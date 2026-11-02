import { getActiveFirebaseConfig, getFirebaseAuth } from '../firebaseBackend';
import { incrementDailyQuotaCount } from '../allowedUsers.js';
import { reportHealthEvent } from './healthTelemetry';
import { HEALTH_EVENT_KINDS, buildPingResult, PingResult } from '../domain/healthEvents';
import { containsInjection } from '../domain/aiSecurityGuards';
import { usageTelemetryService } from './usageTelemetryService';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';

export interface CallDirectGeminiApiOptions {
  prompt: string;
  model?: string;
  apiKey: string;
}

export interface CallAiProxyEndpointOptions {
  operation: string;
  payload: Record<string, unknown> & { prompt?: string };
  hints?: Record<string, unknown>;
  model?: string;
}

export interface CustomAiError extends Error {
  status?: number;
  isTimeout?: boolean;
  details?: unknown;
}

async function callDirectGeminiApi({
  prompt,
  model = 'gemini-2.5-flash',
  apiKey
}: CallDirectGeminiApiOptions): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('AI_DIRECT_TIMEOUT')), 70000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Direct API error (${response.status}): ${errText}`);
    }
    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/[\{\[][\s\S]*[\}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {}
    }
    return { raw: text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Proxy AI call to Cloud Function `aiGenerateV2` (with automatic retry & fallback to `aiGenerate`).
 * Includes the logged-in user's Firebase Auth Bearer token in headers.
 * Fallbacks to direct Gemini API call if local Admin Gemini Key is present and proxy fails.
 */
export async function callAiProxyEndpoint({
  operation,
  payload,
  hints = {},
  model
}: CallAiProxyEndpointOptions): Promise<unknown> {
  const localApiKey =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('tala_gemini_api_key') || (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY
      : typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage
        ? (globalThis as unknown as { localStorage: Storage }).localStorage.getItem('tala_gemini_api_key')
        : '';

  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  let idToken = '';
  if (currentUser) {
    try {
      idToken = await currentUser.getIdToken();
    } catch (e) {
      console.warn('[aiProxyClient] Failed to retrieve Auth ID Token:', e);
    }
  }

  const config = getActiveFirebaseConfig();
  const projectId = config?.projectId || 'tala-d9aaa';
  const region = 'us-central1';

  // Custom or standard Cloud Function endpoint URLs
  const metaEnv = (import.meta as unknown as { env?: { VITE_AI_PROXY_URL?: string } }).env;
  const envProxyUrl = metaEnv?.VITE_AI_PROXY_URL;
  const primaryUrl =
    envProxyUrl || `https://${region}-${projectId}.cloudfunctions.net/aiGenerateV2`;
  const fallbackUrl =
    envProxyUrl ? null : `https://${region}-${projectId}.cloudfunctions.net/aiGenerate`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const bodyString = JSON.stringify({
    operation,
    payload,
    hints,
    model
  });

  const isTransientFailure = (err: CustomAiError): boolean => {
    if (!err) return false;
    // Client-side hard timeout: fail fast so fallback/error banner triggers immediately
    if (err.isTimeout) return false;
    // Network / fetch failures (e.g. TypeError: Failed to fetch) have no status property
    if (!err.status) return true;
    // Transient 5xx status codes (cold start gateway timeout / bad gateway / temporary service unavailable)
    if (err.status === 502 || err.status === 503 || err.status === 504) return true;
    return false;
  };

  const AI_REQUEST_TIMEOUT_MS =
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' && process.env?.TEST_FAST_TIMEOUT
      ? 50
      : 70000;

  const executePost = async (url: string): Promise<unknown> => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error('AI_REQUEST_TIMEOUT'));
    }, AI_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyString,
        signal: controller.signal
      });

      if (!res.ok) {
        let errData: { error?: string } = {};
        try {
          errData = (await res.json()) as { error?: string };
        } catch (_) {}
        const err: CustomAiError = new Error(errData.error || `AI proxy request failed with status ${res.status}`);
        err.status = res.status;
        err.details = errData;
        throw err;
      }

      const data = (await res.json()) as { data?: unknown };
      return data.data; // The returned structured JSON or fallback object
    } catch (err: unknown) {
      const errorObj = err as CustomAiError;
      if (errorObj.name === 'AbortError' || errorObj.message === 'AI_REQUEST_TIMEOUT') {
        const timeoutErr: CustomAiError = new Error('AI request timed out after 70 seconds. Please check your network connection.');
        timeoutErr.isTimeout = true;
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  const retryDelayMs =
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? 10 : 800;

  const callStartTime = Date.now();
  let callStatus = 'success';

  try {
    let result: unknown;
    try {
      result = await executePost(primaryUrl);
    } catch (firstErr: unknown) {
      const err = firstErr as CustomAiError;
      // Do not retry if explicitly frozen by admin (circuit breaker)
      if (err.status === 503 && err.message && err.message.includes('frozen')) {
        callStatus = 'failure';
        throw err;
      }
      if (!isTransientFailure(err)) {
        callStatus = 'failure';
        throw err;
      }

      console.warn('[aiProxyClient] Primary proxy transiently failed, attempting auto-retry...', err.message);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

      callStatus = 'retry';
      // Attempt retry on fallback URL (v1) or re-attempt primary
      const retryUrl = fallbackUrl || primaryUrl;
      result = await executePost(retryUrl);
    }

    const latencyMs = Math.max(0, Date.now() - callStartTime);
    try {
      usageTelemetryService.track(TELEMETRY_EVENTS.AI_LATENCY_RECORDED, {
        operation: operation || 'unknown',
        latencyMs,
        durationMs: latencyMs,
        status: callStatus
      });
    } catch (_) {}

    incrementDailyQuotaCount('ai');
    return result;
  } catch (proxyError: unknown) {
    const err = proxyError as CustomAiError;
    const latencyMs = Math.max(0, Date.now() - callStartTime);
    try {
      usageTelemetryService.track(TELEMETRY_EVENTS.AI_LATENCY_RECORDED, {
        operation: operation || 'unknown',
        latencyMs,
        durationMs: latencyMs,
        status: 'failure'
      });
    } catch (_) {}

    if (err.status === 503 || (err.message && err.message.includes('frozen'))) {
      throw err;
    }
    console.warn('[aiProxyClient] Proxy endpoint unavailable or failed:', err.message);
    reportHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
      operation,
      error: err,
      extra: {
        promptLength: typeof payload?.prompt === 'string' ? payload.prompt.length : undefined,
        viaDirectKey: Boolean(localApiKey)
      }
    });
    if (localApiKey) {
      const promptToUse = payload?.prompt || JSON.stringify(payload);
      if (containsInjection(promptToUse)) {
        const injectionErr: CustomAiError = new Error('Prompt injection detected');
        injectionErr.status = 400;
        throw injectionErr;
      }
      console.info('[aiProxyClient] Using direct Gemini API call via saved Admin key...');
      const directResult = await callDirectGeminiApi({ prompt: promptToUse, model, apiKey: String(localApiKey) });
      incrementDailyQuotaCount('ai');
      return directResult;
    }
    throw err;
  }
}

