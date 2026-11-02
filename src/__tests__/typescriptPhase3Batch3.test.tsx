import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ParentVoiceControl, {
  type ParentVoiceControlProps
} from '../components/form/ParentVoiceControl';
import ShareTeamModal, {
  type ShareTeamModalProps
} from '../components/form/ShareTeamModal';
import StatusReportPanel, {
  type StatusReportPanelProps
} from '../components/form/StatusReportPanel';
import TeamChatDrawer, {
  getAuthorInitials,
  getAuthorColorTheme,
  AUTHOR_COLOR_THEMES,
  type TeamChatDrawerProps
} from '../components/form/TeamChatDrawer';

describe('TypeScript Migration Phase 3 Batch 3 Gate', () => {
  describe('ParentVoiceControl.tsx', () => {
    it('renders initial pill when closed', () => {
      const props: ParentVoiceControlProps = {
        student: { id: 'stu_1', name: 'איתמר ישראלי', gender: 'boy' },
        currentUser: { email: 'teacher@school.org' },
        onMerge: vi.fn(),
        initialOpen: false
      };

      const html = renderToStaticMarkup(<ParentVoiceControl {...props} />);
      expect(html).toContain('קול ההורים');
      expect(html).not.toContain('שאלון קצר בקישור אישי');
    });

    it('renders open modal with child name, pending invite, and questions customization', () => {
      const props: ParentVoiceControlProps = {
        student: { id: 'stu_1', name: 'איתמר ישראלי', gender: 'boy' },
        currentUser: { email: 'teacher@school.org' },
        onMerge: vi.fn(),
        initialOpen: true,
        initialInvites: [
          {
            token: 'tok_pending_1',
            ownerEmail: 'teacher@school.org',
            studentId: 'stu_1',
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        ]
      };

      const html = renderToStaticMarkup(<ParentVoiceControl {...props} />);
      expect(html).toContain('קול ההורים');
      expect(html).toContain('עבור איתמר');
      expect(html).toContain('קישור להורים');
      expect(html).toContain('tok_pending_1');
      expect(html).toContain('שליחה בוואטסאפ');
    });

    it('renders questions customization when no pending invite exists', () => {
      const props: ParentVoiceControlProps = {
        student: { id: 'stu_1', name: 'איתמר ישראלי', gender: 'boy' },
        currentUser: { email: 'teacher@school.org' },
        onMerge: vi.fn(),
        initialOpen: true,
        initialInvites: []
      };

      const html = renderToStaticMarkup(<ParentVoiceControl {...props} />);
      expect(html).toContain('התאמת שאלות השאלון להורים');
      expect(html).toContain('יצירת קישור להורים');
    });

    it('renders reviewed unreviewed responses with merge button', () => {
      const props: ParentVoiceControlProps = {
        student: { id: 'stu_2', name: 'מאיה לוי', gender: 'girl' },
        currentUser: { email: 'teacher@school.org' },
        onMerge: vi.fn(),
        initialOpen: true,
        initialInvites: [
          {
            token: 'tok_submitted_1',
            ownerEmail: 'teacher@school.org',
            studentId: 'stu_2',
            status: 'submitted',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            responses: {
              strengths: 'מאיה מאוד חברותית ויצירתית',
              challenges: 'קשה לה להתרכז ברעש'
            }
          }
        ]
      };

      const html = renderToStaticMarkup(<ParentVoiceControl {...props} />);
      expect(html).toContain('התקבל מענה מההורים');
      expect(html).toContain('מאיה מאוד חברותית ויצירתית');
      expect(html).toContain('שלבי בתיאור החופשי של המורה');
      expect(html).toContain('העברה לארכיון בלבד');
    });
  });

  describe('ShareTeamModal.tsx', () => {
    it('returns null when isOpen is false', () => {
      const props: ShareTeamModalProps = {
        isOpen: false,
        onClose: vi.fn()
      };
      const html = renderToStaticMarkup(<ShareTeamModal {...props} />);
      expect(html).toBe('');
    });

    it('renders security shield warning if current user has no team/matya group', () => {
      const props: ShareTeamModalProps = {
        isOpen: true,
        onClose: vi.fn(),
        formData: { id: 'doc_1', name: 'דניאל כהן', sharedWith: [] },
        currentUser: { email: 'lonely@school.org' }, // no group
        allowedUsers: []
      };

      const html = renderToStaticMarkup(<ShareTeamModal {...props} />);
      expect(html).toContain('אינך משויך/ת לצוות או מתי&quot;א');
      expect(html).toContain('מטעמי אבטחת מידע והגנת פרטיות התלמידים');
    });

    it('renders colleague checkboxes and locked plan warning when isLocked is true', () => {
      const props: ShareTeamModalProps = {
        isOpen: true,
        onClose: vi.fn(),
        formData: {
          id: 'doc_1',
          name: 'דניאל כהן',
          isLocked: true,
          sharedWith: ['therapist@school.org']
        },
        currentUser: { email: 'teacher@school.org', group: 'בית ספר אלונים' },
        allowedUsers: [
          { email: 'teacher@school.org', name: 'שרה מורה', group: 'בית ספר אלונים' },
          { email: 'therapist@school.org', name: 'דנה קלינאית', role: 'קלינאית תקשורת', group: 'בית ספר אלונים' },
          { email: 'ot@school.org', name: 'מיכל ריפוי', role: 'מרפאה בעיסוק', group: 'בית ספר אלונים' }
        ]
      };

      const html = renderToStaticMarkup(<ShareTeamModal {...props} />);
      expect(html).toContain('שיתוף תוכנית עם צוות / מתי&quot;א');
      expect(html).toContain('שימי לב: תוכנית העבודה נעולה לעריכה');
      expect(html).toContain('דנה קלינאית');
      expect(html).toContain('משותף');
      expect(html).toContain('מיכל ריפוי');
      expect(html).toContain('סיום');
    });
  });

  describe('StatusReportPanel.tsx', () => {
    it('renders empty state when no sections exist', () => {
      const props: StatusReportPanelProps = {
        formData: { statusReportSections: [] },
        isGeneratingStatusReport: false,
        onGenerateStatusReport: vi.fn(),
        onClose: vi.fn(),
        onRemoveStatusSection: vi.fn(),
        onUpdateStatusSectionContent: vi.fn(),
        onAddManualStatusSection: vi.fn()
      };

      const html = renderToStaticMarkup(<StatusReportPanel {...props} />);
      expect(html).toContain('דו&quot;ח מצב חינוכי-תפקודי עדכני');
      expect(html).toContain('טרם הופק דו&quot;ח מצב עבור התלמיד/ה');
      expect(html).toContain('הפק דו&quot;ח מצב מתוך נתוני הכרטיס כעת');
    });

    it('renders busy indicator during generation and banner after completion', () => {
      const generatingProps: StatusReportPanelProps = {
        formData: { statusReportSections: [] },
        isGeneratingStatusReport: true,
        onGenerateStatusReport: vi.fn(),
        onClose: vi.fn(),
        onRemoveStatusSection: vi.fn(),
        onUpdateStatusSectionContent: vi.fn(),
        onAddManualStatusSection: vi.fn()
      };

      const genHtml = renderToStaticMarkup(<StatusReportPanel {...generatingProps} />);
      expect(genHtml).toContain('המערכת מנתחת את כרטיס התלמיד/ה');
      expect(genHtml).toContain('מפיק ומעדכן דו&quot;ח מצב...');

      const doneProps: StatusReportPanelProps = {
        formData: {
          statusReportSections: [
            {
              sectionNumber: 1,
              title: '1. תפקוד לימודי וקוגניטיבי',
              content: 'התלמיד מגלה עניין רב במשימות חקר.'
            }
          ]
        },
        isGeneratingStatusReport: false,
        statusReportBanner: 'דו"ח המצב הופק בהצלחה!',
        onGenerateStatusReport: vi.fn(),
        onClose: vi.fn(),
        onRemoveStatusSection: vi.fn(),
        onUpdateStatusSectionContent: vi.fn(),
        onAddManualStatusSection: vi.fn()
      };

      const doneHtml = renderToStaticMarkup(<StatusReportPanel {...doneProps} />);
      expect(doneHtml).toContain('דו&quot;ח המצב הופק בהצלחה!');
      expect(doneHtml).toContain('תפקוד לימודי וקוגניטיבי');
      expect(doneHtml).toContain('השמט סעיף');
      expect(doneHtml).toContain('הדפס דו&quot;ח מצב');
      expect(doneHtml).toContain('הורד קובץ Word – דו&quot;ח מצב');
      expect(doneHtml).toContain('שלח דו&quot;ח מצב למייל');
    });
  });

  describe('TeamChatDrawer.tsx', () => {
    it('computes author initials and theme colors accurately', () => {
      expect(getAuthorInitials('שרה כהן', 's@school.org')).toBe('שכ');
      expect(getAuthorInitials('דנה', '')).toBe('דנ');
      expect(getAuthorInitials('', 'john@example.com')).toBe('JO');
      expect(getAuthorInitials('', '')).toBe('צו');

      const theme0 = getAuthorColorTheme('teacher@school.org', 0);
      expect(theme0.bg).toBe(AUTHOR_COLOR_THEMES[0].bg);
      expect(theme0.avatarBg).toBe(AUTHOR_COLOR_THEMES[0].avatarBg);

      const themeHashed = getAuthorColorTheme('test@example.com');
      expect(themeHashed).toBeDefined();
      expect(themeHashed.badgeColor).toBeTruthy();
    });

    it('returns null when drawer is closed', () => {
      const props: TeamChatDrawerProps = {
        isOpen: false,
        onClose: vi.fn()
      };
      const html = renderToStaticMarkup(<TeamChatDrawer {...props} />);
      expect(html).toBe('');
    });

    it('renders drawer with message stream, handoff tag, and quick chips when open', () => {
      const props: TeamChatDrawerProps = {
        isOpen: true,
        onClose: vi.fn(),
        studentName: 'יואב לוי',
        teamMessages: [
          {
            id: 'msg_1',
            text: 'נא לבדוק את יעד התקשורת לקראת ישיבת צוות',
            createdAt: '2025-11-01T12:00:00Z',
            authorEmail: 'teacher@school.org',
            authorName: 'שרה כהן',
            authorRole: 'מחנכת'
          },
          {
            id: 'msg_2',
            text: 'עדכנתי את המטרות הטיפוליות',
            createdAt: '2025-11-01T13:00:00Z',
            authorEmail: 'therapist@school.org',
            authorName: 'דנה לוין',
            authorRole: 'קלינאית תקשורת',
            type: 'share_handoff',
            recipientName: 'שרה כהן'
          }
        ],
        currentUser: { email: 'teacher@school.org', name: 'שרה כהן' },
        sharedWith: ['therapist@school.org'],
        onSendMessage: vi.fn(),
        onRetractMessage: vi.fn()
      };

      const html = renderToStaticMarkup(<TeamChatDrawer {...props} />);
      expect(html).toContain('שיח צוות ותיעוד שיתוף');
      expect(html).toContain('יואב לוי');
      expect(html).toContain('שרה כהן');
      expect(html).toContain('(אני)');
      expect(html).toContain('דנה לוין');
      expect(html).toContain('קלינאית תקשורת');
      expect(html).toContain('נא לבדוק מטרות');
      expect(html).toContain('שלח');
    });
  });
});
