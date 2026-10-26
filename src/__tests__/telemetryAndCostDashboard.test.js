import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLocalDayKey,
  getLocalMonthKey,
  toTimestampMs,
  calculateStorageFootprint,
  aggregateTelemetryData,
  generateTelemetryCsv,
  detectAbnormalSpikes,
  DAILY_AI_QUOTA_LIMIT,
  DAILY_EMAIL_QUOTA_LIMIT
} from '../domain/telemetry.js';
import {
  maskEmailForPrivacy,
  recordEmailAuditLogToCloud,
  fetchTelemetrySnapshot,
  setEmergencyAiFreeze
} from '../services/telemetryService.js';
import * as firebaseBackend from '../firebaseBackend';
import * as firestore from 'firebase/firestore';

vi.mock('../firebaseBackend', () => ({
  getFirestoreDb: vi.fn(),
  getFirebaseAuth: vi.fn(),
  saveSettingsToCloud: vi.fn(),
  sanitizeForFirestore: (x) => x
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, name) => ({ db, name })),
  doc: vi.fn((col, id) => ({ col, id })),
  setDoc: vi.fn().mockResolvedValue(true),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn((...args) => ({ args })),
  orderBy: vi.fn(),
  limit: vi.fn()
}));

describe('Telemetry & Cost Dashboard Domain', () => {
  it('formats local day and month keys correctly', () => {
    const fixedDate = new Date('2026-10-26T12:00:00Z');
    expect(getLocalDayKey(fixedDate)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getLocalMonthKey(fixedDate)).toMatch(/^\d{4}-\d{2}$/);
    expect(getLocalDayKey('invalid')).toBe('');
  });

  it('converts diverse timestamp formats to ms correctly', () => {
    expect(toTimestampMs(1700000000000)).toBe(1700000000000);
    expect(toTimestampMs('2026-10-26T10:00:00Z')).toBeGreaterThan(0);
    expect(toTimestampMs({ toMillis: () => 12345 })).toBe(12345);
    expect(toTimestampMs({ seconds: 100, nanoseconds: 500000000 })).toBe(100500);
    expect(toTimestampMs(null)).toBe(0);
  });

  it('calculates storage footprint across student records and sorts largest files', () => {
    const students = [
      {
        id: 's1',
        name: 'דני כהן',
        diagnosticDossier: {
          documents: [
            { id: 'd1', fileName: 'diag1.pdf', storagePath: 'dossier_files/s1/doc1.pdf', fileSize: 1024 * 1024 * 2 }, // 2MB
            { id: 'd2', fileName: 'scan.pdf', storagePath: 'dossier_files/s1/doc2.pdf', fileSize: 1024 * 1024 * 8 }  // 8MB
          ]
        }
      },
      {
        id: 's2',
        name: 'רוני לוי',
        diagnosticDossier: {
          documents: [
            { id: 'd3', fileName: 'speech.pdf', storagePath: 'dossier_files/s2/doc3.pdf', fileSize: 1024 * 1024 * 5 } // 5MB
          ]
        }
      },
      {
        id: 's3' // No dossier
      }
    ];

    const footprint = calculateStorageFootprint(students);
    expect(footprint.totalFiles).toBe(3);
    expect(footprint.totalBytes).toBe(1024 * 1024 * 15); // 15MB
    expect(footprint.formattedMb).toBe('15.0 MB');
    expect(footprint.usagePercent).toBeGreaterThan(0);

    // Largest files check
    expect(footprint.largestFiles.length).toBe(3);
    expect(footprint.largestFiles[0].fileName).toBe('scan.pdf');
    expect(footprint.largestFiles[0].formattedSize).toBe('8.0 MB');
    expect(footprint.largestFiles[0].studentName).toBe('דני כהן');
  });

  it('aggregates live AI queries, emails, costs, and timeline accurately', () => {
    const today = new Date('2026-10-26T12:00:00Z');
    const todayMs = today.getTime();
    const yesterdayMs = todayMs - 24 * 60 * 60 * 1000;

    const aiLogs = [
      { email: 'teacher1@school.org', status: 'ok', createdAt: todayMs },
      { email: 'teacher1@school.org', status: 'ok', createdAt: todayMs },
      { email: 'teacher2@school.org', status: 'ok', createdAt: todayMs },
      { email: 'teacher2@school.org', status: 'ok', createdAt: yesterdayMs },
      { email: 'attacker@evil.org', status: 'blocked_injection', createdAt: todayMs, operation: 'rawPrompt' },
      { email: 'spammer@evil.org', status: 'rate_limit_exceeded', createdAt: todayMs, operation: 'rawPrompt', limitedWindow: 'minute' }
    ];

    const emailLogs = [
      { userEmail: 'teacher1@school.org', createdAtMs: todayMs },
      { userEmail: 'teacher2@school.org', createdAtMs: yesterdayMs }
    ];

    const result = aggregateTelemetryData({
      aiLogs,
      emailLogs,
      students: [],
      settings: { aiFreeze: false },
      now: today
    });

    // AI Counts
    expect(result.aiTodayCount).toBe(5); // 3 ok + 1 injection + 1 rate limit
    expect(result.aiMonthCount).toBe(6);
    expect(result.aiQuotaLimit).toBe(DAILY_AI_QUOTA_LIMIT);
    expect(result.aiRemainingToday).toBe(DAILY_AI_QUOTA_LIMIT - 5);

    // Email Counts
    expect(result.emailTodayCount).toBe(1);
    expect(result.emailMonthCount).toBe(2);
    expect(result.emailQuotaLimit).toBe(DAILY_EMAIL_QUOTA_LIMIT);

    // Costs
    expect(result.estimatedAiCostUsd).toBeGreaterThan(0);
    expect(result.estimatedAiCostIls).toBeGreaterThan(0);

    // Security & Threat Level
    expect(result.blockedInjections.length).toBe(1);
    expect(result.rateLimitEvents.length).toBe(1);
    expect(result.threatLevel).toBe('warning');
    expect(result.isAiFrozen).toBe(false);

    // Blaze Breakdown
    expect(result.blazeBreakdown.length).toBe(5);
    expect(result.blazeBreakdown[0].service).toContain('Gemini');

    // 7-day sparkline
    expect(result.last7Days.length).toBe(7);
    const todayBucket = result.last7Days[result.last7Days.length - 1];
    expect(todayBucket.aiCount).toBe(5);
    expect(todayBucket.emailCount).toBe(1);

    // Top teachers ranking
    expect(result.topActiveTeachers.length).toBeGreaterThan(0);
    expect(result.topActiveTeachers[0].email).toBe('teacher1@school.org');
  });

  it('triggers critical threat level when 3+ injections detected within 24h', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    const nowMs = now.getTime();
    const aiLogs = [
      { email: 'bad1@test.com', status: 'blocked_injection', createdAt: nowMs },
      { email: 'bad2@test.com', status: 'blocked_injection', createdAt: nowMs - 1000 },
      { email: 'bad3@test.com', status: 'blocked_injection', createdAt: nowMs - 2000 }
    ];

    const result = aggregateTelemetryData({ aiLogs, now });
    expect(result.threatLevel).toBe('critical');
    expect(result.recentInjectionsCount).toBe(3);
  });

  it('triggers critical threat level when 5+ rate limits detected within 24h', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    const nowMs = now.getTime();
    const aiLogs = Array.from({ length: 5 }).map((_, i) => ({
      email: `bad_${i}@test.com`,
      status: 'rate_limit_exceeded',
      createdAt: nowMs - i * 1000
    }));

    const result = aggregateTelemetryData({ aiLogs, now });
    expect(result.threatLevel).toBe('critical');
    expect(result.recentRateLimitsCount).toBe(5);
  });

  it('generates valid CSV export string with proper escaping', () => {
    const aiLogs = [
      { email: 'teacher@school.org', operation: 'rawPrompt', status: 'ok', model: 'gemini-2.5-flash', createdAt: 1700000000000 }
    ];
    const emailLogs = [
      { userEmail: 'teacher@school.org', recipientMasked: 'p***t@home.com', createdAtMs: 1700000000000 }
    ];

    const csv = generateTelemetryCsv({ aiLogs, emailLogs });
    expect(csv).toContain('"AI_QUERY"');
    expect(csv).toContain('"teacher@school.org"');
    expect(csv).toContain('"EMAIL_SENT"');
    expect(csv).toContain('"p***t@home.com"');
  });

  it('respects emergency AI freeze setting in status payload', () => {
    const result = aggregateTelemetryData({ settings: { aiFreeze: true } });
    expect(result.isAiFrozen).toBe(true);
  });

  it('handles empty or corrupted input gracefully', () => {
    const result = aggregateTelemetryData();
    expect(result.aiTodayCount).toBe(0);
    expect(result.emailTodayCount).toBe(0);
    expect(result.threatLevel).toBe('safe');
    expect(result.last7Days.length).toBe(7);
  });
});

  it('detects soft quota warnings when AI, email, or storage cross 80% threshold', () => {
    const report = detectAbnormalSpikes({
      aiTodayCount: 1250, // > 80% of 1500
      emailTodayCount: 85, // > 80% of 100
      storage: { usagePercent: 82, formattedMb: '4,198 MB' }
    });

    expect(report.hasAnomalies).toBe(true);
    expect(report.anomalies.length).toBe(3);
    expect(report.anomalies[0].id).toBe('warn_ai_soft_quota');
    expect(report.anomalies[1].id).toBe('warn_email_soft_quota');
    expect(report.anomalies[2].id).toBe('warn_storage_soft_quota');
  });

  it('detects runaway teacher anomaly when one user dominates AI queries', () => {
    const report = detectAbnormalSpikes({
      aiTodayCount: 50,
      topActiveTeachers: [
        { email: 'runaway@school.org', aiCount: 25 } // 50% > 40%
      ]
    });

    expect(report.hasAnomalies).toBe(true);
    expect(report.anomalies.some((a) => a.id.includes('runaway@school.org'))).toBe(true);
  });

  it('detects volume spike when today usage is > 2.5x the 7-day average', () => {
    const report = detectAbnormalSpikes({
      aiTodayCount: 80,
      last7Days: [
        { aiCount: 20 },
        { aiCount: 20 },
        { aiCount: 20 },
        { aiCount: 20 },
        { aiCount: 20 },
        { aiCount: 20 },
        { aiCount: 80 }
      ]
    });

    expect(report.hasAnomalies).toBe(true);
    expect(report.anomalies.some((a) => a.id === 'anomaly_volume_spike')).toBe(true);
  });

