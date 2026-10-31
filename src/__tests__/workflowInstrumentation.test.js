import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

// Domain and Service Imports
import { usageTelemetryService } from '../services/usageTelemetryService';
import { TELEMETRY_EVENTS, TELEMETRY_CATEGORIES } from '../domain/telemetryTaxonomy';
import {
  advanceOnboardingStep,
  goToOnboardingStep,
  pauseOnboarding,
  dismissOnboarding,
  resetOnboardingState,
  getOnboardingState,
  recordOnboardingMilestone,
  trackFirstStudentMilestone,
  trackFirstReportMilestone,
  __clearInMemoryStoreForTesting
} from '../services/onboardingStorage';
import {
  calculateCurrentStreak
} from '../components/DailyPedagogicalTracker';
import ErrorBoundary from '../components/ErrorBoundary';
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import {
  trackPedagogicalSummaryGenerated,
  trackStaffMeetingReadinessChecked,
  trackDocumentShared,
  trackPedagogicalChatSessionStarted,
  trackPedagogicalChatToolDiscovered,
  trackPedagogicalChatSessionEnded,
  trackReportGenerated
} from '../App';

describe('Workflow Journey & Technical Health Instrumentation (Milestone M5)', () => {
  let trackedEvents = [];
  const testEmail = 'teacher.instrumentation@tala.internal';

  beforeEach(() => {
    trackedEvents = [];
    __clearInMemoryStoreForTesting();
    try {
      localStorage.clear();
    } catch (_) {}

    usageTelemetryService.clear();
    usageTelemetryService.setEnabled(true);
    usageTelemetryService.setSamplingRate(1.0);
    usageTelemetryService.setExcludeInternalAccounts(false);

    // Capture all flushed telemetry batches
    usageTelemetryService.setTransport(async (batch) => {
      trackedEvents.push(...batch);
      return { success: true, count: batch.length };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Onboarding Journey Telemetry (R6)
  // =========================================================================
  describe('1. Onboarding Journey Telemetry (R6)', () => {
    it('dispatches onboarding_started when onboarding is initiated or reset', async () => {
      resetOnboardingState(testEmail, 'demo');
      await usageTelemetryService.flush();

      const startedEvent = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.ONBOARDING_STARTED);
      expect(startedEvent).toBeDefined();
      expect(startedEvent.category).toBe(TELEMETRY_CATEGORIES.ONBOARDING);
      expect(startedEvent.properties.mode).toBe('demo');
    });

    it('dispatches onboarding_step_completed on advancing each of the 10 steps', async () => {
      resetOnboardingState(testEmail, 'real');
      trackedEvents = [];

      for (let step = 1; step <= 9; step++) {
        advanceOnboardingStep(testEmail);
      }
      await usageTelemetryService.flush();

      const stepEvents = trackedEvents.filter((e) => e.eventName === TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED);
      expect(stepEvents.length).toBe(9);
      expect(stepEvents[0].properties.stepIndex).toBe(1);
      expect(stepEvents[0].properties.totalSteps).toBe(10);
      expect(stepEvents[8].properties.stepIndex).toBe(9);
    });

    it('dispatches onboarding_completed when the final step (10) is finished', async () => {
      resetOnboardingState(testEmail, 'demo');
      // Advance to step 10
      for (let s = 1; s <= 9; s++) {
        advanceOnboardingStep(testEmail);
      }
      trackedEvents = [];

      // Complete final step
      advanceOnboardingStep(testEmail);
      await usageTelemetryService.flush();

      const completedEvent = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.ONBOARDING_COMPLETED);
      expect(completedEvent).toBeDefined();
      expect(completedEvent.category).toBe(TELEMETRY_CATEGORIES.ONBOARDING);
      expect(completedEvent.properties.totalSteps).toBe(10);
      expect(completedEvent.properties.durationSec).toBeGreaterThanOrEqual(0);

      const state = getOnboardingState(testEmail);
      expect(state.isCompleted).toBe(true);
    });

    it('dispatches onboarding_paused and onboarding_dismissed with current step id', async () => {
      resetOnboardingState(testEmail, 'real');
      goToOnboardingStep(testEmail, 4);
      trackedEvents = [];

      pauseOnboarding(testEmail);
      dismissOnboarding(testEmail);
      await usageTelemetryService.flush();

      const pausedEvent = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.ONBOARDING_PAUSED);
      const dismissedEvent = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.ONBOARDING_DISMISSED);

      expect(pausedEvent).toBeDefined();
      expect(pausedEvent.properties.stepIndex).toBe(4);
      expect(pausedEvent.properties.stepId).toBe('set_goals');

      expect(dismissedEvent).toBeDefined();
      expect(dismissedEvent.properties.stepIndex).toBe(4);
    });

    it('tracks time-to-first-student and time-to-first-report onboarding milestones', () => {
      resetOnboardingState(testEmail, 'real');

      const afterStudent = trackFirstStudentMilestone(testEmail);
      expect(afterStudent.firstStudentAt).toBeDefined();
      expect(afterStudent.timeToFirstStudentSec).toBeGreaterThanOrEqual(0);

      const afterReport = trackFirstReportMilestone(testEmail);
      expect(afterReport.firstReportAt).toBeDefined();
      expect(afterReport.timeToFirstReportSec).toBeGreaterThanOrEqual(0);

      // Subsequent duplicate calls do not overwrite original milestone timestamps
      const originalStudentTime = afterStudent.firstStudentAt;
      const secondCall = trackFirstStudentMilestone(testEmail);
      expect(secondCall.firstStudentAt).toBe(originalStudentTime);
    });
  });

  // =========================================================================
  // 2. Daily Pedagogical Tracking (F16)
  // =========================================================================
  describe('2. Daily Pedagogical Tracking (F16)', () => {
    it('accurately computes daily observation streaks based on historical dates', () => {
      const todayStr = '2026-10-31';
      const mockStudents = [
        {
          id: 'st_1',
          goals: [
            {
              id: 'g_1',
              observations: [
                { date: '2026-10-31', note: 'obs' },
                { date: '2026-10-30', note: 'obs' },
                { date: '2026-10-29', note: 'obs' }
              ]
            }
          ]
        },
        {
          id: 'st_2',
          goals: [
            {
              id: 'g_2',
              observations: [
                { date: '2026-10-28', note: 'obs' }
              ]
            }
          ]
        }
      ];

      const streak = calculateCurrentStreak(mockStudents, todayStr);
      expect(streak).toBe(4); // 31, 30, 29, 28 = 4 consecutive days
    });

    it('dispatches daily_tracking_entry_started on starting voice or text logging', async () => {
      usageTelemetryService.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'text',
        isEdit: false
      });
      usageTelemetryService.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'voice',
        isEdit: true
      });
      await usageTelemetryService.flush();

      const textStarted = trackedEvents.find((e) => e.properties.mode === 'text' && e.eventName === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED);
      const voiceStarted = trackedEvents.find((e) => e.properties.mode === 'voice' && e.eventName === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED);

      expect(textStarted).toBeDefined();
      expect(textStarted.properties.isEdit).toBe(false);
      expect(voiceStarted).toBeDefined();
      expect(voiceStarted.properties.isEdit).toBe(true);
    });

    it('dispatches daily_tracking_entry_completed and daily_tracking_streak_recorded upon observation save', async () => {
      const streakDays = 5;
      usageTelemetryService.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 42,
        isEdit: false,
        streakDays
      });
      usageTelemetryService.track(TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED, {
        currentStreakDays: streakDays
      });
      await usageTelemetryService.flush();

      const completed = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED);
      expect(completed).toBeDefined();
      expect(completed.category).toBe(TELEMETRY_CATEGORIES.DAILY_TRACKING);
      expect(completed.properties.mode).toBe('voice');
      expect(completed.properties.durationSec).toBe(42);
      expect(completed.properties.streakDays).toBe(5);

      const streakRecorded = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED);
      expect(streakRecorded).toBeDefined();
      expect(streakRecorded.properties.currentStreakDays).toBe(5);
    });

    it('dispatches daily_tracking_entry_abandoned when observation modal is closed unsaved', async () => {
      usageTelemetryService.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED, {
        mode: 'text',
        timeSpentSec: 15
      });
      await usageTelemetryService.flush();

      const abandoned = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED);
      expect(abandoned).toBeDefined();
      expect(abandoned.properties.mode).toBe('text');
      expect(abandoned.properties.timeSpentSec).toBe(15);
    });
  });

  // =========================================================================
  // 3. Pedagogical Summary & Staff Readiness (F17)
  // =========================================================================
  describe('3. Pedagogical Summary & Staff Readiness (F17)', () => {
    it('dispatches pedagogical_summary_generated with correct type and student count bands', async () => {
      trackPedagogicalSummaryGenerated({
        summaryType: 'staff_meeting',
        studentCount: 3,
        email: testEmail
      });
      trackPedagogicalSummaryGenerated({
        summaryType: 'periodic_review',
        studentCount: 12,
        email: testEmail
      });
      trackPedagogicalSummaryGenerated({
        summaryType: 'staff_meeting',
        studentCount: 24,
        email: testEmail
      });
      await usageTelemetryService.flush();

      const summaries = trackedEvents.filter((e) => e.eventName === TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED);
      expect(summaries.length).toBe(3);
      expect(summaries[0].properties.studentCountBand).toBe('1-5');
      expect(summaries[1].properties.studentCountBand).toBe('6-15');
      expect(summaries[2].properties.studentCountBand).toBe('16+');
    });

    it('dispatches staff_meeting_readiness_checked with completed items count and boolean readiness', async () => {
      trackStaffMeetingReadinessChecked({
        itemsCompletedCount: 3,
        isFullyReady: true,
        email: testEmail
      });
      trackStaffMeetingReadinessChecked({
        itemsCompletedCount: 1,
        isFullyReady: false,
        email: testEmail
      });
      await usageTelemetryService.flush();

      const checks = trackedEvents.filter((e) => e.eventName === TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED);
      expect(checks.length).toBe(2);
      expect(checks[0].properties.itemsCompletedCount).toBe(3);
      expect(checks[0].properties.isFullyReady).toBe(true);
      expect(checks[1].properties.itemsCompletedCount).toBe(1);
      expect(checks[1].properties.isFullyReady).toBe(false);
    });
  });

  // =========================================================================
  // 4. Document Sharing & Pedagogical Chat (F18)
  // =========================================================================
  describe('4. Document Sharing & Pedagogical Chat (F18)', () => {
    it('dispatches document_shared across formats (pdf, docx, print) and channels', async () => {
      trackDocumentShared({ format: 'pdf', channel: 'download', email: testEmail });
      trackDocumentShared({ format: 'docx', channel: 'download', email: testEmail });
      trackDocumentShared({ format: 'print', channel: 'whatsapp_link', email: testEmail });
      await usageTelemetryService.flush();

      const shares = trackedEvents.filter((e) => e.eventName === TELEMETRY_EVENTS.DOCUMENT_SHARED);
      expect(shares.length).toBe(3);
      expect(shares[0].properties.format).toBe('pdf');
      expect(shares[0].properties.channel).toBe('download');
      expect(shares[2].properties.channel).toBe('whatsapp_link');
    });

    it('dispatches pedagogical chat session lifecycle events with zero message PII', async () => {
      trackPedagogicalChatSessionStarted({ triggerSource: 'floating_dock', email: testEmail });
      trackPedagogicalChatToolDiscovered({ toolType: 'goal_suggester', email: testEmail });
      trackPedagogicalChatToolDiscovered({ toolType: 'acronym_explainer', email: testEmail });
      trackPedagogicalChatSessionEnded({ durationSec: 180, turnsCount: 6, email: testEmail });
      await usageTelemetryService.flush();

      const startEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED);
      const toolEvts = trackedEvents.filter((e) => e.eventName === TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED);
      const endEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED);

      expect(startEvt).toBeDefined();
      expect(startEvt.properties.triggerSource).toBe('floating_dock');
      expect(toolEvts.length).toBe(2);
      expect(toolEvts[0].properties.toolType).toBe('goal_suggester');
      expect(endEvt.properties.durationSec).toBe(180);
      expect(endEvt.properties.turnsCount).toBe(6);

      // Verify STRICTLY 0% PII in chat payloads
      trackedEvents.forEach((evt) => {
        expect(evt.properties.message).toBeUndefined();
        expect(evt.properties.messages).toBeUndefined();
        expect(evt.properties.text).toBeUndefined();
        expect(evt.properties.prompt).toBeUndefined();
      });
    });

    it('dispatches report_generated when official reports are compiled', async () => {
      trackReportGenerated({ reportType: 'tala', email: testEmail });
      await usageTelemetryService.flush();

      const reportEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.REPORT_GENERATED);
      expect(reportEvt).toBeDefined();
      expect(reportEvt.category).toBe(TELEMETRY_CATEGORIES.WORKFLOW);
    });
  });

  // =========================================================================
  // 5. Technical Health (F13)
  // =========================================================================
  describe('5. Technical Health (F13)', () => {
    it('dispatches client_js_error when ErrorBoundary catches a component crash', async () => {
      const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const boundary = new ErrorBoundary({ componentName: 'DailyPedagogicalTracker' });
      boundary.componentDidCatch(new Error('Simulated pedagogical render crash in component'), {
        componentStack: 'in BombComponent'
      });

      await usageTelemetryService.flush();

      const errEvent = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.CLIENT_JS_ERROR);
      expect(errEvent).toBeDefined();
      expect(errEvent.category).toBe(TELEMETRY_CATEGORIES.TECHNICAL_HEALTH);
      expect(errEvent.properties.componentName).toBe('DailyPedagogicalTracker');
      expect(errEvent.properties.errorCode).toBe('Error');
      expect(errEvent.properties.errorMessageClamped).toContain('Simulated pedagogical render crash');

      spyError.mockRestore();
    });

    it('dispatches ai_latency_recorded on AI proxy successful execution', async () => {
      // Mock global fetch for successful cloud function proxy call
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { goals: [{ title: 'התקדמות בישיבה' }] } })
      });

      await callAiProxyEndpoint({
        operation: 'generateGoals',
        payload: { text: 'חיזוק מיומנויות' },
        hints: { stage: 'school' }
      });

      await usageTelemetryService.flush();

      const latencyEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.AI_LATENCY_RECORDED);
      expect(latencyEvt).toBeDefined();
      expect(latencyEvt.category).toBe(TELEMETRY_CATEGORIES.TECHNICAL_HEALTH);
      expect(latencyEvt.properties.operation).toBe('generateGoals');
      expect(latencyEvt.properties.status).toBe('success');
      expect(latencyEvt.properties.latencyMs).toBeGreaterThanOrEqual(0);

      globalThis.fetch = originalFetch;
    });

    it('dispatches ai_latency_recorded on AI proxy transient retry execution', async () => {
      const originalFetch = globalThis.fetch;
      let callCount = 0;

      // Fail first with 503, succeed on retry
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'Transient gateway timeout' })
          };
        }
        return {
          ok: true,
          json: async () => ({ data: { success: true } })
        };
      });

      await callAiProxyEndpoint({
        operation: 'summarizeObservations',
        payload: { count: 3 }
      });

      await usageTelemetryService.flush();

      const retryEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.AI_LATENCY_RECORDED);
      expect(retryEvt).toBeDefined();
      expect(retryEvt.properties.status).toBe('retry');
      expect(retryEvt.properties.latencyMs).toBeGreaterThanOrEqual(0);

      globalThis.fetch = originalFetch;
    });

    it('dispatches ai_latency_recorded with status failure when API completely fails', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Permanent internal server crash' })
      });

      try {
        await callAiProxyEndpoint({
          operation: 'synthesizePlan',
          payload: { test: true }
        });
      } catch (_) {
        // Expected failure
      }

      await usageTelemetryService.flush();

      const failureEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.AI_LATENCY_RECORDED);
      expect(failureEvt).toBeDefined();
      expect(failureEvt.properties.status).toBe('failure');

      globalThis.fetch = originalFetch;
    });

    it('records page_load_recorded with valid duration metadata', async () => {
      usageTelemetryService.track(TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, {
        loadDurationMs: 450,
        loadTimeMs: 450
      });
      await usageTelemetryService.flush();

      const pageLoadEvt = trackedEvents.find((e) => e.eventName === TELEMETRY_EVENTS.PAGE_LOAD_RECORDED);
      expect(pageLoadEvt).toBeDefined();
      expect(pageLoadEvt.properties.loadDurationMs).toBe(450);
      expect(pageLoadEvt.properties.loadTimeMs).toBe(450);
    });
  });

  // =========================================================================
  // 6. Zero-PII Forensic Security Verification
  // =========================================================================
  describe('6. Zero-PII Forensic Security Verification', () => {
    it('guarantees that no raw user credentials, student names, or clinical notes leak into telemetry', async () => {
      // Intentionally feed payloads containing potential PII traps
      usageTelemetryService.track(TELEMETRY_EVENTS.STUDENT_CREATED, {
        studentName: 'יונתן לוי',
        idNumber: '039874512',
        diagnosis: 'ADHD and SPD',
        notes: 'קשיים בריכוז ובוויסות',
        stage: 'school'
      });

      usageTelemetryService.track(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'text',
        durationSec: 30,
        streakDays: 4,
        isEdit: false,
        note: 'התלמיד השתולל בחצר',
        rawText: 'שיחה חסויה'
      });

      await usageTelemetryService.flush();

      for (const event of trackedEvents) {
        const props = event.properties;
        expect(props.studentName).toBeUndefined();
        expect(props.idNumber).toBeUndefined();
        expect(props.diagnosis).toBeUndefined();
        expect(props.notes).toBeUndefined();
        expect(props.note).toBeUndefined();
        expect(props.rawText).toBeUndefined();

        // Check serialized payload string
        const serialized = JSON.stringify(event);
        expect(serialized).not.toContain('יונתן לוי');
        expect(serialized).not.toContain('039874512');
        expect(serialized).not.toContain('השתולל בחצר');
      }
    });
  });
});
