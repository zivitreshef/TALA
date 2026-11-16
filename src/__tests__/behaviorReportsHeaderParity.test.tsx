import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorProgressReportForm from '../components/behavior/BehaviorProgressReportForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import type { StudentProfile } from '../domain/types';

describe('Behavior Reports Header Parity & Theme Alignment Suite (Picture 1 & Picture 2)', () => {
  const mockStudent: StudentProfile = {
    id: 'st_align_1',
    name: 'דניאל מזרחי',
    educationalFramework: 'חטיבת ביניים שחקים',
    schoolYear: 'תשפ"ז (2026-2027)',
    behaviorAssessment: {
      assessorName: 'רונית שפירא',
      assessmentDate: '14.11.2026',
      targetBehaviors: [],
      baselineData: [],
      updatedAt: '2026-11-14T20:58:00.000Z'
    },
    behaviorPlan: {
      analystName: 'רונית שפירא',
      effectiveDate: '14.11.2026',
      targetBehaviors: [],
      replacementBehaviors: [],
      ongoingTracking: [],
      antecedentStrategies: '',
      reinforcementSystem: { preferredReinforcers: '', scheduleOfReinforcement: '' },
      reactiveProtocol: { staffResponse: '', crisisSafetyPlan: '' },
      updatedAt: '2026-11-14T20:58:00.000Z'
    },
    behaviorProgressReport: {
      period: 'mid_year',
      assessorName: 'רונית שפירא',
      reportDate: '14.11.2026',
      targetBehaviorsProgress: [],
      replacementBehaviorsAcquisition: [],
      updatedAt: '2026-11-14T20:58:00.000Z'
    }
  };

  const mockUser = {
    name: 'רונית שפירא',
    role: 'behavior_analyst',
    email: 'ronit@example.com'
  };

  it('renders BehaviorAssessmentForm with original behavior title, student info, and unified action bar', () => {
    const onGoBack = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
      />
    );

    // Header container & classes
    expect(html).toContain('behavior-form-header');
    expect(html).toContain('הערכת תפקוד התנהגותי');
    expect(html).toContain('דניאל מזרחי');
    expect(html).toContain('חטיבת ביניים שחקים');

    // Action buttons matching Picture 1 & 2
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('btn-export-dropdown');
    expect(html).toContain('הדפסה וייצוא');
    expect(html).toContain('סגירה');
  });

  it('renders BehaviorInterventionPlanForm with original behavior plan title and unified actions', () => {
    const onGoBack = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
      />
    );

    // Header container & classes
    expect(html).toContain('plan-form-header');
    expect(html).toContain('תוכנית התערבות התנהגותית');
    expect(html).toContain('דניאל מזרחי');
    expect(html).toContain('חטיבת ביניים שחקים');

    // Action buttons matching Picture 1 & 2
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('btn-export-dropdown');
    expect(html).toContain('הדפסה וייצוא');
    expect(html).toContain('סגירה');
  });

  it('renders BehaviorProgressReportForm with original progress report title and unified actions', () => {
    const onGoBack = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorProgressReportForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
      />
    );

    // Header container & classes
    expect(html).toContain('plan-form-header');
    expect(html).toContain('דוח סיכום והערכת התקדמות התנהגותית');
    expect(html).toContain('דניאל מזרחי');
    expect(html).toContain('חטיבת ביניים שחקים');

    // Action buttons matching Picture 1 & 2
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('btn-export-dropdown');
    expect(html).toContain('הדפסה וייצוא');
    expect(html).toContain('סגירה');
  });

  it('ensures CSS header styles contain the signature purple top border accent #8b6fc0', () => {
    const assessmentCss = fs.readFileSync(
      path.resolve(__dirname, '../components/behavior/BehaviorAssessmentForm.css'),
      'utf-8'
    );
    const planCss = fs.readFileSync(
      path.resolve(__dirname, '../components/behavior/BehaviorInterventionPlanForm.css'),
      'utf-8'
    );
    const progressCss = fs.readFileSync(
      path.resolve(__dirname, '../components/behavior/BehaviorProgressReportForm.css'),
      'utf-8'
    );

    expect(assessmentCss).toContain('border-top: 3px solid #8b6fc0');
    expect(planCss).toContain('border-top: 3px solid #8b6fc0');
    expect(progressCss).toContain('border-top: 3px solid #8b6fc0');
  });

  it('ensures student-document-selector-bar in App.tsx is preserved on desktop for document switching', () => {
    const appTsx = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

    expect(appTsx).toContain('className="student-document-selector-bar"');
    expect(appTsx).toContain('activeStudentDocumentType === \'behavior_assessment\'');
    expect(appTsx).toContain('activeStudentDocumentType === \'behavior_plan\'');
    expect(appTsx).toContain('activeStudentDocumentType === \'behavior_progress_report\'');
  });

  it('prohibits English text in parentheses in all titles and labels', () => {
    const assessmentHtml = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
      />
    );
    const planHtml = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
      />
    );
    const progressHtml = renderToStaticMarkup(
      <BehaviorProgressReportForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
      />
    );

    const hebrewWithEnglishInParenRegex = /[\u0590-\u05FF]+\s*\([A-Za-z\s]+\)/g;
    expect(assessmentHtml.match(hebrewWithEnglishInParenRegex)).toBeNull();
    expect(planHtml.match(hebrewWithEnglishInParenRegex)).toBeNull();
    expect(progressHtml.match(hebrewWithEnglishInParenRegex)).toBeNull();
  });
});
