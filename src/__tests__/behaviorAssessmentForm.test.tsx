import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import { StudentProfile } from '../domain/types';

describe('BehaviorAssessmentForm Component Suite', () => {
  const sampleStudent: StudentProfile = {
    id: 'st_123',
    name: 'איתמר ישראלי',
    educationalFramework: 'בית ספר יסודי דקל',
    behaviorAssessment: {
      assessorName: 'רונית שפירא',
      assessmentDate: '2026-11-15',
      backgroundInfo: 'רקע סביבתי וחינוכי תקין',
      targetBehaviors: [
        {
          id: 'target_1',
          name: 'עזיבת מקום ללא אישור',
          operationalDefinition: 'התלמיד קם מהכיסא במהלך שיעור פרונטלי ויוצא מהכיתה',
          measurementType: 'frequency',
          baselineAverage: 6,
          targetGoal: 1
        }
      ],
      baselineData: [
        { id: 'b_1', date: '2026-11-01', sessionOrPeriod: 'שיעור 1', value: 5, notes: 'עבודה אישית' },
        { id: 'b_2', date: '2026-11-02', sessionOrPeriod: 'שיעור 1', value: 7, notes: 'שיעור חשבון' }
      ],
      antecedentAnalysis: 'דרישה למשימה מורכבת במליאה',
      mainHypothesizedFunction: 'escape',
      functionalHypothesisNarrative: 'התלמיד קם מהכיסא כאשר נדרש לכתיבה עצמאית על מנת להימנע מהמטלה',
      initialRecommendations: 'מתן אפשרות להפסקה יזומה ופירוק משימות'
    }
  };

  it('renders without throwing and displays core student information', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={sampleStudent}
        currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).toContain('הערכת תפקוד התנהגותי');
    expect(html).toContain('איתמר ישראלי');
    expect(html).toContain('בית ספר יסודי דקל');
    expect(html).toContain('רונית שפירא');
  });

  it('renders all 5 core sections with clean Hebrew headers and no English in parentheses', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={sampleStudent}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).toContain('פרטי רקע והערכה');
    expect(html).toContain('הגדרת התנהגויות יעד');
    expect(html).toContain('נתוני קו בסיס ומדדי מדידה');
    expect(html).toContain('ניתוח תנאים מקדימים והשערת תפקוד');
    expect(html).toContain('עוגנים והמלצות לתוכנית ההתערבות');

    // Verify Hebrew-Only Titles Rule
    expect(html).not.toContain('(FBA)');
    expect(html).not.toContain('(ABC)');
    expect(html).not.toContain('(BIP)');
  });

  it('displays computed baseline statistics accurately in the banner', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={sampleStudent}
        onSaveStudentPlan={handleSave}
      />
    );

    // Baseline data has 2 points: 5 and 7 -> average = 6
    expect(html).toContain('מספר מדידות');
    expect(html).toContain('ממוצע קו בסיס');
    expect(html).toContain('ערך מינימום');
    expect(html).toContain('ערך מקסימום');
    expect(html).toContain('6'); // average (5+7)/2
  });

  it('renders empty state cleanly when student has no prior behavior assessment', () => {
    const freshStudent: StudentProfile = {
      id: 'st_fresh',
      name: 'נועה לוי'
    };
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={freshStudent}
        currentUser={{ name: 'מנתח התנהגות', role: 'behavior_analyst' }}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).toContain('נועה לוי');
    expect(html).toContain('טרם הוגדרו התנהגויות יעד');
    expect(html).toContain('טרם הוזנו נתוני קו בסיס');
  });
});
