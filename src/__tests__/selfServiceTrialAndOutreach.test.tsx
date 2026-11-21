import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  validateTrialSignupForm,
  createTrialUserRecord,
  shouldShowTrialOutreachNotification,
  createTrialOutreachWhatsappUrl,
  createTrialOutreachEmailUrl,
  TRIAL_OUTREACH_DELAY_MS,
  ZIVIT_WHATSAPP_PHONE,
  ZIVIT_CALL_PHONE
} from '../domain/trialOutreach';
import TeacherPreferencesModal from '../components/modals/TeacherPreferencesModal';
import { AllowlistAuthGate } from '../AllowlistAuthGate';

describe('Self-Service Trial Registration & Proactive Outreach Domain Logic', () => {
  const existingUsers = [
    { email: 'existing.teacher@school.org.il', name: 'מורה קיימת' }
  ];

  it('validateTrialSignupForm validates required fields and returns Hebrew errors', () => {
    // Missing name
    const res1 = validateTrialSignupForm(
      { name: '', email: 'new@school.il', phone: '0501234567', group: 'מתי״א תל אביב', password: 'secretPassword' },
      existingUsers
    );
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain('שם מלא');

    // Invalid email
    const res2 = validateTrialSignupForm(
      { name: 'דנה ישראלי', email: 'invalid-email', phone: '0501234567', group: 'מתי״א תל אביב', password: 'secretPassword' },
      existingUsers
    );
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain('כתובת דוא״ל');

    // Email collision
    const res3 = validateTrialSignupForm(
      { name: 'דנה ישראלי', email: 'existing.teacher@school.org.il', phone: '0501234567', group: 'מתי״א תל אביב', password: 'secretPassword' },
      existingUsers
    );
    expect(res3.valid).toBe(false);
    expect(res3.error).toContain('כבר רשומה במערכת');

    // Short phone
    const res4 = validateTrialSignupForm(
      { name: 'דנה ישראלי', email: 'dana@school.il', phone: '1234', group: 'מתי״א תל אביב', password: 'secretPassword' },
      existingUsers
    );
    expect(res4.valid).toBe(false);
    expect(res4.error).toContain('מספר טלפון');

    // Missing MATYA / framework
    const res5 = validateTrialSignupForm(
      { name: 'דנה ישראלי', email: 'dana@school.il', phone: '0501234567', group: '', password: 'secretPassword' },
      existingUsers
    );
    expect(res5.valid).toBe(false);
    expect(res5.error).toContain('מתי״א');

    // Short password
    const res6 = validateTrialSignupForm(
      { name: 'דנה ישראלי', email: 'dana@school.il', phone: '0501234567', group: 'מתי״א ירושלים', password: '123' },
      existingUsers
    );
    expect(res6.valid).toBe(false);
    expect(res6.error).toContain('סיסמה');

    // Valid submission
    const resValid = validateTrialSignupForm(
      { name: 'דנה ישראלי', email: 'dana@school.il', phone: '050-1234567', group: 'מתי״א ירושלים', password: 'SecretPassword1' },
      existingUsers
    );
    expect(resValid.valid).toBe(true);
    expect(resValid.error).toBeUndefined();
  });

  it('createTrialUserRecord initializes complete trial user with 7 days and mustSignNda', () => {
    const creds = { passwordSalt: 'salt123', passwordHash: 'hash456' };
    const user = createTrialUserRecord(
      {
        name: 'דנה לוי',
        email: 'dana.levi@school.org.il',
        phone: '052-1234567',
        group: 'מתי״א צפון',
        title: 'מורת שילוב'
      },
      creds,
      7
    );

    expect(user.isTrialUser).toBe(true);
    expect(user.trialDays).toBe(7);
    expect(user.mustSignNda).toBe(true);
    expect(user.ndaSigned).toBe(false);
    expect(user.subscriptionType).toBe('trial');
    expect(user.group).toBe('מתי״א צפון');
    expect(user.title).toBe('מורת שילוב');
    expect(user.passwordSalt).toBe('salt123');
    expect(user.passwordHash).toBe('hash456');
    expect(user.trialExpiresAt).toBeDefined();
  });

  it('shouldShowTrialOutreachNotification controls the 1-hour delay accurately', () => {
    const baseTrialUser = {
      isTrialUser: true,
      ndaSigned: true,
      ndaSignedAtMs: 1000000,
      trialOutreachDismissed: false
    };

    // Before 1 hour has elapsed
    expect(shouldShowTrialOutreachNotification(baseTrialUser, 1000000 + 30 * 60 * 1000)).toBe(false);

    // Exactly at 1 hour (60 min)
    expect(shouldShowTrialOutreachNotification(baseTrialUser, 1000000 + TRIAL_OUTREACH_DELAY_MS)).toBe(true);

    // After 2 hours
    expect(shouldShowTrialOutreachNotification(baseTrialUser, 1000000 + 2 * TRIAL_OUTREACH_DELAY_MS)).toBe(true);

    // When dismissed
    expect(
      shouldShowTrialOutreachNotification(
        { ...baseTrialUser, trialOutreachDismissed: true },
        1000000 + 2 * TRIAL_OUTREACH_DELAY_MS
      )
    ).toBe(false);

    // When user has not signed NDA yet
    expect(
      shouldShowTrialOutreachNotification(
        { ...baseTrialUser, ndaSigned: false },
        1000000 + 2 * TRIAL_OUTREACH_DELAY_MS
      )
    ).toBe(false);

    // When non-trial user
    expect(
      shouldShowTrialOutreachNotification(
        { ...baseTrialUser, isTrialUser: false },
        1000000 + 2 * TRIAL_OUTREACH_DELAY_MS
      )
    ).toBe(false);
  });

  it('constructs correct WhatsApp and mailto communication URLs to Zivit', () => {
    const waUrl = createTrialOutreachWhatsappUrl('רחל כהן', 'rachel@school.il');
    expect(waUrl).toContain(ZIVIT_WHATSAPP_PHONE);
    expect(waUrl).toContain(encodeURIComponent('רחל כהן'));

    const mailUrl = createTrialOutreachEmailUrl('רחל כהן', 'rachel@school.il');
    expect(mailUrl).toContain('mailto:zivit.reshef@matala.education');
    expect(mailUrl).toContain(encodeURIComponent('רחל כהן'));
  });
});

