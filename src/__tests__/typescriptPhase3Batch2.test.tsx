import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HebrewDatePicker, { HebrewDatePickerProps } from '../components/HebrewDatePicker';
import ParentStudentInputView, { ParentStudentInputViewProps } from '../components/public/ParentStudentInputView';
import QuickObservationModal, { QuickObservationModalProps } from '../components/form/QuickObservationModal';
import {
  DeleteStudentModal,
  ArchiveStudentModal,
  LogoutUnsavedModal
} from '../components/modals/StudentActionModals';

vi.mock('../../services/inviteService', () => ({
  fetchInviteForRespondent: vi.fn().mockResolvedValue({ state: 'pending', invite: null }),
  submitInviteResponses: vi.fn().mockResolvedValue(undefined)
}));

describe('TypeScript Migration Phase 3 - Batch 2 (Leaf Modals & Controls)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HebrewDatePicker.tsx', () => {
    it('renders trigger button with formatted Hebrew date and holiday pill if applicable', () => {
      const props: HebrewDatePickerProps = {
        value: '2025-10-07', // Sukkot holiday in Israel
        onChange: vi.fn(),
        showDayNav: true,
        compact: false,
        ariaLabel: 'בחירת תאריך תצפית'
      };

      const html = renderToStaticMarkup(<HebrewDatePicker {...props} />);
      expect(html).toContain('hdp-root');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('aria-label="בחירת תאריך תצפית"');
      expect(html).toContain('hdp-holiday-pill');
      expect(html).toContain('יום קודם');
      expect(html).toContain('יום הבא');
      expect(html).toContain('היום');
    });

    it('renders in compact mode without day navigation buttons', () => {
      const props: HebrewDatePickerProps = {
        value: '2025-11-15',
        onChange: vi.fn(),
        showDayNav: false,
        compact: true
      };

      const html = renderToStaticMarkup(<HebrewDatePicker {...props} />);
      expect(html).toContain('hdp-compact');
      expect(html).not.toContain('hdp-nav-group');
    });
  });

  describe('ParentStudentInputView.tsx', () => {
    it('renders initial loading state within page shell', () => {
      const props: ParentStudentInputViewProps = {
        token: '0123456789abcdef012345'
      };

      const html = renderToStaticMarkup(<ParentStudentInputView {...props} />);
      expect(html).toContain('pi-page');
      expect(html).toContain('טוען…');
      expect(html).toContain('dir="rtl"');
    });
  });

  describe('QuickObservationModal.tsx', () => {
    it('renders modal with environment, title, support levels, and past observations', () => {
      const props: QuickObservationModalProps = {
        goalRow: {
          id: 'goal_1',
          environment: 'חצר המשחקים',
          title: 'יוזם משחק משותף עם עמית',
          observations: [
            {
              id: 'obs_1',
              dateIso: '2025-11-01T10:00:00.000Z',
              supportLevel: 'עצמאי',
              note: 'שיחק בכדור 10 דקות',
              authorName: 'רחל'
            }
          ]
        },
        authorName: 'מורה שרה',
        onAddObservation: vi.fn(),
        onDeleteObservation: vi.fn(),
        onClose: vi.fn()
      };

      const html = renderToStaticMarkup(<QuickObservationModal {...props} />);
      expect(html).toContain('תיעוד תצפית מהירה בשטח');
      expect(html).toContain('חצר המשחקים');
      expect(html).toContain('יוזם משחק משותף עם עמית');
      expect(html).toContain('עצמאי');
      expect(html).toContain('תיווך מלא');
      expect(html).toContain('יומן תצפיות למטרה זו (1)');
      expect(html).toContain('שיחק בכדור 10 דקות');
    });
  });

  describe('StudentActionModals.tsx', () => {
    it('DeleteStudentModal renders student name and handles options', () => {
      const htmlActive = renderToStaticMarkup(
        <DeleteStudentModal
          studentToDelete={{ id: 'st_1', name: 'אורי ישראלי', archived: false }}
          onClose={vi.fn()}
          onConfirmArchiveInstead={vi.fn()}
          onConfirmDelete={vi.fn()}
        />
      );
      expect(htmlActive).toContain('אישור מחיקת תלמיד/ה');
      expect(htmlActive).toContain('אורי ישראלי');
      expect(htmlActive).toContain('העבר לארכיון במקום');
      expect(htmlActive).toContain('כן, מחק לצמיתות');

      const htmlArchived = renderToStaticMarkup(
        <DeleteStudentModal
          studentToDelete={{ id: 'st_2', name: 'תמר כהן', archived: true }}
          onClose={vi.fn()}
          onConfirmArchiveInstead={vi.fn()}
          onConfirmDelete={vi.fn()}
        />
      );
      expect(htmlArchived).not.toContain('העבר לארכיון במקום');

      const htmlNull = renderToStaticMarkup(
        <DeleteStudentModal
          studentToDelete={null}
          onClose={vi.fn()}
          onConfirmArchiveInstead={vi.fn()}
          onConfirmDelete={vi.fn()}
        />
      );
      expect(htmlNull).toBe('');
    });

    it('ArchiveStudentModal renders confirmation dialog', () => {
      const html = renderToStaticMarkup(
        <ArchiveStudentModal
          studentToArchive={{ id: 'st_1', name: 'יונתן לוי' }}
          onClose={vi.fn()}
          onConfirmArchive={vi.fn()}
        />
      );
      expect(html).toContain('העברת תלמיד/ה לארכיון');
      expect(html).toContain('יונתן לוי');
      expect(html).toContain('כן, העבר לארכיון');
    });

    it('LogoutUnsavedModal renders unsaved warning dialog when open', () => {
      const htmlOpen = renderToStaticMarkup(
        <LogoutUnsavedModal
          isOpen={true}
          draftStudentName="דניאל"
          onClose={vi.fn()}
          onDiscardAndLogout={vi.fn()}
          onSaveAndLogout={vi.fn()}
        />
      );
      expect(htmlOpen).toContain('שינויים שלא נשמרו לפני התנתקות');
      expect(htmlOpen).toContain('דניאל');
      expect(htmlOpen).toContain('התעלם והתנתק');
      expect(htmlOpen).toContain('שמור שינויים והתנתק');

      const htmlClosed = renderToStaticMarkup(
        <LogoutUnsavedModal
          isOpen={false}
          draftStudentName="דניאל"
          onClose={vi.fn()}
          onDiscardAndLogout={vi.fn()}
          onSaveAndLogout={vi.fn()}
        />
      );
      expect(htmlClosed).toBe('');
    });
  });
});
