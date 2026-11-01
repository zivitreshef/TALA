import { describe, it, expect } from 'vitest';
import {
  DISCIPLINE_LEAD_OPTIONS,
  mergeObservationsLists,
  mergeGoalObjects,
  mergeStudentSnapshots,
  mergeTeamMessages,
  type SyncGoal,
  type StudentSnapshot
} from '../domain/studentSyncMerge';
import {
  SENDER_ROLES,
  THREAD_STATUS,
  RESOLUTION_FEEDBACK,
  MAX_MESSAGE_LENGTH,
  MAX_IMAGE_RAW_SIZE_BYTES,
  validateChatImageSecurity,
  escapeHtml,
  sanitizeThreadKey,
  createChatMessage,
  appendMessageToThread,
  countUnreadMessages,
  markThreadAsRead,
  buildAdminChatDeepLink,
  formatAdminChatNotificationMessage,
  buildAdminChatNotificationEmailHtml,
  computePendingInquiriesCount
} from '../domain/supportChat';
import {
  DAILY_AI_QUOTA_LIMIT,
  DAILY_EMAIL_QUOTA_LIMIT,
  FREE_STORAGE_LIMIT_BYTES,
  getLocalDayKey,
  getLocalMonthKey,
  toTimestampMs,
  calculateStorageFootprint,
  detectAbnormalSpikes,
  aggregateTelemetryData,
  generateTelemetryCsv
} from '../domain/telemetry';

