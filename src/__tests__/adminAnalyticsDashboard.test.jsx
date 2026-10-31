import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AdminAnalyticsDashboard, { isUserAdmin } from '../components/admin/AdminAnalyticsDashboard.jsx';
import {
  saveTelemetryBatch,
  fetchTelemetryEvents,
  getTimeRangeStartMs,
  setupUsageTelemetryTransport,
  TELEMETRY_EVENTS_COLLECTION
} from '../services/telemetryStorage.js';
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
} from '../domain/telemetryAggregator.js';
import {
  TELEMETRY_CATEGORIES,
  TELEMETRY_EVENTS
} from '../domain/telemetryTaxonomy.js';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal.jsx';

describe('Admin Analytics Dashboard & Storage Hub Test Suite (M3 & M4)', () => {
  const adminUser = {
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    role: 'admin',
    isAdmin: true
  };

  const teacherUser = {
    email: 'teacher.miriam@school.gov.il',
    name: 'מרים לוי',
    role: 'teacher',
    isAdmin: false
  };

  const nowMs = 1772450000000; // Fixed reference timestamp

  // Synthetic comprehensive telemetry event dataset
  const mockSyntheticEvents = [
    // 1. Engagement & Active users
    {
      eventId: 'ev_eng_1',
      eventName: TELEMETRY_EVENTS.SESSION_START,
      category: TELEMETRY_CATEGORIES.ENGAGEMENT,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      timestampMs: nowMs - 2 * 60 * 60 * 1000 // 2 hours ago (DAU, WAU, MAU)
    },
    {
      eventId: 'ev_eng_2',
      eventName: TELEMETRY_EVENTS.SESSION_START,
      category: TELEMETRY_CATEGORIES.ENGAGEMENT,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000 // 3 days ago (WAU, MAU)
    },
    {
      eventId: 'ev_eng_3',
      eventName: TELEMETRY_EVENTS.SESSION_START,
      category: TELEMETRY_CATEGORIES.ENGAGEMENT,
      anonUserId: 'user_hash_3',
      accountType: 'teacher',
      timestampMs: nowMs - 20 * 24 * 60 * 60 * 1000 // 20 days ago (MAU)
    },
    {
      eventId: 'ev_eng_4',
      eventName: TELEMETRY_EVENTS.SESSION_START,
      category: TELEMETRY_CATEGORIES.ENGAGEMENT,
      anonUserId: 'internal_tester_1',
      accountType: 'internal_test',
      timestampMs: nowMs - 1 * 60 * 60 * 1000
    },

    // 2. Daily Tracking Events
    {
      eventId: 'ev_dt_1',
      eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
      category: TELEMETRY_CATEGORIES.DAILY_TRACKING,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { mode: 'voice', isEdit: false },
      timestampMs: nowMs - 2 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_dt_2',
      eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
      category: TELEMETRY_CATEGORIES.DAILY_TRACKING,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { mode: 'voice', durationSec: 45, isEdit: false, streakDays: 5 },
      timestampMs: nowMs - 2 * 60 * 60 * 1000 + 45000
    },
    {
      eventId: 'ev_dt_3',
      eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
      category: TELEMETRY_CATEGORIES.DAILY_TRACKING,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      properties: { mode: 'text', isEdit: true },
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_dt_4',
      eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
      category: TELEMETRY_CATEGORIES.DAILY_TRACKING,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      properties: { mode: 'text', durationSec: 30, isEdit: true, streakDays: 12 },
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000 + 30000
    },
    {
      eventId: 'ev_dt_5',
      eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
      category: TELEMETRY_CATEGORIES.DAILY_TRACKING,
      anonUserId: 'user_hash_3',
      accountType: 'teacher',
      properties: { mode: 'text', isEdit: false },
      timestampMs: nowMs - 20 * 24 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_dt_6',
      eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED,
      category: TELEMETRY_CATEGORIES.DAILY_TRACKING,
      anonUserId: 'user_hash_3',
      accountType: 'teacher',
      properties: { mode: 'text', timeSpentSec: 15 },
      timestampMs: nowMs - 20 * 24 * 60 * 60 * 1000 + 15000
    },

    // 3. Staff Meeting Readiness & Pedagogical Summaries
    {
      eventId: 'ev_sum_1',
      eventName: TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED,
      category: TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { summaryType: 'staff_meeting', studentCountBand: '6-15' },
      timestampMs: nowMs - 12 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_sum_2',
      eventName: TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED,
      category: TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      properties: { summaryType: 'periodic_review', studentCountBand: '1-5' },
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000 + 3600000
    },
    {
      eventId: 'ev_sum_3',
      eventName: TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED,
      category: TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { itemsCompletedCount: 5, isFullyReady: true },
      timestampMs: nowMs - 11 * 60 * 60 * 1000
    },

    // 4. Document Sharing & Pedagogical Chat
    {
      eventId: 'ev_share_1',
      eventName: TELEMETRY_EVENTS.DOCUMENT_SHARED,
      category: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { format: 'pdf', channel: 'download' },
      timestampMs: nowMs - 4 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_share_2',
      eventName: TELEMETRY_EVENTS.DOCUMENT_SHARED,
      category: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      properties: { format: 'docx', channel: 'whatsapp_link' },
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000 + 7200000
    },
    {
      eventId: 'ev_chat_1',
      eventName: TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED,
      category: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { triggerSource: 'floating_dock' },
      timestampMs: nowMs - 3 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_chat_2',
      eventName: TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED,
      category: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { toolType: 'goal_suggester' },
      timestampMs: nowMs - 3 * 60 * 60 * 1000 + 30000
    },
    {
      eventId: 'ev_chat_3',
      eventName: TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED,
      category: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { durationSec: 120, turnsCount: 4 },
      timestampMs: nowMs - 3 * 60 * 60 * 1000 + 120000
    },

    // 5. Onboarding Funnel Steps
    {
      eventId: 'ev_onb_start',
      eventName: TELEMETRY_EVENTS.ONBOARDING_STARTED,
      category: TELEMETRY_CATEGORIES.ONBOARDING,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      timestampMs: nowMs - 15 * 24 * 60 * 60 * 1000
    },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => ({
      eventId: `ev_onb_step_${step}`,
      eventName: TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED,
      category: TELEMETRY_CATEGORIES.ONBOARDING,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { stepNumber: step },
      timestampMs: nowMs - 15 * 24 * 60 * 60 * 1000 + step * 60000
    })),
    {
      eventId: 'ev_onb_comp',
      eventName: TELEMETRY_EVENTS.ONBOARDING_COMPLETED,
      category: TELEMETRY_CATEGORIES.ONBOARDING,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      timestampMs: nowMs - 15 * 24 * 60 * 60 * 1000 + 700000
    },

    // 6. UX Friction & Technical Health
    {
      eventId: 'ev_fric_1',
      eventName: TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED,
      category: TELEMETRY_CATEGORIES.FRICTION,
      anonUserId: 'user_hash_3',
      accountType: 'teacher',
      timestampMs: nowMs - 20 * 24 * 60 * 60 * 1000 + 3600000
    },
    {
      eventId: 'ev_fric_2',
      eventName: TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY,
      category: TELEMETRY_CATEGORIES.FRICTION,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000 + 10800000
    },
    {
      eventId: 'ev_lat_1',
      eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED,
      category: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH,
      anonUserId: 'user_hash_1',
      accountType: 'teacher',
      properties: { latencyMs: 850 },
      timestampMs: nowMs - 7 * 60 * 60 * 1000
    },
    {
      eventId: 'ev_lat_2',
      eventName: TELEMETRY_EVENTS.AI_LATENCY_RECORDED,
      category: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH,
      anonUserId: 'user_hash_2',
      accountType: 'teacher',
      properties: { latencyMs: 2400 },
      timestampMs: nowMs - 3 * 24 * 60 * 60 * 1000 + 14400000
    },
    {
      eventId: 'ev_err_1',
      eventName: TELEMETRY_EVENTS.CLIENT_JS_ERROR,
      category: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH,
      anonUserId: 'user_hash_3',
      accountType: 'teacher',
      properties: { errorMessage: 'TypeError: Cannot read properties of undefined' },
      timestampMs: nowMs - 20 * 24 * 60 * 60 * 1000 + 18000000
    }
  ];

  // ==========================================================================
  // Section 1: Access Control & Authorization Tests
  // ==========================================================================
  describe('Access Control Guard & isUserAdmin Helper', () => {
    it('accurately identifies primary admin emails and role=admin', () => {
      expect(isUserAdmin({ email: 'zivit.reshef@gmail.com' })).toBe(true);
      expect(isUserAdmin({ email: 'moti.reshef@gmail.com' })).toBe(true);
      expect(isUserAdmin({ email: 'admin@tala.education' })).toBe(true);
      expect(isUserAdmin({ role: 'admin' })).toBe(true);
      expect(isUserAdmin({ role: 'superadmin' })).toBe(true);
      expect(isUserAdmin({ isAdmin: true })).toBe(true);
    });

    it('rejects regular teachers, unauthenticated users and demo accounts', () => {
      expect(isUserAdmin(null)).toBe(false);
      expect(isUserAdmin(undefined)).toBe(false);
      expect(isUserAdmin({})).toBe(false);
      expect(isUserAdmin({ email: 'teacher@school.org', role: 'teacher' })).toBe(false);
      expect(isUserAdmin({ email: 'demo@tala.education', role: 'demo' })).toBe(false);
    });

    it('renders Access Denied view when current user is not an administrator', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAnalyticsDashboard, {
          currentUser: teacherUser,
          initialEvents: mockSyntheticEvents
        })
      );

      expect(html).toContain('admin-access-denied');
      expect(html).toContain('גישה חסומה — נדרשות הרשאות ניהול');
      expect(html).not.toContain('admin-analytics-dashboard');
    });

    it('renders full analytics cockpit when current user is an authorized admin', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAnalyticsDashboard, {
          currentUser: adminUser,
          initialEvents: mockSyntheticEvents
        })
      );

      expect(html).toContain('admin-analytics-dashboard');
      expect(html).toContain('לוח בינת חוויית משתמש וטלמטריה');
      expect(html).toContain('0% PII — אפס חשיפת פרטי תלמיד');
      expect(html).not.toContain('admin-access-denied');
    });
  });

  // ==========================================================================
  // Section 2: Storage Ingestion & Query Timeframe Tests
  // ==========================================================================
  describe('telemetryStorage domain logic', () => {
    it('calculates accurate timeRange start timestamps', () => {
      const tNow = 1000000000000;
      expect(getTimeRangeStartMs('24h', null, tNow)).toBe(tNow - 24 * 3600 * 1000);
      expect(getTimeRangeStartMs('7d', null, tNow)).toBe(tNow - 7 * 24 * 3600 * 1000);
      expect(getTimeRangeStartMs('30d', null, tNow)).toBe(tNow - 30 * 24 * 3600 * 1000);
      expect(getTimeRangeStartMs('90d', null, tNow)).toBe(tNow - 90 * 24 * 3600 * 1000);
      expect(getTimeRangeStartMs('custom', 12345678, tNow)).toBe(12345678);
      expect(getTimeRangeStartMs('all', null, tNow)).toBe(0);
    });

    it('gracefully handles empty batch saving without error', async () => {
      const result = await saveTelemetryBatch([]);
      expect(result).toBe(true);
    });

    it('setupUsageTelemetryTransport connects saveTelemetryBatch to service', () => {
      const mockService = {
        setTransport: vi.fn()
      };
      setupUsageTelemetryTransport(mockService);
      expect(mockService.setTransport).toHaveBeenCalledWith(saveTelemetryBatch);
    });
  });

  // ==========================================================================
  // Section 3: Telemetry Aggregator Mathematics & Domain Logic
  // ==========================================================================
  describe('telemetryAggregator metric computations', () => {
    it('computes DAU, WAU, MAU, and stickiness ratio correctly', () => {
      const teacherEvents = mockSyntheticEvents.filter((e) => e.accountType === 'teacher');
      const metrics = computeActiveUsers(teacherEvents, nowMs);
      expect(metrics.dau).toBe(1); // user_hash_1 within 24h
      expect(metrics.wau).toBe(2); // user_hash_1, user_hash_2 within 7d
      expect(metrics.mau).toBe(3); // user_hash_1, user_hash_2, user_hash_3 within 30d
      expect(metrics.dauMauRatio).toBeCloseTo(33.3, 1);
    });

    it('computes deep Daily Tracking metrics (streaks, voice vs text, abandonment)', () => {
      const dt = computeDailyTrackingMetrics(mockSyntheticEvents);
      expect(dt.started).toBe(3);
      expect(dt.completed).toBe(2);
      expect(dt.abandoned).toBe(1);
      expect(dt.completionRate).toBeCloseTo(66.7, 1);
      expect(dt.abandonmentRate).toBeCloseTo(33.3, 1);

      // Voice vs text
      expect(dt.voiceCount).toBe(2); // 1 start + 1 comp
      expect(dt.textCount).toBe(3); // 2 starts + 1 comp
      expect(dt.voicePct + dt.textPct).toBe(100);

      // Streaks
      expect(dt.maxStreak).toBe(12);
      expect(dt.avgStreak).toBeCloseTo(8.5, 1);
      expect(dt.streakDistribution.length).toBe(4);
    });

    it('computes Staff Readiness & Pedagogical Summary metrics', () => {
      const staff = computeStaffReadinessMetrics(mockSyntheticEvents, 3);
      expect(staff.summariesGenerated).toBe(2);
      expect(staff.staffMeetingSummaries).toBe(1);
      expect(staff.periodicReviewSummaries).toBe(1);
      expect(staff.teacherAdoptionCount).toBe(2); // user_hash_1 and user_hash_2
      expect(staff.teacherAdoptionRate).toBeCloseTo(66.7, 1);
      expect(staff.readinessChecksCount).toBe(1);
      expect(staff.fullyReadyCount).toBe(1);
      expect(staff.fullyReadyRate).toBe(100);
      expect(staff.avgItemsCompleted).toBe(5);
    });

    it('computes Document Sharing & Pedagogical Chat metrics', () => {
      const sc = computeSharingAndChatMetrics(mockSyntheticEvents);
      expect(sc.totalDocsShared).toBe(2);
      expect(sc.formats.pdf).toBe(1);
      expect(sc.formats.docx).toBe(1);
      expect(sc.channels.whatsapp_link).toBe(1);
      expect(sc.channels.download).toBe(1);

      expect(sc.chatSessionsStarted).toBe(1);
      expect(sc.chatSessionsEnded).toBe(1);
      expect(sc.avgChatDurationSec).toBe(120);
      expect(sc.avgTurnsPerSession).toBe(4);
      expect(sc.toolDiscoveryCounts['goal_suggester']).toBe(1);
    });

    it('computes 10-step Onboarding Funnel and step conversions', () => {
      const onb = computeOnboardingFunnel(mockSyntheticEvents);
      expect(onb.started).toBe(1);
      expect(onb.completed).toBe(1);
      expect(onb.completionRate).toBe(100);
      expect(onb.steps.length).toBe(10);
      expect(onb.steps[0].stepNumber).toBe(1);
      expect(onb.steps[9].stepNumber).toBe(10);
    });

    it('computes UX Friction and AI latency percentiles (p50, p90, p95)', () => {
      const fric = computeUxFrictionMetrics(mockSyntheticEvents);
      expect(fric.dirtyExits).toBe(1);
      expect(fric.repeatedFailures).toBe(1);
      expect(fric.aiLatenciesCount).toBe(2);
      expect(fric.p50).toBeGreaterThanOrEqual(850);
      expect(fric.p95).toBe(2323);
    });

    it('computes Technical Health and Client JS errors', () => {
      const health = computeTechnicalHealthMetrics(mockSyntheticEvents);
      expect(health.jsErrorsCount).toBe(1);
      expect(health.topErrors.length).toBe(1);
      expect(health.topErrors[0].message).toContain('TypeError');
    });

    it('calculatePercentile accurately resolves edge and boundary values', () => {
      expect(calculatePercentile([], 50)).toBe(0);
      expect(calculatePercentile([100], 50)).toBe(100);
      expect(calculatePercentile([10, 20, 30, 40, 50], 50)).toBe(30);
      expect(calculatePercentile([10, 20, 30, 40, 50], 90)).toBe(46);
    });
  });

  // ==========================================================================
  // Section 4: Component Rendering & Tabs Verification
  // ==========================================================================
  describe('AdminAnalyticsDashboard Component UI & Navigation', () => {
    it('renders all 8 prominent tab buttons with correct Hebrew labels', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAnalyticsDashboard, {
          currentUser: adminUser,
          initialEvents: mockSyntheticEvents
        })
      );

      expect(html).toContain('data-testid="tab-overview"');
      expect(html).toContain('סקירה כללית');
      expect(html).toContain('data-testid="tab-daily"');
      expect(html).toContain('מעקב פדגוגי יומי');
      expect(html).toContain('data-testid="tab-staff"');
      expect(html).toContain('מוכנות לישיבות צוות');
      expect(html).toContain('data-testid="tab-sharing"');
      expect(html).toContain('שיתוף וצ&#x27;אט');
      expect(html).toContain('data-testid="tab-features"');
      expect(html).toContain('מודולים ואימוץ');
      expect(html).toContain('data-testid="tab-journeys"');
      expect(html).toContain('מסעות מורה ו-Onboarding');
      expect(html).toContain('data-testid="tab-friction"');
      expect(html).toContain('חיכוך וחוויית שימוש');
      expect(html).toContain('data-testid="tab-health"');
      expect(html).toContain('בריאות טכנית והגדרות');
    });

    it('renders time-range buttons and exclusion toggle in controls bar', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAnalyticsDashboard, {
          currentUser: adminUser,
          initialEvents: mockSyntheticEvents
        })
      );

      expect(html).toContain('data-testid="time-btn-24h"');
      expect(html).toContain('data-testid="time-btn-7d"');
      expect(html).toContain('data-testid="time-btn-30d"');
      expect(html).toContain('data-testid="time-btn-90d"');
      expect(html).toContain('data-testid="time-btn-custom"');
      expect(html).toContain('data-testid="toggle-exclude-internal"');
      expect(html).toContain('סנן חשבונות בדיקה ומנהלים');
      expect(html).toContain('data-testid="btn-export-csv"');
    });

    it('renders Overview tab content by default with KPI cards and cohort table', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAnalyticsDashboard, {
          currentUser: adminUser,
          initialEvents: mockSyntheticEvents
        })
      );

      expect(html).toContain('data-testid="tab-content-overview"');
      expect(html).toContain('משתמשים פעילים חודשיים (MAU)');
      expect(html).toContain('משתמשים פעילים יומיים (DAU)');
      expect(html).toContain('מטריצת שימור שבועי');
    });

    it('renders Hebrew RTL structure with dir="rtl"', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAnalyticsDashboard, {
          currentUser: adminUser,
          initialEvents: mockSyntheticEvents
        })
      );

      expect(html).toContain('dir="rtl"');
    });
  });

  // ==========================================================================
  // Section 5: AdminAllowlistModal Integration Test
  // ==========================================================================
  describe('AdminAllowlistModal Integration', () => {
    it('integrates AdminAnalyticsDashboard under activeTab="analytics"', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAllowlistModal, {
          isOpen: true,
          onClose: () => {},
          currentUser: adminUser,
          initialTab: 'analytics',
          allowedUsers: [
            { id: 'u1', name: 'זיוית', email: 'zivit.reshef@gmail.com', role: 'admin' },
            { id: 'u2', name: 'שרה', email: 'sarah@school.org', role: 'teacher' }
          ],
          students: [
            { id: 's1', name: 'דניאל', ownerEmail: 'sarah@school.org' }
          ]
        })
      );

      expect(html).toContain('admin-analytics-dashboard');
      expect(html).toContain('לוח בינת חוויית משתמש וטלמטריה — TALA');
      expect(html).toContain('0% PII — אפס חשיפת פרטי תלמיד');
    });
  });
});
