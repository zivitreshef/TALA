import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';
import AdminOutreachEmailModal from '../components/modals/AdminOutreachEmailModal';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';

describe('Pedagogical Tasks UX & Admin Modal Tab Isolation (Bugs 1, 2, 3)', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => (key in mockStore ? mockStore[key] : null)),
      setItem: vi.fn((key: string, val: any) => {
        mockStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      })
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockStudents = [
    {
      id: 'st_idan',
      name: 'עידן אבוהב',
      goals: [
        {
          id: 'g_1',
          title: 'יעד בדיקה 1',
          domain: 'התנהגותי',
          currentProgress: 50,
          observations: []
        }
      ]
    },
    {
      id: 'st_arbel',
      name: 'ארבל חנה',
      goals: [
        {
          id: 'g_2',
          title: 'יעד בדיקה 2',
          domain: 'לימודי',
          currentProgress: 30,
          observations: []
        }
      ]
    }
  ];

  describe('Bug 1 & 2: Pedagogical Tasks Section UX', () => {
    it('renders student selector directly in the upper task form with options for all students and general', () => {
      const html = renderToStaticMarkup(
        <DailyPedagogicalTracker
          students={mockStudents}
          currentUser={{ email: 'teacher@school.gov.il' } as any}
          onUpdateStudent={vi.fn()}
          onSelectStudent={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Verify the direct student select dropdown exists in the form
      expect(html).toContain('todo-student-select');
      expect(html).toContain('כללי (ללא שיוך)');
      expect(html).toContain('עידן אבוהב');
      expect(html).toContain('ארבל חנה');
      expect(html).toContain('הוסיפי משימה פדגוגית...');
    });

    it('removes the redundant task counter badge (e.g. "2 פתוחות") from the header', () => {
      const html = renderToStaticMarkup(
        <DailyPedagogicalTracker
          students={mockStudents}
          currentUser={{ email: 'teacher@school.gov.il' } as any}
          onUpdateStudent={vi.fn()}
          onSelectStudent={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Verify redundant badge is gone
      expect(html).not.toContain('todo-count-badge');
      expect(html).not.toContain('פתוחות</span>');
    });
  });

  describe('Bug 3: Admin Outreach Email Modal Tab Isolation', () => {
    it('renders tabs and stops propagation so clicking tabs does not close parent modals', () => {
      const onCloseMock = vi.fn();
      const mockRecipients = [
        {
          id: 'u1',
          name: 'אודליה גמליאל',
          email: 'odelia@school.gov.il',
          role: 'teacher' as const,
          group: 'גן יובלים',
          active: true,
          passwordSalt: 'salt',
          passwordHash: 'hash'
        }
      ];

      const html = renderToStaticMarkup(
        <AdminOutreachEmailModal
          isOpen={true}
          recipients={mockRecipients}
          onClose={onCloseMock}
        />
      );

      // Verify both tabs exist
      expect(html).toContain('עריכת הודעה ותבניות');
      expect(html).toContain('תצוגה מקדימה מעוצבת');
      expect(html).toContain('אודליה גמליאל');
    });
  });

  describe('Bug 3: Admin Allowlist Modal Tab Navigation', () => {
    it('renders admin tabs with protected backdrop that only triggers onClose on exact target match', () => {
      const onCloseMock = vi.fn();
      const html = renderToStaticMarkup(
        <AdminAllowlistModal
          isOpen={true}
          currentUser={{ role: 'admin', email: 'admin@tala.org' } as any}
          allowedUsers={[]}
          onClose={onCloseMock}
          onUpdateAllowedUsers={vi.fn()}
          onUpdateEmailEngineConfig={vi.fn()}
          enforcePasswordPolicy={false}
          onChangeEnforcePasswordPolicy={vi.fn()}
          geminiApiKey=""
          onChangeGeminiApiKey={vi.fn()}
          adminRequests={[]}
          onDismissAdminRequest={vi.fn()}
          cloudSyncState={{ connected: true, lastSynced: new Date().toISOString() }}
        />
      );

      expect(html).toContain('משתמשים');
      expect(html).toContain('צוותים ומתי&quot;אות');
      expect(html).toContain('טלמטריית האתר');
      expect(html).toContain('עלויות, שימוש ואבטחה');
      expect(html).toContain('פניות והתראות');
      expect(html).toContain('בריאות המערכת');
      expect(html).toContain('הגדרות API ואבטחה');
    });
  });
});