describe('TypeScript Migration Phase 2 Batch 6 Gate', () => {
  describe('studentSyncMerge.ts', () => {
    it('provides immutable discipline lead options', () => {
      expect(DISCIPLINE_LEAD_OPTIONS).toContain('צוות משותף');
      expect(DISCIPLINE_LEAD_OPTIONS).toContain('מחנכת הכיתה');
      expect(DISCIPLINE_LEAD_OPTIONS).toContain('קלינאית תקשורת');
      expect(DISCIPLINE_LEAD_OPTIONS.length).toBe(9);
    });

    it('merges observations lists with deduplication and chronological ordering', () => {
      const localObs = [
        { id: 'o1', dateIso: '2026-03-01T10:00:00Z', note: 'הערה מקומית' },
        { id: 'o2', dateIso: '2026-03-02T10:00:00Z', note: 'תצפית 2' }
      ];
      const serverObs = [
        { id: 'o1', dateIso: '2026-03-01T10:00:00Z', note: 'הערה מעודכנת משרת' },
        { id: 'o3', dateIso: '2026-02-28T10:00:00Z', note: 'תצפית מוקדמת' }
      ];

      const merged = mergeObservationsLists(localObs, serverObs);
      expect(merged).toHaveLength(3);
      expect(merged[0].id).toBe('o3');
      expect(merged[1].id).toBe('o1');
      expect(merged[1].note).toBe('הערה מעודכנת משרת');
      expect(merged[2].id).toBe('o2');
    });

    it('performs three-way merge on goal objects without clobbering concurrent edits', () => {
      const baseGoal: SyncGoal = {
        id: 'g1',
        title: 'כותרת מקורית',
        objectives: 'יעדים מקוריים',
        leadProfessional: 'צוות משותף',
        observations: [{ id: 'obs1', dateIso: '2026-01-01', note: 'בסיס' }]
      };

      const serverGoal: SyncGoal = {
        ...baseGoal,
        title: 'כותרת שונתה בשרת',
        leadProfessional: 'קלינאית תקשורת',
        achievementStatus: 'בתהליך',
        observations: [
          { id: 'obs1', dateIso: '2026-01-01', note: 'בסיס' },
          { id: 'obs_server', dateIso: '2026-01-02', note: 'תצפית שרת' }
        ]
      };

      const localGoal: SyncGoal = {
        ...baseGoal,
        objectives: 'יעדים שונו מקומית',
        observations: [
          { id: 'obs1', dateIso: '2026-01-01', note: 'בסיס' },
          { id: 'obs_local', dateIso: '2026-01-03', note: 'תצפית מקומית' }
        ]
      };

      const merged = mergeGoalObjects(localGoal, serverGoal, baseGoal);
      expect(merged.title).toBe('כותרת שונתה בשרת');
      expect(merged.objectives).toBe('יעדים שונו מקומית');
      expect(merged.leadProfessional).toBe('קלינאית תקשורת');
      expect(merged.achievementStatus).toBe('בתהליך');
      expect(merged.observations).toHaveLength(3);
    });

    it('merges student snapshots, reconciling sharing list, read receipts, and team messages', () => {
      const localStudent: StudentSnapshot = {
        id: 's1',
        name: 'תלמיד א',
        sharedWith: ['teacher1@school.org'],
        sharedReadBy: ['teacher1@school.org'],
        goals: [{ id: 'g1', title: 'מטרה מקומית' }],
        teamMessages: [{ id: 'm1', text: 'הודעה 1', createdAt: '2026-03-01T12:00:00Z' }]
      };

      const serverStudent: StudentSnapshot = {
        id: 's1',
        name: 'תלמיד א',
        sharedWith: ['teacher1@school.org', 'unshared_teacher@school.org'],
        sharedReadBy: ['teacher1@school.org', 'unshared_teacher@school.org'],
        goals: [
          { id: 'g1', title: 'מטרה מקומית' },
          { id: 'g2', title: 'מטרה שנוספה בשרת' }
        ],
        teamMessages: [
          { id: 'm1', text: 'הודעה 1', createdAt: '2026-03-01T12:00:00Z' },
          { id: 'm2', text: 'הודעה 2 מהקולגה', createdAt: '2026-03-01T13:00:00Z' }
        ]
      };

      const merged = mergeStudentSnapshots({ localStudent, serverStudent });
      expect(merged.sharedWith).toEqual(['teacher1@school.org']);
      expect(merged.sharedReadBy).toEqual(['teacher1@school.org']);
      expect(merged.goals).toHaveLength(2);
      expect(merged.teamMessages).toHaveLength(2);
      expect(merged.updatedAt).toBeDefined();
    });

    it('merges team messages preserving soft deletions and reading receipts', () => {
      const localMsgs = [
        { id: 'm1', text: 'שלום', isDeleted: false, readBy: ['a@school.org'] }
      ];
      const serverMsgs = [
        { id: 'm1', text: 'שלום', isDeleted: true, readBy: ['b@school.org'] }
      ];

      const merged = mergeTeamMessages(localMsgs, serverMsgs);
      expect(merged).toHaveLength(1);
      expect(merged[0].isDeleted).toBe(true);
      expect(merged[0].text).toContain('נמחקה');
      expect(merged[0].readBy).toContain('a@school.org');
      expect(merged[0].readBy).toContain('b@school.org');
    });
  });

  describe('supportChat.ts', () => {
    it('validates image upload security strictly', () => {
      expect(validateChatImageSecurity(null).valid).toBe(false);
      expect(validateChatImageSecurity({ size: 0, name: 'pic.png' }).valid).toBe(false);
      expect(validateChatImageSecurity({ size: MAX_IMAGE_RAW_SIZE_BYTES + 1, name: 'pic.png' }).valid).toBe(false);
      expect(validateChatImageSecurity({ size: 5000, name: 'noext' }).valid).toBe(false);
      expect(validateChatImageSecurity({ size: 5000, name: 'evil.exe' }).valid).toBe(false);
      expect(validateChatImageSecurity({ size: 5000, name: 'exploit.php.png' }).valid).toBe(false);
      expect(validateChatImageSecurity({ size: 5000, name: 'bad.js.jpg' }).valid).toBe(false);
      expect(validateChatImageSecurity({ size: 5000, name: 'image.png', type: 'application/pdf' }).valid).toBe(false);

      const validPng = validateChatImageSecurity({ size: 50000, name: 'screenshot.png', type: 'image/png' });
      expect(validPng.valid).toBe(true);
      expect(validPng.extension).toBe('png');
    });

    it('escapes html and sanitizes thread keys', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sanitizeThreadKey('Teacher.Name+1@Matya.Org.IL')).toBe('teacher.name_1_matya.org.il');
      expect(sanitizeThreadKey(null)).toBe('guest_thread');
    });

    it('creates and bounds chat messages and threads', () => {
      const msg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        senderEmail: 'teacher@school.org',
        senderName: 'מורה',
        text: 'A'.repeat(MAX_MESSAGE_LENGTH + 500)
      });
      expect(msg.text.length).toBe(MAX_MESSAGE_LENGTH);
      expect(msg.senderRole).toBe('user');

      const thread = appendMessageToThread(null, msg);
      expect(thread.status).toBe(THREAD_STATUS.ACTIVE);
      expect(thread.unreadByAdmin).toBe(true);
      expect(thread.unreadByUser).toBe(false);
      expect(countUnreadMessages(thread, SENDER_ROLES.ADMIN)).toBe(1);
      expect(countUnreadMessages(thread, SENDER_ROLES.USER)).toBe(0);

      const readThread = markThreadAsRead(thread, SENDER_ROLES.ADMIN);
      expect(countUnreadMessages(readThread, SENDER_ROLES.ADMIN)).toBe(0);
      expect(RESOLUTION_FEEDBACK.THUMBS_UP).toBe('thumbs_up');
      expect(buildAdminChatDeepLink('teacher@test.com', 'https://tala.app')).toBe(
        'https://tala.app?openAdminChat=teacher%40test.com'
      );
    });

    it('formats admin notification text and HTML email with deep-links', () => {
      const text = formatAdminChatNotificationMessage({
        teacherName: 'שרה',
        teacherEmail: 'sara@matya.org',
        topic: 'שאלה על תל"א',
        messageText: 'איך יוצרים יעד?',
        siteUrl: 'https://app.tala.org'
      });
      expect(text).toContain('שרה');
      expect(text).toContain('שאלה על תל"א');
      expect(text).toContain('https://app.tala.org?openAdminChat=sara%40matya.org');

      const html = buildAdminChatNotificationEmailHtml({
        teacherName: 'שרה',
        teacherEmail: 'sara@matya.org',
        topic: 'שאלה על תל"א',
        messageText: 'איך יוצרים יעד?'
      });
      expect(html).toContain('sara@matya.org');
      expect(html).toContain('איך יוצרים יעד?');
      expect(html).toContain('openAdminChat=sara%40matya.org');
    });

    it('computes deduplicated pending inquiries count', () => {
      const supportThreads = [
        { id: 't1', userEmail: 'user1@school.org', unreadByAdmin: true },
        { id: 't2', userEmail: 'user2@school.org', unreadByAdmin: false, status: THREAD_STATUS.ACTIVE },
        { id: 't3', userEmail: 'user3@school.org', unreadByAdmin: false, status: THREAD_STATUS.NEEDS_ATTENTION }
      ];
      const adminRequests = [
        { id: 'r1', email: 'user1@school.org' }, // already in live threads
        { id: 'r2', email: 'guest@school.org' }  // new standalone request
      ];

      const pending = computePendingInquiriesCount(adminRequests, supportThreads);
      expect(pending).toBe(3); // t1 (unread), t3 (needs_attention), r2 (standalone)
    });
  });

  describe('telemetry.ts', () => {
    it('formats day and month keys and parses firestore timestamps', () => {
      const fixedDate = new Date(2026, 2, 15); // March 15, 2026
      expect(getLocalDayKey(fixedDate)).toBe('2026-03-15');
      expect(getLocalMonthKey(fixedDate)).toBe('2026-03');

      expect(toTimestampMs(1700000000000)).toBe(1700000000000);
      expect(toTimestampMs({ toMillis: () => 1710000000000 })).toBe(1710000000000);
      expect(toTimestampMs({ seconds: 1720000000, nanoseconds: 500000000 })).toBe(1720000000500);
      expect(toTimestampMs(null)).toBe(0);
      expect(FREE_STORAGE_LIMIT_BYTES).toBe(5 * 1024 * 1024 * 1024);
    });

    it('calculates cloud storage footprint across student dossiers', () => {
      const students = [
        {
          id: 's1',
          name: 'יונתן',
          diagnosticDocuments: [
            { id: 'd1', fileName: 'diag.pdf', fileSize: 1024 * 1024 }, // 1 MB
            { id: 'd2', fileName: 'eval.docx', fileSize: 2 * 1024 * 1024 } // 2 MB
          ]
        }
      ];

      const footprint = calculateStorageFootprint(students);
      expect(footprint.totalFiles).toBe(2);
      expect(footprint.totalBytes).toBe(3 * 1024 * 1024);
      expect(footprint.formattedMb).toBe('3.0 MB');
      expect(footprint.largestFiles).toHaveLength(2);
      expect(footprint.largestFiles[0].fileName).toBe('eval.docx');
    });

    it('detects abnormal quota consumption, spikes, and runaway users', () => {
      const normalReport = detectAbnormalSpikes({
        aiTodayCount: 10,
        emailTodayCount: 5,
        storage: { usagePercent: 10 }
      });
      expect(normalReport.hasAnomalies).toBe(false);

      const quotaReport = detectAbnormalSpikes({
        aiTodayCount: DAILY_AI_QUOTA_LIMIT * 0.85,
        emailTodayCount: DAILY_EMAIL_QUOTA_LIMIT * 0.9,
        storage: { usagePercent: 85, formattedMb: '4,350 MB' },
        topActiveTeachers: [{ email: 'heavy@school.org', aiCount: 600, emailCount: 0, lastActiveMs: 0 }],
        last7Days: [
          { key: 'd1', dayName: 'א', dateShort: '1/3', aiCount: 20, emailCount: 0 },
          { key: 'd2', dayName: 'ב', dateShort: '2/3', aiCount: 20, emailCount: 0 },
          { key: 'd3', dayName: 'ג', dateShort: '3/3', aiCount: 1275, emailCount: 0 }
        ]
      });
      expect(quotaReport.hasAnomalies).toBe(true);
      expect(quotaReport.anomalies.some((a) => a.id === 'warn_ai_soft_quota')).toBe(true);
      expect(quotaReport.anomalies.some((a) => a.id === 'warn_email_soft_quota')).toBe(true);
      expect(quotaReport.anomalies.some((a) => a.id === 'warn_storage_soft_quota')).toBe(true);
      expect(quotaReport.anomalies.some((a) => a.id.startsWith('anomaly_teacher_'))).toBe(true);
      expect(quotaReport.anomalies.some((a) => a.id === 'anomaly_volume_spike')).toBe(true);
    });

    it('aggregates complete telemetry data, cost estimates, and security threat levels', () => {
      const now = new Date(2026, 2, 10, 12, 0, 0);
      const todayMs = now.getTime();

      const aiLogs = [
        { email: 'teacher@matya.org', status: 'success', createdAtMs: todayMs },
        { email: 'attacker@evil.com', status: 'blocked_injection', createdAtMs: todayMs },
        { email: 'attacker@evil.com', status: 'blocked_injection', createdAtMs: todayMs },
        { email: 'attacker@evil.com', status: 'blocked_injection', createdAtMs: todayMs }
      ];
      const emailLogs = [
        { userEmail: 'teacher@matya.org', recipientMasked: 'parent***@gmail.com', createdAtMs: todayMs }
      ];

      const agg = aggregateTelemetryData({ aiLogs, emailLogs, students: [], now });
      expect(agg.aiTodayCount).toBe(4);
      expect(agg.emailTodayCount).toBe(1);
      expect(agg.threatLevel).toBe('critical'); // 3 injections within 24h triggers critical
      expect(agg.recentInjectionsCount).toBe(3);
      expect(agg.blazeBreakdown).toHaveLength(5);
      expect(agg.last7Days).toHaveLength(7);
      expect(agg.topActiveTeachers).toHaveLength(2);

      const csv = generateTelemetryCsv({ aiLogs, emailLogs });
      expect(csv).toContain('AI_QUERY');
      expect(csv).toContain('EMAIL_SENT');
      expect(csv).toContain('teacher@matya.org');
    });
  });
});
