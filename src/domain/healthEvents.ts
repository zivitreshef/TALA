// System-health events: pure helpers (no Firebase / React). Used by the AI proxy client and the
// admin control center. Events NEVER contain prompts, student names or other PII – only the
// reporting user's email (needed by the admin to follow up), the operation and an error class.

export const HEALTH_EVENT_KINDS = {
  AI_PROXY_ERROR: 'ai_proxy_error',
  AI_LOCAL_FALLBACK: 'ai_local_fallback',
  AI_EMPTY_RESPONSE: 'ai_empty_response',
  AI_CLIENT_PROCESSING_ERROR: 'ai_client_processing_error'
} as const;

export type HealthEventKind = (typeof HEALTH_EVENT_KINDS)[keyof typeof HEALTH_EVENT_KINDS];

export const HEALTH_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_HEALTH_EVENTS_SHOWN = 100;

export const HEALTH_CATEGORY_LABELS_HE: Record<string, string> = {
  rate_limit: 'חריגת מכסה / עומס (429)',
  prompt_too_long: 'פרומפט / טקסט ארוך מדי',
  injection: 'נחסם כחשד להזרקת פקודות',
  auth: 'שגיאת הרשאה / התחברות',
  server_error: 'שגיאת שרת AI / Gemini',
  client_code_error: 'שגיאת קוד קליינט / JavaScript Exception',
  network: 'שגיאת רשת / השרת לא זמין',
  empty_response: 'תשובת AI ריקה או לא תקינה',
  unknown: 'שגיאה לא מזוהה'
};

export const HEALTH_KIND_LABELS_HE: Record<HealthEventKind, string> = {
  [HEALTH_EVENT_KINDS.AI_PROXY_ERROR]: 'כשל בקריאת AI',
  [HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK]: 'מעבר למנוע מקומי (ללא AI)',
  [HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE]: 'תשובת AI לא תקינה',
  [HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR]: 'שגיאת עיבוד AI בקליינט'
};

export interface ClassifiedAiError {
  category: string;
  status: number;
  message: string;
}

export interface HealthEventEntity {
  kind: string;
  operation: string;
  category: string;
  status: number;
  message: string;
  userEmail: string;
  createdAtMs: number;
  createdAtIso: string;
  promptLength?: number;
  stage?: string;
  reason?: string;
  viaDirectKey?: boolean;
  [key: string]: unknown;
}

export interface BuildHealthEventParams {
  kind: string;
  operation?: string;
  error?: { status?: number | string; message?: string; name?: string } | null;
  user?: { email?: string } | null;
  extra?: Record<string, unknown>;
  nowMs?: number;
}

export interface HealthSummary {
  total: number;
  fallbackCount: number;
  affectedUsers: number;
  byCategory: Record<string, number>;
  lastAtMs: number;
  severity: 'ok' | 'warn' | 'critical';
}

export interface PingResult {
  name: string;
  ok: boolean;
  latencyMs: number;
  category: string;
  status: number;
  message: string;
}

const truncate = (value: unknown, max: number): string => String(value ?? '').slice(0, max);

/** Maps a thrown error (from aiProxyClient) to a coarse, admin-readable category. */
export function classifyAiError(error?: { status?: number | string; message?: string; name?: string } | null): ClassifiedAiError {
  const status = Number(error?.status) || 0;
  const message = String(error?.message || '');
  const lower = message.toLowerCase();

  let category = 'unknown';
  if (status === 429 || /rate limit|quota|resource_exhausted/.test(lower)) category = 'rate_limit';
  else if (/injection/.test(lower)) category = 'injection';
  else if (status === 401 || status === 403) category = 'auth';
  else if (status === 400 && /too long|invalid length|length/.test(lower)) category = 'prompt_too_long';
  else if (status >= 500) category = 'server_error';
  else if (/referenceerror|typeerror|syntaxerror|cannot read|undefined is not|is not defined/.test(lower) || error?.name === 'ReferenceError' || error?.name === 'TypeError') category = 'client_code_error';
  else if (!status && /failed to fetch|network|load failed|timeout|cors/.test(lower)) category = 'network';
  else if (!status && message) category = 'network';

  return { category, status, message: truncate(message, 300) };
}

/**
 * Builds a Firestore-safe health event. `error` is optional. `user` needs only an email.
 * `extra` is an allow-listed set of scalar diagnostics (e.g. promptLength, stage).
 */
export function buildHealthEvent({
  kind,
  operation = '',
  error = null,
  user = null,
  extra = {},
  nowMs = Date.now()
}: BuildHealthEventParams): HealthEventEntity {
  const classified = error ? classifyAiError(error) : null;
  const category =
    kind === HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE
      ? 'empty_response'
      : classified?.category || (extra?.category ? truncate(extra.category, 40) : 'unknown');

  const safeExtra: Record<string, unknown> = {};
  (['promptLength', 'stage', 'reason', 'viaDirectKey'] as const).forEach((key) => {
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
export function normalizeHealthEvents(rawEvents?: unknown[] | null): HealthEventEntity[] {
  return (Array.isArray(rawEvents) ? rawEvents : [])
    .filter((e): e is HealthEventEntity => Boolean(e && typeof (e as HealthEventEntity).createdAtMs === 'number' && (e as HealthEventEntity).kind))
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, MAX_HEALTH_EVENTS_SHOWN);
}

/**
 * Rolls events up for the dashboard.
 * severity: 'critical' = teachers got non-AI output or AI is failing repeatedly; 'warn' = isolated
 * errors; 'ok' = nothing in the window.
 */
export function summarizeHealthEvents(
  events?: unknown[] | null,
  nowMs: number = Date.now(),
  windowMs: number = HEALTH_EVENT_WINDOW_MS
): HealthSummary {
  const inWindow = normalizeHealthEvents(events).filter((e) => nowMs - e.createdAtMs <= windowMs);
  const byCategory: Record<string, number> = {};
  let fallbackCount = 0;
  const affectedUsers = new Set<string>();
  inWindow.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    if (e.kind === HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK) fallbackCount += 1;
    if (e.userEmail) affectedUsers.add(e.userEmail);
  });

  let severity: 'ok' | 'warn' | 'critical' = 'ok';
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
export function countUnreviewedHealthEvents(
  events?: unknown[] | null,
  lastReviewedMs: number = 0,
  nowMs: number = Date.now()
): number {
  return normalizeHealthEvents(events).filter(
    (e) => e.createdAtMs > lastReviewedMs && nowMs - e.createdAtMs <= HEALTH_EVENT_WINDOW_MS
  ).length;
}

/** Builds the user-visible result of a live ping probe. */
export function buildPingResult(
  name: string,
  startedMs: number,
  endedMs: number,
  error?: { status?: number | string; message?: string; name?: string } | null
): PingResult {
  const latencyMs = Math.max(0, Math.round(endedMs - startedMs));
  if (error) {
    const { category, status, message } = classifyAiError(error);
    return { name, ok: false, latencyMs, category, status, message };
  }
  return { name, ok: true, latencyMs, category: '', status: 200, message: '' };
}
