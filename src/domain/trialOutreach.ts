import { computeTrialExpirationIso, DEFAULT_TRIAL_DAYS } from '../allowedUsers';

export const TRIAL_OUTREACH_DELAY_MS = 60 * 60 * 1000; // 1 hour (60 minutes)
export const ZIVIT_WHATSAPP_PHONE = '972559236606';
export const ZIVIT_CALL_PHONE = '052-4286501';
export const ZIVIT_CONTACT_EMAIL = 'zivit.reshef@gmail.com';

export interface TrialSignupFormFields {
  name: string;
  email: string;
  phone: string;
  group: string; // מתי״א / מסגרת חינוכית
  title?: string; // תפקיד פדגוגי
  password?: string;
}

export interface TrialSignupValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates self-service trial signup input fields.
 */
export function validateTrialSignupForm(
  fields: TrialSignupFormFields,
  existingUsers: Array<{ email?: string; [key: string]: unknown }> = []
): TrialSignupValidationResult {
  const cleanName = (fields.name || '').trim();
  const cleanEmail = (fields.email || '').trim().toLowerCase();
  const cleanPhone = (fields.phone || '').trim().replace(/[-–\s]/g, '');
  const cleanGroup = (fields.group || '').trim();
  const cleanPassword = (fields.password || '').trim();

  if (!cleanName || cleanName.length < 2) {
    return { valid: false, error: 'נא להזין שם מלא (לפחות 2 תווים).' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { valid: false, error: 'נא להזין כתובת דוא״ל תקינה.' };
  }

  const collision = existingUsers.some(
    (u) => (u?.email || '').trim().toLowerCase() === cleanEmail
  );
  if (collision) {
    return {
      valid: false,
      error: 'כתובת דוא״ל זו כבר רשומה במערכת. אנא התחברי באמצעות מסך הכניסה.'
    };
  }

  if (!cleanPhone || cleanPhone.length < 9) {
    return { valid: false, error: 'נא להזין מספר טלפון תקין (לפחות 9 ספרות).' };
  }

  if (!cleanGroup) {
    return { valid: false, error: 'נא להזין מתי״א או מסגרת חינוכית (חיוני לסנכרון ושיתוף).' };
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    return { valid: false, error: 'נא לבחור סיסמה אישית באורך 6 תווים לפחות.' };
  }

  return { valid: true };
}

/**
 * Constructs a fully configured trial user record for self-service onboarding.
 */
export function createTrialUserRecord(
  fields: TrialSignupFormFields,
  creds: { passwordSalt: string; passwordHash: string },
  trialDays: number = DEFAULT_TRIAL_DAYS
) {
  const now = new Date();
  const cleanEmail = (fields.email || '').trim().toLowerCase();
  const cleanName = (fields.name || '').trim();
  const cleanGroup = (fields.group || '').trim();
  const cleanTitle = (fields.title || '').trim() || 'מורת שילוב / גננת';
  const cleanPhone = (fields.phone || '').trim();

  return {
    id: `trial_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    group: cleanGroup,
    title: cleanTitle,
    role: 'teacher' as const,
    passwordSalt: creds.passwordSalt,
    passwordHash: creds.passwordHash,
    active: true,
    isTrialUser: true,
    trialDays,
    trialStartedAt: now.toISOString(),
    trialExpiresAt: computeTrialExpirationIso(trialDays, now),
    mustSignNda: true,
    ndaSigned: false,
    subscriptionType: 'trial',
    createdAt: now.toISOString(),
    dailyAiQuotaLimit: 50
  };
}

/**
 * Checks whether the 1-hour proactive outreach notification from Zivit should appear
 * for this trial user.
 */
export function shouldShowTrialOutreachNotification(
  user?: {
    isTrialUser?: boolean;
    ndaSigned?: boolean;
    ndaSignedAtMs?: number;
    ndaSignedAt?: string;
    trialOutreachDismissed?: boolean;
    trialStartedAt?: string;
    [key: string]: unknown;
  } | null,
  nowMs: number = Date.now()
): boolean {
  if (!user || !user.isTrialUser) return false;
  if (!user.ndaSigned) return false;
  if (user.trialOutreachDismissed) return false;

  let signedMs = Number(user.ndaSignedAtMs);
  if (!signedMs && user.ndaSignedAt) {
    const parsed = new Date(user.ndaSignedAt).getTime();
    if (!Number.isNaN(parsed) && parsed > 0) {
      signedMs = parsed;
    }
  }

  if (!signedMs && user.trialStartedAt) {
    const parsedStart = new Date(user.trialStartedAt).getTime();
    if (!Number.isNaN(parsedStart) && parsedStart > 0) {
      signedMs = parsedStart;
    }
  }

  if (!signedMs) return false;

  const diffMs = nowMs - signedMs;
  return diffMs >= TRIAL_OUTREACH_DELAY_MS;
}

/**
 * Constructs direct WhatsApp URL to Zivit for trial assistance.
 */
export function createTrialOutreachWhatsappUrl(userName: string = '', userEmail: string = ''): string {
  const text = `שלום זיוית, שמי ${userName.trim()}${userEmail ? ` (${userEmail.trim()})` : ''} ממערכת תל״א. התחלתי התנסות במערכת ואשמח לקבל עזרה / הכוונה. תודה!`;
  return `https://wa.me/${ZIVIT_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

/**
 * Constructs direct mailto URL to Zivit for trial assistance.
 */
export function createTrialOutreachEmailUrl(userName: string = '', userEmail: string = ''): string {
  const subject = `פנייה מחשבון התנסות בתל״א: ${userName.trim()}`;
  const body = `שלום זיוית,\n\nשמי: ${userName.trim()}\nדוא״ל: ${userEmail.trim()}\nהתחלתי התנסות בתל״א ואשמח לקבל הכוונה או לשאול שאלה.\n\nבברכה,`;
  return `mailto:${ZIVIT_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
