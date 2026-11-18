import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
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
  generateSessionId: vi.fn(() => 'test_session_789'),
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1')
}));

describe('Landing Page Polish & Grounded SaaS Experience (v3.0.79)', () => {
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

  it('Point 1: eliminates empty bottom space with a grounded pedagogical product footer bar', () => {
    const html = renderLanding();

    expect(html).toContain('saas-landing-footer');
    expect(html).toContain('סביבת עבודה פדגוגית חכמה • פחות בירוקרטיה, יותר זמן לכל ילד');
    expect(html).toContain('סרטון הדרכה');
    expect(html).toContain('תמיכה ושירות');
    expect(html).toContain('פתיחת חשבון התנסות');
    expect(html).toContain('כל הזכויות שמורות');

    // CSS guarantees min-height 100vh with space-between positioning
    expect(indexCss).toMatch(/\.saas-landing-container\s*\{[\s\S]*?min-height:\s*100vh/);
    expect(indexCss).toMatch(/\.saas-landing-container\s*\{[\s\S]*?justify-content:\s*space-between/);
    expect(indexCss).toMatch(/\.saas-landing-footer\s*\{[\s\S]*?border-top:\s*1px solid #e2e8f0/);
  });

  it('Point 2: increases screenshot height by ~20% and reduces white container margins', () => {
    expect(indexCss).toMatch(/\.preview-image-container\s*\{[\s\S]*?padding:\s*8px 10px/);
    expect(indexCss).toMatch(/\.preview-real-screenshot\s*\{[\s\S]*?height:\s*415px/);
    expect(indexCss).toMatch(/\.preview-real-screenshot\s*\{[\s\S]*?max-height:\s*415px/);
  });

  it('Point 3: harmonizes the trial button style with the brand design language', () => {
    expect(indexCss).toMatch(/\.btn-saas-open-trial\.compact\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#2b4c73 0%,\s*#3d6391 55%,\s*#5c4b85 100%\)/);
    expect(indexCss).toMatch(/\.btn-saas-open-trial\.compact\s*\{[\s\S]*?border-radius:\s*10px/);
  });

  it('Point 4: presents authentic teacher WhatsApp voices in a compact, balanced container', () => {
    const html = renderLanding();

    expect(html).toContain('saas-whatsapp-voices-section');
    expect(html).toContain('קבוצת משתמשות TALA • מורות וגננות מהשטח');
    expect(html).toContain('0:41');
    expect(html).toContain('0:30');
    expect(html).toContain('דוח מצב - וואו!!!');
    expect(html).toContain('אני עפה על זה');

    expect(indexCss).toMatch(/\.saas-whatsapp-grid\s*\{[\s\S]*?gap:\s*8px/);
    expect(indexCss).toMatch(/\.whatsapp-chat-avatar\s*\{[\s\S]*?width:\s*28px/);
  });

  it('Point 5: provides legible, spacious typography in pillar cards and survey metrics', () => {
    expect(indexCss).toMatch(/\.saas-pillar-card p\s*\{[\s\S]*?font-size:\s*14px/);
    expect(indexCss).toMatch(/\.saas-pillar-card p\s*\{[\s\S]*?line-height:\s*1\.6/);
    expect(indexCss).toMatch(/\.survey-metric-row\s*\{[\s\S]*?font-size:\s*12px/);
    expect(indexCss).toMatch(/\.survey-heading\s*\{[\s\S]*?font-size:\s*14px/);
  });

  it('strictly adheres to Hebrew-only titles with zero English in parentheses', () => {
    const html = renderLanding();
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });
});
