import { getActiveFirebaseConfig, getFirebaseAuth } from '../firebaseBackend';
import { incrementDailyQuotaCount } from '../allowedUsers';
import { reportHealthEvent } from './healthTelemetry';
import { HEALTH_EVENT_KINDS, buildPingResult } from '../domain/healthEvents.js';

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
 * Proxy AI call to Cloud Function `aiGenerate` (or `aiGenerateV2`).
 * Includes the logged-in user's Firebase Auth Bearer token in headers.
 * Fallbacks to direct Gemini API call if local Admin Gemini Key is present and proxy fails.
 */
export async function callAiProxyEndpoint({ operation, payload, hints = {}, model }) {
  const localApiKey =
    typeof window !== 'undefined'
      ? localStorage.getItem('tala_gemini_api_key') || import.meta.env?.VITE_GEMINI_API_KEY
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
  
  // Custom or standard Cloud Function endpoint URL
  const envProxyUrl = import.meta.env?.VITE_AI_PROXY_URL;
  const functionUrl =
    envProxyUrl || `https://${region}-${projectId}.cloudfunctions.net/aiGenerateV2`;

  const headers = {
    'Content-Type': 'application/json'
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operation,
        payload,
        hints,
        model
      })
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
    incrementDailyQuotaCount('ai');
    return data.data; // The returned structured JSON or fallback object
  } catch (proxyError) {
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
      console.info('[aiProxyClient] Using direct Gemini API call via saved Admin key...');
      const promptToUse = payload?.prompt || JSON.stringify(payload);
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
  try {
    const auth = getFirebaseAuth();
    const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
    const config = getActiveFirebaseConfig();
    const projectId = config?.projectId || 'tala-d9aaa';
    const functionUrl =
      import.meta.env?.VITE_AI_PROXY_URL ||
      `https://us-central1-${projectId}.cloudfunctions.net/aiGenerateV2`;
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
      },
      body: JSON.stringify({
        operation: 'rawPrompt',
        payload: { prompt: 'החזר JSON תקין בלבד: {"ok": true}' },
        hints: {}
      })
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
    return buildPingResult('ai', started, Date.now());
  } catch (error) {
    return buildPingResult('ai', started, Date.now(), error);
  }
}

