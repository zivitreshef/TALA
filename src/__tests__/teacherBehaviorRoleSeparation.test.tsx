import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Strict Role Separation Suite (Teacher vs Behavior Analyst)', () => {
  const appTsx = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

  it('guarantees behavioral forms are strictly gated behind behavior_analyst role check', () => {
    // BehaviorAssessmentForm must require behavior_analyst role
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst' && activeStudentDocumentType === 'behavior_assessment'");

    // BehaviorInterventionPlanForm must require behavior_analyst role
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst' && activeStudentDocumentType === 'behavior_plan'");

    // BehaviorProgressReportForm must require behavior_analyst role
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst' && activeStudentDocumentType === 'behavior_progress_report'");
  });

  it('guarantees teacher default document type is pedagogical_plan and not behavior forms', () => {
    // useEffect must reset to pedagogical_plan when role is not behavior_analyst
    expect(appTsx).toContain("setActiveStudentDocumentType('pedagogical_plan');");
  });

  it('guarantees mobile-student-top-nav separates badge labels strictly by role', () => {
    // Shows behavioral titles ONLY when role is behavior_analyst
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst'");
    expect(appTsx).toContain("? 'תוכנית אקולוגית לילדי הגן'");
    expect(appTsx).toContain(": 'תוכנית לתלמיד ביה\"ס'");
  });

  it('guarantees teachers fallback to EcologicalWorkPlanForm and never to behavioral forms', () => {
    // When effectiveCurrentUser?.role !== 'behavior_analyst', the fallback renders EcologicalWorkPlanForm
    expect(appTsx).toContain('<EcologicalWorkPlanForm');
  });

  it('prohibits English in parentheses in document mode tabs across behavior forms', () => {
    const assessmentPath = path.resolve(__dirname, '../components/behavior/BehaviorAssessmentForm.tsx');
    const planPath = path.resolve(__dirname, '../components/behavior/BehaviorInterventionPlanForm.tsx');
    const reportPath = path.resolve(__dirname, '../components/behavior/BehaviorProgressReportForm.tsx');

    const files = [
      fs.readFileSync(assessmentPath, 'utf-8'),
      fs.readFileSync(planPath, 'utf-8'),
      fs.readFileSync(reportPath, 'utf-8')
    ];

    const hebrewWithEnglishInParenRegex = /[\u0590-\u05FF]+\s*\([A-Za-z\s]+\)/g;
    files.forEach((code) => {
      // Find all tab headings
      const tabsMatches = code.match(/className="workplan-mode-tab[^"]*"[^>]*>[\s\S]*?<\/button>/g) || [];
      tabsMatches.forEach((tab) => {
        expect(tab.match(hebrewWithEnglishInParenRegex)).toBeNull();
      });
    });
  });
});
