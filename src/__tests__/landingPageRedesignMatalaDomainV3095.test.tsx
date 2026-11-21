import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { AllowlistAuthGate } from '../AllowlistAuthGate';
import { isUserAdmin } from '../allowedUsers';
import {
  ZIVIT_CONTACT_EMAIL,
  INFO_CONTACT_EMAIL,
  ADMIN_CONTACT_EMAIL,
  createTrialOutreachEmailUrl
} from '../domain/trialOutreach';

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
  generateSessionId: vi.fn(() => 'test_session_matala'),
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1')
}));

describe('Landing Page Redesign, Slogan, Commercial Banner & matala.education Domain (v3.0.95)', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('verifies public/CNAME exists and contains matala.education', () => {
    const cnamePath = path.join(rootDir, 'public/CNAME');
    expect(fs.existsSync(cnamePath)).toBe(true);
    const content = fs.readFileSync(cnamePath, 'utf8').trim();
    expect(content).toBe('matala.education');
  });

  it('configures and validates the 3 new matala.education emails in trialOutreach and admin checks', () => {
    expect(ZIVIT_CONTACT_EMAIL).toBe('zivit.reshef@matala.education');
    expect(INFO_CONTACT_EMAIL).toBe('info@matala.education');
    expect(ADMIN_CONTACT_EMAIL).toBe('admin@matala.education');

    const trialMail = createTrialOutreachEmailUrl('מיכל', 'michal@school.org');
    expect(trialMail).toContain('mailto:zivit.reshef@matala.education');

    // Admin privileges check
    expect(isUserAdmin({ email: 'admin@matala.education' })).toBe(true);
    expect(isUserAdmin({ email: 'info@matala.education' })).toBe(true);
    expect(isUserAdmin({ email: 'zivit.reshef@matala.education' })).toBe(true);
    expect(isUserAdmin({ email: 'moti.reshef@gmail.com' })).toBe(true);
  });

  it('renders landing page with the new slogan and high-impact commercial banner', () => {
    const html = renderToStaticMarkup(
      <AllowlistAuthGate
        allowedUsers={[]}
        onLoginSuccess={vi.fn()}
        onUpdateAllowedUsers={vi.fn()}
        onSubmitAdminRequest={vi.fn()}
      />
    );

    // Commercial banner with slogan and 7-day trial emphasis
    expect(html).toContain('saas-top-commercial-banner');
    expect(html).toContain('מטלה?! מה? תל״א!');
    expect(html).toContain('7 ימי התנסות מלאים חינם לכל מורה');
    expect(html).toContain('info@matala.education');

    // Hero slogan callout and promo card
    expect(html).toContain('saas-hero-slogan-callout');
    expect(html).toContain('saas-hero-promo-card');
    expect(html).toContain('פתיחת 7 ימי התנסות מלאים חינם לכל מורה');
    expect(html).toContain('פתיחת חשבון התנסות חינם');
    expect(html).toContain('TALA – פחות בירוקרטיה.');
    expect(html).toContain('יותר זמן לכל ילד.');

    // Footer brand and contact emails
    expect(html).toContain('matala.education');
    expect(html).toContain('admin@matala.education');
    expect(html).toContain('zivit.reshef@matala.education');
  });
});