describe('UI Markup: Trial Registration Buttons & TeacherPreferencesModal Outreach Card', () => {
  it('renders AllowlistAuthGate with clear trial access buttons', () => {
    const html = renderToStaticMarkup(
      <AllowlistAuthGate
        allowedUsers={[]}
        onLoginSuccess={vi.fn()}
        onUpdateAllowedUsers={vi.fn()}
        onSubmitAdminRequest={vi.fn()}
      />
    );

    // Should include trial signup triggers
    expect(html).toContain('פתיחת חשבון התנסות');
    expect(html).toContain('btn-saas-primary-trial');
    expect(html).toContain('btn-saas-nav-trial');
    expect(html).toContain('btn-saas-open-trial');
  });

  it('TeacherPreferencesModal renders proactive personal outreach card when showTrialOutreachNotice is true', () => {
    const currentUser = {
      name: 'שירה חדד',
      email: 'shira@school.org.il',
      isTrialUser: true,
      role: 'teacher' as const
    };

    const htmlWithNotice = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={vi.fn()}
        currentUser={currentUser}
        showTrialOutreachNotice={true}
        onDismissTrialOutreach={vi.fn()}
      />
    );

    // Personal outreach card elements
    expect(htmlWithNotice).toContain('trial-outreach-personal-card');
    expect(htmlWithNotice).toContain('הודעה אישית מזיוית');
    expect(htmlWithNotice).toContain('שירה חדד');
    expect(htmlWithNotice).toContain(ZIVIT_WHATSAPP_PHONE);
    expect(htmlWithNotice).toContain(ZIVIT_CALL_PHONE);
    expect(htmlWithNotice).toContain('dismiss-trial-outreach-btn');
    expect(htmlWithNotice).toContain('הבנתי, תודה');

    // Without notice
    const htmlWithoutNotice = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={vi.fn()}
        currentUser={currentUser}
        showTrialOutreachNotice={false}
        onDismissTrialOutreach={vi.fn()}
      />
    );
    expect(htmlWithoutNotice).not.toContain('trial-outreach-personal-card');
  });
});
