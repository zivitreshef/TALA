import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PedagogicalTasksModal, {
  generatePedagogicalTasksHeuristic,
  type PedagogicalModalStudent,
  type PedagogicalTasksModalProps
} from '../components/modals/PedagogicalTasksModal';
import SystemHealthPanel, {
  type SystemHealthPanelProps
} from '../components/modals/SystemHealthPanel';
import UserFeedbackSurveyModal, {
  type UserFeedbackSurveyModalProps
} from '../components/modals/UserFeedbackSurveyModal';
import TeacherPreferencesModal, {
  type TeacherPreferencesModalProps
} from '../components/modals/TeacherPreferencesModal';
import { DEFAULT_USER_PREFERENCES } from '../domain/userPreferences';

describe('TypeScript Migration Phase 3 Batch 5 Test Suite', () => {
  describe('PedagogicalTasksModal & Heuristic Generator', () => {
    const mockStudents: PedagogicalModalStudent[] = [
      {
        id: 'st_1',
        name: 'דניאל כהן',
        educationalFramework: 'שילוב ביה"ס',
        goals: [
          {
            title: 'שיפור קריאה מדויקת',
            domain: 'לימודי',
            environment: 'כיתה',
            observations: []
          }
        ]
      },
      {
        id: 'st_2',
        name: 'נועה לוי',
        educationalFramework: 'גן שפתי',
        goals: []
      }
    ];

    const mockEvents = [
      {
        studentId: 'st_1',
        studentName: 'דניאל כהן',
        date: '2026-11-02',
        title: 'שיעור פרטני שפה',
        startTime: '10:00'
      }
    ];

    it('generates heuristic tasks correctly for meeting and non-meeting students', () => {
      const tasks = generatePedagogicalTasksHeuristic(
        mockStudents,
        mockEvents,
        '2026-11-02',
        'דגש על חיזוק ביטחון'
      );

      expect(tasks).toHaveLength(2);
      expect(tasks[0].studentName).toBe('דניאל כהן');
      expect(tasks[0].text).toContain('במפגש (שיעור פרטני שפה)');
      expect(tasks[0].text).toContain('שיפור קריאה מדויקת');
      expect(tasks[0].text).toContain('[דגש: דגש על חיזוק ביטחון]');

      expect(tasks[1].studentName).toBe('נועה לוי');
      expect(tasks[1].text).toContain('נועה לוי: בדיקת מוכנות לימודית');
    });

    it('renders modal in select step when open', () => {
      const props: PedagogicalTasksModalProps = {
        isOpen: true,
        onClose: vi.fn(),
        students: mockStudents,
        events: mockEvents,
        selectedDate: '2026-11-02',
        onAddTasks: vi.fn()
      };

      const html = renderToStaticMarkup(<PedagogicalTasksModal {...props} />);
      expect(html).toContain('מיקוד פדגוגי עם AI ליום הנבחר: 2026-11-02');
      expect(html).toContain('דניאל כהן');
      expect(html).toContain('נועה לוי');
      expect(html).toContain('חולל משימות פדגוגיות');
      expect(html).toContain('מפגש היום');
    });

    it('returns null when modal is closed', () => {
      const props: PedagogicalTasksModalProps = {
        isOpen: false,
        onClose: vi.fn(),
        students: mockStudents,
        onAddTasks: vi.fn()
      };

      const html = renderToStaticMarkup(<PedagogicalTasksModal {...props} />);
      expect(html).toBe('');
    });
  });

  describe('SystemHealthPanel', () => {
    const mockEvents = [
      {
        id: 'he_1',
        kind: 'ai_fallback',
        category: 'quota',
        status: 429,
        createdAtMs: Date.now() - 3600000,
        userEmail: 'teacher@school.org',
        message: 'Quota exceeded'
      }
    ];

    it('renders system health metrics, warning banner, and action buttons', () => {
      const props: SystemHealthPanelProps = {
        healthEvents: mockEvents,
        healthReviewedMs: 0,
        onMarkHealthReviewed: vi.fn(),
        onClearHealthEvents: vi.fn(),
        cloudSyncState: { connected: true }
      };

      const html = renderToStaticMarkup(<SystemHealthPanel {...props} />);
      expect(html).toContain('בריאות המערכת ומעקב תקלות AI');
      expect(html).toContain('אירועים ב-24 שעות:');
      expect(html).toContain('מעברים למנוע מקומי:');
      expect(html).toContain('בדיקת תקינות עכשיו');
      expect(html).toContain('סמן כנסקר');
      expect(html).toContain('נקה יומן');
      expect(html).toContain('teacher@school.org');
    });

    it('renders clean state when there are no health events', () => {
      const props: SystemHealthPanelProps = {
        healthEvents: [],
        healthReviewedMs: 0,
        onMarkHealthReviewed: vi.fn(),
        onClearHealthEvents: vi.fn(),
        cloudSyncState: { connected: true }
      };

      const html = renderToStaticMarkup(<SystemHealthPanel {...props} />);
      expect(html).toContain('🟢 תקין');
      expect(html).not.toContain('סמן כנסקר');
    });
  });

  describe('UserFeedbackSurveyModal', () => {
    it('renders survey categories, 5-star controls, and recommendation options', () => {
      const props: UserFeedbackSurveyModalProps = {
        isOpen: true,
        currentUser: {
          name: 'רותי מורה',
          email: 'ruti@school.org',
          title: 'מורת שילוב',
          group: 'מתי"א מרכז'
        },
        onSubmitSurvey: vi.fn(),
        onSnoozeSurvey: vi.fn(),
        onDismissSurveyPermanently: vi.fn()
      };

      const html = renderToStaticMarkup(<UserFeedbackSurveyModal {...props} />);
      expect(html).toContain('משוב חוויית משתמש – מערכת TALA');
      expect(html).toContain('קלות ונוחות השימוש באתר');
      expect(html).toContain('יצירה והקמה של כרטיס תלמיד/ה חדש/ה');
      expect(html).toContain('ניסוח ובניית מטרות ויעדים');
      expect(html).toContain('הפקת דוחות');
      expect(html).toContain('שיתוף תלמיד/ה ועבודה משותפת עם קולגות בצוות');
      expect(html).toContain('שלח משוב למנהלת המערכת');
      expect(html).toContain('דחה לאחר כך');
      expect(html).toContain('אל תציג שוב');
    });

    it('returns null when survey modal is closed or user missing', () => {
      const htmlClosed = renderToStaticMarkup(
        <UserFeedbackSurveyModal isOpen={false} currentUser={{ name: 'א', email: 'a@b.com' }} />
      );
      expect(htmlClosed).toBe('');

      const htmlNoUser = renderToStaticMarkup(
        <UserFeedbackSurveyModal isOpen={true} currentUser={null} />
      );
      expect(htmlNoUser).toBe('');
    });
  });

  describe('TeacherPreferencesModal', () => {
    const mockUser = {
      name: 'שרה כהן',
      email: 'sara@school.org',
      title: 'גננת שילוב',
      group: 'מתי"א צפון',
      notifyOnSharedReport: true
    };

    it('renders mandatory first login password setup when isMandatoryFirstLogin=true', () => {
      const props: TeacherPreferencesModalProps = {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockUser,
        isMandatoryFirstLogin: true,
        onChangeOwnPassword: vi.fn()
      };

      const html = renderToStaticMarkup(<TeacherPreferencesModal {...props} />);
      expect(html).toContain('ברוכים הבאים, שרה כהן! הגדרת סיסמה אישית');
      expect(html).toContain('כניסה ראשונה באמצעות סיסמה זמנית:');
      expect(html).toContain('בחר/י סיסמה אישית חדשה:');
      expect(html).toContain('שמור סיסמה אישית והמשך למערכת');
    });

    it('renders full preferences modal with 4 tabs and report options when normal login', () => {
      const props: TeacherPreferencesModalProps = {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockUser,
        userPreferences: {
          ...DEFAULT_USER_PREFERENCES,
          fullName: 'שרה כהן גננת',
          privateGoals: [
            {
              id: 'priv_1',
              text: 'חיזוק ויסות חושי במפגש',
              domain: 'רגשי-חברתי',
              environment: 'מפגש / מליאה',
              createdAt: '2026-11-02'
            }
          ]
        },
        onSavePreferences: vi.fn()
      };

      const html = renderToStaticMarkup(<TeacherPreferencesModal {...props} />);
      expect(html).toContain('אזור אישי והגדרות מורה – שרה כהן');
      expect(html).toContain('ברירות מחדל לדוחות');
      expect(html).toContain('בנק מטרות אישי (1)');
      expect(html).toContain('התראות ותקשורת');
      expect(html).toContain('פרופיל מקצועי וחתימה');
      expect(html).toContain('חיזוק ויסות חושי במפגש');
      expect(html).toContain('שמור את כל ההגדרות');
    });

    it('returns null when closed', () => {
      const props: TeacherPreferencesModalProps = {
        isOpen: false,
        onClose: vi.fn(),
        currentUser: mockUser
      };

      const html = renderToStaticMarkup(<TeacherPreferencesModal {...props} />);
      expect(html).toBe('');
    });
  });
});
