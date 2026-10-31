/**
 * TALA Centralized Usage Telemetry Service
 * Singleton service featuring an in-memory event ring buffer, auto-batching,
 * bounded offline fallback storage, retry with exponential backoff, duplicate detection,
 * sampling controls, and admin/internal account segregation.
 */

import {
  safeGetStorageJson,
  safeSetStorageJson,
  safeRemoveStorageItem
} from './storage.js';
import {
  sanitizeTelemetryPayload,
  isInternalAccount
} from '../domain/telemetryPrivacy.js';
import { isValidEventName } from '../domain/telemetryTaxonomy.js';

export const OFFLINE_STORAGE_KEY = 'tala_telemetry_offline_queue';
export const RING_BUFFER_CAPACITY = 100;
export const MAX_OFFLINE_EVENTS = 50;
export const BATCH_SIZE = 15;
export const FLUSH_INTERVAL_MS = 45000;
export const DEDUP_WINDOW_MS = 2000;
export const BASE_BACKOFF_MS = 1000;
export const MAX_BACKOFF_MS = 30000;
export const MAX_RETRIES = 3;

export class UsageTelemetryService {
  constructor() {
    this._enabled = true;
    this._samplingRate = 1.0; // 100% capture by default
    this._excludeInternalAccounts = false;
    this._userContext = null;
    this._appVersion = '2.4.20';

    // In-memory queues
    this._queue = []; // pending events awaiting dispatch
    this._ringBuffer = []; // last 100 tracked events (history)

    // Deduplication tracking: map of dedupKey -> timestampMs
    this._dedupMap = new Map();

    // Batching & retry state
    this._isFlushing = false;
    this._retryCount = 0;
    this._flushIntervalId = null;
    this._retryTimeoutId = null;
    this._isOnlineOverride = null;

    // Pluggable transport (default resolves true; can be injected by Firestore storage)
    this._transport = null;

    // Bound event handlers for clean lifecycle removal
    this._onVisibilityChange = this._handleVisibilityChange.bind(this);
    this._onBeforeUnload = this._handleBeforeUnload.bind(this);
    this._onOnline = this._handleOnline.bind(this);

    this._initLifecycleListeners();
    this._startFlushInterval();
  }

  // ==========================================================================
  // Configuration & State
  // ==========================================================================

  isEnabled() {
    return this._enabled;
  }

  setEnabled(enabled) {
    this._enabled = Boolean(enabled);
  }

  getSamplingRate() {
    return this._samplingRate;
  }

  setSamplingRate(rate) {
    if (typeof rate !== 'number' || Number.isNaN(rate)) {
      this._samplingRate = 1.0;
      return;
    }
    this._samplingRate = Math.max(0.0, Math.min(1.0, rate));
  }

  getExcludeInternalAccounts() {
    return this._excludeInternalAccounts;
  }

  setExcludeInternalAccounts(exclude) {
    this._excludeInternalAccounts = Boolean(exclude);
  }

  getUserContext() {
    return this._userContext;
  }

  setUserContext(context) {
    this._userContext = context ? { ...context } : null;
  }

  getAppVersion() {
    return this._appVersion;
  }

  setAppVersion(version) {
    if (typeof version === 'string' && version) {
      this._appVersion = version;
    }
  }

  setTransport(transportFn) {
    this._transport = typeof transportFn === 'function' ? transportFn : null;
  }

  setIsOnline(online) {
    this._isOnlineOverride = typeof online === 'boolean' ? online : null;
  }

  getBufferSize() {
    return this._queue.length;
  }

  getQueue() {
    return [...this._queue];
  }

  getRingBuffer() {
    return [...this._ringBuffer];
  }

  // ==========================================================================
  // Core Tracking API
  // ==========================================================================

