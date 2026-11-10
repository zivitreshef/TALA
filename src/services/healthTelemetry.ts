import { getFirebaseAuth, reportHealthEventToCloud } from '../firebaseBackend';
import { buildHealthEvent, HEALTH_EVENT_KINDS } from '../domain/healthEvents';
import type { HealthEventKind } from '../domain/healthEvents';
import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';

export interface ReportHealthEventParams {
  kind: HealthEventKind | string;
  operation?: string;
  error?: { status?: number | string; message?: string; name?: string } | Error | unknown;
  extra?: Record<string, unknown>;
}

const DEDUPE_WINDOW_MS = 30 * 1000;
const recentKeys = new Map<string, number>();

/**
 * Fire-and-forget system-health report for the admin control center.
 * Never throws and never blocks: telemetry must not affect the teacher's workflow.
 */
export function reportHealthEvent({ kind, operation, error, extra }: ReportHealthEventParams): void {
  try {
    const now = Date.now();
    const userEmail = getFirebaseAuth()?.currentUser?.email || '';
    const normalizedError =
      error && typeof error === 'object'
        ? (error as { status?: number | string; message?: string; name?: string })
        : null;

    const event = buildHealthEvent({
      kind,
      operation,
      error: normalizedError,
      extra,
      nowMs: now,
      user: { email: userEmail }
    });

    // Collapse bursts (e.g. several AI calls failing in a row) into a single record.
    const dedupeKey = `${event.kind}|${event.operation || ''}|${event.category || ''}|${event.userEmail || ''}`;
    const last = recentKeys.get(dedupeKey) || 0;
    if (now - last < DEDUPE_WINDOW_MS) return;
    recentKeys.set(dedupeKey, now);

    Promise.resolve(reportHealthEventToCloud(event)).catch(() => {});
  } catch (_) {
    // ignore
  }
}

/** Reports an unexpected Firestore / database persistence failure for RCA tracking. */
export function reportDatabaseHealthError(operation: string, error: unknown, extra: Record<string, unknown> = {}): void {
  const err = (error && typeof error === 'object' ? error : {}) as { code?: string; message?: string; name?: string };
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const errorName = err.code || err.name || 'FirestoreError';
  const rawMsg = err.message || 'Database operation failed';
  const rcaDetails = `online=${isOnline} • ver=${CURRENT_APP_VERSION} • code=${errorName}`;
  const enrichedMessage = rawMsg.includes('online=') ? rawMsg : `${rawMsg} (${rcaDetails})`;

  reportHealthEvent({
    kind: HEALTH_EVENT_KINDS.DB_ERROR,
    operation: operation || 'firestore',
    error: {
      status: 0,
      name: errorName,
      message: enrichedMessage
    },
    extra: {
      reason: rcaDetails,
      ...extra
    }
  });
}
