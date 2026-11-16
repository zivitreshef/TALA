import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorProgressReportForm from '../components/behavior/BehaviorProgressReportForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import type { StudentProfile } from '../domain/types';

describe('Behavior Reports Unified 3-Row Header Suite (Option 1 - Matching Teacher Workspace)', () => {
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

  it('renders BehaviorAssessmentForm with complete 3-row architecture (sticky action bar, mode tabs, and blue title banner)', () => {
    const onGoBack = vi.fn();
    const onNavigateDocumentType = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
        onNavigateDocumentType={onNavigateDocumentType}
      />
    );

    // Row 1: Sticky Top Action Bar
    expect(html).toContain('sticky-action-bar');
    expect(html).toContain('ניהול תלמידים');
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('btn-export-dropdown');
    expect(html).toContain('הדפסה וייצוא');

    // Row 2: Master Document Mode Tabs
    expect(html).toContain('workplan-mode-tabs-container');
    expect(html).toContain('workplan-mode-tab');
    expect(html).toContain('הערכת תפקוד התנהגותי');
    expect(html).toContain('תוכנית התערבות התנהגותית');
    expect(html).toContain('דוח התקדמות תקופתי');

    // Row 3: Blue Document Title Banner
    expect(html).toContain('document-title-card');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('banner-slot-date');
    expect(html).toContain('banner-slot-controls');
    expect(html).toContain('שנת לימודים:');
    expect(html).toContain('הערכת תפקוד התנהגותי – דניאל מזרחי');
  });

  it('renders BehaviorInterventionPlanForm with complete 3-row architecture', () => {
    const onGoBack = vi.fn();
    const onNavigateDocumentType = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
        onNavigateDocumentType={onNavigateDocumentType}
      />
    );

    // Row 1: Sticky Top Action Bar
    expect(html).toContain('sticky-action-bar');
    expect(html).toContain('ניהול תלמידים');
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('btn-export-dropdown');
    expect(html).toContain('הדפסה וייצוא');

    // Row 2: Master Document Mode Tabs
    expect(html).toContain('workplan-mode-tabs-container');
    expect(html).toContain('workplan-mode-tab');
    expect(html).toContain('הערכת תפקוד התנהגותי');
    expect(html).toContain('תוכנית התערבות התנהגותית');
    expect(html).toContain('דוח התקדמות תקופתי');

    // Row 3: Blue Document Title Banner
    expect(html).toContain('document-title-card');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('banner-slot-date');
    expect(html).toContain('banner-slot-controls');
    expect(html).toContain('שנת לימודים:');
    expect(html).toContain('תוכנית התערבות התנהגותית – דניאל מזרחי');
  });

  it('renders BehaviorProgressReportForm with complete 3-row architecture', () => {
    const onGoBack = vi.fn();
    const onNavigateDocumentType = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorProgressReportForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
        onNavigateDocumentType={onNavigateDocumentType}
      />
    );

    // Row 1: Sticky Top Action Bar
    expect(html).toContain('sticky-action-bar');
    expect(html).toContain('ניהול תלמידים');
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('תצוגת מסמך מלאה');
    expect(html).toContain('btn-export-dropdown');
    expect(html).toContain('הדפסה וייצוא');

    // Row 2: Master Document Mode Tabs
    expect(html).toContain('workplan-mode-tabs-container');
    expect(html).toContain('workplan-mode-tab');
    expect(html).toContain('הערכת תפקוד התנהגותי');
    expect(html).toContain('תוכנית התערבות התנהגותית');
    expect(html).toContain('דוח התקדמות תקופתי');

    // Row 3: Blue Document Title Banner
    expect(html).toContain('document-title-card');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('banner-slot-date');
    expect(html).toContain('banner-slot-controls');
    expect(html).toContain('שנת לימודים:');
    expect(html).toContain('דוח סיכום והערכת התקדמות – דניאל מזרחי');
  });

  it('ensures CSS container styles align with workplan-form-container max-width 1240px', () => {
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

    expect(assessmentCss).toContain('max-width: 1240px');
    expect(planCss).toContain('max-width: 1240px');
    expect(progressCss).toContain('max-width: 1240px');
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