  /**
   * Safe, non-blocking telemetry event tracking.
   * Never throws, never interrupts calling UI code.
   *
   * @param {string} eventName - Standardized taxonomy event name
   * @param {object} properties - Behavioral/technical metadata (strictly zero PII)
   * @param {object} [options] - Optional overrides (e.g. userContext)
   * @returns {boolean} - true if enqueued/processed, false if dropped/suppressed
   */
  track(eventName, properties = {}, options = {}) {
    try {
      if (!this._enabled) {
        return false;
      }

      if (!isValidEventName(eventName)) {
        console.warn(`[usageTelemetryService] Discarding invalid event name: "${eventName}"`);
        return false;
      }

      // Sampling check (100% by default unless explicitly configured < 1.0)
      if (this._samplingRate < 1.0 && Math.random() > this._samplingRate) {
        return false;
      }

      const effectiveContext = options.userContext || this._userContext;

      // 5-Tier Sanitization & Zero-PII Pseudonymization
      const payload = sanitizeTelemetryPayload(eventName, properties, effectiveContext);
      if (!payload) {
        return false;
      }
      payload.appVersion = payload.appVersion || this._appVersion;

      // Admin & internal account filtering
      if (this._excludeInternalAccounts && isInternalAccount(payload.accountType)) {
        return false;
      }

      // Deduplication check (2000ms window)
      if (this._isDuplicate(eventName, payload.properties)) {
        return false;
      }

      // Enqueue to in-memory queue & ring buffer
      this._enqueue(payload);

      // Trigger flush if batch size threshold is met
      if (this._queue.length >= BATCH_SIZE) {
        Promise.resolve().then(() => this.flush()).catch((err) => {
          console.warn('[usageTelemetryService] Async batch flush failure:', err);
        });
      }

      return true;
    } catch (err) {
      console.warn('[usageTelemetryService] Unexpected error in track:', err);
      return false;
    }
  }

  // ==========================================================================
  // Buffer & Deduplication
  // ==========================================================================

  _isDuplicate(eventName, sanitizedProperties) {
    const now = Date.now();
    this._pruneStaleDedupKeys(now);

    const sortedKeys = Object.keys(sanitizedProperties).sort();
    const propsString = sortedKeys.map((k) => `${k}:${sanitizedProperties[k]}`).join('|');
    const dedupKey = `${eventName}::${propsString}`;

    const lastTime = this._dedupMap.get(dedupKey);
    if (lastTime && (now - lastTime) < DEDUP_WINDOW_MS) {
      return true;
    }

    this._dedupMap.set(dedupKey, now);
    return false;
  }

  _pruneStaleDedupKeys(now) {
    for (const [key, timestamp] of this._dedupMap.entries()) {
      if (now - timestamp >= DEDUP_WINDOW_MS) {
        this._dedupMap.delete(key);
      }
    }
  }

  _enqueue(payload) {
    // 1. Maintain in-memory dispatch queue with FIFO eviction at 100
    this._queue.push(payload);
    while (this._queue.length > RING_BUFFER_CAPACITY) {
      this._queue.shift();
    }

    // 2. Maintain inspection ring buffer (capped at 100)
    this._ringBuffer.push(payload);
    while (this._ringBuffer.length > RING_BUFFER_CAPACITY) {
      this._ringBuffer.shift();
    }
  }

  // ==========================================================================
  // Batch Flushing & Retry Management
  // ==========================================================================

