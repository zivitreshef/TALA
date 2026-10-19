import { getFirebaseAuth, reportHealthEventToCloud } from '../firebaseBackend';
import { buildHealthEvent } from '../domain/healthEvents.js';

const DEDUPE_WINDOW_MS = 30 * 1000;
const recentKeys = new Map();

/**
 * Fire-and-forget system-health report for the admin control center.
 * Never throws and never blocks: telemetry must not affect the teacher's workflow.
 */
export function reportHealthEvent({ kind, operation, error, extra }) {
  try {
    const now = Date.now();
    const event = buildHealthEvent({
      kind,
      operation,
      error,
      extra,
      nowMs: now,
      user: { email: getFirebaseAuth()?.currentUser?.email || '' }
    });

    // Collapse bursts (e.g. several AI calls failing in a row) into a single record.
    const dedupeKey = `${event.kind}|${event.operation}|${event.category}|${event.userEmail}`;
    const last = recentKeys.get(dedupeKey) || 0;
    if (now - last < DEDUPE_WINDOW_MS) return;
    recentKeys.set(dedupeKey, now);

    Promise.resolve(reportHealthEventToCloud(event)).catch(() => {});
  } catch (_) {
    // ignore
  }
}
