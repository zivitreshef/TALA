import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DiagnosticIntakeModal, {
  type DiagnosticIntakeModalProps
} from '../components/form/DiagnosticIntakeModal';
import MinistryCopyModal, {
  type MinistryCopyModalProps
} from '../components/form/MinistryCopyModal';
import TeacherChatWidget, {
  type TeacherChatWidgetProps
} from '../components/chat/TeacherChatWidget';
import { SENDER_ROLES, THREAD_STATUS } from '../domain/supportChat';

describe('TypeScript Migration Phase 3 Batch 4 Gate', () => {
  describe('DiagnosticIntakeModal.tsx', () => {
    it('renders input step with file upload dropzone and manual notes', () => {
      const props: DiagnosticIntakeModalProps = {
        formData: {
          id: 'student_1',
          name: 'רועי שחר',
          gender: 'boy',
          planType: 'תל"א'
        },
        onApplyIntake: vi.fn(),
        onClose: vi.fn()
      };

      const html = renderToStaticMarkup(<DiagnosticIntakeModal {...props} />);
      expect(html).toContain('קליטת מסמך ושמירה בתיק התלמיד/ה');
      expect(html).toContain('העלאת קובץ אבחון');
      expect(html).toContain('לחצי כאן להעלאת קובץ או גררי לכאן');
      expect(html).toContain('privacy-sensitive-info-note');
      expect(html).toContain('שמירה על פרטיות:');
      expect(html).toContain('נא להימנע מחשיפת מידע אישי רגיש או פרטים מזהים של התלמיד/ה');
      expect(html).not.toContain('תוספת הערות');
      expect(html).toContain('שמור בתיק והוסף לתובנות');
    });

    it('renders highlighter mode when initial lines are provided', () => {
      const props: DiagnosticIntakeModalProps = {
        formData: {
          id: 'student_1',
          name: 'רועי שחר',
          gender: 'boy'
        },
        initialText: 'התלמיד מגלה הבנה טובה במתמטיקה.\nמתקשה בהתארגנות וניהול זמן.\nזקוק לתיווך מילולי במעברים.',
        initialDocName: 'אבחון_רועי.pdf',
        onApplyIntake: vi.fn(),
        onClose: vi.fn()
      };

      const html = renderToStaticMarkup(<DiagnosticIntakeModal {...props} />);
      expect(html).toContain('הקובץ נקרא בהצלחה');
      expect(html).toContain('אבחון_רועי.pdf');
      expect(html).toContain('מרקר שורות (3/3)');
      expect(html).toContain('התלמיד מגלה הבנה טובה במתמטיקה.');
      expect(html).toContain('מתקשה בהתארגנות וניהול זמן.');
      expect(html).toContain('שמור בתיק והוסף לתובנות');
    });
  });

  describe('MinistryCopyModal.tsx', () => {
    it('renders blocks formatted for ministry copy with privacy toggle and copy-all', () => {
      const props: MinistryCopyModalProps = {
        formData: {
          id: 'stu_1',
          name: 'אביגיל כהן',
          idNumber: '123456789',
          framework: 'בית ספר אלונים',
          studentGeneralBackground: 'אביגיל תלמידה סקרנית וחברותית.',
          goals: [
            {
              environment: 'כיתת אם',
              title: 'השתתפות בדיון כיתתי',
              objectives: 'תצביע לפני דיבור'
            }
          ]
        },
        hideDetails: false,
        onToggleHideDetails: vi.fn(),
        onClose: vi.fn()
      };

      const html = renderToStaticMarkup(<MinistryCopyModal {...props} />);
      expect(html).toContain('העתקה למנב&quot;ס / משרד החינוך');
      expect(html).toContain('הגנת פרטיות');
      expect(html).toContain('העתק את כל התוכנית');
      expect(html).toContain('אביגיל תלמידה סקרנית וחברותית.');
      expect(html).toContain('העתק סעיף');
    });

    it('masks student details when hideDetails is true', () => {
      const props: MinistryCopyModalProps = {
        formData: {
          name: 'אביגיל כהן',
          idNumber: '123456789',
          framework: 'בית ספר אלונים'
        },
        hideDetails: true,
        onToggleHideDetails: vi.fn(),
        onClose: vi.fn()
      };

      const html = renderToStaticMarkup(<MinistryCopyModal {...props} />);
      expect(html).toContain('א.כ.');
      expect(html).not.toContain('123456789');
      expect(html).not.toContain('בית ספר אלונים');
    });
  });

  describe('TeacherChatWidget.tsx', () => {
    it('returns null when no effective user email exists', () => {
      const props: TeacherChatWidgetProps = {
        currentUser: null,
        initialUserEmail: ''
      };

      const html = renderToStaticMarkup(<TeacherChatWidget {...props} />);
      expect(html).toBe('');
    });

    it('renders floating launcher button when closed', () => {
      const props: TeacherChatWidgetProps = {
        currentUser: { email: 'teacher@school.org', name: 'שרה מורה' },
        defaultOpen: false
      };

      const html = renderToStaticMarkup(<TeacherChatWidget {...props} />);
      expect(html).toContain('צ&#x27;אט תמיכה ועזרה');
      expect(html).not.toContain('מענה ישיר ממנהלת המערכת');
    });

    it('renders open chat window with message history, admin responses, and CSAT bar', () => {
      const props: TeacherChatWidgetProps = {
        currentUser: { email: 'teacher@school.org', name: 'שרה מורה' },
        defaultOpen: true,
        initialThread: {
          id: 'teacher@school.org',
          userEmail: 'teacher@school.org',
          userName: 'שרה מורה',
          topic: 'עזרה בהפקת דו"ח',
          status: THREAD_STATUS.ACTIVE,
          unreadByUser: false,
          unreadByAdmin: false,
          createdAt: '2025-11-01T10:00:00Z',
          updatedAt: '2025-11-01T10:05:00Z',
          messages: [
            {
              id: 'msg_1',
              senderRole: SENDER_ROLES.USER,
              senderName: 'שרה מורה',
              senderEmail: 'teacher@school.org',
              timestamp: 1730455200000,
              text: 'כיצד מורידים את הדו"ח ל-Word?',
              createdAt: '10:00'
            },
            {
              id: 'msg_2',
              senderRole: SENDER_ROLES.ADMIN,
              senderName: 'זיוית מנהלת',
              senderEmail: 'zivit.reshef@gmail.com',
              timestamp: 1730455500000,
              text: 'שלום שרה! יש ללחוץ על הכפתור "הורד קובץ Word" בתחתית הדו"ח.',
              createdAt: '10:05'
            }
          ]
        }
      };

      const html = renderToStaticMarkup(<TeacherChatWidget {...props} />);
      expect(html).toContain('צ&#x27;אט תמיכה TALA');
      expect(html).toContain('מענה ישיר ממנהלת המערכת');
      expect(html).toContain('כיצד מורידים את הדו&quot;ח ל-Word?');
      expect(html).toContain('זיוית מנהלת');
      expect(html).toContain('שלום שרה! יש ללחוץ על הכפתור');
      expect(html).toContain('האם המענה פתר את שאלתך?');
      expect(html).toContain('כן, תודה!');
      expect(html).toContain('עדיין זקוק/ה לעזרה');
    });
  });
});
