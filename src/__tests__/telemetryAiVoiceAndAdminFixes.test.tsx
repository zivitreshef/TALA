import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import AdminAlertsPanel from '../components/admin/AdminAlertsPanel';
import AdminUsageAndSecurityDashboard from '../components/modals/AdminUsageAndSecurityDashboard';
import AdminAnalyticsDashboard from '../components/admin/AdminAnalyticsDashboard';
import {
  TELEMETRY_EVENTS,
  TELEMETRY_CATEGORIES,
  EVENT_CATEGORY_MAP,
  EVENT_SCHEMAS,
  validateEventProperties
} from '../domain/telemetryTaxonomy';
import { computeDailyTrackingMetrics } from '../domain/telemetryAggregator';

describe('Admin Alert Panel - Collapsed Default & Clean Hebrew (Issue 1)', () => {
  const mockAdmins = [
    { id: 'admin1', name: 'זיוית רשף', email: 'zivit.reshef@gmail.com', role: 'admin', active: true },
    { id: 'admin2', name: 'מוטי רשף', email: 'moti_reshef@bmc.com', role: 'admin', active: true }
  ];

  it('renders with all admin cards collapsed by default (zivit not expanded by default)', () => {
    const html = renderToStaticMarkup(
      <AdminAlertsPanel allowedUsers={mockAdmins} />
    );

    expect(html).toContain('זיוית רשף');
    expect(html).toContain('מוטי רשף');
    // Channel configuration section is hidden when collapsed
    expect(html).not.toContain('סוגי ההתרעות שיועברו לערוצים המסומנים של חשבון זה:');
  });

  it('prohibits English phrases in parentheses across all titles and headers in AdminAlertsPanel', () => {
    const html = renderToStaticMarkup(
      <AdminAlertsPanel allowedUsers={mockAdmins} />
    );

    expect(html).toContain('התרעות מנהל בזמן אמת');
    expect(html).not.toContain('(Real-Time Push Alerts)');
    expect(html).not.toContain('(CallMeBot חינם)');
    expect(html).not.toContain('(Email Push)');
    expect(html).not.toContain('(Telegram Push Bot)');
    expect(html).not.toContain('(Telegram Chat ID)');
  });
});

describe('Admin Control Center - Detailed AI Records & Goal Matching (Issue 2)', () => {
  it('renders detailed AI activity log table in AdminUsageAndSecurityDashboard', () => {
    const html = renderToStaticMarkup(
      <AdminUsageAndSecurityDashboard
        students={[]}
        settings={{}}
      />
    );

    expect(html).toContain('detailed-ai-logs-panel');
    expect(html).toContain('פירוט שאילתות ופעולות AI אחרונות');
    expect(html).toContain('חיפוש לפי מייל משתמש/ת...');
    expect(html).toContain('כל סוגי הפעולות');
  });

  it('prohibits English in parentheses across all titles in AdminUsageAndSecurityDashboard', () => {
    const html = renderToStaticMarkup(
      <AdminUsageAndSecurityDashboard
        students={[]}
        settings={{}}
      />
    );

    expect(html).not.toContain('(Proactive Anomaly Alerts)');
    expect(html).not.toContain('(Gemini)');
    expect(html).not.toContain('(Apps Script)');
    expect(html).not.toContain('(Storage)');
    expect(html).not.toContain('(Free Tier)');
    expect(html).not.toContain('(Top 5 Files)');
    expect(html).not.toContain('(Security & Abuse Watchdog)');
    expect(html).not.toContain('(Real Cloud Consumer Ranking)');
  });
});

describe('Voice Telemetry & Aggregation (Issue 3)', () => {
  it('registers VOICE_OBSERVATION_RECORDED in telemetry taxonomy and schemas', () => {
    expect(TELEMETRY_EVENTS.VOICE_OBSERVATION_RECORDED).toBe('voice_observation_recorded');
    expect(EVENT_CATEGORY_MAP[TELEMETRY_EVENTS.VOICE_OBSERVATION_RECORDED]).toBe(TELEMETRY_CATEGORIES.DAILY_TRACKING);
    expect(EVENT_SCHEMAS[TELEMETRY_EVENTS.VOICE_OBSERVATION_RECORDED]).toBeDefined();

    const valid = validateEventProperties(TELEMETRY_EVENTS.VOICE_OBSERVATION_RECORDED, {
      durationSec: 15,
      hasTranscript: true
    });
    expect(valid.valid).toBe(true);
  });

  it('computes voice percentage and count correctly in computeDailyTrackingMetrics', () => {
    const events = [
      {
        eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
        properties: { mode: 'voice', isEdit: false }
      },
      {
        eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
        properties: { mode: 'voice', durationSec: 20, isEdit: false, streakDays: 2 }
      },
      {
        eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
        properties: { mode: 'text', isEdit: false }
      },
      {
        eventName: TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
        properties: { mode: 'text', durationSec: 45, isEdit: false, streakDays: 2 }
      }
    ];

    const metrics = computeDailyTrackingMetrics(events);
    expect(metrics.voiceCount).toBe(2);
    expect(metrics.textCount).toBe(2);
    expect(metrics.voicePct).toBe(50);
  });

  it('renders voice tracking KPI card and breakdown panel in AdminAnalyticsDashboard', () => {
    const adminUser = { email: 'moti.reshef@gmail.com', role: 'admin' };
    const html = renderToStaticMarkup(
      <AdminAnalyticsDashboard currentUser={adminUser} initialTab="daily" />
    );

    expect(html).toContain('kpi-card-voice-tracking');
    expect(html).toContain('תיעודים קוליים');
    expect(html).toContain('panel-voice-vs-text');
    expect(html).toContain('אופן הזנת התיעוד');
  });
});

describe('Hebrew Wording & Typo Fixes in AdminAnalyticsDashboard (Issue 4)', () => {
  it('renders clean Hebrew for chat sessions without "ססיות" or "לססיה" typos', () => {
    const adminUser = { email: 'moti.reshef@gmail.com', role: 'admin' };
    const html = renderToStaticMarkup(
      <AdminAnalyticsDashboard currentUser={adminUser} initialTab="sharing" />
    );

    expect(html).toContain('שיחות צ&#x27;אט פדגוגי');
    expect(html).toContain('אינטראקציות לשיחה');
    expect(html).not.toContain('ססיות');
    expect(html).not.toContain('ססיה');
  });

  it('prohibits English parentheses in operational AI health heading', () => {
    const adminUser = { email: 'moti.reshef@gmail.com', role: 'admin' };
    const html = renderToStaticMarkup(
      <AdminAnalyticsDashboard currentUser={adminUser} initialTab="health" />
    );

    expect(html).toContain('בריאות ותקינות מנוע ה-AI והרשת');
    expect(html).not.toContain('(tala_health_events)');
  });
});
