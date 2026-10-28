import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Workspace Branding & Unified Blue Theme Contract', () => {
  it('defines the 3 full-page workspaces in App navigation with "ניהול תלמידים" replacing "דף הבית"', () => {
    const appCode = fs.readFileSync(path.resolve(__dirname, '../App.jsx'), 'utf8');

    // Tab 1: ניהול תלמידים with Users icon
    expect(appCode).toContain('<span>ניהול תלמידים</span>');
    expect(appCode).toContain('title="ניהול תלמידים"');
    expect(appCode).not.toContain('<span>דף הבית</span>');

    // Tab 2: מעקב יומי
    expect(appCode).toContain('<span>מעקב יומי</span>');

    // Tab 3: מאגר מטרות
    expect(appCode).toContain('<span>מאגר מטרות</span>');
  });

  it('provides consistent back navigation to "ניהול תלמידים" in subcomponents and mobile header', () => {
    const appCode = fs.readFileSync(path.resolve(__dirname, '../App.jsx'), 'utf8');
    const formCode = fs.readFileSync(path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx'), 'utf8');
    const trackerCode = fs.readFileSync(path.resolve(__dirname, '../components/DailyPedagogicalTracker.jsx'), 'utf8');
    const goalBankCode = fs.readFileSync(path.resolve(__dirname, '../components/GoalBankPage.jsx'), 'utf8');

    // Mobile nav in App.jsx
    expect(appCode).toContain('className="btn-mobile-back-roster"');

    // Form back button
    expect(formCode).toContain('title="חזרה לניהול תלמידים (הוספת תלמיד/ה חדש/ה או פתיחת דוח קיים)"');
    expect(formCode).toContain('<span>ניהול תלמידים</span>');

    // Daily Tracker close button
    expect(trackerCode).toContain('חזרה לניהול תלמידים');

    // Goal Bank back button
    expect(goalBankCode).toContain('title="חזרה לניהול תלמידים"');
    expect(goalBankCode).toContain('<span>חזרה לניהול תלמידים</span>');
    expect(goalBankCode).toContain('צרי כרטיס תלמיד/ה בניהול תלמידים כדי להוסיף מטרות');
  });

  it('applies the signature blue gradient and white typography to all 3 full-page workspace headers', () => {
    const indexCss = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');
    const trackerCss = fs.readFileSync(path.resolve(__dirname, '../components/DailyPedagogicalTracker.css'), 'utf8');
    const goalBankCss = fs.readFileSync(path.resolve(__dirname, '../components/GoalBankPage.css'), 'utf8');

    const expectedGradient = 'linear-gradient(135deg, #2b4c73 0%, #3d6391 52%, #5c4b85 100%)';

    // 1. Home / Student Management Hero Banner (.inside-landing-hero)
    expect(indexCss).toContain('.inside-landing-hero');
    expect(indexCss).toContain(expectedGradient);

    // 2. Daily Pedagogical Tracker Top Header (.tracker-top-header)
    expect(trackerCss).toContain('.tracker-top-header');
    expect(trackerCss).toContain(expectedGradient);
    expect(trackerCss).toMatch(/\.tracker-top-header\s*\{[\s\S]*?color:\s*#ffffff;/);
    expect(trackerCss).toMatch(/\.tracker-header-title-box\s+h1\s*\{[\s\S]*?color:\s*#ffffff;/);

    // 3. Goal Bank Top Header (.goal-bank-top-header)
    expect(goalBankCss).toContain('.goal-bank-top-header');
    expect(goalBankCss).toContain(expectedGradient);
    expect(goalBankCss).toMatch(/\.goal-bank-top-header\s*\{[\s\S]*?color:\s*#ffffff;/);
    expect(goalBankCss).toMatch(/\.goal-bank-header-title-box\s+h1\s*\{[\s\S]*?color:\s*#ffffff;/);
  });

  it('aligns the thickness, padding (22px 28px), and 48px avatar boxes across all 3 workspaces (Option B)', () => {
    const appCode = fs.readFileSync(path.resolve(__dirname, '../App.jsx'), 'utf8');
    const indexCss = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');
    const trackerCss = fs.readFileSync(path.resolve(__dirname, '../components/DailyPedagogicalTracker.css'), 'utf8');
    const goalBankCss = fs.readFileSync(path.resolve(__dirname, '../components/GoalBankPage.css'), 'utf8');

    // App.jsx: uses Users vector icon in inside-landing-avatar
    expect(appCode).toContain('className="inside-landing-avatar"');
    expect(appCode).toMatch(/<Users\s+size=\{22\}\s+color="#ffffff"/);

    // CSS: all 3 headers use matching 22px 28px padding for aligned thickness
    expect(indexCss).toMatch(/\.inside-landing-hero\s*\{[\s\S]*?padding:\s*22px 28px;/);
    expect(trackerCss).toMatch(/\.tracker-top-header\s*\{[\s\S]*?padding:\s*22px 28px;/);
    expect(goalBankCss).toMatch(/\.goal-bank-top-header\s*\{[\s\S]*?padding:\s*22px 28px;/);

    // CSS: all 3 headers use matching 48x48px frosted avatar boxes
    expect(indexCss).toMatch(/\.inside-landing-avatar\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/);
    expect(trackerCss).toMatch(/\.tracker-header-avatar\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/);
    expect(goalBankCss).toMatch(/\.goal-bank-header-avatar\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/);
  });

  it('verifies read-only banner and student list badge contracts for locked shared plans', () => {
    const appCode = fs.readFileSync(path.resolve(__dirname, '../App.jsx'), 'utf8');
    const formCode = fs.readFileSync(path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx'), 'utf8');

    // App.jsx displays read-only indicator for locked shared students
    expect(appCode).toContain("st.isLocked ? 'שותף עמך (קריאה בלבד)' : 'שותף עמך'");

    // EcologicalWorkPlanForm.jsx renders amber read-only banner when report is locked for colleague
    expect(formCode).toContain('data-testid="readonly-shared-plan-banner"');
    expect(formCode).toContain('קריאה בלבד');
    expect(formCode).toContain('התוכנית נעולה לעריכה על ידי המורה האחראי/ת');
  });

  it('ensures "שיח צוות" chat button is accessible in top action bar when plan is shared, without duplicate in section 1', () => {
    const formCode = fs.readFileSync(path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx'), 'utf8');

    // Sticky top action bar renders Team Chat drawer trigger guarded by isPlanShared
    expect(formCode).toContain('data-testid="top-action-bar-team-chat-btn"');
    expect(formCode).toContain('className="btn-team-chat"');
    expect(formCode).toContain('isPlanShared && (');

    // Section 1 header does NOT contain the redundant duplicate Team Chat button
    expect(formCode).not.toContain('data-testid="section1-team-chat-btn"');
  });
});
