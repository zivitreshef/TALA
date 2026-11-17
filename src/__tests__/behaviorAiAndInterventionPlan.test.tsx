import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import { StudentProfile } from '../domain/types';
import {
  refineOperationalDefinition,
  formulateHypothesisNarrative
} from '../services/behaviorAiService';
import {
  validateBehaviorPlanQuality,
  getDifferentialProcedureLabelHebrew,
  calculateBaselineStats,
  calculateTrackingStats
} from '../domain/behaviorAnalysis';

describe('Behavior Intervention Plan & AI Assistance Suite', () => {
  const sampleStudentWithAssessment: StudentProfile = {
    id: 'st_456',
    name: 'מאיה אלון',
    educationalFramework: 'חטיבת ביניים שקד',
    behaviorAssessment: {
      assessorName: 'דנה מנתחת',
      assessmentDate: '2026-11-10',
      baselineData: [
        { id: 'b1', date: '2026-11-01', sessionOrPeriod: '1', value: 8 },
        { id: 'b2', date: '2026-11-02', sessionOrPeriod: '1', value: 6 }
      ],
      targetBehaviors: [
        {
          id: 't1',
          name: 'זריקת ציוד',
          operationalDefinition: 'השלכת כלי כתיבה או מחברות על הרצפה',
          measurementType: 'frequency',
          baselineAverage: 7,
          targetGoal: 1
        }
      ],
      mainHypothesizedFunction: 'escape'
    },
    behaviorPlan: {
      analystName: 'דנה מנתחת',
      effectiveDate: '2026-11-12',
      reviewDate: '2026-12-12',
      targetBehaviors: [
        {
          id: 't1',
          name: 'זריקת ציוד',
          operationalDefinition: 'השלכת כלי כתיבה או מחברות על הרצפה',
          measurementType: 'frequency',
          baselineAverage: 7,
          targetGoal: 1
        }
      ],
      replacementBehaviors: [
        {
          replacementSkill: 'הרמת כרטיסיית הפסקה',
          teachingStrategies: 'הדגמה ותרגול בתחילת שיעור'
        }
      ],
      antecedentStrategies: 'חלוקת דפי עבודה ל-3 שאלות בכל פעם',
      reinforcementSystem: {
        preferredReinforcers: '5 דקות ציור חופשי בסוף השיעור',
        scheduleOfReinforcement: 'חיזוק מיידי על שימוש בכרטיסייה'
      },
      reactiveProtocol: {
        staffResponse: 'הפניה שקטה לכרטיסיית הפסקה ללא שיח נוסף',
        crisisSafetyPlan: 'הרחקת חפצים שבירים'
      },
      ongoingTracking: [
        {
          id: 'tr1',
          date: '2026-11-13',
          period: 'שיעור 1',
          targetBehaviorOccurrences: 2,
          replacementBehaviorUsed: true,
          reinforcementDelivered: true
        },
        {
          id: 'tr2',
          date: '2026-11-14',
          period: 'שיעור 1',
          targetBehaviorOccurrences: 1,
          replacementBehaviorUsed: true,
          reinforcementDelivered: true
        }
      ]
    }
  };

  it('renders BehaviorInterventionPlanForm with student info and clean Hebrew titles', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={sampleStudentWithAssessment}
        currentUser={{ name: 'דנה מנתחת', role: 'behavior_analyst' }}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).toContain('תוכנית התערבות התנהגותית');
    expect(html).toContain('מאיה אלון');
    expect(html).toContain('חטיבת ביניים שקד');
    expect(html).toContain('זריקת ציוד');
    expect(html).toContain('הרמת כרטיסיית הפסקה');

    // Section Titles
    expect(html).toContain('פרטי התוכנית וצוות יישום');
    expect(html).toContain('מטרות ההתערבות ויעדים משלימים');
    expect(html).toContain('התנהגויות יעד להפחתה והליך הקניית התנהגות חלופית');
    expect(html).toContain('התערבות מניעתית והתאמות סביבתיות');
    expect(html).toContain('מערך חיזוקים וחיזוק דיפרנציאלי');
    expect(html).toContain('פרוטוקול תגובה מדורג ב-4 מצבים ונוהל בטיחות');
    expect(html).toContain('פרוטוקול יישום מעשי לכיתה ולצוות החינוכי');
    expect(html).toContain('טבלת מעקב שוטף ולוח התקדמות מול קו הבסיס');
    expect(html).toContain('בקרת איכות מקצועית של תוכנית ההתערבות');

    // Strictly no English in parentheses
    expect(html).not.toContain('(BIP)');
    expect(html).not.toContain('(FBA)');
    expect(html).not.toContain('(DRA)');
  });

  it('computes and displays baseline vs ongoing comparison metrics accurately', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={sampleStudentWithAssessment}
        onSaveStudentPlan={handleSave}
      />
    );

    // Baseline average was (8+6)/2 = 7
    // Tracking occurrences: 2 and 1 -> average = 1.5
    // Reduction from 7 to 1.5 = ((7 - 1.5)/7) * 100 = 78.6%
    expect(html).toContain('ממוצע קו בסיס מקורי');
    expect(html).toContain('7');
    expect(html).toContain('ממוצע נוכחי בהתערבות');
    expect(html).toContain('1.5');
    expect(html).toContain('אחוז הפחתה מקו הבסיס');
    expect(html).toContain('78.6%');
    expect(html).toContain('שיעור שימוש בהתנהגות חלופית');
    expect(html).toContain('100%');
  });

  it('handles empty fallback safely for AI prompt helpers when inputs are blank', async () => {
    const emptyDef = await refineOperationalDefinition('');
    expect(emptyDef).toBe('');

    const hypothesis = await formulateHypothesisNarrative('', '', '');
    expect(typeof hypothesis).toBe('string');
  });

  it('validates professional quality checklist indicators correctly', () => {
    const plan = sampleStudentWithAssessment.behaviorPlan!;
    const assessment = sampleStudentWithAssessment.behaviorAssessment!;

    const result = validateBehaviorPlanQuality(plan, assessment);
    expect(result.total).toBe(6);
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.isReady).toBe(true);

    const labels = result.items.map((i) => i.label);
    expect(labels).toContain('הגדרת התנהגות יעד אופרציונלית');
    expect(labels).toContain('מטרות התערבות מדידות ומותאמות');
    expect(labels).toContain('התנהגות חלופית תואמת תפקוד');
    expect(labels).toContain('התערבות מניעתית והתאמות סביבתיות');
    expect(labels).toContain('מערך חיזוקים מובנה וחיזוק דיפרנציאלי');
    expect(labels).toContain('פרוטוקול תגובה מדורג ובטיחות');
  });

  it('verifies getDifferentialProcedureLabelHebrew produces pure Hebrew with zero English in parentheses', () => {
    expect(getDifferentialProcedureLabelHebrew('DRA')).toBe('חיזוק דיפרנציאלי של התנהגות חלופית');
    expect(getDifferentialProcedureLabelHebrew('DRI')).toBe('חיזוק דיפרנציאלי של התנהגות בלתי תואמת');
    expect(getDifferentialProcedureLabelHebrew('DRO')).toBe('חיזוק דיפרנציאלי של התנהגות אחרת');
    expect(getDifferentialProcedureLabelHebrew('FCT')).toBe('אימון לתקשורת תפקודית מותאמת');

    // Strictly no English letters
    ['DRA', 'DRI', 'DRO', 'FCT'].forEach((proc) => {
      const label = getDifferentialProcedureLabelHebrew(proc);
      expect(label).not.toMatch(/[a-zA-Z]/);
      expect(label).not.toContain('(');
      expect(label).not.toContain(')');
    });
  });

  it('strictly rejects or clamps negative values to non-negative numbers in baseline and tracking stats', () => {
    // Negative points in baselineData must be excluded or clamped
    const rawBaseline = [
      { id: 'b1', date: '2026-11-01', value: -5 },
      { id: 'b2', date: '2026-11-02', value: 8 },
      { id: 'b3', date: '2026-11-03', value: 4 }
    ];
    const baseStats = calculateBaselineStats(rawBaseline as any);
    expect(baseStats.count).toBe(2);
    expect(baseStats.average).toBe(6);
    expect(baseStats.min).toBe(4);
    expect(baseStats.max).toBe(8);

    // Negative occurrences in tracking must be clamped to 0
    const rawTracking = [
      { id: 't1', date: '2026-11-04', period: '1', targetBehaviorOccurrences: -3, replacementBehaviorUsed: true, reinforcementDelivered: true },
      { id: 't2', date: '2026-11-05', period: '2', targetBehaviorOccurrences: 2, replacementBehaviorUsed: true, reinforcementDelivered: true }
    ];
    const trackStats = calculateTrackingStats(rawTracking as any, 6);
    expect(trackStats.totalOccurrences).toBe(2);
    expect(trackStats.averageOccurrences).toBe(1);
  });
});
