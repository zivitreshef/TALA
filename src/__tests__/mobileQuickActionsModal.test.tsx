import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MobileQuickActionsModal from '../components/mobile/MobileQuickActionsModal';

describe('MobileQuickActionsModal Component Tests', () => {
  const mockStudents = [
    {
      id: 'st-1',
      name: 'איתי לוי',
      educationalFramework: 'שילוב פרטני',
      goals: [
        {
          id: 'goal-1',
          title: 'יוזמה חברתית בהפסקות',
          currentProgress: 20,
          observations: []
        }
      ]
    },
    {
      id: 'st-2',
      name: 'נועה כהן',
      educationalFramework: 'כיתה מקדמת',
      goals: []
    }
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <MobileQuickActionsModal
        isOpen={false}
        onClose={vi.fn()}
        students={mockStudents}
      />
    );
    expect(html).toBe('');
  });

  it('renders complete mobile quick-hub sheet when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <MobileQuickActionsModal
        isOpen={true}
        onClose={vi.fn()}
        students={mockStudents}
        selectedStudentId="st-1"
      />
    );

    // Header and titles
    expect(html).toContain('מוקד פעולות מהיר לתלמיד');
    expect(html).toContain('חיפוש, שיתוף דוחות ותיעוד יומי בקליק אחד');

    // Search bar
    expect(html).toContain('חיפוש תלמיד/ה לפי שם...');

    // Student chips
    expect(html).toContain('איתי לוי');
    expect(html).toContain('נועה כהן');
    expect(html).toContain('mobile-quick-student-chip active');

    // Quick action buttons
    expect(html).toContain('הדפסת דוח');
    expect(html).toContain('שיתוף דוח');

    // Observation card
    expect(html).toContain('תיעוד למפגש היום');
    expect(html).toContain('הקלטה קולית');
    expect(html).toContain('כתיבת הערה');
    expect(html).toContain('ניתוח בבינה מלאכותית ושמירה');
  });

  it('strictly adheres to Hebrew-only titles with zero English in parentheses', () => {
    const html = renderToStaticMarkup(
      <MobileQuickActionsModal
        isOpen={true}
        onClose={vi.fn()}
        students={mockStudents}
        selectedStudentId="st-1"
      />
    );

    // Forbidden parenthetical English patterns (e.g. "חיפוש (Search)", "דוח (Report)")
    const forbiddenEnglishInParens = /\([A-Za-z\s-]+\)/;
    expect(html).not.toMatch(forbiddenEnglishInParens);
  });

  it('renders empty state message when student list is empty', () => {
    const html = renderToStaticMarkup(
      <MobileQuickActionsModal
        isOpen={true}
        onClose={vi.fn()}
        students={[]}
      />
    );

    expect(html).toContain('לא נמצאו תלמידים התואמים לחיפוש');
  });
});
