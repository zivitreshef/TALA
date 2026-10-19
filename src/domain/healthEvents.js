// System-health events: pure helpers (no Firebase / React). Used by the AI proxy client and the
// admin control center. Events NEVER contain prompts, student names or other PII – only the
// reporting user's email (needed by the admin to follow up), the operation and an error class.

export const HEALTH_EVENT_KINDS = {
  AI_PROXY_ERROR: 'ai_proxy_error', // the cloud AI proxy call failed (may still be rescued by a direct key)
  AI_LOCAL_FALLBACK: 'ai_local_fallback', // the teacher received output from the local (non-AI) engine
  AI_EMPTY_RESPONSE: 'ai_empty_response' // AI answered, but the response was unusable
};

export const HEALTH_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_HEALTH_EVENTS_SHOWN = 100;

export const HEALTH_CATEGORY_LABELS_HE = {
  rate_limit: 'חריגת מכסה / עומס (429)',
  prompt_too_long: 'פרומפט / טקסט ארוך מדי',
  injection: 'נחסם כחשד להזרקת פקודות',
  auth: 'שגיאת הרשאה / התחברות',
  server_error: 'שגיאת שרת AI / Gemini',
  network: 'שגיאת רשת / השרת לא זמין',
  empty_response: 'תשובת AI ריקה או לא תקינה',
  unknown: 'שגיאה לא מזוהה'
};

export const HEALTH_KIND_LABELS_HE = {
  [HEALTH_EVENT_KINDS.AI_PROXY_ERROR]: 'כשל בקריאת AI',
  [HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK]: 'מעבר למנוע מקומי (ללא AI)',
  [HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE]: 'תשובת AI לא תקינה'
};

const truncate = (value, max) => String(value ?? '').slice(0, max);

/** Maps a thrown error (from aiProxyClient) to a coarse, admin-readable category. */
export function classifyAiError(error) {
  const status = Number(error?.status) || 0;
  const message = String(error?.message || '');
  const lower = message.toLowerCase();

  let category = 'unknown';
  if (status === 429 || /rate limit|quota|resource_exhausted/.test(lower)) category = 'rate_limit';
  else if (/injection/.test(lower)) category = 'injection';
  else if (status === 401 || status === 403) category = 'auth';
  else if (status === 400 && /too long|invalid length|length/.test(lower)) category = 'prompt_too_long';
  else if (status >= 500) category = 'server_error';
  else if (!status && /failed to fetch|network|load failed|timeout|cors/.test(lower)) category = 'network';
  else if (!status && message) category = 'network';

  return { category, status, message: truncate(message, 300) };
}

/**
 * Builds a Firestore-safe health event. `error` is optional. `user` needs only an email.
 * `extra` is an allow-listed set of scalar diagnostics (e.g. promptLength, stage).
 */
export function buildHealthEvent({ kind, operation = '', error = null, user = null, extra = {}, nowMs = Date.now() }) {
  const classified = error ? classifyAiError(error) : null;
  const category =
    kind === HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE
      ? 'empty_response'
      : classified?.category || (extra?.category ? truncate(extra.category, 40) : 'unknown');

  const safeExtra = {};
  ['promptLength', 'stage', 'reason', 'viaDirectKey'].forEach((key) => {
    const v = extra?.[key];
    if (typeof v === 'number' || typeof v === 'boolean') safeExtra[key] = v;
    else if (typeof v === 'string') safeExtra[key] = truncate(v, 120);
  });

  return {
    kind: truncate(kind, 40),
    operation: truncate(operation, 40),
    category,
    status: classified?.status || 0,
    message: classified?.message || truncate(extra?.message || '', 300),
    userEmail: truncate(String(user?.email || '').trim().toLowerCase(), 120),
    createdAtMs: nowMs,
    createdAtIso: new Date(nowMs).toISOString(),
    ...safeExtra
  };
}

/** Normalises raw Firestore docs: valid, newest first, capped. */
export function normalizeHealthEvents(rawEvents) {
  return (Array.isArray(rawEvents) ? rawEvents : [])
    .filter((e) => e && typeof e.createdAtMs === 'number' && e.kind)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, MAX_HEALTH_EVENTS_SHOWN);
}

/**
 * Rolls events up for the dashboard.
 * severity: 'critical' = teachers got non-AI output or AI is failing repeatedly; 'warn' = isolated
 * errors; 'ok' = nothing in the window.
 */
export function summarizeHealthEvents(events, nowMs = Date.now(), windowMs = HEALTH_EVENT_WINDOW_MS) {
  const inWindow = normalizeHealthEvents(events).filter((e) => nowMs - e.createdAtMs <= windowMs);
  const byCategory = {};
  let fallbackCount = 0;
  const affectedUsers = new Set();
  inWindow.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    if (e.kind === HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK) fallbackCount += 1;
    if (e.userEmail) affectedUsers.add(e.userEmail);
  });

  let severity = 'ok';
  if (inWindow.length > 0) severity = 'warn';
  if (fallbackCount > 0 || inWindow.length >= 5) severity = 'critical';

  return {
    total: inWindow.length,
    fallbackCount,
    affectedUsers: affectedUsers.size,
    byCategory,
    lastAtMs: inWindow[0]?.createdAtMs || 0,
    severity
  };
}

/** Number of events newer than the admin's last "mark as reviewed" timestamp (drives the badge). */
export function countUnreviewedHealthEvents(events, lastReviewedMs = 0, nowMs = Date.now()) {
  return normalizeHealthEvents(events).filter(
    (e) => e.createdAtMs > lastReviewedMs && nowMs - e.createdAtMs <= HEALTH_EVENT_WINDOW_MS
  ).length;
}

/** Builds the user-visible result of a live ping probe. */
export function buildPingResult(name, startedMs, endedMs, error = null) {
  const latencyMs = Math.max(0, Math.round(endedMs - startedMs));
  if (error) {
    const { category, status, message } = classifyAiError(error);
    return { name, ok: false, latencyMs, category, status, message };
  }
  return { name, ok: true, latencyMs, category: '', status: 200, message: '' };
}