/**
 * Admin live probe: sends a tiny prompt through the real cloud proxy (no direct-key rescue, so
 * the result reflects the proxy itself). Resolves { name, ok, latencyMs, category, status, message }.
 */
export async function pingAiProxy(): Promise<PingResult> {
  const started = Date.now();
  const auth = getFirebaseAuth();
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
  const config = getActiveFirebaseConfig();
  const projectId = config?.projectId || 'tala-d9aaa';
  const metaEnv = (import.meta as unknown as { env?: { VITE_AI_PROXY_URL?: string } }).env;
  const primaryUrl =
    metaEnv?.VITE_AI_PROXY_URL ||
    `https://us-central1-${projectId}.cloudfunctions.net/aiGenerateV2`;
  const fallbackUrl =
    metaEnv?.VITE_AI_PROXY_URL ? null : `https://us-central1-${projectId}.cloudfunctions.net/aiGenerate`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
  };
  const bodyString = JSON.stringify({
    operation: 'ping'
  });

  const sendPing = async (url: string): Promise<Response> => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyString
    });
    if (!res.ok) {
      let errData: { error?: string } = {};
      try {
        errData = (await res.json()) as { error?: string };
      } catch (_) {}
      const err: CustomAiError = new Error(errData.error || `AI proxy request failed with status ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res;
  };

  try {
    try {
      await sendPing(primaryUrl);
    } catch (firstErr: unknown) {
      const err = firstErr as CustomAiError;
      // If network/cold-start error, retry fallback or retry primary once
      if (!err.status || err.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        await sendPing(fallbackUrl || primaryUrl);
      } else {
        throw err;
      }
    }
    return buildPingResult('ai', started, Date.now());
  } catch (error: unknown) {
    return buildPingResult('ai', started, Date.now(), error as CustomAiError);
  }
}

/**
 * Starts scheduled client-side keep-alive pings to keep the Cloud Function warm
 * without baseline static infrastructure costs ($0 baseline).
 * Automatically pings once on call, then every `intervalMs`.
 * @param intervalMs - Interval between pings in ms (default 9 min)
 * @returns Cleanup function to stop keep-alive pings
 */
export function startAiProxyKeepAlive(intervalMs = 9 * 60 * 1000): () => void {
  // Fire once immediately
  pingAiProxy().catch(() => {});

  const intervalId = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      pingAiProxy().catch(() => {});
    }
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
  };
}
