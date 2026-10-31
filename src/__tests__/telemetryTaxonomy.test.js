import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_CATEGORIES,
  TELEMETRY_EVENTS,
  EVENT_CATEGORY_MAP,
  EVENT_SCHEMAS,
  isValidEventName,
  getEventCategory,
  getEventsByCategory,
  getAllCategories,
  getAllEvents,
  validateEventProperties
} from '../domain/telemetryTaxonomy.js';

describe('Telemetry Event Taxonomy Registry (F2, F12, F16, F17, F18)', () => {
  describe('Tier 1: Category & Event Registry Completeness', () => {
    it('defines all 8 mandated telemetry categories', () => {
      const categories = Object.values(TELEMETRY_CATEGORIES);
      expect(categories).toContain('engagement');
      expect(categories).toContain('workflow');
      expect(categories).toContain('daily_tracking');
      expect(categories).toContain('pedagogical_summary');
      expect(categories).toContain('sharing_and_chat');
      expect(categories).toContain('onboarding');
      expect(categories).toContain('friction');
      expect(categories).toContain('technical_health');
      expect(categories.length).toBe(8);
      expect(getAllCategories()).toEqual(categories);
    });

    it('freezes TELEMETRY_CATEGORIES to prevent runtime mutations', () => {
      expect(Object.isFrozen(TELEMETRY_CATEGORIES)).toBe(true);
    });

    it('freezes TELEMETRY_EVENTS to prevent runtime mutations', () => {
      expect(Object.isFrozen(TELEMETRY_EVENTS)).toBe(true);
    });

    it('defines all Engagement events', () => {
      expect(TELEMETRY_EVENTS.SESSION_START).toBe('session_start');
      expect(TELEMETRY_EVENTS.SESSION_END).toBe('session_end');
      expect(TELEMETRY_EVENTS.NAVIGATE_SCREEN).toBe('navigate_screen');
      expect(TELEMETRY_EVENTS.FEATURE_VIEW).toBe('feature_view');
    });

    it('defines all Workflow events', () => {
      expect(TELEMETRY_EVENTS.STUDENT_CREATED).toBe('student_created');
      expect(TELEMETRY_EVENTS.STUDENT_ARCHIVED).toBe('student_archived');
      expect(TELEMETRY_EVENTS.GOAL_CREATED).toBe('goal_created');
      expect(TELEMETRY_EVENTS.GOAL_UPDATED).toBe('goal_updated');
      expect(TELEMETRY_EVENTS.REPORT_GENERATED).toBe('report_generated');
      expect(TELEMETRY_EVENTS.PARENT_VOICE_LINK_CREATED).toBe('parent_voice_link_created');
    });

    it('defines all Daily Pedagogical Tracking events (F16)', () => {
      expect(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED).toBe('daily_tracking_entry_started');
      expect(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED).toBe('daily_tracking_entry_completed');
      expect(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED).toBe('daily_tracking_entry_abandoned');
      expect(TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED).toBe('daily_tracking_streak_recorded');
    });

    it('defines all Pedagogical Summary & Staff Readiness events (F17)', () => {
      expect(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED).toBe('pedagogical_summary_generated');
      expect(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED).toBe('staff_meeting_readiness_checked');
    });

    it('defines all Document Sharing & Pedagogical Chat events (F18)', () => {
      expect(TELEMETRY_EVENTS.DOCUMENT_SHARED).toBe('document_shared');
      expect(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED).toBe('pedagogical_chat_session_started');
      expect(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED).toBe('pedagogical_chat_tool_discovered');
      expect(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED).toBe('pedagogical_chat_session_ended');
    });

    it('defines all Onboarding events (F12)', () => {
      expect(TELEMETRY_EVENTS.ONBOARDING_STARTED).toBe('onboarding_started');
      expect(TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED).toBe('onboarding_step_completed');
      expect(TELEMETRY_EVENTS.ONBOARDING_PAUSED).toBe('onboarding_paused');
      expect(TELEMETRY_EVENTS.ONBOARDING_COMPLETED).toBe('onboarding_completed');
      expect(TELEMETRY_EVENTS.ONBOARDING_DISMISSED).toBe('onboarding_dismissed');
    });

    it('defines all UX Friction events', () => {
      expect(TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED).toBe('form_dirty_abandoned');
      expect(TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY).toBe('action_failed_repeatedly');
      expect(TELEMETRY_EVENTS.OBSERVATION_GAP_DETECTED).toBe('observation_gap_detected');
      expect(TELEMETRY_EVENTS.SEARCH_ZERO_RESULTS).toBe('search_zero_results');
    });

    it('defines all Technical Health events', () => {
      expect(TELEMETRY_EVENTS.CLIENT_JS_ERROR).toBe('client_js_error');
      expect(TELEMETRY_EVENTS.API_OPERATION_FAILED).toBe('api_operation_failed');
      expect(TELEMETRY_EVENTS.AI_LATENCY_RECORDED).toBe('ai_latency_recorded');
      expect(TELEMETRY_EVENTS.PAGE_LOAD_RECORDED).toBe('page_load_recorded');
    });

    it('contains exactly 33 unique event definitions in total', () => {
      const events = getAllEvents();
      const uniqueEvents = new Set(events);
      expect(uniqueEvents.size).toBe(33);
      expect(events.length).toBe(33);
    });

    it('maps every single event to a recognized category in EVENT_CATEGORY_MAP', () => {
      const events = getAllEvents();
      const validCategories = new Set(getAllCategories());
      expect(Object.isFrozen(EVENT_CATEGORY_MAP)).toBe(true);

      events.forEach((eventName) => {
        const category = getEventCategory(eventName);
        expect(category).not.toBeNull();
        expect(validCategories.has(category)).toBe(true);
      });
    });

    it('correctly retrieves events partitioned by category via getEventsByCategory', () => {
      const dailyTrackingEvents = getEventsByCategory(TELEMETRY_CATEGORIES.DAILY_TRACKING);
      expect(dailyTrackingEvents).toEqual([
        'daily_tracking_entry_started',
        'daily_tracking_entry_completed',
        'daily_tracking_entry_abandoned',
        'daily_tracking_streak_recorded'
      ]);

      const sharingChatEvents = getEventsByCategory(TELEMETRY_CATEGORIES.SHARING_AND_CHAT);
      expect(sharingChatEvents).toEqual([
        'document_shared',
        'pedagogical_chat_session_started',
        'pedagogical_chat_tool_discovered',
        'pedagogical_chat_session_ended'
      ]);

      const summaryEvents = getEventsByCategory(TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY);
      expect(summaryEvents).toEqual([
        'pedagogical_summary_generated',
        'staff_meeting_readiness_checked'
      ]);
    });
  });

  describe('Tier 2: Event Name Validation & Boundary Cases', () => {
    it('returns true for all registered taxonomy events', () => {
      getAllEvents().forEach((eventName) => {
        expect(isValidEventName(eventName)).toBe(true);
      });
    });

    it('returns false for unrecognized event strings', () => {
      expect(isValidEventName('unknown_event')).toBe(false);
      expect(isValidEventName('custom_teacher_action')).toBe(false);
      expect(isValidEventName('SESSION_START')).toBe(false); // Uppercase key vs lowercase event name
      expect(isValidEventName('student_created_v2')).toBe(false);
    });

    it('returns false for non-string or empty inputs', () => {
      expect(isValidEventName('')).toBe(false);
      expect(isValidEventName(null)).toBe(false);
      expect(isValidEventName(undefined)).toBe(false);
      expect(isValidEventName(12345)).toBe(false);
      expect(isValidEventName({})).toBe(false);
      expect(isValidEventName([])).toBe(false);
      expect(isValidEventName(true)).toBe(false);
    });

    it('returns null for getEventCategory on invalid or unknown inputs', () => {
      expect(getEventCategory('')).toBeNull();
      expect(getEventCategory(null)).toBeNull();
      expect(getEventCategory(undefined)).toBeNull();
      expect(getEventCategory('not_an_event')).toBeNull();
      expect(getEventCategory(999)).toBeNull();
    });

    it('returns empty array for getEventsByCategory with invalid category', () => {
      expect(getEventsByCategory('')).toEqual([]);
      expect(getEventsByCategory(null)).toEqual([]);
      expect(getEventsByCategory(undefined)).toEqual([]);
      expect(getEventsByCategory('invalid_category')).toEqual([]);
    });
  });

  describe('Tier 2: Schema Validation (F16, F17, F18, Technical Health, Friction)', () => {
    it('validates DAILY_TRACKING_ENTRY_STARTED schema', () => {
      const validText = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'text',
        isEdit: false
      });
      expect(validText.valid).toBe(true);
      expect(validText.errors).toEqual([]);

      const validVoice = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'voice',
        isEdit: true
      });
      expect(validVoice.valid).toBe(true);

      const invalidMode = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'video', // Invalid enum
        isEdit: false
      });
      expect(invalidMode.valid).toBe(false);
      expect(invalidMode.errors[0]).toContain('is not in allowed list');

      const invalidType = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED, {
        mode: 'text',
        isEdit: 'true' // String instead of boolean
      });
      expect(invalidType.valid).toBe(false);
      expect(invalidType.errors[0]).toContain('expected type boolean');
    });

    it('validates DAILY_TRACKING_ENTRY_COMPLETED with duration and streak boundaries', () => {
      const valid = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 42,
        isEdit: false,
        streakDays: 5
      });
      expect(valid.valid).toBe(true);

      // Boundary: durationSec < 0
      const negDuration = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: -1,
        isEdit: false,
        streakDays: 0
      });
      expect(negDuration.valid).toBe(false);
      expect(negDuration.errors[0]).toContain('must be >= 0');

      // Boundary: streakDays < 0
      const negStreak = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 10,
        isEdit: false,
        streakDays: -3
      });
      expect(negStreak.valid).toBe(false);
      expect(negStreak.errors[0]).toContain('must be >= 0');

      // Boundary: non-finite durationSec (NaN or Infinity)
      const nanDuration = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: NaN,
        isEdit: false,
        streakDays: 1
      });
      expect(nanDuration.valid).toBe(false);
      expect(nanDuration.errors[0]).toContain('must be a finite number');
    });

    it('validates PEDAGOGICAL_SUMMARY_GENERATED enum bands and types (F17)', () => {
      const valid1 = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'staff_meeting',
        studentCountBand: '1-5'
      });
      expect(valid1.valid).toBe(true);

      const valid2 = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'periodic_review',
        studentCountBand: '16+'
      });
      expect(valid2.valid).toBe(true);

      const invalidType = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'end_of_year', // Not in enum
        studentCountBand: '6-15'
      });
      expect(invalidType.valid).toBe(false);
      expect(invalidType.errors[0]).toContain('summaryType');

      const invalidBand = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED, {
        summaryType: 'staff_meeting',
        studentCountBand: '100+' // Not in enum
      });
      expect(invalidBand.valid).toBe(false);
      expect(invalidBand.errors[0]).toContain('studentCountBand');
    });

    it('validates STAFF_MEETING_READINESS_CHECKED completion counts and boolean flag (F17)', () => {
      const valid = validateEventProperties(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED, {
        itemsCompletedCount: 4,
        isFullyReady: true
      });
      expect(valid.valid).toBe(true);

      const negativeCount = validateEventProperties(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED, {
        itemsCompletedCount: -2,
        isFullyReady: false
      });
      expect(negativeCount.valid).toBe(false);

      const wrongFlag = validateEventProperties(TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED, {
        itemsCompletedCount: 0,
        isFullyReady: 1 // Integer instead of boolean
      });
      expect(wrongFlag.valid).toBe(false);
    });

    it('validates DOCUMENT_SHARED format and channel enums (F18)', () => {
      const validShare = validateEventProperties(TELEMETRY_EVENTS.DOCUMENT_SHARED, {
        format: 'pdf',
        channel: 'whatsapp_link'
      });
      expect(validShare.valid).toBe(true);

      const invalidFormat = validateEventProperties(TELEMETRY_EVENTS.DOCUMENT_SHARED, {
        format: 'txt',
        channel: 'download'
      });
      expect(invalidFormat.valid).toBe(false);

      const invalidChannel = validateEventProperties(TELEMETRY_EVENTS.DOCUMENT_SHARED, {
        format: 'docx',
        channel: 'bluetooth'
      });
      expect(invalidChannel.valid).toBe(false);
    });

    it('validates PEDAGOGICAL_CHAT session and tool discovery (F18)', () => {
      const validStart = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED, {
        triggerSource: 'floating_dock'
      });
      expect(validStart.valid).toBe(true);

      const invalidStart = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED, {
        triggerSource: 'url_param'
      });
      expect(invalidStart.valid).toBe(false);

      const validTool = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED, {
        toolType: 'acronym_explainer'
      });
      expect(validTool.valid).toBe(true);

      const validEnd = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED, {
        durationSec: 180,
        turnsCount: 6
      });
      expect(validEnd.valid).toBe(true);

      const negEnd = validateEventProperties(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED, {
        durationSec: -5,
        turnsCount: 3
      });
      expect(negEnd.valid).toBe(false);
    });

    it('validates Technical Health latencies and error reporting', () => {
      const validAi = validateEventProperties(TELEMETRY_EVENTS.AI_LATENCY_RECORDED, {
        durationMs: 450
      });
      expect(validAi.valid).toBe(true);

      const invalidAi = validateEventProperties(TELEMETRY_EVENTS.AI_LATENCY_RECORDED, {
        durationMs: -10
      });
      expect(invalidAi.valid).toBe(false);

      const validPage = validateEventProperties(TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, {
        loadTimeMs: 1200
      });
      expect(validPage.valid).toBe(true);

      const validError = validateEventProperties(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
        errorType: 'TypeError'
      });
      expect(validError.valid).toBe(true);
    });

    it('accumulates multiple schema validation errors for multiple invalid fields', () => {
      const multipleErrors = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'invalid_mode',
        durationSec: -50,
        streakDays: -10,
        isEdit: 'not-a-bool'
      });
      expect(multipleErrors.valid).toBe(false);
      expect(multipleErrors.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('handles non-object properties gracefully', () => {
      const stringProps = validateEventProperties(TELEMETRY_EVENTS.FEATURE_VIEW, 'invalid');
      expect(stringProps.valid).toBe(false);
      expect(stringProps.errors[0]).toContain('plain object');

      const arrayProps = validateEventProperties(TELEMETRY_EVENTS.FEATURE_VIEW, ['step1']);
      expect(arrayProps.valid).toBe(false);
      expect(arrayProps.errors[0]).toContain('cannot be an array');
    });

    it('handles unknown events gracefully in validateEventProperties', () => {
      const res = validateEventProperties('bogus_event', { foo: 'bar' });
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Unknown telemetry event name');
    });

    it('allows events without specific schemas to pass validation with any object', () => {
      const res = validateEventProperties(TELEMETRY_EVENTS.STUDENT_CREATED, {
        arbitraryKey: 'safeValue'
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });
  });

  describe('Tier 3: Cross-Category Consistency & Immutability', () => {
    it('ensures no duplicate event string names across different enum keys', () => {
      const values = Object.values(TELEMETRY_EVENTS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it('ensures every event category has at least one event mapped', () => {
      getAllCategories().forEach((category) => {
        const events = getEventsByCategory(category);
        expect(events.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('ensures EVENT_SCHEMAS only contains valid event names', () => {
      Object.keys(EVENT_SCHEMAS).forEach((eventName) => {
        expect(isValidEventName(eventName)).toBe(true);
      });
    });
  });
});
