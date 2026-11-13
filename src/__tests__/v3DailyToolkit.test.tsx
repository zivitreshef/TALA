import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickCaptureModal from '../components/modals/QuickCaptureModal';
import ClassPulseStrip from '../components/ClassPulseStrip';
import TeamMeetingReportModal from '../components/modals/TeamMeetingReportModal';
import * as observationCapture from '../domain/observationCapture';

describe('V3 Daily Pedagogical Toolkit Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QuickCaptureModal', () => {
    const mockStudent = {
      id: 'st_1',
      name: 'יוסי כהן',
      goals: [
        { id: 'g_1', title: 'שיפור קריאה שוטפת', domain: 'שפה', observations: [] }
      ]
    };

    it('renders cleanly with Hebrew title and student name', () => {
      const html = renderToStaticMarkup(
        <QuickCaptureModal
          isOpen={true}
          onClose={vi.fn()}
          student={mockStudent}
          onStudentUpdated={vi.fn()}
          teacherEmail="teacher@test.com"
        />
      );

      expect(html).toContain('תיעוד מהיר');
      expect(html).toContain('עבור יוסי כהן');
      expect(html).toContain('הקלטה קולית');
      expect(html).toContain('הקלדה חופשית');
      expect(html).toContain('שמירה מהירה וחיבור למטרות');
    });

    it('returns null when isOpen is false or student is null', () => {
      const htmlClosed = renderToStaticMarkup(
        <QuickCaptureModal
          isOpen={false}
          onClose={vi.fn()}
          student={mockStudent}
          onStudentUpdated={vi.fn()}
          teacherEmail="teacher@test.com"
        />
      );
      expect(htmlClosed).toBe('');

      const htmlNoStudent = renderToStaticMarkup(
        <QuickCaptureModal
          isOpen={true}
          onClose={vi.fn()}
          student={null}
          onStudentUpdated={vi.fn()}
          teacherEmail="teacher@test.com"
        />
      );
      expect(htmlNoStudent).toBe('');
    });

    it('integrates observationCapture logic with immediate save and AI matching', () => {
      const baseStudent = {
        id: 'st_test',
        name: 'דני',
        goals: [{ id: 'g_math', title: 'חיבור שברים', domain: 'חשבון', observations: [] }],
        dailyPedagogicalEntries: []
      };

      const captured = observationCapture.buildObservation({
        note: 'פתר נכון שלושה תרגילי שברים',
        author: 'מורה לדוגמה',
        surface: 'quick_capture'
      });

      expect(captured.note).toBe('פתר נכון שלושה תרגילי שברים');
      expect(captured.source).toBe('quick_capture');

      const saved = observationCapture.addObservationToDailyEntries(baseStudent, captured);
      expect(saved.dailyPedagogicalEntries).toHaveLength(1);
      expect(saved.dailyPedagogicalEntries[0].note).toBe('פתר נכון שלושה תרגילי שברים');

      // AI goal matching application
      const matchResult = [
        {
          matchedGoalId: 'g_math',
          suggestedProgressDelta: 5,
          conciseObservationNote: 'פתר נכון שלושה תרגילי שברים',
          confidenceScore: 0.95
        }
      ];

      const { student: updated, matchedCount } = observationCapture.applyAiMatchesToStudent(
        saved,
        captured,
        matchResult
      );

      expect(matchedCount).toBe(1);
      expect(updated.goals[0].observations).toHaveLength(1);
      expect(updated.goals[0].observations[0].note).toBe('פתר נכון שלושה תרגילי שברים');
      expect(updated.goals[0].currentProgress).toBe(5);
    });
  });

  describe('ClassPulseStrip', () => {
    const mockStudents = [
      {
        id: 'st_1',
        name: 'דני לוי',
        goals: [
          {
            id: 'g_1',
            title: 'חשבון',
            observations: [{ id: 'o1', date: new Date().toISOString(), text: 'הצלחה' }]
          }
        ]
      },
      {
        id: 'st_2',
        name: 'מאיה רון',
        goals: [
          {
            id: 'g_2',
            title: 'כישורים חברתיים',
            observations: [
              {
                id: 'o2',
                date: new Date(Date.now() - 14 * 86400000).toISOString(),
                text: 'מפגש ישן'
              }
            ]
          }
        ]
      }
    ];

    it('renders coverage metric, streak, and waiting students list', () => {
      const html = renderToStaticMarkup(
        <ClassPulseStrip
          students={mockStudents}
          userPreferences={{ pedagogicalReminderEnabled: true }}
          onQuickRecordStudent={vi.fn()}
          onOpenTeamReport={vi.fn()}
        />
      );

      expect(html).toContain('מענה שבועי');
      expect(html).toContain('רצף תיעוד פעיל');
      expect(html).toContain('דוח לישיבת צוות');
      expect(html).toContain('מאיה רון');
      expect(html).toContain('תלמידים הממתינים לתצפית מעל 10 ימים');
    });

    it('shows opt-in banner when pedagogical reminders are disabled and callback provided', () => {
      const htmlWithBanner = renderToStaticMarkup(
        <ClassPulseStrip
          students={mockStudents}
          userPreferences={{ pedagogicalReminderEnabled: false, monthlyPedagogicalReminder: false }}
          onQuickRecordStudent={vi.fn()}
          onOpenTeamReport={vi.fn()}
          onOptInReminder={vi.fn()}
        />
      );
      expect(htmlWithBanner).toContain('לקבל סיכום שבועי למייל בימי חמישי');
      expect(htmlWithBanner).toContain('הפעלת סיכום שבועי');

      const htmlWithoutBanner = renderToStaticMarkup(
        <ClassPulseStrip
          students={mockStudents}
          userPreferences={{ pedagogicalReminderEnabled: true }}
          onQuickRecordStudent={vi.fn()}
          onOpenTeamReport={vi.fn()}
        />
      );
      expect(htmlWithoutBanner).not.toContain('לקבל סיכום שבועי למייל בימי חמישי');
    });

    it('renders nothing when students list is empty', () => {
      const htmlEmpty = renderToStaticMarkup(
        <ClassPulseStrip
          students={[]}
          userPreferences={{}}
          onQuickRecordStudent={vi.fn()}
          onOpenTeamReport={vi.fn()}
        />
      );
      expect(htmlEmpty).toBe('');
    });
  });

  describe('TeamMeetingReportModal', () => {
    const mockStudents = [
      {
        id: 'st_1',
        name: 'דני לוי',
        goals: [
          {
            id: 'g_1',
            title: 'חשבון',
            observations: [{ id: 'o1', date: new Date().toISOString(), text: 'הצליח לחבר שברים' }]
          }
        ]
      }
    ];

    it('renders KPI summary, recent observations and actions', () => {
      const html = renderToStaticMarkup(
        <TeamMeetingReportModal
          isOpen={true}
          onClose={vi.fn()}
          students={mockStudents}
          userPreferences={{ defaultPrivacyMode: 'full_name' }}
          currentUser={{ email: 'teacher@test.com', name: 'מורה לדוגמה' }}
        />
      );

      expect(html).toContain('סיכום שבועי לישיבת צוות');
      expect(html).toContain('תלמידים שקיבלו מענה');
      expect(html).toContain('תצפיות שתועדו השבוע');
      expect(html).toContain('ממתינים לתצפית');
      expect(html).toContain('דני לוי');
      expect(html).toContain('הצליח לחבר שברים');
      expect(html).toContain('הדפסה או שמירה כקובץ');
      expect(html).toContain('שליחה למייל שלי');
      expect(html).toContain('העתקת טקסט');
    });

    it('returns null when isOpen is false', () => {
      const htmlClosed = renderToStaticMarkup(
        <TeamMeetingReportModal
          isOpen={false}
          onClose={vi.fn()}
          students={mockStudents}
          userPreferences={{ defaultPrivacyMode: 'full_name' }}
          currentUser={{ email: 'teacher@test.com', name: 'מורה לדוגמה' }}
        />
      );
      expect(htmlClosed).toBe('');
    });
  });
});
