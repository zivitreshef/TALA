import { describe, it, expect } from 'vitest';
import {
  CURRENT_APP_VERSION,
  TELEMETRY_CATEGORIES,
  TELEMETRY_EVENTS,
  isValidEventName,
  getEventCategory,
  getEventsByCategory,
  getAllCategories,
  getAllEvents,
  validateEventProperties
} from '../domain/telemetryTaxonomy';
import {
  isProhibitedKey,
  scrubPiiFromString,
  sanitizeProperties,
  generateUuidV4,
  getSessionId,
  resetSessionId,
  generateCorrelationId,
  getAnonUserId,
  classifyAccount,
  isInternalAccount,
  sanitizeTelemetryPayload
} from '../domain/telemetryPrivacy';
import {
  calculatePercentile,
  computeActiveUsers,
  computeCohortRetention,
  computeDailyTrackingMetrics,
  computeStaffReadinessMetrics,
  computeSharingAndChatMetrics,
  computeFeatureAdoption,
  computeOnboardingFunnel,
  computeUxFrictionMetrics,
  computeTechnicalHealthMetrics,
  computeTelemetryAnalytics
} from '../domain/telemetryAggregator';

describe('TypeScript Migration Phase 2 Batch 7 Gate', () => {
  describe('telemetryTaxonomy.ts', () => {
    it('synchronizes taxonomy version and provides categories and events', () => {
      expect(CURRENT_APP_VERSION).toBe('2.6.18');
      expect(getAllCategories()).toContain(TELEMETRY_CATEGORIES.ENGAGEMENT);
      expect(getAllCategories()).toContain(TELEMETRY_CATEGORIES.WORKFLOW);
      expect(getAllCategories()).toContain(TELEMETRY_CATEGORIES.TECHNICAL_HEALTH);
      expect(getAllEvents()).toContain(TELEMETRY_EVENTS.SESSION_START);
      expect(getAllEvents()).toContain(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED);

      expect(isValidEventName(TELEMETRY_EVENTS.SESSION_START)).toBe(true);
      expect(isValidEventName('unknown_custom_event')).toBe(false);
      expect(isValidEventName(null)).toBe(false);

      expect(getEventCategory(TELEMETRY_EVENTS.SESSION_START)).toBe(TELEMETRY_CATEGORIES.ENGAGEMENT);
      expect(getEventCategory('unknown')).toBeNull();

      const trackingEvents = getEventsByCategory(TELEMETRY_CATEGORIES.DAILY_TRACKING);
      expect(trackingEvents).toContain(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED);
      expect(trackingEvents).toContain(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED);
    });

    it('validates properties against schema rules', () => {
      const valid = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'voice',
        durationSec: 45,
        isEdit: false,
        streakDays: 3
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);

      const invalidEnum = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        mode: 'telepathy' as any
      });
      expect(invalidEnum.valid).toBe(false);
      expect(invalidEnum.errors[0]).toContain('not in allowed list');

      const invalidNumber = validateEventProperties(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED, {
        durationSec: -5
      });
      expect(invalidNumber.valid).toBe(false);
      expect(invalidNumber.errors[0]).toContain('must be >= 0');

      const unknownEvent = validateEventProperties('made_up_event', {});
      expect(unknownEvent.valid).toBe(false);
    });
  });

  describe('telemetryPrivacy.ts', () => {
    it('enforces prohibited key denylist strictly', () => {
      expect(isProhibitedKey('name')).toBe(true);
      expect(isProhibitedKey('email')).toBe(true);
      expect(isProhibitedKey('studentName')).toBe(true);
      expect(isProhibitedKey('clinicalDiagnosis')).toBe(true);
      expect(isProhibitedKey('aiPrompt')).toBe(true);
      expect(isProhibitedKey('שם_תלמיד')).toBe(true);
      expect(isProhibitedKey('זהות')).toBe(true);

      // Allowed telemetry keys
      expect(isProhibitedKey('screen')).toBe(false);
      expect(isProhibitedKey('durationSec')).toBe(false);
      expect(isProhibitedKey('streakDays')).toBe(false);
    });

    it('scrubs PII patterns from text and clamps property values', () => {
      const dirty = 'User teacher@school.org with phone 052-1234567 and ID 123456789 submitted a report.';
      const scrubbed = scrubPiiFromString(dirty);
      expect(scrubbed).not.toContain('teacher@school.org');
      expect(scrubbed).not.toContain('052-1234567');
      expect(scrubbed).not.toContain('123456789');
      expect(scrubbed).toContain('[REDACTED_EMAIL]');
      expect(scrubbed).toContain('[REDACTED_PHONE]');
      expect(scrubbed).toContain('[REDACTED_ID]');

      const sanitizedProps = sanitizeProperties({
        screen: 'dashboard',
        email: 'secret@domain.com', // should be dropped
        count: 42,
        active: true,
        nested: { inner: 'object' }, // should be dropped
        longText: 'A'.repeat(200) // should be clamped to 100
      });

      expect(sanitizedProps.screen).toBe('dashboard');
      expect(sanitizedProps.email).toBeUndefined();
      expect(sanitizedProps.count).toBe(42);
      expect(sanitizedProps.active).toBe(true);
      expect(sanitizedProps.nested).toBeUndefined();
      expect((sanitizedProps.longText as string).length).toBe(100);
    });

    it('generates deterministic pseudonyms, sessions, and classifies accounts', () => {
      const u1 = getAnonUserId('teacher@matya.org');
      const u2 = getAnonUserId('TEACHER@matya.org');
      expect(u1).toBe(u2);
      expect(u1).toHaveLength(64);

      expect(classifyAccount({ email: 'teacher@school.org' })).toBe('teacher');
      expect(classifyAccount({ email: 'admin@tala.education' })).toBe('admin');
      expect(classifyAccount({ email: 'demo@matya.org' })).toBe('demo');
      expect(classifyAccount({ email: 'test_runner@test.local' })).toBe('internal_test');

      expect(isInternalAccount('admin')).toBe(true);
      expect(isInternalAccount('teacher')).toBe(false);

      const sess1 = getSessionId();
      expect(sess1).toBeDefined();
      const sess2 = resetSessionId();
      expect(sess2).toBeDefined();

      const uuid = generateUuidV4();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(generateCorrelationId()).toHaveLength(36);
    });

    it('sanitizes telemetry payload into a zero-trust envelope', () => {
      const envelope = sanitizeTelemetryPayload(
        TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
        {
          mode: 'text',
          durationSec: 30,
          studentName: 'דני' // PII key to be dropped
        },
        { email: 'teacher@matya.org' }
      );

      expect(envelope).not.toBeNull();
      expect(envelope?.eventName).toBe(TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED);
      expect(envelope?.category).toBe(TELEMETRY_CATEGORIES.DAILY_TRACKING);
      expect(envelope?.accountType).toBe('teacher');
      expect(envelope?.appVersion).toBe('2.6.18');
      expect(envelope?.properties.mode).toBe('text');
      expect(envelope?.properties.durationSec).toBe(30);
      expect(envelope?.properties.studentName).toBeUndefined();

      expect(sanitizeTelemetryPayload('non_existent_event')).toBeNull();
    });
  });

  describe('telemetryAggregator.ts', () => {
    it('calculates percentiles and active user metrics accurately', () => {
      const numbers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(calculatePercentile(numbers, 50)).toBe(55);
      expect(calculatePercentile(numbers, 90)).toBe(91);
      expect(calculatePercentile([], 50)).toBe(0);

      const now = 1773000000000;
      const dayMs = 24 * 60 * 60 * 1000;
      const events = [
        { eventName: 'session_start', anonUserId: 'u1', timestampMs: now - 1000 },
        { eventName: 'session_start', anonUserId: 'u2', timestampMs: now - 2 * dayMs },
        { eventName: 'session_start', anonUserId: 'u3', timestampMs: now - 15 * dayMs }
      ];

      const active = computeActiveUsers(events, now);
      expect(active.dau).toBe(1); // u1 within 24h
      expect(active.wau).toBe(2); // u1, u2 within 7d
      expect(active.mau).toBe(3); // u1, u2, u3 within 30d
      expect(active.dauMauRatio).toBe(33.3);
    });

    it('computes cohort retention across 4 weekly buckets', () => {
      const now = 1773000000000;
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const events = [
        // User 1 first seen in week 1 (3 weeks ago) and returned in week 2
        { eventName: 'session_start', anonUserId: 'u1', timestampMs: now - 3 * weekMs + 1000 },
        { eventName: 'session_start', anonUserId: 'u1', timestampMs: now - 2 * weekMs + 1000 }
      ];

      const cohorts = computeCohortRetention(events, now);
      expect(cohorts).toHaveLength(4);
      expect(cohorts[0].cohort).toBe('מחזור שבוע 1');
    });

    it('computes daily tracking metrics and streak distribution', () => {
      const events = [
        {
          eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
          properties: { mode: 'voice', isEdit: false }
        },
        {
          eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
          properties: { mode: 'text', isEdit: false }
        },
        {
          eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
          properties: { mode: 'voice', durationSec: 35, streakDays: 4, isEdit: false }
        },
        {
          eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED,
          properties: { timeSpentSec: 15 }
        }
      ];

      const metrics = computeDailyTrackingMetrics(events);
      expect(metrics.started).toBe(2);
      expect(metrics.completed).toBe(1);
      expect(metrics.abandoned).toBe(1);
      expect(metrics.completionRate).toBe(50);
      expect(metrics.voicePct).toBe(66.7);
      expect(metrics.maxStreak).toBe(4);
      expect(metrics.avgDurationSec).toBe(35);
      expect(metrics.streakDistribution).toHaveLength(4);
    });

    it('computes staff readiness, sharing & chat, feature adoption, and onboarding funnel', () => {
      const events = [
        {
          eventName: TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED,
          anonUserId: 't1',
          properties: { summaryType: 'staff_meeting', studentCountBand: '1-5' }
        },
        {
          eventName: TELEMETRY_EVENTS.DOCUMENT_SHARED,
          properties: { format: 'pdf', channel: 'whatsapp_link' }
        },
        {
          eventName: TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED,
          properties: { triggerSource: 'floating_dock' }
        },
        {
          eventName: TELEMETRY_EVENTS.ONBOARDING_STARTED
        },
        {
          eventName: TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED,
          properties: { stepIndex: 1 }
        },
        {
          eventName: TELEMETRY_EVENTS.ONBOARDING_COMPLETED
        }
      ];

      const readiness = computeStaffReadinessMetrics(events, 2);
      expect(readiness.summariesGenerated).toBe(1);
      expect(readiness.teacherAdoptionRate).toBe(50);

      const sharing = computeSharingAndChatMetrics(events);
      expect(sharing.totalDocsShared).toBe(1);
      expect(sharing.formats.pdf).toBe(1);
      expect(sharing.channels.whatsapp_link).toBe(1);
      expect(sharing.chatSessionsStarted).toBe(1);

      const adoption = computeFeatureAdoption(events);
      expect(adoption.modules.some((m) => m.name === 'שיתוף מסמכים')).toBe(true);

      const funnel = computeOnboardingFunnel(events);
      expect(funnel.started).toBe(1);
      expect(funnel.completed).toBe(1);
      expect(funnel.steps).toHaveLength(10);
    });

    it('computes UX friction, technical health, and full analytics summary', () => {
      const events = [
        {
          eventName: TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED,
          properties: { formId: 'workPlan' }
        },
        {
          eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED,
          properties: { durationMs: 1200 }
        },
        {
          eventName: TELEMETRY_EVENTS.CLIENT_JS_ERROR,
          properties: { message: 'Network error', deviceCategory: 'desktop', browser: 'Chrome' }
        }
      ];

      const friction = computeUxFrictionMetrics(events);
      expect(friction.dirtyExits).toBe(1);
      expect(friction.p50).toBe(1200);

      const health = computeTechnicalHealthMetrics(events);
      expect(health.jsErrorsCount).toBe(1);
      expect(health.devices.desktop).toBe(1);
      expect(health.browsers.Chrome).toBe(1);

      const summary = computeTelemetryAnalytics(events, { timeRange: '7d' });
      expect(summary.timeRange).toBe('7d');
      expect(summary.totalEvents).toBe(3);
      expect(summary.overview).toBeDefined();
      expect(summary.cohorts).toBeDefined();
      expect(summary.uxFriction).toBeDefined();
      expect(summary.technicalHealth).toBeDefined();
    });
  });
});
