import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassReadinessOverview from '../components/ClassReadinessOverview';

describe('Behavior Analyst Readiness Overview Suite', () => {
  const sampleBehaviorStudents = [
    {
      id: 'st-ba-1',
      name: 'איתי לוי',
      educationalFramework: 'כיתת שילוב ב׳',
      behaviorAssessment: {
        targetBehaviors: [{ id: 'tb1', name: 'התפרצות קולית', behaviorDescription: 'צעקות בעת מעברים' }],
        baselineData: [{ value: 6, date: '2026-11-01' }, { value: 4, date: '2026-11-02' }],
        functionalHypothesisNarrative: 'התנהגות של בריחה ממטלה לימודית מורכבת',
        mainHypothesizedFunction: 'escape' as const
      },
      behaviorPlan: {
        replacementBehaviors: [
          { replacementSkill: 'שימוש בכרטיסיית הפסקה', teachingStrategies: 'הדגמה וחיזוק מיידי' }
        ],
        antecedentStrategies: 'הטרמה של מעברים בלוח זמנים חזותי',
        ongoingTracking: [
          {
            id: 'trk-1',
            date: '2026-11-10',
            period: '1',
            targetBehaviorOccurrences: 1,
            replacementBehaviorUsed: true,
            reinforcementDelivered: true
          }
        ]
      }
    },
    {
      id: 'st-ba-2',
      name: 'נועם שרון',
      educationalFramework: 'גן גפן',
      behaviorAssessment: {
        targetBehaviors: [{ id: 'tb2', name: 'סירוב להשתתף', behaviorDescription: 'שוכב על הרצפה במפגש' }],
        baselineData: []
      },
      behaviorPlan: {
        replacementBehaviors: [],
        ongoingTracking: []
      }
    },
    {
      id: 'st-ba-3',
      name: 'דניאל מזרחי',
      educationalFramework: 'כיתת שילוב ב׳',
      behaviorAssessment: {
        targetBehaviors: [],
        baselineData: []
      }
    }
  ];

  it('renders behavior analyst readiness view by default when currentUser has role behavior_analyst', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview
        students={sampleBehaviorStudents}
        currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
        onSelectStudent={vi.fn()}
      />
    );

    // Headers & Titles
    expect(html).toContain('דוח מוכנות לישיבות צוות ומבט מרוכז במעקב התנהגותי');
    expect(html).toContain('תמונת מצב שוטפת לקראת דיוני צוות רב-מקצועיים, ישיבות מעקב התערבות והערכות תפקודיות');
    expect(html).toContain('3 תלמידים במעקב התנהגותי');
    expect(html).toContain('תמונת מצב מערך מעקב התנהגותי:');

    // KPI Badges
    expect(html).toContain('1 מוכנים לישיבת צוות');
    expect(html).toContain('1 בתהליך');
    expect(html).toContain('1 דורשים השלמה');

    // Behavioral Quick Filter Chips
    expect(html).toContain('כל התלמידים');
    expect(html).toContain('חסרים נתוני בסיס');
    expect(html).toContain('חסרה השערה תפקודית');
    expect(html).toContain('חסרה התנהגות חלופית');
    expect(html).toContain('ללא מעקב שוטף');
    expect(html).toContain('מוכנים לישיבת צוות');

    // Behavioral Table Columns
    expect(html).toContain('הערכת תפקוד ובייסליין');
    expect(html).toContain('השערה תפקודית ומנע');
    expect(html).toContain('התנהגות חלופית וחיזוקים');
    expect(html).toContain('מעקב שוטף ונתוני שטח');
    expect(html).toContain('סטטוס תיק');
    expect(html).toContain('פעולה מהירה');

    // Student Names & Cell Content
    expect(html).toContain('איתי לוי');
    expect(html).toContain('נועם שרון');
    expect(html).toContain('דניאל מזרחי');
    expect(html).toContain('1 יעדים • 2 בייסליין');
    expect(html).toContain('1 חלופות • חיזוקים');
    expect(html).toContain('1 רישומי שטח');
    expect(html).toContain('מוכן לישיבה');

    // Action buttons
    expect(html).toContain('מעבר לתיק');

    // Mode Toggle Tabs
    expect(html).toContain('מבט הוראה מותאמת');
    expect(html).toContain('מבט ניתוח התנהגות');

    // Strict Hebrew-Only Titles Rule (Zero English in parentheses)
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });

  it('renders behavior view when isBehaviorAnalyst prop is true regardless of currentUser', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview
        students={sampleBehaviorStudents}
        isBehaviorAnalyst={true}
        onSelectStudent={vi.fn()}
      />
    );

    expect(html).toContain('דוח מוכנות לישיבות צוות ומבט מרוכז במעקב התנהגותי');
    expect(html).toContain('1 מוכנים לישיבת צוות');
    expect(html).toContain('הערכת תפקוד ובייסליין');
  });

  it('renders pedagogical view when currentUser is a standard teacher', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview
        students={sampleBehaviorStudents}
        currentUser={{ name: 'מיכל המורה', role: 'teacher' }}
        onSelectStudent={vi.fn()}
      />
    );

    expect(html).toContain('דוח מוכנות לישיבות צוות ומבט כיתתי מרוכז');
    expect(html).toContain('מטרות פעילות (2+)');
    expect(html).toContain('קול הורים ושותפות');
    expect(html).toContain('הערכת אמצע שנה');
    expect(html).toContain('דו״ח מצב ונעילה');
  });

  it('correctly adapts bottom legend for behavior analyst', () => {
    const html = renderToStaticMarkup(
      <ClassReadinessOverview
        students={sampleBehaviorStudents}
        currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
        onSelectStudent={vi.fn()}
      />
    );

    expect(html).toContain('הושלם ותקין לדיון');
    expect(html).toContain('הערכה או תוכנית נעולים');
    expect(html).toContain('פותחת את הערכת התפקוד או תוכנית ההתערבות בעריכה');
  });
});
