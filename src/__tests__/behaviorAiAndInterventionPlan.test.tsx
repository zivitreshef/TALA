import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import { StudentProfile } from '../domain/types';
import {
  refineOperationalDefinition,
  formulateHypothesisNarrative
} from '../services/behaviorAiService';

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
    expect(html).toContain('התנהגויות יעד להפחתה והתנהגויות חלופיות להוראה');
    expect(html).toContain('אסטרטגיות מקדימות והתאמות סביבתיות');
    expect(html).toContain('מערך חיזוקים ונוהל תגובת צוות');
    expect(html).toContain('טבלת מעקב שוטף ולוח התקדמות מול קו הבסיס');

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
});
