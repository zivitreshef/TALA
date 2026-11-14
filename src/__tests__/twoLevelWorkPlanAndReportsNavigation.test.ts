import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Two-Level Work Plan & Periodic Reports Architecture', () => {
  const componentPath = path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx');
  const cssPath = path.resolve(__dirname, '../index.css');

  const componentSource = fs.readFileSync(componentPath, 'utf-8');
  const cssSource = fs.readFileSync(cssPath, 'utf-8');

  it('renders Level 1 master mode tabs for Work Plan and Periodic Reports', () => {
    expect(componentSource).toContain('className="workplan-mode-tabs-container"');
    expect(componentSource).toContain('<span>תוכנית עבודה שנתית</span>');
    expect(componentSource).toContain('<span>דוחות תקופתיים ומעקב</span>');
  });

  it('strictly limits Work Plan stepper to 4 steps with zero English in titles', () => {
    // Stepper must contain steps 1 to 4
    expect(componentSource).toContain('1. רקע ומסגרת');
    expect(componentSource).toContain('2. פרופיל ומוקדי כוח');
    expect(componentSource).toContain('3. מטרות ויעדים');
    expect(componentSource).toContain('4. המלצות וסיכום');

    // Must NOT contain step 5 in the stepper
    expect(componentSource).not.toContain('5. הערכת מחצית/שנה');
    expect(componentSource).not.toContain('activeWorkPlanStep === 5');
  });

  it('replaces step 4 next button with periodic reports navigation and plan completion', () => {
    // Step 4 footer must NOT prompt to "continue to step 5"
    expect(componentSource).not.toContain('המשך לשלב 5: הערכת מחצית/שנה');

    // Must offer dedicated transition to reports and plan completion
    expect(componentSource).toContain('מעבר לדוחות תקופתיים ומעקב');
    expect(componentSource).toContain('סיום ונעילת תוכנית עבודה');
    expect(componentSource).toContain('תוכנית העבודה נעולה ומאושרת');
  });

  it('provides dedicated reports navigation and seamless return to work plan', () => {
    // Sub-stepper in reports mode
    expect(componentSource).toContain('<span>דוח הערכת מחצית ושנה</span>');
    expect(componentSource).toContain('<span>דו״ח מצב תפקודי</span>');
    expect(componentSource).toContain('<span>חזרה לתוכנית עבודה שנתית</span>');
    expect(componentSource).toContain('<span>מעבר לדו״ח מצב תפקודי</span>');
  });

  it('contains proper CSS rules for master mode tabs and report badges', () => {
    expect(cssSource).toContain('.workplan-mode-tabs-container');
    expect(cssSource).toContain('.workplan-mode-tab');
    expect(cssSource).toContain('.workplan-mode-tab.active');
    expect(cssSource).toContain('.workplan-mode-tab.reports-mode.active');
    expect(cssSource).toContain('.section-nav-pill.purple-report');
    expect(cssSource).toContain('.section-nav-pill.blue-report');
  });
});
