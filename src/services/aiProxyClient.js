import { getActiveFirebaseConfig, getFirebaseAuth } from '../firebaseBackend';
import { incrementDailyQuotaCount } from '../allowedUsers';
import { reportHealthEvent } from './healthTelemetry';
import { HEALTH_EVENT_KINDS, buildPingResult } from '../domain/healthEvents.js';
import { containsInjection } from '../domain/aiSecurityGuards.js';

async function callDirectGeminiApi({ prompt, model = 'gemini-2.5-flash', apiKey }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {}
  }
  return { raw: text };
}

/**
 * Proxy AI call to Cloud Function `aiGenerateV2` (with automatic retry & fallback to `aiGenerate`).
 * Includes the logged-in user's Firebase Auth Bearer token in headers.
 * Fallbacks to direct Gemini API call if local Admin Gemini Key is present and proxy fails.
 */
export async function callAiProxyEndpoint({ operation, payload, hints = {}, model }) {
  const localApiKey =
    typeof window !== 'undefined'
      ? localStorage.getItem('tala_gemini_api_key') || import.meta.env?.VITE_GEMINI_API_KEY
      : (typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage.getItem('tala_gemini_api_key') : '');

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
  const envProxyUrl = import.meta.env?.VITE_AI_PROXY_URL;
  const primaryUrl =
    envProxyUrl || `https://${region}-${projectId}.cloudfunctions.net/aiGenerateV2`;
  const fallbackUrl =
    envProxyUrl ? null : `https://${region}-${projectId}.cloudfunctions.net/aiGenerate`;

  const headers = {
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

  const isTransientFailure = (err) => {
    if (!err) return false;
    // Network / fetch failures (e.g. TypeError: Failed to fetch) have no status property
    if (!err.status) return true;
    // Transient 5xx status codes (cold start gateway timeout / bad gateway / temporary service unavailable)
    if (err.status === 502 || err.status === 503 || err.status === 504) return true;
    return false;
  };

  const executePost = async (url) => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyString
    });

    if (!res.ok) {
      let errData = {};
      try {
        errData = await res.json();
      } catch (_) {}
      const err = new Error(errData.error || `AI proxy request failed with status ${res.status}`);
      err.status = res.status;
      err.details = errData;
      throw err;
    }

    const data = await res.json();
    return data.data; // The returned structured JSON or fallback object
  };

  const retryDelayMs =
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? 10 : 800;

  try {
    let result;
    try {
      result = await executePost(primaryUrl);
    } catch (firstErr) {
      // Do not retry if explicitly frozen by admin (circuit breaker)
      if (firstErr.status === 503 && firstErr.message && firstErr.message.includes('frozen')) {
        throw firstErr;
      }
      if (!isTransientFailure(firstErr)) {
        throw firstErr;
      }

      console.warn('[aiProxyClient] Primary proxy transiently failed, attempting auto-retry...', firstErr.message);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

      // Attempt retry on fallback URL (v1) or re-attempt primary
      const retryUrl = fallbackUrl || primaryUrl;
      result = await executePost(retryUrl);
    }

    incrementDailyQuotaCount('ai');
    return result;
  } catch (proxyError) {
    if (proxyError.status === 503 || (proxyError.message && proxyError.message.includes('frozen'))) {
      throw proxyError;
    }
    console.warn('[aiProxyClient] Proxy endpoint unavailable or failed:', proxyError.message);
    reportHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
      operation,
      error: proxyError,
      extra: {
        promptLength: typeof payload?.prompt === 'string' ? payload.prompt.length : undefined,
        viaDirectKey: Boolean(localApiKey)
      }
    });
    if (localApiKey) {
      const promptToUse = payload?.prompt || JSON.stringify(payload);
      if (containsInjection(promptToUse)) {
        const err = new Error('Prompt injection detected');
        err.status = 400;
        throw err;
      }
      console.info('[aiProxyClient] Using direct Gemini API call via saved Admin key...');
      const directResult = await callDirectGeminiApi({ prompt: promptToUse, model, apiKey: localApiKey });
      incrementDailyQuotaCount('ai');
      return directResult;
    }
    throw proxyError;
  }
}

/**
 * Admin live probe: sends a tiny prompt through the real cloud proxy (no direct-key rescue, so
 * the result reflects the proxy itself). Resolves { name, ok, latencyMs, category, status, message }.
 */
export async function pingAiProxy() {
  const started = Date.now();
  const auth = getFirebaseAuth();
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
  const config = getActiveFirebaseConfig();
  const projectId = config?.projectId || 'tala-d9aaa';
  const primaryUrl =
    import.meta.env?.VITE_AI_PROXY_URL ||
    `https://us-central1-${projectId}.cloudfunctions.net/aiGenerateV2`;
  const fallbackUrl =
    import.meta.env?.VITE_AI_PROXY_URL ? null : `https://us-central1-${projectId}.cloudfunctions.net/aiGenerate`;

  const headers = {
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
  };
  const bodyString = JSON.stringify({
    operation: 'ping'
  });

  const sendPing = async (url) => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyString
    });
    if (!res.ok) {
      let errData = {};
      try {
        errData = await res.json();
      } catch (_) {}
      const err = new Error(errData.error || `AI proxy request failed with status ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res;
  };

  try {
    try {
      await sendPing(primaryUrl);
    } catch (firstErr) {
      // If network/cold-start error, retry fallback or retry primary once
      if (!firstErr.status || firstErr.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        await sendPing(fallbackUrl || primaryUrl);
      } else {
        throw firstErr;
      }
    }
    return buildPingResult('ai', started, Date.now());
  } catch (error) {
    return buildPingResult('ai', started, Date.now(), error);
  }
}

/**
 * Starts scheduled client-side keep-alive pings to keep the Cloud Function warm
 * without baseline static infrastructure costs ($0 baseline).
 * Automatically pings once on call, then every `intervalMs`.
 * @param {number} [intervalMs=540000] - Interval between pings in ms (default 9 min)
 * @returns {Function} Cleanup function to stop keep-alive pings
 */
export function startAiProxyKeepAlive(intervalMs = 9 * 60 * 1000) {
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
