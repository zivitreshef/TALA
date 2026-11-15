import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import SendReportEmailModal from '../components/modals/SendReportEmailModal';

describe('Behavior Analyst Export & KISS Parity Suite', () => {
  const sampleStudent = {
    id: 'st-export-1',
    name: 'ליאור קפלן',
    educationalFramework: 'בית ספר יסודי רימונים',
    behaviorAssessment: {
      targetBehaviors: [
        {
          id: 'tb1',
          name: 'עזיבת מקום',
          behaviorDescription: 'קם ומשוטט בכיתה',
          operationalDefinition: 'קם ומשוטט בכיתה',
          measurementType: 'frequency' as const
        }
      ],
      baselineData: [{ id: 'b1', value: 4, date: '2026-11-01', sessionOrPeriod: 'מפגש 1' }],
      functionalHypothesisNarrative: 'הימנעות מעבודה עצמית',
      mainHypothesizedFunction: 'escape' as const
    },
    behaviorPlan: {
      targetBehaviors: [
        {
          id: 'tb1',
          name: 'עזיבת מקום',
          behaviorDescription: 'קם ומשוטט בכיתה',
          operationalDefinition: 'קם ומשוטט בכיתה',
          measurementType: 'frequency' as const
        }
      ],
      replacementBehaviors: [
        { replacementSkill: 'איתות לעזרה', teachingStrategies: 'כרטיסיית עזרה' }
      ],
      antecedentStrategies: 'פירוק מטלה למקטעים',
      reinforcementSystem: {
        preferredReinforcers: 'זמן משחק',
        scheduleOfReinforcement: 'חיזוק מיידי'
      },
      reactiveProtocol: {
        staffResponse: 'הפניה שקטה'
      },
      ongoingTracking: []
    }
  };

  it('renders top bar preview button and verifies all 4 export actions in BehaviorAssessmentForm', () => {
    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={sampleStudent}
        currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
        onSaveStudentPlan={vi.fn()}
      />
    );

    // Full Document Preview button in top bar
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('הדפסה וייצוא');

    // KISS verification: No confusing global AI button in the top header
    expect(html).not.toMatch(/<button[^>]*class="btn-export-dropdown"[^>]*>[\s\S]*?<span>סיוע בינה מלאכותית<\/span>/);

    // Contextual AI buttons remain in their appropriate sections
    expect(html).toContain('ניסוח משפט השערה בבינה מלאכותית');
    expect(html).toContain('הצעת עוגנים בבינה מלאכותית');

    // Dropdown items in source code
    const sourceCode = fs.readFileSync(
      path.resolve(__dirname, '../components/behavior/BehaviorAssessmentForm.tsx'),
      'utf8'
    );
    expect(sourceCode).toContain('הדפס הערכת תפקוד');
    expect(sourceCode).toContain('שלח למייל (Word / PDF)');
    expect(sourceCode).toContain('הורד קובץ Word (.doc)');
    expect(sourceCode).toContain('הורד קובץ PDF (.pdf)');
    expect(sourceCode).toContain('הסתר פרטים מזהים בהדפסה');

    // Zero English in parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });

  it('renders top bar preview button and verifies all 4 export actions in BehaviorInterventionPlanForm', () => {
    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={sampleStudent}
        currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
        onSaveStudentPlan={vi.fn()}
      />
    );

    // Full Document Preview button in top bar
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('הדפסה וייצוא');

    // KISS verification: No confusing global AI button in the top header
    expect(html).not.toMatch(/<button[^>]*class="btn-export-dropdown"[^>]*>[\s\S]*?<span>סיוע בינה מלאכותית<\/span>/);

    // Dropdown items in source code
    const sourceCode = fs.readFileSync(
      path.resolve(__dirname, '../components/behavior/BehaviorInterventionPlanForm.tsx'),
      'utf8'
    );
    expect(sourceCode).toContain('הדפס תוכנית התערבות');
    expect(sourceCode).toContain('שלח למייל (Word / PDF)');
    expect(sourceCode).toContain('הורד קובץ Word (.doc)');
    expect(sourceCode).toContain('הורד קובץ PDF (.pdf)');
    expect(sourceCode).toContain('הסתר פרטים מזהים בהדפסה');

    // Zero English in parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });

  it('renders SendReportEmailModal with Word and PDF options and privacy toggle', () => {
    const html = renderToStaticMarkup(
      <SendReportEmailModal
        isOpen={true}
        onClose={vi.fn()}
        reportTitle="הערכת תפקוד התנהגותי"
        studentName="ליאור קפלן"
        schoolYear="תשפ״ו"
        currentUser={{ name: 'רונית שפירא' }}
        hideDetails={false}
        onToggleHideDetails={vi.fn()}
        getWordAttachment={() => ({
          blob: new Blob(),
          filename: 'test.doc',
          mimeType: 'application/msword',
          htmlContent: '<div>test</div>'
        })}
        getPdfAttachment={async () => ({
          blob: new Blob(),
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          htmlContent: '<div>test</div>'
        })}
      />
    );

    expect(html).toContain('שליחת הערכת תפקוד התנהגותי במייל');
    expect(html).toContain('שלח אל כתובת אימייל:');
    expect(html).toContain('בחר פורמט קובץ מצורף:');
    expect(html).toContain('מסמך PDF');
    expect(html).toContain('מסמך Word');
    expect(html).toContain('הפעל הגנת פרטיות בקובץ המצורף');
    expect(html).toContain('הורד קובץ בלבד');
    expect(html).toContain('שלח למייל');

    // Zero English in parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });
});
