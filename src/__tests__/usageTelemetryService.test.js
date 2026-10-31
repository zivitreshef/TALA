import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UsageTelemetryService,
  OFFLINE_STORAGE_KEY,
  RING_BUFFER_CAPACITY,
  MAX_OFFLINE_EVENTS,
  BATCH_SIZE,
  DEDUP_WINDOW_MS,
  MAX_RETRIES,
  MAX_BACKOFF_MS
} from '../services/usageTelemetryService.js';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy.js';
import { safeGetStorageJson, safeSetStorageJson, safeRemoveStorageItem } from '../services/storage.js';

describe('Centralized Usage Telemetry Service (F1, F5, F6)', () => {
  let service;
  let mockStorageStore = {};
  let mockLocalStorage;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorageStore = {};
    mockLocalStorage = {
      getItem: vi.fn((key) => (key in mockStorageStore ? mockStorageStore[key] : null)),
      setItem: vi.fn((key, val) => {
        mockStorageStore[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorageStore[key];
      }),
      clear: vi.fn(() => {
        mockStorageStore = {};
      })
    };

    vi.stubGlobal('window', {
      localStorage: mockLocalStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    service = new UsageTelemetryService();
    service.clear();
    // Stop periodic background flush to avoid interference during timer manipulation
    if (service._flushIntervalId) {
      clearInterval(service._flushIntervalId);
      service._flushIntervalId = null;
    }
  });

  afterEach(() => {
    service.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('Tier 1: Core Service Operations & Lifecycle', () => {
    it('initializes with expected default configurations', () => {
      expect(service.isEnabled()).toBe(true);
      expect(service.getSamplingRate()).toBe(1.0);
      expect(service.getExcludeInternalAccounts()).toBe(false);
      expect(service.getBufferSize()).toBe(0);
      expect(service.getRingBuffer()).toEqual([]);
      expect(service.getUserContext()).toBeNull();
    });

    it('enqueues valid events to both queue and ring buffer', () => {
      const ok = service.track(TELEMETRY_EVENTS.SESSION_START, { screen: 'home' });
      expect(ok).toBe(true);
      expect(service.getBufferSize()).toBe(1);

      const ring = service.getRingBuffer();
      expect(ring.length).toBe(1);
      expect(ring[0].eventName).toBe('session_start');
      expect(ring[0].properties.screen).toBe('home');
      expect(ring[0].anonUserId).toBeDefined();
    });

    it('flushes queued events to the registered transport function', async () => {
      const transportMock = vi.fn().mockResolvedValue(true);
      service.setTransport(transportMock);

      service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: 'goals_bank' });
      service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: 'daily_tracking' });

      expect(service.getBufferSize()).toBe(2);

      const flushResult = await service.flush();
      expect(flushResult).toBe(true);
      expect(transportMock).toHaveBeenCalledTimes(1);

      const batchSent = transportMock.mock.calls[0][0];
      expect(batchSent.length).toBe(2);
      expect(batchSent[0].properties.feature).toBe('goals_bank');
      expect(batchSent[1].properties.feature).toBe('daily_tracking');

      // Queue is cleared after successful dispatch
      expect(service.getBufferSize()).toBe(0);
      // Ring buffer retains history
      expect(service.getRingBuffer().length).toBe(2);
    });

    it('triggers automatic batch flush when buffer reaches BATCH_SIZE (15 events)', async () => {
      const transportMock = vi.fn().mockResolvedValue(true);
      service.setTransport(transportMock);

      for (let i = 0; i < BATCH_SIZE - 1; i++) {
        service.track(TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, { stepIndex: i });
      }
      expect(service.getBufferSize()).toBe(BATCH_SIZE - 1);
      expect(transportMock).not.toHaveBeenCalled();

      // Track the 15th event to trigger auto-flush
      service.track(TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, { stepIndex: BATCH_SIZE - 1 });

      // Allow microtask resolution
      await Promise.resolve();
      await Promise.resolve();

      expect(transportMock).toHaveBeenCalledTimes(1);
      expect(transportMock.mock.calls[0][0].length).toBe(BATCH_SIZE);
      expect(service.getBufferSize()).toBe(0);
    });

    it('propagates user context to tracked events', () => {
      service.setUserContext({ email: 'teacher.miriam@school.k12.il', role: 'teacher' });

      service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'students_list' });

      const ring = service.getRingBuffer();
      expect(ring.length).toBe(1);
      expect(ring[0].accountType).toBe('teacher');
      expect(ring[0].anonUserId).toMatch(/^[0-9a-f]{64}$/);
    });

    it('clears queues, history, and storage on clear()', () => {
      service.track(TELEMETRY_EVENTS.SESSION_START);
      expect(service.getBufferSize()).toBe(1);
      expect(service.getRingBuffer().length).toBe(1);

      service.clear();
      expect(service.getBufferSize()).toBe(0);
      expect(service.getRingBuffer().length).toBe(0);
    });
  });

  describe('Tier 2: Boundaries, Edge Cases & Deduplication', () => {
    it('enforces ring buffer capacity limit (100 events) with FIFO eviction', () => {
      for (let i = 0; i < RING_BUFFER_CAPACITY + 25; i++) {
        service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: `screen_${i}` });
      }

      const ring = service.getRingBuffer();
      expect(ring.length).toBe(RING_BUFFER_CAPACITY);
      // Oldest 25 events (0..24) were evicted; oldest remaining is screen_25
      expect(ring[0].properties.screen).toBe('screen_25');
      // Most recent is screen_124
      expect(ring[RING_BUFFER_CAPACITY - 1].properties.screen).toBe('screen_124');
    });

    it('suppresses identical events within the 2000ms deduplication window', () => {
      const ok1 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'dashboard' });
      expect(ok1).toBe(true);

      // Immediate duplicate call with same event and properties
      const ok2 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'dashboard' });
      expect(ok2).toBe(false);
      expect(service.getBufferSize()).toBe(1);

      // Call with different properties is allowed
      const ok3 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'settings' });
      expect(ok3).toBe(true);
      expect(service.getBufferSize()).toBe(2);

      // Advance clock past 2000ms deduplication window
      vi.advanceTimersByTime(DEDUP_WINDOW_MS + 100);

      // Now the original event is permitted again
      const ok4 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'dashboard' });
      expect(ok4).toBe(true);
      expect(service.getBufferSize()).toBe(3);
    });

    it('respects samplingRate configuration', () => {
      // 0% sampling drops all events
      service.setSamplingRate(0.0);
      const res1 = service.track(TELEMETRY_EVENTS.SESSION_START);
      expect(res1).toBe(false);
      expect(service.getBufferSize()).toBe(0);

      // Clamps invalid inputs
      service.setSamplingRate(1.5);
      expect(service.getSamplingRate()).toBe(1.0);

      service.setSamplingRate(-0.5);
      expect(service.getSamplingRate()).toBe(0.0);

      service.setSamplingRate('invalid');
      expect(service.getSamplingRate()).toBe(1.0);
    });

    it('drops events when service is disabled via setEnabled(false)', () => {
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);

      const ok = service.track(TELEMETRY_EVENTS.SESSION_START);
      expect(ok).toBe(false);
      expect(service.getBufferSize()).toBe(0);

      service.setEnabled(true);
      const okAfter = service.track(TELEMETRY_EVENTS.SESSION_START);
      expect(okAfter).toBe(true);
      expect(service.getBufferSize()).toBe(1);
    });

    it('discards invalid event names that do not belong to taxonomy', () => {
      const ok = service.track('random_fake_event', { foo: 'bar' });
      expect(ok).toBe(false);
      expect(service.getBufferSize()).toBe(0);
    });

    it('guarantees safe, non-blocking execution when transport throws', async () => {
      const throwingTransport = vi.fn().mockRejectedValue(new Error('Network crash'));
      service.setTransport(throwingTransport);

      service.track(TELEMETRY_EVENTS.SESSION_START);

      // flush() must catch internal errors and return false without throwing
      let didThrow = false;
      let flushResult = false;
      try {
        flushResult = await service.flush();
      } catch {
        didThrow = true;
      }

      expect(didThrow).toBe(false);
      expect(flushResult).toBe(false);
      expect(throwingTransport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tier 3: Admin & Test Account Exclusion (F6)', () => {
    it('omits events from admin and test accounts when excludeInternalAccounts is true', () => {
      service.setExcludeInternalAccounts(true);
      expect(service.getExcludeInternalAccounts()).toBe(true);

      // Admin user
      service.setUserContext({ role: 'admin', email: 'admin@tala.education' });
      const adminTracked = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'admin' });
      expect(adminTracked).toBe(false);
      expect(service.getBufferSize()).toBe(0);

      // Internal test account
      service.setUserContext({ isTest: true, email: 'runner@test.local' });
      const testTracked = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'goals' });
      expect(testTracked).toBe(false);
      expect(service.getBufferSize()).toBe(0);

      // Real teacher account is tracked
      service.setUserContext({ role: 'teacher', email: 'teacher.hila@school.k12.il' });
      const teacherTracked = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'goals' });
      expect(teacherTracked).toBe(true);
      expect(service.getBufferSize()).toBe(1);
    });

    it('includes all accounts when excludeInternalAccounts is false (default)', () => {
      service.setExcludeInternalAccounts(false);
      service.setUserContext({ role: 'admin', email: 'admin@tala.education' });

      const adminTracked = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'admin' });
      expect(adminTracked).toBe(true);
      expect(service.getBufferSize()).toBe(1);
      expect(service.getRingBuffer()[0].accountType).toBe('admin');
    });
  });

  describe('Tier 3 & Tier 4: Offline Queue & Recovery Scenario S4', () => {
    it('Scenario S4: Network Interruption, Offline Bounded Queue & Batch Recovery', async () => {
      const transportMock = vi.fn().mockResolvedValue(true);
      service.setTransport(transportMock);

      // Step 1: Teacher tracks events while online
      service.track(TELEMETRY_EVENTS.SESSION_START);
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, { mode: 'text', isEdit: false });
      expect(service.getBufferSize()).toBe(2);

      // Step 2: Network goes offline
      vi.spyOn(service, 'isOnline').mockReturnValue(false);

      // Flush called while offline
      const offlineFlush = await service.flush();
      expect(offlineFlush).toBe(false);
      expect(transportMock).not.toHaveBeenCalled();

      // Verify events were persisted to offline storage
      const offlineEvents = safeGetStorageJson(OFFLINE_STORAGE_KEY, []);
      expect(offlineEvents.length).toBe(2);
      expect(offlineEvents[0].eventName).toBe('session_start');
      expect(offlineEvents[1].eventName).toBe('daily_tracking_entry_started');

      // Step 3: Teacher continues actions offline
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 85,
        isEdit: false,
        streakDays: 3
      });
      expect(service.getBufferSize()).toBe(1);
      expect(safeGetStorageJson(OFFLINE_STORAGE_KEY, []).length).toBe(2);

      // Step 4: Network is restored
      vi.spyOn(service, 'isOnline').mockReturnValue(true);

      // Step 5: Flush triggers batch recovery
      const onlineFlush = await service.flush();
      expect(onlineFlush).toBe(true);
      expect(transportMock).toHaveBeenCalledTimes(1);

      const dispatchedBatch = transportMock.mock.calls[0][0];
      expect(dispatchedBatch.length).toBeGreaterThanOrEqual(3);

      // Offline storage is drained
      const remainingOffline = safeGetStorageJson(OFFLINE_STORAGE_KEY, []);
      expect(remainingOffline.length).toBe(0);
      expect(service.getBufferSize()).toBe(0);
    });

    it('enforces maximum offline storage bound (MAX_OFFLINE_EVENTS = 50) with FIFO eviction', () => {
      // Simulate 65 events while offline
      vi.spyOn(service, 'isOnline').mockReturnValue(false);

      for (let i = 0; i < MAX_OFFLINE_EVENTS + 15; i++) {
        service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: `feat_${i}` });
      }

      service._persistOffline();

      const stored = safeGetStorageJson(OFFLINE_STORAGE_KEY, []);
      expect(stored.length).toBe(MAX_OFFLINE_EVENTS);
      // Oldest 15 events (0..14) evicted; oldest stored is feat_15
      expect(stored[0].properties.feature).toBe('feat_15');
      // Latest is feat_64
      expect(stored[MAX_OFFLINE_EVENTS - 1].properties.feature).toBe('feat_64');
    });

    it('persists queue to offline storage when retries exceed MAX_RETRIES', async () => {
      const failingTransport = vi.fn().mockRejectedValue(new Error('Repeated server 500'));
      service.setTransport(failingTransport);

      service.track(TELEMETRY_EVENTS.REPORT_GENERATED);

      // Retries 1..3
      for (let i = 1; i <= MAX_RETRIES; i++) {
        await service.flush();
        expect(service._retryCount).toBe(i);
        // Advance timers by backoff delay to allow scheduled retry without recursive runaway
        vi.advanceTimersByTime(MAX_BACKOFF_MS);
      }

      // 4th flush attempt: retryCount was 3, fails again -> retryCount becomes 4 (> MAX_RETRIES)
      // -> persists offline and clears queue
      await service.flush();

      const offlineStored = safeGetStorageJson(OFFLINE_STORAGE_KEY, []);
      expect(offlineStored.length).toBe(1);
      expect(offlineStored[0].eventName).toBe('report_generated');
      expect(service.getBufferSize()).toBe(0);
    });
  });
});
