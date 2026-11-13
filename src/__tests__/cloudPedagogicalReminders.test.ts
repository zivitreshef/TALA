import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DAYS_MAP,
  getIsraelTimeComponents,
  toHebrewAcronymServer,
  isDueForPedagogicalReminderServer,
  calculateObservationGapsServer,
  calculateAccomplishmentsServer,
  buildPedagogicalReminderEmailHtmlServer,
  dispatchPedagogicalRemindersServer
} from '../../functions/pedagogicalReminders';
import {
  normalizeUserPreferences
} from '../domain/userPreferences';

describe('Cloud Pedagogical Reminders Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Time & Schedule Calculations (Israel Timezone)', () => {
    it('calculates Israel time components reliably', () => {
      // 2026-11-12T11:00:00Z -> In Israel (UTC+2) it is 13:00 on Thursday
      const testDate = new Date('2026-11-12T11:00:00Z');
      const parts = getIsraelTimeComponents(testDate);

      expect(parts.hour).toBe(13);
      expect(parts.dayOfWeek).toBe(4); // Thursday is 4
      expect(parts.dayOfMonth).toBe(12);
      expect(parts.dateString).toBe('2026-11-12');
    });

    it('correctly maps all weekday keys in DAYS_MAP', () => {
      expect(DAYS_MAP.sunday).toBe(0);
      expect(DAYS_MAP.monday).toBe(1);
      expect(DAYS_MAP.tuesday).toBe(2);
      expect(DAYS_MAP.wednesday).toBe(3);
      expect(DAYS_MAP.thursday).toBe(4);
      expect(DAYS_MAP.friday).toBe(5);
      expect(DAYS_MAP.saturday).toBe(6);
    });
  });

  describe('Student Privacy & Initials Acronyms', () => {
    it('masks full names into two-letter acronyms', () => {
      expect(toHebrewAcronymServer('ישראל ישראלי')).toBe('י.י.');
      expect(toHebrewAcronymServer('דני לוי')).toBe('ד.ל.');
    });

    it('handles single-word or empty names gracefully', () => {
      expect(toHebrewAcronymServer('דוד')).toBe("ד'");
      expect(toHebrewAcronymServer('')).toBe('א.א.');
      expect(toHebrewAcronymServer(null as any)).toBe('א.א.');
    });
  });

  describe('isDueForPedagogicalReminderServer', () => {
    it('returns false when reminder is disabled in preferences', () => {
      const prefs = {
        pedagogicalReminderEnabled: false,
        monthlyPedagogicalReminder: false
      };
      expect(isDueForPedagogicalReminderServer(prefs, new Date())).toBe(false);
    });

    it('returns false when current Israel hour is before scheduled time', () => {
      // 06:00 UTC -> 08:00 Israel time (Scheduled: 13:00)
      const now = new Date('2026-11-12T06:00:00Z');
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'thursday',
        pedagogicalReminderTime: '13:00'
      };
      expect(isDueForPedagogicalReminderServer(prefs, now)).toBe(false);
    });

    it('returns false if weekday does not match weekly schedule', () => {
      // 2026-11-12 is Thursday, but teacher requested Sunday
      const now = new Date('2026-11-12T12:00:00Z'); // 14:00 Israel time
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'sunday',
        pedagogicalReminderTime: '13:00'
      };
      expect(isDueForPedagogicalReminderServer(prefs, now)).toBe(false);
    });

    it('returns true on matching Thursday at or after scheduled hour', () => {
      // 2026-11-12 11:30 UTC -> 13:30 Israel time (Thursday, scheduled 13:00)
      const now = new Date('2026-11-12T11:30:00Z');
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'thursday',
        pedagogicalReminderTime: '13:00'
      };
      expect(isDueForPedagogicalReminderServer(prefs, now)).toBe(true);
    });

    it('returns false if already sent earlier today (deduplication)', () => {
      const now = new Date('2026-11-12T11:30:00Z'); // 13:30 Israel time
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'thursday',
        pedagogicalReminderTime: '13:00',
        pedagogicalDigestLastSentAt: '2026-11-12T11:05:00Z' // sent 25 mins ago today
      };
      expect(isDueForPedagogicalReminderServer(prefs, now)).toBe(false);
    });

    it('evaluates monthly reminders correctly', () => {
      // 2026-11-12 is the 12th day of the month
      const now = new Date('2026-11-12T11:30:00Z');
      const prefsMatching = {
        monthlyPedagogicalReminder: true,
        pedagogicalReminderFrequency: 'monthly',
        pedagogicalReminderMonthlyDay: 12,
        pedagogicalReminderTime: '13:00'
      };
      expect(isDueForPedagogicalReminderServer(prefsMatching, now)).toBe(true);

      const prefsMismatch = {
        monthlyPedagogicalReminder: true,
        pedagogicalReminderFrequency: 'monthly',
        pedagogicalReminderMonthlyDay: 1,
        pedagogicalReminderTime: '13:00'
      };
      expect(isDueForPedagogicalReminderServer(prefsMismatch, now)).toBe(false);
    });
  });

  describe('Gaps & Accomplishments Calculation', () => {
    const mockStudents = [
      {
        id: 'st_1',
        name: 'יוסי כהן',
        isArchived: false,
        goals: [
          {
            id: 'g_1',
            title: 'שיפור שטף קריאה',
            completed: false,
            observations: [
              { date: '2026-09-01T10:00:00Z', note: 'תצפית ישנה' } // > 70 days ago
            ]
          },
          {
            id: 'g_2',
            title: 'השתתפות במעגל שיח',
            completed: false,
            observations: [
              { date: '2026-11-10T10:00:00Z', note: 'תצפית טרייה' } // 2 days ago
            ]
          }
        ]
      },
      {
        id: 'st_2',
        name: 'רוני שחר',
        isArchived: false,
        goals: [
          {
            id: 'g_3',
            title: 'השלמת משימות בכיתה',
            completed: true, // completed!
            observations: []
          }
        ]
      }
    ];

    it('identifies observation gaps for active goals older than 45 days', () => {
      const now = new Date('2026-11-12T10:00:00Z');
      const gaps = calculateObservationGapsServer(mockStudents, 45, now);

      expect(gaps.length).toBe(1);
      expect(gaps[0].studentName).toBe('יוסי כהן');
      expect(gaps[0].goalTitle).toBe('שיפור שטף קריאה');
      expect(gaps[0].daysSinceObservation).toBeGreaterThan(45);
    });

    it('calculates recent accomplishments within 30 days', () => {
      const now = new Date('2026-11-12T10:00:00Z');
      const accomplishments = calculateAccomplishmentsServer(mockStudents, 30, now);

      expect(accomplishments.recentObservationsCount).toBe(1); // g_2 on 2026-11-10
      expect(accomplishments.completedGoalsCount).toBe(1); // g_3
      expect(accomplishments.activeGoalsCount).toBe(2); // g_1, g_2
    });
  });

  describe('buildPedagogicalReminderEmailHtmlServer', () => {
    it('produces valid RTL HTML containing greeting and stats', () => {
      const html = buildPedagogicalReminderEmailHtmlServer({
        teacherName: 'מיכל לוי',
        gaps: [
          { studentId: 'st_1', studentName: 'יוסי כהן', goalTitle: 'שטף קריאה', daysSinceObservation: 50 }
        ],
        accomplishments: { recentObservationsCount: 5, completedGoalsCount: 2, activeGoalsCount: 4 },
        totalStudents: 10,
        privacyMode: 'full_name'
      });

      expect(html).toContain('dir="rtl"');
      expect(html).toContain('מיכל לוי');
      expect(html).toContain('יוסי כהן');
      expect(html).toContain('שטף קריאה');
      expect(html).toContain('תלמידים בטיפולך');
      expect(html).toContain('כניסה למערכת TALA');
    });

    it('masks names when privacyMode is acronym', () => {
      const html = buildPedagogicalReminderEmailHtmlServer({
        teacherName: 'מיכל לוי',
        gaps: [
          { studentId: 'st_1', studentName: 'יוסי כהן', goalTitle: 'שטף קריאה', daysSinceObservation: 50 }
        ],
        accomplishments: { recentObservationsCount: 5, completedGoalsCount: 2, activeGoalsCount: 4 },
        totalStudents: 10,
        privacyMode: 'acronym'
      });

      expect(html).toContain('י.כ.');
      expect(html).not.toContain('יוסי כהן');
    });
  });

  describe('dispatchPedagogicalRemindersServer Integration with Mock DB', () => {
    it('processes due teachers and dispatches email in dryRun mode', async () => {
      const mockDocRef = {
        set: vi.fn().mockResolvedValue(true)
      };

      const mockPrefsDocs = [
        {
          id: 'teacher_school_com',
          ref: mockDocRef,
          data: () => ({
            userEmail: 'teacher@school.com',
            fullName: 'רחל כהן',
            pedagogicalReminderEnabled: true,
            pedagogicalReminderFrequency: 'weekly',
            pedagogicalReminderWeeklyDay: 'thursday',
            pedagogicalReminderTime: '13:00',
            defaultPrivacyMode: 'full_name'
          })
        }
      ];

      const mockStudentDocs = [
        {
          id: 'st_1',
          data: () => ({
            name: 'נועה לוי',
            goals: []
          })
        }
      ];

      const mockDb: any = {
        collection: vi.fn((colName: string) => {
          if (colName === 'tala_user_preferences') {
            return {
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: mockPrefsDocs
              })
            };
          }
          if (colName === 'tala_students') {
            return {
              where: vi.fn(() => ({
                get: vi.fn().mockResolvedValue(mockStudentDocs)
              }))
            };
          }
          return { get: vi.fn().mockResolvedValue({ empty: true, docs: [] }) };
        })
      };

      // 2026-11-12 11:30 UTC = 13:30 Israel Time (Thursday)
      const testDate = new Date('2026-11-12T11:30:00Z');
      const result = await dispatchPedagogicalRemindersServer({
        dryRun: true,
        db: mockDb,
        referenceDate: testDate
      });

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.teachers).toContain('teacher@school.com');
      // In dry-run mode, ref.set should not be called
      expect(mockDocRef.set).not.toHaveBeenCalled();
    });
  });

  describe('User Preferences Domain Integration', () => {
    it('accepts 13:00 as a valid reminder time preference', () => {
      const normalized = normalizeUserPreferences({
        pedagogicalReminderTime: '13:00' as any
      });
      expect(normalized.pedagogicalReminderTime).toBe('13:00');
    });

    it('preserves pedagogicalDigestLastSentAt across normalizations', () => {
      const timestamp = '2026-11-12T13:00:00.000Z';
      const normalized = normalizeUserPreferences({
        pedagogicalDigestLastSentAt: timestamp
      });
      expect(normalized.pedagogicalDigestLastSentAt).toBe(timestamp);

      const defaultNorm = normalizeUserPreferences({});
      expect(defaultNorm.pedagogicalDigestLastSentAt).toBeNull();
    });
  });
});
