import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassReadinessOverview from '../components/ClassReadinessOverview';

describe('ClassReadinessOverview Component (Matrix Table)', () => {
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

  it('renders traffic-light summary, matrix table headers, and rows in clean Hebrew', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview students={sampleStudents} onSelectStudent={vi.fn()} />
    );

    expect(html).toContain('מבט-על כיתתי על עמידה ביעדים ומועדי דיווח');
    expect(html).toContain('תמונת מצב כיתתית:');
    expect(html).toContain('1 מוכנים לוועדה');
    expect(html).toContain('1 בתהליך');
    expect(html).toContain('1 דורשים השלמה');
    expect(html).toContain('כל התלמידים');
    expect(html).toContain('חסר קול הורים');
    expect(html).toContain('חסרה הערכת אמצע');
    expect(html).toContain('חסרות מטרות פעילות');
    expect(html).toContain('שם התלמיד/ה ומסגרת');
    expect(html).toContain('מטרות פעילות (2+)');
    expect(html).toContain('קול הורים ושותפות');
    expect(html).toContain('הערכת אמצע שנה');
    expect(html).toContain('דו״ח מצב ונעילה');
    expect(html).toContain('סטטוס תיק');
    expect(html).toContain('פעולה מהירה');
    expect(html).toContain('נועה כהן');
    expect(html).toContain('יונתן לוי');
    expect(html).toContain('אורי מזרחי');
    expect(html).toContain('מעבר לתיק');

    // Strictly Hebrew only - zero parenthetical English
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });

  it('renders framework filter when multiple frameworks are present', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview students={sampleStudents} onSelectStudent={vi.fn()} />
    );
    expect(html).toContain('כל המסגרות החינוכיות (3)');
    expect(html).toContain('גן שקד');
    expect(html).toContain('כיתה ג׳ 2');
  });

  it('renders empty state gracefully when no students exist', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview students={[]} onSelectStudent={vi.fn()} />
    );
    expect(html).toContain('0 תלמידים מוצגים');
    expect(html).toContain('לא נמצאו תלמידים התואמים לסינון הנוכחי');
  });
});
