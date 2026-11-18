import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { AllowlistAuthGate } from '../AllowlistAuthGate';

// Mock backend & session dependencies for AllowlistAuthGate
vi.mock('../firebaseBackend', () => ({
  loginWithTala: vi.fn(),
  prewarmTalaLogin: vi.fn().mockResolvedValue({}),
  subscribeToUserPresence: vi.fn(() => vi.fn()),
  signOutFirebaseAuthSession: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../services/sessionSecurity', () => ({
  checkActiveSession: vi.fn().mockResolvedValue({ takeoverRequired: false }),
  activateSession: vi.fn().mockResolvedValue({}),
  generateSessionId: vi.fn(() => 'test_session_456'),
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1')
}));

describe('Landing Page Enhancements (v3.0.78 Single PR Delivery)', () => {
  const renderLanding = () => {
    return renderToStaticMarkup(
      <AllowlistAuthGate
        allowedUsers={[]}
        onLoginSuccess={vi.fn()}
        onUpdateAllowedUsers={vi.fn()}
        onSubmitAdminRequest={vi.fn()}
      />
    );
  };

  const indexCssPath = path.resolve(__dirname, '../index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  it('Step 1: renders the strengthened Hero with dominant title, single value proposition sentence, and prominent primary CTA', () => {
    const html = renderLanding();

    // Dominant headline
    expect(html).toContain('TALA – פחות בירוקרטיה.');
    expect(html).toContain('יותר זמן לכל ילד.');

    // Single core value sentence
    expect(html).toContain('סביבת עבודה חכמה לאנשי חינוך, המאפשרת לנהל מטרות, מעקב התקדמות, תיעוד ודוחות במקום אחד.');

    // Single prominent primary trial CTA
    expect(html).toContain('btn-saas-primary-trial');
    expect(html).toContain('פתיחת חשבון התנסות חינם');

    // Secondary video link
    expect(html).toContain('צפייה בסרטון היכרות והדרכה (3 דק׳)');
  });

  it('Step 2: places the real product showcase directly below hero copy with interactive tabs and zoom depth', () => {
    const html = renderLanding();

    // Live product showcase window
    expect(html).toContain('real-screenshots-showcase');
    expect(html).toContain('טעימה אמיתית מהשטח • ממשק המערכת בפעולה');
    expect(html).toContain('צילומי מסך חיים');

    // Interactive tabs
    expect(html).toContain('יומן ומעקב שוטף');
    expect(html).toContain('תוכנית שנתית ותל״א');
    expect(html).toContain('מוכנות לישיבות צוות');
    expect(html).toContain('סיכום שבועי במייל');
    expect(html).toContain('מרחב מובייל בכיתה');

    // Metric bar
    expect(html).toContain('חיסכון של כ-4 שעות שבועיות');
  });

  it('Step 3: separates system login from self-service trial signup and balances column heights', () => {
    const html = renderLanding();

    // Login Form
    expect(html).toContain('כניסה למערכת');
    expect(html).toContain('וקוד הגישה האישי שלכם');
    expect(html).toContain('צוות מורשה');
    expect(html).toContain('כניסה למערכת TALA');

    // Dedicated self-service trial box
    expect(html).toContain('saas-new-teacher-box');
    expect(html).toContain('עדיין אין לך חשבון במערכת?');
    expect(html).toContain('פתיחת חשבון התנסות (7 ימים)');

    // Compact Social Proof Card below login
    expect(html).toContain('saas-survey-card');
    expect(html).toContain('סקר שביעות רצון פדגוגי');
    expect(html).toContain('5.0 / 5.0');
    expect(html).toContain('משוב מאומת • גננת חנ״מ, מתי״א קרית שמונה');

    // CSS column balance check
    expect(indexCss).toMatch(/\.auth-landing-shell\.saas-hero-shell\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s*minmax\(360px,\s*420px\)/);
  });

  it('Step 4: renders 4 upgraded pedagogical pillar cards with generous padding, icons and hover elevation', () => {
    const html = renderLanding();

    // 4 Core Pillar Cards
    expect(html).toContain('יומן יעדים ומעקב שוטף');
    expect(html).toContain('תיעוד תצפיות והקלטה קולית');
    expect(html).toContain('מוכנות לצוות ודוחות ישיבות');
    expect(html).toContain('מאגר אקולוגי ובינה מלאכותית');

    // Bottom trust strip
    expect(html).toContain('גישה אקולוגית');
    expect(html).toContain('זמינות מכל מכשיר');
    expect(html).toContain('הגנת פרטיות מלאה');
    expect(html).toContain('מותאם לצוותי חינוך מיוחד ושילוב');

    // CSS styling checks for pillars
    expect(indexCss).toMatch(/\.auth-feature-card\.saas-pillar-card\s*\{[\s\S]*?padding:\s*22px 24px/);
    expect(indexCss).toMatch(/\.auth-feature-card\.saas-pillar-card:hover\s*\{[\s\S]*?transform:\s*translateY\(-3px\)/);
  });

  it('strictly adheres to Hebrew-only titles with zero English in parentheses across all components', () => {
    const html = renderLanding();

    // Strict prohibition on English translation parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });
});
