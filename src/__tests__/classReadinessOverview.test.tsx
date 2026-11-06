import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassReadinessOverview from '../components/ClassReadinessOverview';

describe('ClassReadinessOverview Component', () => {
  const sampleStudents = [
    {
      id: 'st1',
      name: 'נועה כהן',
      educationalFramework: 'כיתה ג׳ 2',
      goals: [
        { id: 'g1', title: 'מטרה 1', midYearEvaluation: 'התקדמות יפה' },
        { id: 'g2', title: 'מטרה 2' }
      ],
      teacherFreeText: '— קול ההורים (כפי שנמסר על ידי ההורים) — שיתוף פעולה מלא',
      isLocked: true
    },
    {
      id: 'st2',
      name: 'יונתן לוי',
      educationalFramework: 'כיתה ג׳ 2',
      goals: [
        { id: 'g1', title: 'מטרה 1', midYearEvaluation: 'התקדמות חלקית' },
        { id: 'g2', title: 'מטרה 2' }
      ],
      teacherFreeText: 'רקע מורה',
      isLocked: false
    },
    {
      id: 'st3',
      name: 'אורי מזרחי',
      educationalFramework: 'גן שקד',
      goals: [],
      teacherFreeText: '',
      isLocked: false
    }
  ];

  it('renders traffic-light summary, filter chips, student cards, and inspector panel in clean Hebrew', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview students={sampleStudents} onSelectStudent={vi.fn()} />
    );

    expect(html).toContain('רשימת תלמידים ומבט-על כיתתי');
    expect(html).toContain('מוכנות כיתתית לדיווח');
    expect(html).toContain('1 מוכנים');
    expect(html).toContain('1 בתהליך');
    expect(html).toContain('1 דורשים השלמה');
    expect(html).toContain('כל התלמידים');
    expect(html).toContain('חסרות מטרות פעילות');
    expect(html).toContain('חסר קול הורים');
    expect(html).toContain('חסרה הערכת אמצע');
    expect(html).toContain('מוכנים ונעולים');
    expect(html).toContain('נועה כהן');
    expect(html).toContain('יונתן לוי');
    expect(html).toContain('אורי מזרחי');
    expect(html).toContain('פתיחת תיק התלמיד/ה להשלמה ולעריכה');
    // Strictly no parenthetical English in UI labels
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });

  it('renders empty state gracefully when no students exist', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview students={[]} onSelectStudent={vi.fn()} />
    );
    expect(html).toContain('0 תלמידים');
    expect(html).toContain('לא נמצאו תלמידים התואמים לסינון הנוכחי');
  });
});
