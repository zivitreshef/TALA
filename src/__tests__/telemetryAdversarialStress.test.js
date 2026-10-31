import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UsageTelemetryService,
  OFFLINE_STORAGE_KEY,
  RING_BUFFER_CAPACITY,
  MAX_OFFLINE_EVENTS,
  DEDUP_WINDOW_MS
} from '../services/usageTelemetryService.js';
import {
  isProhibitedKey,
  scrubPiiFromString,
  sanitizeProperties,
  sanitizeTelemetryPayload
} from '../domain/telemetryPrivacy.js';
import {
  TELEMETRY_EVENTS,
  TELEMETRY_CATEGORIES,
  isValidEventName
} from '../domain/telemetryTaxonomy.js';
import {
  computeTelemetryAnalytics,
  computeFeatureAdoption,
  computeOnboardingFunnel,
  computeUxFrictionMetrics,
  computeCohortRetention
} from '../domain/telemetryAggregator.js';

describe('Adversarial Coverage Hardening & Stress Testing (Challenger Gate)', () => {
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

  // ==========================================================================
  // Area 1: Adversarial PII Assault
  // ==========================================================================
  describe('Area 1: Adversarial PII Assault & Mathematical Redaction', () => {
    it('CHALLENGE-1: drops or redacts property keys written in Hebrew (e.g. שם, תעודת_זהות, אבחון, הערות)', () => {
      const payload = sanitizeTelemetryPayload(TELEMETRY_EVENTS.STUDENT_CREATED, {
        שם: 'יוסי כהן',
        תעודת_זהות: '123456789',
        אבחון: 'אוטיזם בתפקוד גבוה',
        הערות: 'הערה אישית וסודית'
      });

      expect(payload).not.toBeNull();
      // Zero-Trust: Hebrew names, diagnoses, and notes must never pass into properties
      expect(payload.properties['שם']).toBeUndefined();
      expect(payload.properties['תעודת_זהות']).toBeUndefined();
      expect(payload.properties['אבחון']).toBeUndefined();
      expect(payload.properties['הערות']).toBeUndefined();
    });

    it('CHALLENGE-2: scrubs Israeli ID numbers formatted with separators (hyphens, spaces)', () => {
      const withHyphen8Plus1 = scrubPiiFromString('תעודת זהות 12345678-9 עודכנה');
      const withHyphen3x3 = scrubPiiFromString('ID: 123-456-789');
      const withSpaces = scrubPiiFromString('ID: 123 456 789');

      expect(withHyphen8Plus1).toContain('[REDACTED_ID]');
      expect(withHyphen8Plus1).not.toContain('12345678-9');

      expect(withHyphen3x3).toContain('[REDACTED_ID]');
      expect(withHyphen3x3).not.toContain('123-456-789');

      expect(withSpaces).toContain('[REDACTED_ID]');
      expect(withSpaces).not.toContain('123 456 789');
    });

    it('CHALLENGE-3: blocks compound clinical, medical, assessment, profile, and note property keys', () => {
      const raw = {
        clinical_note: 'ADHD diagnosis details',
        medical_history: 'epilepsy records',
        student_profile: 'special education band 3',
        assessment_score: 'low scores in reading',
        teacher_notes: 'confidential teacher observations'
      };

      const cleaned = sanitizeProperties(raw);

      expect(cleaned.clinical_note).toBeUndefined();
      expect(cleaned.medical_history).toBeUndefined();
      expect(cleaned.student_profile).toBeUndefined();
      expect(cleaned.assessment_score).toBeUndefined();
      expect(cleaned.teacher_notes).toBeUndefined();
    });

    it('sanitizes deeply nested objects, arrays, functions, and prototype poisoning attempts', () => {
      const malicious = {
        valid_feature: 'goals_bank',
        __proto__: { admin: true },
        constructor: { prototype: { hacked: true } },
        deepNested: {
          level1: {
            level2: {
              studentName: 'דני לוי',
              tz: '987654321'
            }
          }
        },
        records: [
          { name: 'יוסי', id: '111222333' }
        ],
        callback: () => 'leak'
      };

      const cleaned = sanitizeProperties(malicious);
      expect(cleaned.valid_feature).toBe('goals_bank');
      expect(cleaned.deepNested).toBeUndefined();
      expect(cleaned.records).toBeUndefined();
      expect(cleaned.callback).toBeUndefined();
      expect(cleaned.admin).toBeUndefined();
      expect(cleaned.hacked).toBeUndefined();
    });

    it('clamps strings to 100 characters max and scrubs PII before clamping', () => {
      const padding = 'X'.repeat(50);
      const raw = {
        context: `${padding} email: teacher@school.org ${padding}`
      };
      const cleaned = sanitizeProperties(raw);
      expect(cleaned.context).toContain('[REDACTED_EMAIL]');
      expect(cleaned.context.length).toBeLessThanOrEqual(100);
      expect(cleaned.context).not.toContain('teacher@school.org');
    });
  });

  // ==========================================================================
  // Area 2: Quota & Offline Stress
  // ==========================================================================
  describe('Area 2: Quota & Offline Stress', () => {
    it('strictly caps in-memory ring buffer to 100 items under 1,000 burst events (FIFO eviction)', () => {
      for (let i = 0; i < 1000; i++) {
        service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: `feat_${i}` });
      }

      const ring = service.getRingBuffer();
      expect(ring.length).toBe(100);
      // Oldest events evicted; latest 100 retained
      expect(ring[0].properties.feature).toBe('feat_900');
      expect(ring[99].properties.feature).toBe('feat_999');
    });

    it('strictly caps offline storage queue to 50 items under offline burst (FIFO eviction)', () => {
      service.setIsOnline(false);

      for (let i = 0; i < 200; i++) {
        service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: `offline_${i}` });
      }

      // Trigger flush while offline to trigger offline persistence
      service.flush();

      const rawStored = mockStorageStore[OFFLINE_STORAGE_KEY];
      expect(rawStored).toBeDefined();
      const stored = JSON.parse(rawStored);
      expect(stored.length).toBeLessThanOrEqual(MAX_OFFLINE_EVENTS);

      // Verify FIFO: oldest evicted, newest preserved
      const latest = stored[stored.length - 1];
      expect(latest.properties.feature).toBe('offline_199');
    });

    it('never throws or interrupts application when localStorage.setItem throws QuotaExceededError', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw quotaError;
      });

      service.setIsOnline(false);

      expect(() => {
        for (let i = 0; i < 60; i++) {
          service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: `burst_${i}` });
        }
        service.flush();
      }).not.toThrow();
    });

    it('gracefully handles private browsing where localStorage access throws SecurityError', () => {
      vi.stubGlobal('window', {
        get localStorage() {
          throw new DOMException('SecurityError', 'SecurityError');
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const privateService = new UsageTelemetryService();
      privateService.setIsOnline(false);

      expect(() => {
        privateService.track(TELEMETRY_EVENTS.SESSION_START, { screen: 'home' });
        privateService.flush();
      }).not.toThrow();

      privateService.destroy();
    });

    it('recovers cleanly when localStorage contains corrupted JSON string', () => {
      mockStorageStore[OFFLINE_STORAGE_KEY] = 'CORRUPTED_{{{JSON_DATA_MALFORMED';
      service.setIsOnline(true);

      expect(() => {
        service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'dashboard' });
        service.flush();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Area 3: Network Interruption & Transport Concurrency
  // ==========================================================================
  describe('Area 3: Network Interruption & Concurrency', () => {
    it('suppresses duplicate events within 2000ms deduplication window', () => {
      const ok1 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'reports' });
      const ok2 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'reports' });

      expect(ok1).toBe(true);
      expect(ok2).toBe(false); // Dedup suppressed
      expect(service.getBufferSize()).toBe(1);

      // After DEDUP_WINDOW_MS, same event should be accepted again
      vi.advanceTimersByTime(DEDUP_WINDOW_MS + 10);
      const ok3 = service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'reports' });
      expect(ok3).toBe(true);
      expect(service.getBufferSize()).toBe(2);
    });

    it('enforces mutex locking: concurrent flush calls do not cause duplicate dispatches', async () => {
      let dispatchCount = 0;
      service.setTransport(async () => {
        dispatchCount++;
        return true;
      });

      service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: 'chat' });

      const [r1, r2, r3] = await Promise.all([
        service.flush(),
        service.flush(),
        service.flush()
      ]);

      expect(dispatchCount).toBe(1);
      expect([r1, r2, r3].filter(Boolean).length).toBe(1);
    });

    it('CHALLENGE-4: does not drop newly enqueued in-flight events when async batch flush completes under burst', async () => {
      let sentEvents = [];
      service.setTransport(async (batch) => {
        sentEvents = [...batch];
        // Simulate async network latency
        await new Promise((resolve) => setTimeout(resolve, 50));
        return true;
      });

      // 1. Initial 50 events in queue
      for (let i = 0; i < 50; i++) {
        service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: `initial_${i}` });
      }

      // 2. Start flushing initial 50
      const flushPromise = service.flush();

      // 3. While transport is awaiting in-flight, burst 100 new events into the queue
      for (let i = 0; i < 100; i++) {
        service.track(TELEMETRY_EVENTS.FEATURE_VIEW, { feature: `burst_in_flight_${i}` });
      }

      // 4. Advance fake timers to resolve network transport
      await vi.advanceTimersByTimeAsync(100);
      await flushPromise;

      const remainingQueue = service.getQueue();
      const initialFeatures = sentEvents.map((e) => e.properties.feature);
      const remainingFeatures = remainingQueue.map((e) => e.properties.feature);

      expect(initialFeatures.length).toBe(50);

      // CRITICAL CHECK: None of the in-flight events should have been deleted by splice()
      // The first in-flight event burst_in_flight_0 must NOT be silently lost!
      const allBursts = [];
      for (let i = 0; i < 100; i++) allBursts.push(`burst_in_flight_${i}`);

      const anyLost = allBursts.some(
        (bf) => !remainingFeatures.includes(bf) && !initialFeatures.includes(bf)
      );

      expect(anyLost).toBe(false);
    });
  });

  // ==========================================================================
  // Area 4: Aggregator Stress & Boundary Hardening
  // ==========================================================================
  describe('Area 4: Aggregator Stress & Edge Cases', () => {
    it('safely handles null, undefined, non-array inputs without throwing', () => {
      expect(() => computeTelemetryAnalytics(null)).not.toThrow();
      expect(() => computeTelemetryAnalytics(undefined)).not.toThrow();
      expect(() => computeTelemetryAnalytics('invalid_string')).not.toThrow();
      expect(() => computeTelemetryAnalytics({})).not.toThrow();
      expect(() => computeTelemetryAnalytics(42)).not.toThrow();
    });

    it('CHALLENGE-5: computeFeatureAdoption does NOT crash with TypeError when events lack eventName', () => {
      const corruptEvents = [
        null,
        undefined,
        {},
        { properties: { feature: 'test' } },
        { eventName: null },
        { eventName: undefined },
        { eventName: 12345 }
      ];

      expect(() => {
        computeFeatureAdoption(corruptEvents);
      }).not.toThrow();

      expect(() => {
        computeTelemetryAnalytics(corruptEvents);
      }).not.toThrow();
    });

    it('CHALLENGE-6: computeOnboardingFunnel counts steps when events provide stepIndex per taxonomy schema', () => {
      const stepEvents = [
        { eventName: TELEMETRY_EVENTS.ONBOARDING_STARTED, properties: {} },
        { eventName: TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, properties: { stepIndex: 1 } },
        { eventName: TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, properties: { stepIndex: 2 } },
        { eventName: TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, properties: { stepIndex: 3 } }
      ];

      const funnel = computeOnboardingFunnel(stepEvents);
      expect(funnel).toBeDefined();

      const step1 = funnel.steps.find((s) => s.stepNumber === 1);
      const step2 = funnel.steps.find((s) => s.stepNumber === 2);
      const step3 = funnel.steps.find((s) => s.stepNumber === 3);

      expect(step1.count).toBeGreaterThan(0);
      expect(step2.count).toBeGreaterThan(0);
      expect(step3.count).toBeGreaterThan(0);
    });

    it('computeUxFrictionMetrics safely handles NaN, Infinity, and negative latencies', () => {
      const latEvents = [
        { eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED, properties: { latencyMs: NaN } },
        { eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED, properties: { latencyMs: Infinity } },
        { eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED, properties: { latencyMs: -500 } },
        { eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED, properties: { latencyMs: 1200 } }
      ];

      const friction = computeUxFrictionMetrics(latEvents);
      expect(Number.isNaN(friction.avgLatency)).toBe(false);
      expect(Number.isFinite(friction.avgLatency)).toBe(true);
      expect(Number.isNaN(friction.p50)).toBe(false);
      expect(Number.isNaN(friction.p95)).toBe(false);
    });

    it('computeCohortRetention handles extreme future and negative timestamps safely', () => {
      const cohortEvents = [
        { anonUserId: 'user_past', timestampMs: -1000000 },
        { anonUserId: 'user_future', timestampMs: Date.now() + 1000000000 },
        { anonUserId: 'user_nan', timestampMs: NaN },
        { anonUserId: 'user_string', timestampMs: 'invalid' }
      ];

      expect(() => {
        computeCohortRetention(cohortEvents);
      }).not.toThrow();
    });
  });
});
