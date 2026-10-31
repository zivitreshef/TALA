/**
 * TALA Telemetry Storage & Ingestion Service
 * Handles batched persistence of zero-PII telemetry events to Firebase Firestore
 * collection `tala_telemetry_events` using `writeBatch()`, resilient fetching
 * with time-range and internal account filtering, and transport integration.
 */

import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import {
  getFirestoreDb,
  sanitizeForFirestore
} from '../firebaseBackend.js';
import {
  generateUuidV4,
  isInternalAccount
} from '../domain/telemetryPrivacy.js';

export const TELEMETRY_EVENTS_COLLECTION = 'tala_telemetry_events';
export const FIRESTORE_BATCH_LIMIT = 450; // Under Firestore max 500 write operations per batch

/**
 * Calculates start timestamp in milliseconds based on a predefined or custom time range.
 *
 * @param {string} timeRange - '24h' | '7d' | '30d' | '90d' | 'custom' | 'all'
 * @param {number} [startTimeMs] - Optional start timestamp for 'custom'
 * @param {number} [nowMs] - Current time in ms (default Date.now())
 * @returns {number}
 */
export function getTimeRangeStartMs(timeRange = '30d', startTimeMs = null, nowMs = Date.now()) {
  switch (timeRange) {
    case '24h':
      return nowMs - 24 * 60 * 60 * 1000;
    case '7d':
      return nowMs - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return nowMs - 30 * 24 * 60 * 60 * 1000;
    case '90d':
      return nowMs - 90 * 24 * 60 * 60 * 1000;
    case 'custom':
      return typeof startTimeMs === 'number' && Number.isFinite(startTimeMs) ? startTimeMs : 0;
    case 'all':
      return 0;
    default:
      return nowMs - 30 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Persists a batch of telemetry events into Firestore using writeBatch().
 * Safe and non-blocking: never throws uncaught exceptions.
 *
 * @param {Array<object>} events - Array of sanitized telemetry event payloads
 * @returns {Promise<boolean>} - Resolves to true on success, false on error
 */
export async function saveTelemetryBatch(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return true;
  }

  try {
    const db = getFirestoreDb();
    if (!db) {
      console.warn('[telemetryStorage] Firestore DB instance not available, skipping save');
      return false;
    }

    // Split events into chunks under FIRESTORE_BATCH_LIMIT to avoid Firestore quota errors
    for (let i = 0; i < events.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = events.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);

      for (const event of chunk) {
        if (!event || typeof event !== 'object') continue;
        const docId = event.eventId || generateUuidV4();
        const docRef = doc(db, TELEMETRY_EVENTS_COLLECTION, docId);

        const safePayload = {
          eventId: docId,
          eventName: event.eventName || 'unknown',
          category: event.category || 'general',
          anonUserId: event.anonUserId || 'anon',
          sessionId: event.sessionId || 'session',
          accountType: event.accountType || 'teacher',
          appVersion: event.appVersion || '2.4.19',
          properties: event.properties || {},
          timestampMs: typeof event.timestampMs === 'number' ? event.timestampMs : Date.now()
        };

        batch.set(docRef, sanitizeForFirestore(safePayload));
      }

      await batch.commit();
    }

    return true;
  } catch (err) {
    console.warn('[telemetryStorage] Failed to save telemetry batch to Firestore:', err);
    return false;
  }
}

/**
 * Fetches telemetry events from Firestore within the specified timeframe.
 * Filters out internal/admin/test accounts when requested.
 *
 * @param {object} options
 * @param {string} [options.timeRange='30d'] - '24h' | '7d' | '30d' | '90d' | 'custom' | 'all'
 * @param {string} [options.category] - Optional category filter
 * @param {boolean} [options.excludeInternal=false] - Whether to exclude internal test accounts and admins
 * @param {number} [options.startTimeMs] - Optional start time for custom range
 * @param {number} [options.endTimeMs] - Optional end time for custom range
 * @param {number} [options.limitCount=5000] - Max events to retrieve
 * @returns {Promise<Array<object>>} - List of retrieved events sorted newest first
 */
export async function fetchTelemetryEvents({
  timeRange = '30d',
  category = null,
  excludeInternal = false,
  startTimeMs = null,
  endTimeMs = null,
  limitCount = 5000
} = {}) {
  try {
    const db = getFirestoreDb();
    if (!db) {
      return [];
    }

    const startMs = getTimeRangeStartMs(timeRange, startTimeMs);
    const colRef = collection(db, TELEMETRY_EVENTS_COLLECTION);

    let q;
    try {
      if (startMs > 0) {
        q = query(
          colRef,
          where('timestampMs', '>=', startMs),
          orderBy('timestampMs', 'desc'),
          firestoreLimit(limitCount)
        );
      } else {
        q = query(
          colRef,
          orderBy('timestampMs', 'desc'),
          firestoreLimit(limitCount)
        );
      }
    } catch {
      // Fallback query if indexing or composite query encounters issues
      q = query(colRef, firestoreLimit(limitCount));
    }

    const snapshot = await getDocs(q);
    const rawEvents = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      rawEvents.push({
        id: docSnap.id,
        ...data
      });
    });

    // In-memory post-filtering for composite conditions
    let filtered = rawEvents.filter((ev) => {
      const ts = ev.timestampMs || 0;
      if (startMs > 0 && ts < startMs) return false;
      if (endTimeMs && ts > endTimeMs) return false;
      if (category && ev.category !== category) return false;
      if (excludeInternal && isInternalAccount(ev.accountType)) return false;
      return true;
    });

    // Sort newest first
    filtered.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

    return filtered;
  } catch (err) {
    console.warn('[telemetryStorage] Failed to fetch telemetry events:', err);
    return [];
  }
}

/**
 * Plugs Firestore batch persistence into a UsageTelemetryService instance.
 *
 * @param {object} usageTelemetryServiceInstance
 * @returns {object} The configured usageTelemetryService
 */
export function setupUsageTelemetryTransport(usageTelemetryServiceInstance) {
  if (
    usageTelemetryServiceInstance &&
    typeof usageTelemetryServiceInstance.setTransport === 'function'
  ) {
    usageTelemetryServiceInstance.setTransport(saveTelemetryBatch);
  }
  return usageTelemetryServiceInstance;
}
