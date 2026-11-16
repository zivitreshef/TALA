import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Strict Role Separation Suite (Teacher vs Behavior Analyst)', () => {
  const appTsx = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

  it('guarantees student-document-selector-bar is strictly gated behind behavior_analyst role', () => {
    // Must check effectiveCurrentUser?.role === 'behavior_analyst' before rendering student-document-selector-bar
    const selectorBarMatch = appTsx.match(/effectiveCurrentUser\?\.role === 'behavior_analyst'\s*\?\s*\(\s*<div[^>]*className="student-document-selector-bar"/);
    expect(selectorBarMatch).not.toBeNull();
  });

  it('guarantees behavioral forms are strictly gated behind behavior_analyst role check', () => {
    // BehaviorAssessmentForm must require behavior_analyst role
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst' && activeStudentDocumentType === 'behavior_assessment'");

    // BehaviorInterventionPlanForm must require behavior_analyst role
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst' && activeStudentDocumentType === 'behavior_plan'");

    // BehaviorProgressReportForm must require behavior_analyst role
    expect(appTsx).toContain("effectiveCurrentUser?.role === 'behavior_analyst' && activeStudentDocumentType === 'behavior_progress_report'");
  });

  it('guarantees teachers receive mobile-student-top-nav instead of the selector bar (hidden on desktop)', () => {
    // In the ternary else branch for non-behavior-analysts, mobile-student-top-nav is rendered
    expect(appTsx).toMatch(/\)\s*:\s*\(\s*\/\* Mobile Navigation Header for Mobile Phones ONLY \(hidden on desktop\) \*\/\s*<div className="mobile-student-top-nav">/);
  });

  it('guarantees teacher default document type is pedagogical_plan and not behavior forms', () => {
    // useEffect must reset to pedagogical_plan when role is not behavior_analyst
    expect(appTsx).toContain("setActiveStudentDocumentType('pedagogical_plan');");
  });

  it('guarantees behavior analyst does not see pedagogical plan option in the selector bar', () => {
    // The selector bar for behavior analysts must only have the 3 behavior documents and NOT pedagogical_plan
    const selectorBarSection = appTsx.substring(
      appTsx.indexOf('className="student-document-selector-bar"'),
      appTsx.indexOf('className="mobile-student-top-nav"')
    );

    expect(selectorBarSection).toContain('הערכת תפקוד התנהגותי');
    expect(selectorBarSection).toContain('תוכנית התערבות התנהגותית');
    expect(selectorBarSection).toContain('דוח התקדמות תקופתי');
    expect(selectorBarSection).not.toContain('תוכנית עבודה פדגוגית');
  });

  it('prohibits English in parentheses in role separation labels', () => {
    const selectorBarSection = appTsx.substring(
      appTsx.indexOf('className="student-document-selector-bar"'),
      appTsx.indexOf('className="mobile-student-top-nav"')
    );
    const hebrewWithEnglishInParenRegex = /[\u0590-\u05FF]+\s*\([A-Za-z\s]+\)/g;
    expect(selectorBarSection.match(hebrewWithEnglishInParenRegex)).toBeNull();
  });
});