describe('Telemetry Service Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('masks email addresses properly for student/teacher privacy', () => {
    expect(maskEmailForPrivacy('teacher@gmail.com')).toBe('t***r@gmail.com');
    expect(maskEmailForPrivacy('ab@domain.org')).toBe('*@domain.org');
    expect(maskEmailForPrivacy('invalid-format')).toBe('invalid-format');
    expect(maskEmailForPrivacy('')).toBe('');
  });

  it('records email audit log to cloud when user is logged in', async () => {
    vi.mocked(firebaseBackend.getFirestoreDb).mockReturnValue({ type: 'mockDb' });
    vi.mocked(firebaseBackend.getFirebaseAuth).mockReturnValue({
      currentUser: { email: 'teacher@school.org' }
    });

    const res = await recordEmailAuditLogToCloud({ recipientEmail: 'parent@home.com' });
    expect(res).toBe(true);
    expect(firestore.setDoc).toHaveBeenCalled();
  });

  it('handles offline state safely when recording email audit log', async () => {
    vi.mocked(firebaseBackend.getFirestoreDb).mockReturnValue(null);
    const res = await recordEmailAuditLogToCloud({ recipientEmail: 'parent@home.com' });
    expect(res).toBe(false);
  });

  it('fetches telemetry snapshot from firestore collections', async () => {
    vi.mocked(firebaseBackend.getFirestoreDb).mockReturnValue({ type: 'mockDb' });
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      docs: [
        { id: 'log1', data: () => ({ email: 't1@s.org', status: 'ok', createdAt: 123456 }) }
      ]
    }).mockResolvedValueOnce({
      docs: [
        { id: 'email1', data: () => ({ userEmail: 't1@s.org', createdAtMs: 123456 }) }
      ]
    });

    const snap = await fetchTelemetrySnapshot();
    expect(snap.isOnline).toBe(true);
    expect(snap.aiLogs.length).toBe(1);
    expect(snap.emailLogs.length).toBe(1);
  });

  it('updates emergency AI freeze in cloud settings', async () => {
    vi.mocked(firebaseBackend.saveSettingsToCloud).mockResolvedValue(true);
    const res = await setEmergencyAiFreeze(true);
    expect(firebaseBackend.saveSettingsToCloud).toHaveBeenCalledWith({ aiFreeze: true });
    expect(res).toBe(true);
  });
});
