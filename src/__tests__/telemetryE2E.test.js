import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UsageTelemetryService,
  OFFLINE_STORAGE_KEY,
  BATCH_SIZE
} from '../services/usageTelemetryService.js';
import {
  TELEMETRY_EVENTS,
  TELEMETRY_CATEGORIES,
  isValidEventName,
  getEventCategory
} from '../domain/telemetryTaxonomy.js';
import {
  sanitizeTelemetryPayload,
  getAnonUserId,
  classifyAccount,
  isInternalAccount,
  isProhibitedKey,
  scrubPiiFromString
} from '../domain/telemetryPrivacy.js';
import { safeGetStorageJson, safeRemoveStorageItem } from '../services/storage.js';

describe('Comprehensive Telemetry E2E Test Suite (Tiers 1-4 for F1-F18)', () => {
  let service;
  let dispatchedBatches = [];
  let mockStorageStore = {};
  let mockLocalStorage;

  beforeEach(() => {
    vi.useFakeTimers();
    dispatchedBatches = [];
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

    // Default mock transport capturing dispatched batches
    service.setTransport(async (batch) => {
      dispatchedBatches.push([...batch]);
      return true;
    });
  });

  afterEach(() => {
    service.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Tier 1: Comprehensive Workflow Coverage across All Modules
  // ==========================================================================
  describe('Tier 1: Comprehensive Module Workflows', () => {
    it('F12: instruments complete 10-step Onboarding Journey', async () => {
      service.setUserContext({ email: 'new_teacher@school.k12.il' });

      // Start onboarding
      expect(service.track(TELEMETRY_EVENTS.ONBOARDING_STARTED)).toBe(true);

      // Step through all 10 steps (0 to 9)
      for (let step = 0; step < 10; step++) {
        expect(service.track(TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, { stepIndex: step })).toBe(true);
        vi.advanceTimersByTime(2100); // Pass deduplication window
      }

      // Complete onboarding
      expect(service.track(TELEMETRY_EVENTS.ONBOARDING_COMPLETED)).toBe(true);

      await service.flush();
      expect(dispatchedBatches.length).toBeGreaterThanOrEqual(1);

      const allEvents = dispatchedBatches.flat();
      expect(allEvents[0].eventName).toBe('onboarding_started');
      expect(allEvents[allEvents.length - 1].eventName).toBe('onboarding_completed');

      const stepEvents = allEvents.filter((e) => e.eventName === 'onboarding_step_completed');
      expect(stepEvents.length).toBe(10);
      stepEvents.forEach((evt, idx) => {
        expect(evt.properties.stepIndex).toBe(idx);
        expect(evt.category).toBe(TELEMETRY_CATEGORIES.ONBOARDING);
      });
    });

    it('F16: instruments Daily Pedagogical Tracking with voice/text, duration, and streaks', async () => {
      service.setUserContext({ email: 'tracking_teacher@school.k12.il' });

      // 1. Text entry started
      expect(service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'text',
        isEdit: false
      })).toBe(true);

      vi.advanceTimersByTime(2100);

      // 2. Text entry completed
      expect(service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 90,
        isEdit: false,
        streakDays: 4
      })).toBe(true);

      vi.advanceTimersByTime(2100);

      // 3. Streak recorded
      expect(service.track(TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED, {
        currentStreakDays: 4
      })).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(3);
      expect(events[1].properties.durationSec).toBe(90);
      expect(events[1].properties.streakDays).toBe(4);
      expect(events[1].category).toBe(TELEMETRY_CATEGORIES.DAILY_TRACKING);
    });

    it('F17: instruments Pedagogical Summary and Staff Meeting Readiness', async () => {
      service.setUserContext({ email: 'counselor@school.k12.il' });

      // 1. Staff readiness checklist verified
      expect(service.track(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED, {
        itemsCompletedCount: 5,
        isFullyReady: true
      })).toBe(true);

      vi.advanceTimersByTime(2100);

      // 2. Pedagogical summary generated
      expect(service.track(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'staff_meeting',
        studentCountBand: '6-15'
      })).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(2);
      expect(events[0].properties.isFullyReady).toBe(true);
      expect(events[1].properties.summaryType).toBe('staff_meeting');
      expect(events[1].properties.studentCountBand).toBe('6-15');
      expect(events[1].category).toBe(TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY);
    });

    it('F18: instruments Document Sharing and Pedagogical Chat without sensitive text', async () => {
      service.setUserContext({ email: 'teacher@school.k12.il' });

      // Document shared via WhatsApp link
      expect(service.track(TELEMETRY_EVENTS.DOCUMENT_SHARED, {
        format: 'pdf',
        channel: 'whatsapp_link'
      })).toBe(true);

      vi.advanceTimersByTime(2100);

      // Pedagogical chat session started
      expect(service.track(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED, {
        triggerSource: 'floating_dock'
      })).toBe(true);

      vi.advanceTimersByTime(2100);

      // Tool discovered in chat
      expect(service.track(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED, {
        toolType: 'goal_suggester'
      })).toBe(true);

      vi.advanceTimersByTime(2100);

      // Chat session ended (metrics only: durationSec, turnsCount)
      expect(service.track(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED, {
        durationSec: 140,
        turnsCount: 4
      })).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(4);
      events.forEach((evt) => {
        expect(evt.category).toBe(TELEMETRY_CATEGORIES.SHARING_AND_CHAT);
        // Verify strictly zero chat message or prompt text
        expect(evt.properties.message).toBeUndefined();
        expect(evt.properties.prompt).toBeUndefined();
        expect(evt.properties.content).toBeUndefined();
      });
    });

    it('F13: instruments Technical Health (errors, latencies, load times)', async () => {
      expect(service.track(TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, { loadTimeMs: 850 })).toBe(true);
      vi.advanceTimersByTime(2100);

      expect(service.track(TELEMETRY_EVENTS.AI_LATENCY_RECORDED, { durationMs: 420 })).toBe(true);
      vi.advanceTimersByTime(2100);

      expect(service.track(TELEMETRY_EVENTS.API_OPERATION_FAILED, { endpoint: '/api/v1/sync' })).toBe(true);
      vi.advanceTimersByTime(2100);

      expect(service.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, { errorType: 'TypeError' })).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(4);
      events.forEach((evt) => {
        expect(evt.category).toBe(TELEMETRY_CATEGORIES.TECHNICAL_HEALTH);
      });
    });

    it('F10: instruments UX Friction (dirty form abandonment, repeated failures, observation gaps)', async () => {
      expect(service.track(TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED, { formId: 'iep_goals_form' })).toBe(true);
      vi.advanceTimersByTime(2100);

      expect(service.track(TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY, {
        action: 'save_document',
        attemptCount: 3
      })).toBe(true);
      vi.advanceTimersByTime(2100);

      expect(service.track(TELEMETRY_EVENTS.OBSERVATION_GAP_DETECTED, { daysSinceLastObservation: 14 })).toBe(true);
      vi.advanceTimersByTime(2100);

      expect(service.track(TELEMETRY_EVENTS.SEARCH_ZERO_RESULTS, { queryLength: 8 })).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(4);
      events.forEach((evt) => {
        expect(evt.category).toBe(TELEMETRY_CATEGORIES.FRICTION);
      });
    });
  });

  // ==========================================================================
  // Tier 2: Boundary Value Analysis & Edge Cases across Workflows
  // ==========================================================================
  describe('Tier 2: Boundary Value Analysis & Edge Conditions', () => {
    it('handles zero-duration and zero-streak boundaries gracefully', async () => {
      expect(service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 0,
        isEdit: false,
        streakDays: 0
      })).toBe(true);

      await service.flush();
      const event = dispatchedBatches.flat()[0];
      expect(event.properties.durationSec).toBe(0);
      expect(event.properties.streakDays).toBe(0);
    });

    it('handles high streak and duration values correctly', async () => {
      expect(service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 3600,
        isEdit: true,
        streakDays: 180
      })).toBe(true);

      await service.flush();
      const event = dispatchedBatches.flat()[0];
      expect(event.properties.durationSec).toBe(3600);
      expect(event.properties.streakDays).toBe(180);
    });

    it('handles largest studentCountBand "16+" for summaries', async () => {
      expect(service.track(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'periodic_review',
        studentCountBand: '16+'
      })).toBe(true);

      await service.flush();
      const event = dispatchedBatches.flat()[0];
      expect(event.properties.studentCountBand).toBe('16+');
    });

    it('handles onboarding dismissal without completing any steps', async () => {
      expect(service.track(TELEMETRY_EVENTS.ONBOARDING_STARTED)).toBe(true);
      vi.advanceTimersByTime(2100);
      expect(service.track(TELEMETRY_EVENTS.ONBOARDING_DISMISSED)).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(2);
      expect(events[1].eventName).toBe('onboarding_dismissed');
    });
  });

  // ==========================================================================
  // Tier 3: Cross-Feature Category Pairwise Combinations
  // ==========================================================================
  describe('Tier 3: Pairwise Category Ingestion & Ring Buffer Coherence', () => {
    it('tracks events across all 8 categories sequentially and preserves order in ring buffer', async () => {
      const categorySequence = [
        { evt: TELEMETRY_EVENTS.SESSION_START, cat: TELEMETRY_CATEGORIES.ENGAGEMENT },
        { evt: TELEMETRY_EVENTS.STUDENT_CREATED, cat: TELEMETRY_CATEGORIES.WORKFLOW },
        { evt: TELEMETRY_EVENTS.ONBOARDING_STARTED, cat: TELEMETRY_CATEGORIES.ONBOARDING },
        { evt: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, cat: TELEMETRY_CATEGORIES.DAILY_TRACKING },
        { evt: TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, cat: TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY },
        { evt: TELEMETRY_EVENTS.DOCUMENT_SHARED, cat: TELEMETRY_CATEGORIES.SHARING_AND_CHAT },
        { evt: TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED, cat: TELEMETRY_CATEGORIES.FRICTION },
        { evt: TELEMETRY_EVENTS.AI_LATENCY_RECORDED, cat: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH }
      ];

      categorySequence.forEach(({ evt }) => {
        expect(service.track(evt)).toBe(true);
        vi.advanceTimersByTime(2100);
      });

      const ring = service.getRingBuffer();
      expect(ring.length).toBe(8);

      categorySequence.forEach(({ evt, cat }, i) => {
        expect(ring[i].eventName).toBe(evt);
        expect(ring[i].category).toBe(cat);
      });
    });

    it('maintains distinct anonUserId hashes for distinct user accounts in the same session', async () => {
      service.setUserContext({ email: 'teacher_alpha@school.org' });
      service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'alpha_screen' });

      service.setUserContext({ email: 'teacher_beta@school.org' });
      service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'beta_screen' });

      const ring = service.getRingBuffer();
      expect(ring.length).toBe(2);
      expect(ring[0].anonUserId).not.toBe(ring[1].anonUserId);
    });
  });

  // ==========================================================================
  // Tier 4: Real-World Application Scenarios (S1 - S6)
  // ==========================================================================
  describe('Tier 4: Real-World Scenarios (S1 - S6)', () => {
    it('Scenario S1: New Teacher Complete Onboarding to First Student & Report', async () => {
      const teacherEmail = 'new.teacher.noa@school.k12.il';
      service.setUserContext({ email: teacherEmail, role: 'teacher' });

      // 1. Session start
      service.track(TELEMETRY_EVENTS.SESSION_START, { screen: 'welcome' });
      vi.advanceTimersByTime(2100);

      // 2. Onboarding flow
      service.track(TELEMETRY_EVENTS.ONBOARDING_STARTED);
      vi.advanceTimersByTime(2100);

      for (let s = 0; s < 5; s++) {
        service.track(TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED, { stepIndex: s });
        vi.advanceTimersByTime(2100);
      }
      service.track(TELEMETRY_EVENTS.ONBOARDING_COMPLETED);
      vi.advanceTimersByTime(2100);

      // 3. First student created
      service.track(TELEMETRY_EVENTS.STUDENT_CREATED);
      vi.advanceTimersByTime(2100);

      // 4. Discovers pedagogical chat goal tool
      service.track(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED, { triggerSource: 'student_form' });
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED, { toolType: 'goal_suggester' });
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED, { durationSec: 180, turnsCount: 5 });
      vi.advanceTimersByTime(2100);

      // 5. First goal created
      service.track(TELEMETRY_EVENTS.GOAL_CREATED);
      vi.advanceTimersByTime(2100);

      // 6. First report generated and shared
      service.track(TELEMETRY_EVENTS.REPORT_GENERATED);
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.DOCUMENT_SHARED, { format: 'pdf', channel: 'download' });
      vi.advanceTimersByTime(2100);

      // 7. Session ends
      service.track(TELEMETRY_EVENTS.SESSION_END);

      await service.flush();
      const allEvents = dispatchedBatches.flat();
      expect(allEvents.length).toBeGreaterThanOrEqual(14);

      // Verify stable pseudonymization across the entire journey
      const expectedAnonId = getAnonUserId(teacherEmail);
      allEvents.forEach((evt) => {
        expect(evt.anonUserId).toBe(expectedAnonId);
        expect(evt.accountType).toBe('teacher');
        expect(evt.sessionId).toBeDefined();
        // Absolutely zero PII
        expect(evt.properties.studentName).toBeUndefined();
        expect(evt.properties.studentId).toBeUndefined();
        expect(evt.properties.prompt).toBeUndefined();
      });
    });

    it('Scenario S2: Daily Pedagogical Tracking Week (Streaks, Voice vs Text, Edits)', async () => {
      service.setUserContext({ email: 'daily.tracker.ruth@school.k12.il' });

      // Day 1: Text entry completed (Streak 1)
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, { mode: 'text', isEdit: false });
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 110,
        isEdit: false,
        streakDays: 1
      });
      vi.advanceTimersByTime(2100);

      // Day 2: Voice entry completed (Streak 2)
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, { mode: 'voice', isEdit: false });
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 55,
        isEdit: false,
        streakDays: 2
      });
      vi.advanceTimersByTime(2100);

      // Day 3: Entry started but abandoned (phone call interruption)
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, { mode: 'text', isEdit: false });
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED, { mode: 'text', timeSpentSec: 25 });
      vi.advanceTimersByTime(2100);

      // Day 3 (later): Completed successfully (Streak 3)
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 80,
        isEdit: false,
        streakDays: 3
      });
      vi.advanceTimersByTime(2100);

      // Day 4: Voice entry edit (isEdit: true, Streak 4)
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 40,
        isEdit: true,
        streakDays: 4
      });
      vi.advanceTimersByTime(2100);

      // Day 5: Text entry (Streak 5)
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 75,
        isEdit: false,
        streakDays: 5
      });
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED, { currentStreakDays: 5 });

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(10);

      const completed = events.filter((e) => e.eventName === 'daily_tracking_entry_completed');
      expect(completed.length).toBe(5);

      const voiceEntries = completed.filter((e) => e.properties.mode === 'voice');
      const textEntries = completed.filter((e) => e.properties.mode === 'text');
      expect(voiceEntries.length).toBe(2);
      expect(textEntries.length).toBe(3);

      const abandoned = events.filter((e) => e.eventName === 'daily_tracking_entry_abandoned');
      expect(abandoned.length).toBe(1);
      expect(abandoned[0].properties.timeSpentSec).toBe(25);
    });

    it('Scenario S3: Staff Meeting Preparation & Summary Export Workflow', async () => {
      service.setUserContext({ email: 'special_ed_lead@school.k12.il' });

      // Step 1: Initial readiness check (incomplete)
      service.track(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED, {
        itemsCompletedCount: 3,
        isFullyReady: false
      });
      vi.advanceTimersByTime(2100);

      // Step 2: Final readiness check (complete)
      service.track(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED, {
        itemsCompletedCount: 6,
        isFullyReady: true
      });
      vi.advanceTimersByTime(2100);

      // Step 3: Pedagogical summary generation for staff meeting
      service.track(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'staff_meeting',
        studentCountBand: '6-15'
      });
      vi.advanceTimersByTime(2100);

      // Step 4: Document shared to print
      service.track(TELEMETRY_EVENTS.DOCUMENT_SHARED, {
        format: 'print',
        channel: 'download'
      });

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(4);
      expect(events[0].properties.isFullyReady).toBe(false);
      expect(events[1].properties.isFullyReady).toBe(true);
      expect(events[2].properties.summaryType).toBe('staff_meeting');
      expect(events[3].properties.format).toBe('print');
    });

    it('Scenario S4: Network Interruption, Offline Bounded Queue & Batch Recovery', async () => {
      // Step 1: Normal online tracking
      service.track(TELEMETRY_EVENTS.SESSION_START);
      service.track(TELEMETRY_EVENTS.NAVIGATE_SCREEN, { screen: 'goals' });
      await service.flush();
      expect(dispatchedBatches.length).toBe(1);
      expect(dispatchedBatches[0].length).toBe(2);

      // Step 2: Teacher goes offline (airplane mode / poor Wi-Fi)
      vi.spyOn(service, 'isOnline').mockReturnValue(false);

      // Actions performed offline
      service.track(TELEMETRY_EVENTS.GOAL_CREATED);
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.GOAL_UPDATED);
      vi.advanceTimersByTime(2100);
      service.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 60,
        isEdit: false,
        streakDays: 2
      });

      // Flush called while offline -> safely persists to offline storage
      const flushWhileOffline = await service.flush();
      expect(flushWhileOffline).toBe(false);

      const storedOffline = safeGetStorageJson(OFFLINE_STORAGE_KEY, []);
      expect(storedOffline.length).toBe(3);

      // Step 3: Connection restored
      vi.spyOn(service, 'isOnline').mockReturnValue(true);

      // Step 4: Service flushes and drains offline queue
      const flushOnline = await service.flush();
      expect(flushOnline).toBe(true);

      // Verifies batch sent contains recovered offline events
      expect(dispatchedBatches.length).toBe(2);
      expect(dispatchedBatches[1].length).toBeGreaterThanOrEqual(3);
      expect(safeGetStorageJson(OFFLINE_STORAGE_KEY, []).length).toBe(0);
    });

    it('Scenario S5: Administrator Access Control, Test Account Exclusion & Filtering', async () => {
      service.setExcludeInternalAccounts(true);

      // 1. Regular teacher actions (SHOULD be collected)
      service.setUserContext({ email: 'teacher1@school.k12.il', role: 'teacher' });
      expect(service.track(TELEMETRY_EVENTS.SESSION_START)).toBe(true);
      vi.advanceTimersByTime(2100);

      // 2. Admin actions (MUST be excluded from teacher analytics)
      service.setUserContext({ email: 'admin@tala.education', role: 'admin' });
      expect(service.track(TELEMETRY_EVENTS.SESSION_START)).toBe(false);
      vi.advanceTimersByTime(2100);

      // 3. QA / Test runner actions (MUST be excluded)
      service.setUserContext({ email: 'test_runner@test.local', isTest: true });
      expect(service.track(TELEMETRY_EVENTS.SESSION_START)).toBe(false);
      vi.advanceTimersByTime(2100);

      // 4. Demo account actions (MUST be excluded)
      service.setUserContext({ email: 'demo@tala.education', isDemo: true });
      expect(service.track(TELEMETRY_EVENTS.SESSION_START)).toBe(false);
      vi.advanceTimersByTime(2100);

      // 5. Another teacher actions (SHOULD be collected)
      service.setUserContext({ email: 'teacher2@school.k12.il', role: 'teacher' });
      expect(service.track(TELEMETRY_EVENTS.SESSION_START)).toBe(true);

      await service.flush();
      const events = dispatchedBatches.flat();
      expect(events.length).toBe(2);
      events.forEach((evt) => {
        expect(evt.accountType).toBe('teacher');
      });
    });

    it('Scenario S6: Accidental PII Ingestion Assault (Aggressive Leak Prevention)', async () => {
      service.setUserContext({ email: 'teacher@school.k12.il' });

      // An untrusted caller accidentally passes raw student dossiers, diagnoses, IDs, and prompt texts
      const toxicPayload = {
        name: 'ישראל ישראלי',
        studentName: 'ישראל ישראלי',
        studentId: 'stud_12345',
        idNumber: '012345678',
        teudatZehut: '012345678',
        notes: 'הערות פדגוגיות ורפואיות רגישות',
        diagnosis: 'דיסלקציה ודיסגרפיה התפתחותית',
        prompt: 'כתוב לי בבקשה דוח לתלמיד ישראל ישראלי תז 012345678',
        chatMessage: 'איך לטפל בקשיי קשב?',
        parentName: 'אבי ישראלי',
        parentPhone: '050-9998877',
        parentEmail: 'avi.israeli@gmail.com',

        // Allowed fields with embedded PII
        screen: 'student_view: 012345678',
        feature: 'Call 050-9998877 or email avi.israeli@gmail.com'
      };

      const tracked = service.track(TELEMETRY_EVENTS.FEATURE_VIEW, toxicPayload);
      expect(tracked).toBe(true);

      await service.flush();
      const event = dispatchedBatches.flat()[0];

      // Verify all direct PII keys were stripped
      expect(event.properties.name).toBeUndefined();
      expect(event.properties.studentName).toBeUndefined();
      expect(event.properties.studentId).toBeUndefined();
      expect(event.properties.idNumber).toBeUndefined();
      expect(event.properties.teudatZehut).toBeUndefined();
      expect(event.properties.notes).toBeUndefined();
      expect(event.properties.diagnosis).toBeUndefined();
      expect(event.properties.prompt).toBeUndefined();
      expect(event.properties.chatMessage).toBeUndefined();
      expect(event.properties.parentName).toBeUndefined();
      expect(event.properties.parentPhone).toBeUndefined();
      expect(event.properties.parentEmail).toBeUndefined();

      // Verify embedded PII was scrubbed
      expect(event.properties.screen).toBe('student_view: [REDACTED_ID]');
      expect(event.properties.feature).toBe('Call [REDACTED_PHONE] or email [REDACTED_EMAIL]');

      // Verify anonymous user ID contains no plaintext teacher email
      expect(event.anonUserId).not.toContain('teacher');
      expect(event.anonUserId).not.toContain('school.k12.il');
      expect(event.anonUserId).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