  isOnline() {
    if (typeof this._isOnlineOverride === 'boolean') {
      return this._isOnlineOverride;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Flushes currently queued events through the transport.
   * Safe, non-blocking execution with exponential backoff on failure.
   */
  async flush() {
    if (this._isFlushing) {
      return false;
    }

    // Check if offline
    if (!this.isOnline()) {
      this._persistOffline();
      this._queue = [];
      return false;
    }

    // Drain any stored offline events first
    this._drainOfflineIntoQueue();

    if (this._queue.length === 0) {
      return true;
    }

    this._isFlushing = true;
    const batchToSend = [...this._queue];

    try {
      let dispatchOk = true;

      if (this._transport) {
        dispatchOk = await this._transport(batchToSend);
      } else {
        // Default transport resolves successfully
        dispatchOk = true;
      }

      if (dispatchOk !== false) {
        // Success: drop sent events from queue and reset retries
        const sentIds = new Set(batchToSend.map((e) => e.eventId));
        this._queue = this._queue.filter((e) => !sentIds.has(e.eventId));
        this._retryCount = 0;
        this._clearOfflineStorage();
        this._isFlushing = false;
        return true;
      }

      throw new Error('Transport returned unsuccessful status');
    } catch (err) {
      console.warn('[usageTelemetryService] Batch dispatch failed, scheduling retry:', err);
      this._retryCount += 1;

      if (this._retryCount > MAX_RETRIES) {
        // Retries exceeded: save to offline bounded storage to protect memory
        console.warn('[usageTelemetryService] Max retries exceeded; saving to offline buffer');
        this._persistOffline();
        this._queue = [];
        this._retryCount = 0;
      } else {
        // Exponential backoff
        const delay = Math.min(
          MAX_BACKOFF_MS,
          BASE_BACKOFF_MS * Math.pow(2, this._retryCount - 1)
        );
        this._scheduleRetry(delay);
      }

      this._isFlushing = false;
      return false;
    }
  }

  _scheduleRetry(delayMs) {
    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
    }
    this._retryTimeoutId = setTimeout(() => {
      this.flush().catch((err) => {
        console.warn('[usageTelemetryService] Retry flush error:', err);
      });
    }, delayMs);
  }

  // ==========================================================================
  // Offline Bounded Storage (Max 50 events, Safari safe)
  // ==========================================================================

  _persistOffline() {
    try {
      const existing = safeGetStorageJson(OFFLINE_STORAGE_KEY, []) || [];
      const existingArr = Array.isArray(existing) ? existing : [];
      const existingIds = new Set(existingArr.map((e) => e.eventId));
      const newItems = this._queue.filter((e) => !existingIds.has(e.eventId));
      const merged = [...existingArr, ...newItems];

      // FIFO bounded eviction: keep only latest MAX_OFFLINE_EVENTS
      let bounded = merged.slice(-MAX_OFFLINE_EVENTS);
      let success = safeSetStorageJson(OFFLINE_STORAGE_KEY, bounded);
      if (!success && bounded.length > 10) {
        // Quota safety fallback: trim down to 20 events
        bounded = bounded.slice(-20);
        safeSetStorageJson(OFFLINE_STORAGE_KEY, bounded);
      }
    } catch (err) {
      console.warn('[usageTelemetryService] Failed to persist offline events:', err);
    }
  }

  _drainOfflineIntoQueue() {
    try {
      const stored = safeGetStorageJson(OFFLINE_STORAGE_KEY, []);
      if (Array.isArray(stored) && stored.length > 0) {
        const existingIds = new Set(this._queue.map((e) => e.eventId));
        const newFromStorage = stored.filter((e) => !existingIds.has(e.eventId));
        // Prepend stored offline events ahead of current queue
        this._queue = [...newFromStorage, ...this._queue];
        // Enforce capacity limit
        if (this._queue.length > RING_BUFFER_CAPACITY) {
          this._queue = this._queue.slice(-RING_BUFFER_CAPACITY);
        }
        this._clearOfflineStorage();
      }
    } catch (err) {
      console.warn('[usageTelemetryService] Error draining offline events:', err);
    }
  }

  _clearOfflineStorage() {
    safeRemoveStorageItem(OFFLINE_STORAGE_KEY);
  }

  // ==========================================================================
  // Lifecycle Listeners
  // ==========================================================================

  _initLifecycleListeners() {
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('beforeunload', this._onBeforeUnload);
      window.addEventListener('online', this._onOnline);
    }
  }

  _handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.flush().catch(() => {});
    }
  }

  _handleBeforeUnload() {
    if (this._queue.length > 0) {
      this._persistOffline();
    }
  }

  _handleOnline() {
    // When returning online, flush pending queue and recovered offline items
    Promise.resolve().then(() => this.flush()).catch(() => {});
  }

  _startFlushInterval() {
    if (typeof setInterval !== 'undefined') {
      this._flushIntervalId = setInterval(() => {
        if (this._queue.length > 0) {
          this.flush().catch((err) => {
            console.warn('[usageTelemetryService] Periodic flush error:', err);
          });
        }
      }, FLUSH_INTERVAL_MS);
    }
  }

  // ==========================================================================
  // Reset & Teardown
  // ==========================================================================

  /**
   * Clears in-memory buffer, history, deduplication cache, and offline storage.
   */
  clear() {
    this._queue = [];
    this._ringBuffer = [];
    this._dedupMap.clear();
    this._retryCount = 0;
    this._isOnlineOverride = null;
    this._clearOfflineStorage();
    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = null;
    }
  }

  /**
   * Destroys timers and event listeners for clean shutdown.
   */
  destroy() {
    this.clear();

    if (this._flushIntervalId) {
      clearInterval(this._flushIntervalId);
      this._flushIntervalId = null;
    }

    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
      window.removeEventListener('online', this._onOnline);
    }
  }
}

// Export singleton instance as default and named export
export const usageTelemetryService = new UsageTelemetryService();
export default usageTelemetryService;
