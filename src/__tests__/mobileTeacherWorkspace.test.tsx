import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MobileTeacherWorkspace from '../components/mobile/MobileTeacherWorkspace';

describe('MobileTeacherWorkspace Component Tests', () => {
  const mockStudents = [
    {
      id: 'st-1',
      name: 'איתי לוי',
      educationalFramework: 'שילוב פרטני',
      goals: [
        {
          id: 'goal-1',
          title: 'יוזמה חברתית בהפסקות',
          domain: 'חברתי-רגשי',
          currentProgress: 35,
          observations: [{ id: 'obs-1', note: 'תצפית ראשונה' }]
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

  it('renders complete clean mobile workspace layout', () => {
    const html = renderToStaticMarkup(
      <MobileTeacherWorkspace
        students={mockStudents}
        selectedStudentId="st-1"
        onSelectStudent={vi.fn()}
        currentUser={{ name: 'זיוית רשף' }}
        onUpdateStudent={vi.fn()}
        onSwitchToDesktop={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    // Top Bar
    expect(html).toContain('תל&quot;א');
    expect(html).toContain('מרחב מובייל');
    expect(html).toContain('זיוית רשף');

    // Search Box
    expect(html).toContain('חיפוש תלמיד/ה לפי שם...');

    // Student Carousel
    expect(html).toContain('איתי לוי');
    expect(html).toContain('שילוב פרטני');
    expect(html).toContain('נועה כהן');
    expect(html).toContain('כיתה מקדמת');
    expect(html).toContain('mobile-student-card-btn active');

    // Action Buttons
    expect(html).toContain('הדפסת דוח');
    expect(html).toContain('שיתוף דוח');

    // Today's Observation Card
    expect(html).toContain('תיעוד למפגש היום');
    expect(html).toContain('הקלטה קולית');
    expect(html).toContain('כתיבת הערה');
    expect(html).toContain('ניתוח בבינה מלאכותית ושמירה');

    // Goals Section
    expect(html).toContain('יוזמה חברתית בהפסקות');
    expect(html).toContain('חברתי-רגשי');
    expect(html).toContain('התקדמות ביעד: 35%');
    expect(html).toContain('1 תצפיות מתועדות');

    // Desktop Switcher
    expect(html).toContain('מעבר לטופס המחשב המלא');
  });

  it('strictly adheres to Hebrew-only titles with zero English in parentheses', () => {
    const html = renderToStaticMarkup(
      <MobileTeacherWorkspace
        students={mockStudents}
        selectedStudentId="st-1"
        onSelectStudent={vi.fn()}
        currentUser={{ name: 'מורה' }}
        onUpdateStudent={vi.fn()}
        onSwitchToDesktop={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    const forbiddenEnglishInParens = /\([A-Za-z\s-]+\)/;
    expect(html).not.toMatch(forbiddenEnglishInParens);
  });

  it('renders empty fallback when students list is empty', () => {
    const html = renderToStaticMarkup(
      <MobileTeacherWorkspace
        students={[]}
        selectedStudentId={null}
        onSelectStudent={vi.fn()}
        currentUser={{ name: 'מורה' }}
        onUpdateStudent={vi.fn()}
        onSwitchToDesktop={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(html).toContain('אין עדיין תלמידים להצגה');
  });
});
