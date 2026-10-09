import { getActiveFirebaseConfig, getFirebaseAuth } from '../firebaseBackend';

/**
 * Proxy AI call to Cloud Function `aiGenerate` (or `aiGenerateV2`).
 * Includes the logged-in user's Firebase Auth Bearer token in headers.
 */
export async function callAiProxyEndpoint({ operation, payload, hints = {}, model }) {
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
  return data.data; // The returned structured JSON or fallback object
}
