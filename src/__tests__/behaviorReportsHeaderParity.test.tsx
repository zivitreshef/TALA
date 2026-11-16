import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorProgressReportForm from '../components/behavior/BehaviorProgressReportForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import type { StudentProfile } from '../domain/types';

describe('Behavior Reports Header Parity & Teacher Alignment Suite (Picture 1 vs Picture 2)', () => {
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

  it('aligns BehaviorAssessmentForm header with Picture 1 layout (sticky bar, mode tabs, reports nav, blue banner)', () => {
    const onNavigate = vi.fn();
    const onGoBack = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
        onNavigateDocumentType={onNavigate}
      />
    );

    // Row 1: Sticky Top Bar
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
    expect(html).toContain('תוכנית עבודה שנתית');
    expect(html).toContain('דוחות תקופתיים ומעקב');
    expect(html).toContain('workplan-mode-tab reports-mode active');

    // Row 3: Sub-Navigation Bar
    expect(html).toContain('form-section-nav-bar');
    expect(html).toContain('section-nav-pill purple-report active');
    expect(html).toContain('דוח הערכת מחצית ושנה');
    expect(html).toContain('דו&quot;ח מצב תפקודי');
    expect(html).toContain('חזרה לתוכנית עבודה שנתית');

    // Row 4: Signature Blue Document Title Banner
    expect(html).toContain('document-title-card');
    expect(html).toContain('main-ecological-heading');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('banner-slot-date');
    expect(html).toContain('תאריך:');
    expect(html).toContain('שנת לימודים:');
  });

  it('aligns BehaviorProgressReportForm header with Picture 1 layout', () => {
    const onNavigate = vi.fn();
    const onGoBack = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorProgressReportForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
        onNavigateDocumentType={onNavigate}
      />
    );

    // Row 1: Sticky Top Bar
    expect(html).toContain('sticky-action-bar');
    expect(html).toContain('ניהול תלמידים');
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('btn-export-dropdown');

    // Row 2: Master Document Mode Tabs
    expect(html).toContain('workplan-mode-tabs-container');
    expect(html).toContain('תוכנית עבודה שנתית');
    expect(html).toContain('דוחות תקופתיים ומעקב');
    expect(html).toContain('workplan-mode-tab reports-mode active');

    // Row 3: Sub-Navigation Bar
    expect(html).toContain('form-section-nav-bar');
    expect(html).toContain('דוח הערכת מחצית ושנה');
    expect(html).toContain('דו&quot;ח מצב תפקודי');
    expect(html).toContain('חזרה לתוכנית עבודה שנתית');

    // Row 4: Signature Blue Document Title Banner
    expect(html).toContain('document-title-card');
    expect(html).toContain('main-ecological-heading');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('תאריך:');
    expect(html).toContain('שנת לימודים:');
  });

  it('aligns BehaviorInterventionPlanForm header with Picture 1 layout (work plan mode)', () => {
    const onNavigate = vi.fn();
    const onGoBack = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
        onGoBack={onGoBack}
        onNavigateDocumentType={onNavigate}
      />
    );

    // Row 1: Sticky Top Bar
    expect(html).toContain('sticky-action-bar');
    expect(html).toContain('ניהול תלמידים');
    expect(html).toContain('btn-report-lock-icon');
    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
    expect(html).toContain('btn-preview-doc');
    expect(html).toContain('btn-export-dropdown');

    // Row 2: Master Document Mode Tabs (Active Work Plan)
    expect(html).toContain('workplan-mode-tabs-container');
    expect(html).toContain('תוכנית עבודה שנתית');
    expect(html).toContain('דוחות תקופתיים ומעקב');
    expect(html).toContain('workplan-mode-tab active');

    // Row 3: Sub-Navigation Step Pills
    expect(html).toContain('form-section-nav-bar');
    expect(html).toContain('1. רקע ומטרות התערבות');
    expect(html).toContain('מעבר לדוחות תקופתיים ומעקב');

    // Row 4: Signature Blue Document Title Banner
    expect(html).toContain('document-title-card');
    expect(html).toContain('main-ecological-heading');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('תאריך:');
    expect(html).toContain('שנת לימודים:');
  });

  it('strictly adheres to Hebrew-Only Titles rule with zero English in parentheses', () => {
    const assessmentHtml = renderToStaticMarkup(
      <BehaviorAssessmentForm
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
    const planHtml = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudent}
        currentUser={mockUser}
        onSaveStudentPlan={vi.fn()}
      />
    );

    const regexEnglishParentheses = /\([\s]*[A-Za-z]+[\s\S]*?\)/;
    // Check top bars and headings specifically
    const headerSegments = [assessmentHtml, progressHtml, planHtml].map((h) => {
      const match = h.match(/<div class="document-title-card">[\s\S]*?<\/div>/);
      return match ? match[0] : '';
    });

    headerSegments.forEach((segment) => {
      expect(segment).not.toMatch(regexEnglishParentheses);
    });
  });
});
