import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AllowlistAuthGate } from '../AllowlistAuthGate';

// Mock dependencies for AllowlistAuthGate
vi.mock('../firebaseBackend', () => ({
  loginWithTala: vi.fn(),
  prewarmTalaLogin: vi.fn().mockResolvedValue({}),
  subscribeToUserPresence: vi.fn(() => vi.fn()),
  signOutFirebaseAuthSession: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../services/sessionSecurity', () => ({
  checkActiveSession: vi.fn().mockResolvedValue({ takeoverRequired: false }),
  activateSession: vi.fn().mockResolvedValue({}),
  generateSessionId: vi.fn(() => 'test_session_123'),
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1')
}));

describe('Landing Page Redesign (v3 Pedagogical Workspace Spirit)', () => {
  const renderLandingPage = () => {
    return renderToStaticMarkup(
      <AllowlistAuthGate
        allowedUsers={[]}
        onLoginSuccess={vi.fn()}
        onUpdateAllowedUsers={vi.fn()}
        onSubmitAdminRequest={vi.fn()}
      />
    );
  };

  it('renders the brand showcase with updated pedagogical workspace badge and subtitle', () => {
    const html = renderLandingPage();

    expect(html).toContain('סביבת עבודה פדגוגית חכמה ומעקב שוטף');
    expect(html).toContain('מערכת TALA');
    expect(html).toContain('סביבת עבודה פדגוגית משותפת, יומן יעדים שוטף, תיעוד תצפיות מהיר ומאגר מטרות אקולוגי');
    expect(html).toContain('הפכי שעות של ניירת וסיכומים');
    expect(html).toContain('לדקות של עשייה פדגוגית ממוקדת');
  });

  it('renders the live interactive product showcase with real screenshots tabs and mobile view', () => {
    const html = renderLandingPage();

    expect(html).toContain('טעימה אמיתית מהשטח • ממשק המערכת בפעולה');
    expect(html).toContain('צילומי מסך חיים');
    expect(html).toContain('יומן ומעקב שוטף');
    expect(html).toContain('תוכנית שנתית ותל״א');
    expect(html).toContain('מוכנות לישיבות צוות');
    expect(html).toContain('סיכום שבועי במייל');
    expect(html).toContain('מרחב מובייל בכיתה');
    expect(html).toContain('tala-daily-tracker.jpg');
    expect(html).toContain('חיסכון של כ-4 שעות שבועיות');
  });

  it('renders authentic WhatsApp teacher testimonials from the field with voice notes', () => {
    const html = renderLandingPage();

    expect(html).toContain('קבוצת משתמשות TALA • מורות וגננות מהשטח');
    expect(html).toContain('משובים אותנטיים מצוותי חינוך');
    expect(html).toContain('הודעות וואטסאפ כפי שנשלחו מהשטח');
    expect(html).toContain('0:41');
    expect(html).toContain('0:30');
    expect(html).toContain('דוח מצב - וואו!!!');
    expect(html).toContain('וראיתי שהוספתם הקלטה מצויין');
    expect(html).toContain('השאלות המנחות הן מעולות לדייק את התפקוד כעת!!!');
    expect(html).toContain('אני עפה על זה');
  });

  it('renders the verified pedagogical survey results card with 5.0/5 rating and 100% recommendation', () => {
    const html = renderLandingPage();

    expect(html).toContain('סקר שביעות רצון פדגוגי');
    expect(html).toContain('5.0 / 5.0');
    expect(html).toContain('האם תמליצי לקולגות ולמנהלת לרכוש גישה ל-TALA?');
    expect(html).toContain('כן, סביר שאמליץ לקולגות ולמנהלת לרכוש גישה להמשך שימוש במערכת');
    expect(html).toContain('1. קלות ונוחות השימוש בממשק המערכת');
    expect(html).toContain('2. יצירה והקמה מהירה של כרטיס תלמיד/ה');
    expect(html).toContain('3. ניסוח ובניית מטרות ויעדים עם מאגר מטרות ובינה מלאכותית');
    expect(html).toContain('4. הפקת דוחות – תל״א/תח״י, דו״ח מצב ודוח הערכה');
    expect(html).toContain('5. שיתוף תלמיד/ה ועבודה משותפת עם קולגות בצוות');
    expect(html).toContain('משוב מאומת • גננת חנ״מ, מתי״א קרית שמונה');
  });

  it('renders dual conversion tracks for both returning teachers and prospective trial teachers', () => {
    const html = renderLandingPage();

    expect(html).toContain('בקשת גישה והתנסות ראשונית');
    expect(html).toContain('עדיין אין לך חשבון במערכת?');
    expect(html).toContain('פתיחת חשבון התנסות / בקשת גישה');
    expect(html).toContain('כניסה למערכת TALA');
  });

  it('renders the 4 core pillars representing the active daily pedagogical toolkit', () => {
    const html = renderLandingPage();

    // Pillar 1: Daily Tracker & Goals Journal
    expect(html).toContain('יומן יעדים ומעקב שוטף');
    expect(html).toContain('מעקב ביצוע רציף אחר מטרות ויעדים לאורך כל שנת הלימודים');

    // Pillar 2: Quick Observation Capture & Voice
    expect(html).toContain('תיעוד תצפיות והקלטה קולית');
    expect(html).toContain('תפיסת רגעי למידה, התנהגות והצלחות בכיתה תוך שניות');

    // Pillar 3: Team Readiness & Meeting Reports
    expect(html).toContain('מוכנות לצוות ודוחות ישיבות');
    expect(html).toContain('הפקת דוחות סיכום רב-מקצועיים ותמונת מצב כיתתית מרוכזת');

    // Pillar 4: Ecological Goals Bank & AI Guidance
    expect(html).toContain('מאגר אקולוגי ובינה מלאכותית');
    expect(html).toContain('מאגר מטרות חכם בסביבות השתתפות טבעיות');
  });

  it('renders the trust strip highlights and video introduction CTA', () => {
    const html = renderLandingPage();

    expect(html).toContain('גישה אקולוגית');
    expect(html).toContain('זמינות מכל מכשיר');
    expect(html).toContain('הגנת פרטיות מלאה');
    expect(html).toContain('צפייה בסרטון היכרות והדרכה (3 דק׳)');
  });

  it('renders the clean login panel with security notice and contact options', () => {
    const html = renderLandingPage();

    expect(html).toContain('כניסה למערכת');
    expect(html).toContain('קוד גישה אישי / סיסמה:');
    expect(html).toContain('פנייה למנהל/ת המערכת');
    expect(html).toContain('חיבור מאובטח • סביבת הוראה מוגנת');
  });

  it('strictly adheres to Hebrew-only titles and badges with zero English in parentheses', () => {
    const html = renderLandingPage();

    // Outdated parenthetical English phrases that must not appear in headings/badges
    expect(html).not.toContain('(תוכנית לימודים אישית)');
    expect(html).not.toContain('(תוכנית חינוכית יחידנית)');
    expect(html).not.toContain('ענן ו-AI');
  });
});
