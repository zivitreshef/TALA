import { safeGetStorageItem, safeSetStorageItem } from './services/storage';

// ============================================================================
// Salted Cryptographic Password Hashing (SHA-256 + Per-User Random Salt)
// Ensures plaintext passwords (`accessCode`) are never stored in Firestore or localStorage.
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Synchronous FIPS 180-4 SHA-256 digest over UTF-8 input string, returning 64-char lowercase hex.
 */
export function sha256Hex(message?: unknown): string {
  const bytes = new TextEncoder().encode(String(message ?? ''));
  const bitLen = bytes.length * 8;
  const totalBytes = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(totalBytes);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalBytes - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalBytes - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalBytes; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr32(w[i - 15], 7) ^ rotr32(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr32(w[i - 2], 17) ^ rotr32(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Generates a cryptographically random per-user salt (32 hex chars / 128 bits).
 */
export function generatePasswordSalt(byteLength: number = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes a stretched, salted SHA-256 password hash (256 rounds with domain separation).
 */
export function hashPasswordWithSalt(password?: unknown, salt?: unknown): string {
  const cleanPassword = String(password ?? '').trim();
  const cleanSalt = String(salt ?? '').trim();
  let digest = sha256Hex(`TALA_PBKDF_V1:${cleanSalt}:${cleanPassword}`);
  for (let round = 1; round < 256; round++) {
    digest = sha256Hex(`${digest}:${cleanSalt}:${cleanPassword}:${round}`);
  }
  return digest;
}

export interface PasswordCredentials {
  passwordSalt: string;
  passwordHash: string;
}

/**
 * Creates `{ passwordSalt, passwordHash }` credentials for a plaintext password.
 */
export function createPasswordCredentials(password: string, existingSalt: string | null = null): PasswordCredentials {
  const passwordSalt = existingSalt || generatePasswordSalt();
  const passwordHash = hashPasswordWithSalt(password, passwordSalt);
  return { passwordSalt, passwordHash };
}

export interface UserPasswordRecord {
  passwordHash?: string;
  passwordSalt?: string;
  accessCode?: string;
  [key: string]: unknown;
}

/**
 * Verifies whether a candidate password matches a user's stored salted hash (or legacy accessCode).
 */
export function verifyUserPassword(user?: UserPasswordRecord | null, candidatePassword?: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const cleanCode = String(candidatePassword ?? '').trim();

  if (user.passwordHash && user.passwordSalt) {
    if (hashPasswordWithSalt(cleanCode, user.passwordSalt) === user.passwordHash) {
      return true;
    }
    // Support case-insensitive match for the default TALA2026 bootstrap code
    if (
      cleanCode.toUpperCase() === 'TALA2026' &&
      hashPasswordWithSalt('TALA2026', user.passwordSalt) === user.passwordHash
    ) {
      return true;
    }
    return false;
  }

  // Legacy fallback for unmigrated user records that still carry plaintext `accessCode`
  if (typeof user.accessCode === 'string' && user.accessCode.trim()) {
    return (
      user.accessCode === cleanCode ||
      (user.accessCode.toUpperCase() === 'TALA2026' && cleanCode.toUpperCase() === 'TALA2026')
    );
  }

  return true;
}

export interface EnsurePasswordHashedResult<T> {
  user: T;
  migrated: boolean;
}

/**
 * Ensures a single user object has `{ passwordSalt, passwordHash }` and strips plaintext `accessCode`.
 */
export function ensureUserPasswordHashed<T extends Record<string, unknown>>(user: T): EnsurePasswordHashedResult<T> {
  if (!user || typeof user !== 'object') {
    return { user, migrated: false };
  }

  if (user.passwordHash && user.passwordSalt) {
    if ('accessCode' in user) {
      const { accessCode: _removed, ...rest } = user;
      return { user: rest as unknown as T, migrated: true };
    }
    return { user, migrated: false };
  }

  if (typeof user.accessCode === 'string' && (user.accessCode as string).trim()) {
    const { accessCode, ...rest } = user;
    const creds = createPasswordCredentials((accessCode as string).trim());
    return {
      user: {
        ...rest,
        ...creds
      } as unknown as T,
      migrated: true
    };
  }

  return { user, migrated: false };
}

/**
 * Ensures all users in an array have hashed + salted passwords and no plaintext `accessCode`.
 */
export function ensureUsersListPasswordsHashed<T extends Record<string, unknown>>(usersList?: T[] | null): { users: T[]; migrated: boolean } {
  if (!Array.isArray(usersList)) {
    return { users: [], migrated: false };
  }
  let anyMigrated = false;
  const users = usersList.map((u) => {
    const { user: normalized, migrated } = ensureUserPasswordHashed(u);
    if (migrated) anyMigrated = true;
    return normalized;
  });
  return { users, migrated: anyMigrated };
}

export interface AllowedUserRecord {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher';
  title?: string;
  group?: string;
  passwordSalt: string;
  passwordHash: string;
  active: boolean;
  isTrialUser?: boolean;
  trialDays?: number | null;
  trialExpiresAt?: string | null;
  trialExtendedAt?: string | null;
  subscriptionType?: 'annual_paid' | string;
  paidExpiresAt?: string | null;
  upgradedToPaidAt?: string | null;
  paidLicenseAccepted?: boolean;
  paidLicenseAcceptedAt?: string | null;
  paidLicenseVersion?: string | null;
  lockedOut?: boolean;
  lockedOutAt?: string;
  failedLoginAttempts?: number;
  aiUsageCount?: number;
  aiDailyCount?: number;
  aiDailyDate?: string;
  dailyAiQuotaLimit?: number | null;
  lastAiUsedAt?: string;
  notifyOnSharedReport?: boolean;
  sessionDate?: string;
  loginAt?: number;
  [key: string]: unknown;
}

// רשימת המשתמשים המורשים (Allowlist) לגישה למערכת TALA
export const DEFAULT_ALLOWED_USERS: AllowedUserRecord[] = [
  {
    id: 'u_admin_1',
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    role: 'admin',
    title: 'מנהלת מערכת',
    group: 'מתי"א מרכז',
    ...createPasswordCredentials('TALA2026', 'a1f0e8c49b2d471683a5c7e901234567'),
    active: true
  },
  {
    id: 'u_moti_test',
    email: 'moti_reshef@bmc.com',
    name: 'מוטי רשף (משתמש בדיקה)',
    role: 'teacher',
    title: 'מורה שילוב / מורה חדש',
    group: 'מתי"א מרכז',
    ...createPasswordCredentials('TALA2026', 'd4e3f2a1b0c9876543210fe987654321'),
    active: true
  },
  {
    id: 'u_teacher_1',
    email: 'teacher@tala.edu.il',
    name: 'מיכל כהן',
    role: 'teacher',
    title: 'גננת שילוב / מורת מתי"א',
    group: 'מתי"א מרכז',
    ...createPasswordCredentials('1234', 'b2e1f9d50c3e582794b6d8f012345678'),
    active: true
  },
  {
    id: 'u_teacher_2',
    email: 'gan@tala.edu.il',
    name: 'רונית לוי',
    role: 'teacher',
    title: 'מנהלת גן ורכזת תכניות עבודה',
    group: 'מתי"א מרכז',
    ...createPasswordCredentials('1234', 'c3f20ae61d4f693805c7e90123456789'),
    active: true
  }
];

const STORAGE_KEY = 'tala_allowed_users_v1';

export function loadAllowedUsers(): AllowedUserRecord[] {
  try {
    const saved = safeGetStorageItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const titleMigrated = parsed.map((u: AllowedUserRecord) =>
          (u.email?.toLowerCase() === 'zivit.reshef@gmail.com' || u.id === 'u_admin_1') &&
          u.title === 'מנהלת מערכת ומדריכה פדגוגית'
            ? { ...u, title: 'מנהלת מערכת' }
            : u
        );
        const { users: hashedUsers } = ensureUsersListPasswordsHashed(titleMigrated);
        safeSetStorageItem(STORAGE_KEY, JSON.stringify(hashedUsers));
        return hashedUsers;
      }
    }
  } catch (e) {
    console.warn('Failed to load allowed users from storage', e);
  }
  return DEFAULT_ALLOWED_USERS;
}

export function saveAllowedUsers(users: AllowedUserRecord[]): void {
  const { users: hashedUsers } = ensureUsersListPasswordsHashed(users);
  safeSetStorageItem(STORAGE_KEY, JSON.stringify(hashedUsers));
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

export interface VerifyAllowedUserResult {
  allowed: boolean;
  reason?: string;
  isLockedOut?: boolean;
  isDisabled?: boolean;
  failedAttempts?: number;
  remainingAttempts?: number;
  user?: AllowedUserRecord;
  isTrialExpired?: boolean;
  updatedUsersList?: AllowedUserRecord[] | null;
}

export function verifyAllowedUser(
  email?: string,
  accessCode?: string,
  usersList?: AllowedUserRecord[]
): VerifyAllowedUserResult {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (accessCode || '').trim();
  const rawList = usersList || loadAllowedUsers();
  const { users: list, migrated: listMigrated } = ensureUsersListPasswordsHashed(rawList);

  const found = list.find(
    (u) => (u.email || '').trim().toLowerCase() === cleanEmail
  );

  if (!found) {
    return {
      allowed: false,
      reason: 'גישה נדחתה: כתובת האימייל אינה מופיעה ברשימת המשתמשים המורשים של מערכת TALA.'
    };
  }

  const isMainAdmin = (found.email || '').trim().toLowerCase() === 'zivit.reshef@gmail.com';

  if (!found.active) {
    if (found.lockedOut) {
      return {
        allowed: false,
        isLockedOut: true,
        reason:
          'חשבונך נחסם אוטומטית מטעמי אבטחה לאחר 5 ניסיונות כניסה שגויים. לשחרור החסימה יש לפנות למנהל/ת המערכת.'
      };
    }
    return {
      allowed: false,
      isDisabled: true,
      reason: 'גישה נדחתה: חשבון משתמש זה הושבת על ידי מנהל/ת המערכת. לפרטים ניתן לפנות למנהל/ת המערכת.'
    };
  }

  const isPasswordMatch = verifyUserPassword(found, cleanCode);

  if (!isPasswordMatch) {
    const nextAttempts = (Number(found.failedLoginAttempts) || 0) + 1;
    const nowFormatted = new Date().toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const updatedUsersList = list.map((u) => {
        if (u.id !== found.id) return u;
        return {
          ...u,
          failedLoginAttempts: nextAttempts,
          lockedOut: true,
          lockedOutAt: nowFormatted,
          active: isMainAdmin ? true : false
        };
      });

      return {
        allowed: false,
        isLockedOut: true,
        failedAttempts: nextAttempts,
        updatedUsersList,
        reason:
          'הזנת סיסמה שגויה 5 פעמים ברציפות – החשבון נחסם אוטומטית בהתאם למדיניות האבטחה. נשלחה התראה למנהל/ת המערכת.'
      };
    }

    const remaining = MAX_FAILED_LOGIN_ATTEMPTS - nextAttempts;
    const updatedUsersList = list.map((u) =>
      u.id === found.id ? { ...u, failedLoginAttempts: nextAttempts } : u
    );

    return {
      allowed: false,
      failedAttempts: nextAttempts,
      remainingAttempts: remaining,
      updatedUsersList,
      reason: `קוד הגישה שהוזן שגוי (ניסיון ${nextAttempts} מתוך ${MAX_FAILED_LOGIN_ATTEMPTS} – נותרו עוד ${remaining} ניסיונות לפני חסימה אוטומטית של החשבון).`
    };
  }

  // Successful login: reset failed attempts counter and persist any migrated password hashes
  let updatedUsersList: AllowedUserRecord[] | null = listMigrated ? list : null;
  if ((found.failedLoginAttempts || 0) > 0) {
    updatedUsersList = list.map((u) =>
      u.id === found.id ? { ...u, failedLoginAttempts: 0, lockedOut: false } : u
    );
  }

  return {
    allowed: true,
    user: found,
    isTrialExpired: isTrialUserExpired(found),
    updatedUsersList
  };
}

export interface PasswordPolicyCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordPolicyResult {
  valid: boolean;
  checks: PasswordPolicyCheck[];
  missing: string[];
  errorMessage: string;
}

/**
 * Industry-standard password policy validation (no password history/retention).
 * Rules:
 * 1. Minimum 8 characters
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 lowercase letter (a-z)
 * 4. At least 1 digit (0-9)
 * 5. At least 1 special character (!@#$%^&*...)
 */
export function validatePasswordPolicy(password?: unknown): PasswordPolicyResult {
  const pwd = String(password || '');
  const checks: PasswordPolicyCheck[] = [
    {
      id: 'length',
      label: 'לפחות 8 תווים',
      passed: pwd.length >= 8
    },
    {
      id: 'upper',
      label: 'אות גדולה באנגלית (A-Z)',
      passed: /[A-Z]/.test(pwd)
    },
    {
      id: 'lower',
      label: 'אות קטנה באנגלית (a-z)',
      passed: /[a-z]/.test(pwd)
    },
    {
      id: 'digit',
      label: 'ספרה אחת לפחות (0-9)',
      passed: /[0-9]/.test(pwd)
    },
    {
      id: 'special',
      label: 'תו מיוחד (!@#$%^&*...)',
      passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd)
    }
  ];

  const missing = checks.filter((c) => !c.passed).map((c) => c.label);
  return {
    valid: missing.length === 0,
    checks,
    missing,
    errorMessage:
      missing.length > 0
        ? `הסיסמה אינה עומדת במדיניות האבטחה. חסר: ${missing.join(', ')}.`
        : ''
  };
}

/**
 * Returns the local calendar date string 'YYYY-MM-DD' for daily session reset.
 */
export function getCurrentLocalDayKey(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Stamps a logged-in user object with the current calendar day key and timestamp
 * so the session automatically resets every new day.
 */
export function stampSessionUserWithDate<T extends Record<string, unknown>>(user: T | null, date: Date | string | number = new Date()): (T & { sessionDate: string; loginAt: number }) | null {
  if (!user || typeof user !== 'object') return null;
  const d = date instanceof Date ? date : new Date(date);
  return {
    ...user,
    sessionDate: getCurrentLocalDayKey(d),
    loginAt: d.getTime()
  };
}

/**
 * Checks whether a persisted session user object is still valid for the current calendar day.
 * Sessions from a previous calendar day (or legacy sessions without sessionDate) expire automatically.
 */
export function isSessionUserValidForToday(sessionUser?: Record<string, unknown> | null, now: Date | string | number = new Date()): boolean {
  if (!sessionUser || typeof sessionUser !== 'object' || !sessionUser.email) {
    return false;
  }
  if (!sessionUser.sessionDate || typeof sessionUser.sessionDate !== 'string') {
    return false;
  }
  return sessionUser.sessionDate === getCurrentLocalDayKey(now);
}

export const DEFAULT_TRIAL_DAYS = 7;

/**
 * Computes an ISO expiration timestamp for a trial user given a number of days.
 */
export function computeTrialExpirationIso(days: number = DEFAULT_TRIAL_DAYS, fromDate: Date | string | number = new Date()): string {
  const validDays = Math.max(1, Number(days) || DEFAULT_TRIAL_DAYS);
  const baseMs = (fromDate instanceof Date ? fromDate : new Date(fromDate)).getTime();
  return new Date(baseMs + validDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Returns true if the user is a trial user and their trial period has expired.
 */
export function isTrialUserExpired(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): boolean {
  if (!user || !user.isTrialUser || !user.trialExpiresAt) return false;
  const expMs = new Date(user.trialExpiresAt).getTime();
  if (Number.isNaN(expMs)) return false;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  return nowMs > expMs;
}

/**
 * Returns the remaining days (rounded up) for a trial user, or null if not a trial user.
 */
export function getTrialRemainingDays(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): number | null {
  if (!user || !user.isTrialUser || !user.trialExpiresAt) return null;
  const expMs = new Date(user.trialExpiresAt).getTime();
  if (Number.isNaN(expMs)) return null;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const diffMs = expMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Extends a trial user's trial period by the specified number of additional days.
 * If the trial is already expired, extends from the current date.
 * If the trial is still active, adds days to the existing expiration date.
 */
export function extendUserTrial<T extends Partial<AllowedUserRecord>>(user: T, additionalDays: number = 7, now: Date | string | number = new Date()): T & { isTrialUser: true; trialDays: number; trialExpiresAt: string; trialExtendedAt: string } {
  if (!user || typeof user !== 'object') return user as unknown as T & { isTrialUser: true; trialDays: number; trialExpiresAt: string; trialExtendedAt: string };
  const daysToAdd = Math.max(1, Number(additionalDays) || 7);
  const nowDate = now instanceof Date ? now : new Date(now);
  
  let baseTime = nowDate.getTime();
  if (user.trialExpiresAt) {
    const existingExp = new Date(user.trialExpiresAt).getTime();
    if (!Number.isNaN(existingExp) && existingExp > nowDate.getTime()) {
      baseTime = existingExp;
    }
  }

  const nextExpIso = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
  const remainingDays = Math.ceil((new Date(nextExpIso).getTime() - nowDate.getTime()) / (24 * 60 * 60 * 1000));

  return {
    ...user,
    isTrialUser: true,
    trialDays: remainingDays,
    trialExpiresAt: nextExpIso,
    trialExtendedAt: nowDate.toISOString()
  };
}

export const CURRENT_PAID_LICENSE_VERSION = '1.0';

/**
 * Checks whether a paying user must accept the paid license agreement before using the system.
 * Returns true if the user is a non-admin, paid account (subscriptionType === 'annual_paid' or upgradedToPaidAt exists)
 * and has not yet accepted the current paid license agreement version.
 */
export function mustUserAcceptPaidLicense(user?: Partial<AllowedUserRecord> | null): boolean {
  if (!user || typeof user !== 'object') return false;
  if (user.role === 'admin' || user.email?.toLowerCase() === 'zivit.reshef@gmail.com') {
    return false;
  }
  // Check if user is a paid subscriber
  const isPaid = user.subscriptionType === 'annual_paid' || Boolean(user.upgradedToPaidAt);
  if (!isPaid) return false;

  return !user.paidLicenseAccepted || user.paidLicenseVersion !== CURRENT_PAID_LICENSE_VERSION;
}

/**
 * Stamps a user object with the accepted paid license agreement metadata.
 */
export function acceptPaidLicenseForUser<T extends Partial<AllowedUserRecord>>(
  user: T,
  now: Date | string | number = new Date()
): T & { paidLicenseAccepted: true; paidLicenseAcceptedAt: string; paidLicenseVersion: string } {
  const nowDate = now instanceof Date ? now : new Date(now);
  return {
    ...user,
    paidLicenseAccepted: true,
    paidLicenseAcceptedAt: nowDate.toISOString(),
    paidLicenseVersion: CURRENT_PAID_LICENSE_VERSION
  };
}

/**
 * Upgrades a user to a full annual paid subscription (365 days from now).
 */
export function upgradeUserToAnnualPaid<T extends Partial<AllowedUserRecord>>(user: T, now: Date | string | number = new Date()): T & { isTrialUser: false; subscriptionType: 'annual_paid'; paidExpiresAt: string; upgradedToPaidAt: string; trialExpiresAt: null; trialDays: null; paidLicenseAccepted: false; paidLicenseAcceptedAt: null; paidLicenseVersion: null } {
  if (!user || typeof user !== 'object') return user as unknown as T & { isTrialUser: false; subscriptionType: 'annual_paid'; paidExpiresAt: string; upgradedToPaidAt: string; trialExpiresAt: null; trialDays: null; paidLicenseAccepted: false; paidLicenseAcceptedAt: null; paidLicenseVersion: null };
  const nowDate = now instanceof Date ? now : new Date(now);
  const nextYearIso = new Date(nowDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...user,
    isTrialUser: false,
    subscriptionType: 'annual_paid',
    paidExpiresAt: nextYearIso,
    upgradedToPaidAt: nowDate.toISOString(),
    trialExpiresAt: null,
    trialDays: null,
    paidLicenseAccepted: false,
    paidLicenseAcceptedAt: null,
    paidLicenseVersion: null
  };
}

/**
 * Checks if a paid user's annual subscription has expired.
 */
export function isPaidUserExpired(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): boolean {
  if (!user || user.subscriptionType !== 'annual_paid' || !user.paidExpiresAt) return false;
  const expMs = new Date(user.paidExpiresAt).getTime();
  if (Number.isNaN(expMs)) return false;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  return nowMs > expMs;
}

/**
 * Returns the remaining days for a paid user's annual subscription,
 * or null if the user is null or a trial user.
 * For admin accounts, returns Infinity.
 */
export function getPaidRemainingDays(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): number | null {
  if (!user || user.isTrialUser) return null;
  if (user.role === 'admin' || user.email?.toLowerCase() === 'zivit.reshef@gmail.com') {
    return Infinity;
  }
  const nowDate = now instanceof Date ? now : new Date(now);

  if (user.paidExpiresAt) {
    const expMs = new Date(user.paidExpiresAt).getTime();
    if (!Number.isNaN(expMs)) {
      const diffMs = expMs - nowDate.getTime();
      return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }
  }

  if (user.upgradedToPaidAt) {
    const startMs = new Date(user.upgradedToPaidAt).getTime();
    if (!Number.isNaN(startMs)) {
      const expMs = startMs + 365 * 24 * 60 * 60 * 1000;
      const diffMs = expMs - nowDate.getTime();
      return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }
  }

  if (user.subscriptionType === 'annual_paid' || user.active) {
    return 365;
  }

  return null;
}

export type UserSubscriptionStatus =
  | 'unknown'
  | 'admin'
  | 'locked_out'
  | 'disabled'
  | 'trial_expired'
  | 'trial_active'
  | 'paid_expired'
  | 'paid_active';

/**
 * Computes a standardized subscription lifecycle status for display and filtering.
 */
export function getUserSubscriptionStatus(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): UserSubscriptionStatus {
  if (!user) return 'unknown';
  if (user.email?.toLowerCase() === 'zivit.reshef@gmail.com' || user.role === 'admin') {
    return 'admin';
  }
  if (user.lockedOut) return 'locked_out';
  if (!user.active) return 'disabled';

  if (user.isTrialUser) {
    return isTrialUserExpired(user, now) ? 'trial_expired' : 'trial_active';
  }

  if (user.subscriptionType === 'annual_paid') {
    return isPaidUserExpired(user, now) ? 'paid_expired' : 'paid_active';
  }

  return 'paid_active';
}

/**
 * Renames a group / Matya across an entire list of users (bulk rename).
 */
export function renameUserGroupInList<T extends Partial<AllowedUserRecord>>(usersList?: T[] | null, oldGroupName?: unknown, newGroupName?: unknown): T[] {
  if (!Array.isArray(usersList)) return [];
  const cleanOld = String(oldGroupName ?? '').trim().toLowerCase();
  const cleanNew = String(newGroupName ?? '').trim();
  if (!cleanOld || !cleanNew) return usersList;

  return usersList.map((u) => {
    const currentGroup = String(u.group ?? '').trim();
    if (currentGroup.toLowerCase() === cleanOld) {
      return { ...u, group: cleanNew };
    }
    return u;
  });
}

export interface GroupStat {
  name: string;
  teachersCount: number;
  studentsCount: number;
  aiUsageTotal: number;
  payingCount: number;
  trialCount: number;
}

/**
 * Aggregates group / Matya statistics (teachers count, students count, AI usage).
 */
export function computeGroupStats(
  usersList: Partial<AllowedUserRecord>[] = [],
  studentsList: Array<{ ownerEmail?: string; [key: string]: unknown }> = [],
  userActivityByEmail?: Record<string, { aiCount?: number }>
): GroupStat[] {
  const groupsMap = new Map<string, GroupStat>();

  for (const user of usersList) {
    const groupName = (user.group || '').trim() || 'ללא שיוך צוות / מתי"א';
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, {
        name: groupName,
        teachersCount: 0,
        studentsCount: 0,
        aiUsageTotal: 0,
        payingCount: 0,
        trialCount: 0
      });
    }
    const stat = groupsMap.get(groupName)!;
    stat.teachersCount += 1;
    const emailKey = (user.email || '').trim().toLowerCase();
    const teleAi = userActivityByEmail?.[emailKey]?.aiCount;
    const effectiveAi = Math.max(Number(user.aiUsageCount) || 0, Number(teleAi) || 0);
    stat.aiUsageTotal += effectiveAi;
    if (user.isTrialUser) {
      stat.trialCount += 1;
    } else {
      stat.payingCount += 1;
    }
  }

  for (const student of studentsList) {
    const ownerEmail = (student.ownerEmail || '').trim().toLowerCase();
    const owner = usersList.find((u) => (u.email || '').trim().toLowerCase() === ownerEmail);
    const groupName = (owner?.group || '').trim() || 'ללא שיוך צוות / מתי"א';
    if (groupsMap.has(groupName)) {
      groupsMap.get(groupName)!.studentsCount += 1;
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => b.teachersCount - a.teachersCount);
}

// ============================================================================
// Daily Quota Tracking Telemetry (Gemini AI & Google Apps Script Email)
// ============================================================================

export const DAILY_AI_QUOTA_LIMIT = 1500;
export const DEFAULT_USER_DAILY_AI_QUOTA = 50;
export const DAILY_EMAIL_QUOTA_LIMIT = 100;

/**
 * Returns the effective daily AI quota limit for a given user.
 * Admins have unlimited quota (Infinity); paying users default to 100/day; trial users to 50/day,
 * unless overridden by `user.dailyAiQuotaLimit`.
 */
export function getUserEffectiveDailyAiQuota(user?: Partial<AllowedUserRecord> | null): number {
  if (!user) return DEFAULT_USER_DAILY_AI_QUOTA;
  if (user.role === 'admin' || user.email?.toLowerCase() === 'zivit.reshef@gmail.com') {
    return Infinity;
  }
  const custom = Number(user.dailyAiQuotaLimit);
  if (Number.isFinite(custom) && custom > 0) {
    return Math.round(custom);
  }
  return user.isTrialUser ? DEFAULT_USER_DAILY_AI_QUOTA : 100;
}

/**
 * Returns how many AI requests a user has performed on the given calendar day.
 * Automatically returns 0 when `aiDailyDate` is from a previous calendar day.
 */
export function getUserDailyAiUsage(
  user?: Partial<AllowedUserRecord> | null,
  date: Date | string | number = new Date()
): number {
  if (!user) return 0;
  const todayKey = getCurrentLocalDayKey(date);
  if (user.aiDailyDate === todayKey) {
    return Math.max(0, Number(user.aiDailyCount) || 0);
  }
  if (user.lastAiUsedAt && user.lastAiUsedAt.slice(0, 10) === todayKey) {
    return Math.max(0, Number(user.aiDailyCount) || 0);
  }
  return 0;
}

/**
 * Resets a specific user's daily AI usage counter in the users list (e.g. when a teacher hits their daily limit).
 */
export function resetUserDailyAiQuotaInList<T extends Partial<AllowedUserRecord>>(
  usersList?: T[] | null,
  userEmailOrId?: string,
  date: Date | string | number = new Date()
): T[] {
  if (!Array.isArray(usersList) || !userEmailOrId) return usersList || [];
  const cleanTarget = String(userEmailOrId).trim().toLowerCase();
  const todayKey = getCurrentLocalDayKey(date);

  return usersList.map((u) => {
    const matchId = String(u.id || '').trim().toLowerCase() === cleanTarget;
    const matchEmail = String(u.email || '').trim().toLowerCase() === cleanTarget;
    if (matchId || matchEmail) {
      return {
        ...u,
        aiDailyCount: 0,
        aiDailyDate: todayKey
      };
    }
    return u;
  });
}

/**
 * Sets a custom daily AI quota limit for a specific user or an entire Matya group.
 */
export function setGroupDailyAiQuotaInList<T extends Partial<AllowedUserRecord>>(
  usersList?: T[] | null,
  groupName?: string,
  quotaLimit?: number | null
): T[] {
  if (!Array.isArray(usersList) || !groupName) return usersList || [];
  const cleanGroup = String(groupName).trim().toLowerCase();
  const parsedLimit = quotaLimit === null || quotaLimit === undefined ? null : Math.max(1, Math.min(5000, Math.round(Number(quotaLimit) || DEFAULT_USER_DAILY_AI_QUOTA)));

  return usersList.map((u) => {
    const uGroup = (String(u.group || '').trim() || 'ללא שיוך צוות / מתי"א').toLowerCase();
    if (uGroup === cleanGroup && u.role !== 'admin') {
      return {
        ...u,
        dailyAiQuotaLimit: parsedLimit
      };
    }
    return u;
  });
}

export function getDailyQuotaStorageKey(serviceName: string, date: Date | string | number = new Date()): string {
  const dayKey = getCurrentLocalDayKey(date);
  return `tala_quota_${serviceName}_${dayKey}`;
}

export function getDailyQuotaCount(serviceName: string, date: Date | string | number = new Date()): number {
  try {
    if (typeof localStorage === 'undefined') return 0;
    const key = getDailyQuotaStorageKey(serviceName, date);
    return parseInt(safeGetStorageItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementDailyQuotaCount(serviceName: string, amount: number = 1, date: Date | string | number = new Date()): number {
  try {
    if (typeof localStorage === 'undefined') return 0;
    const key = getDailyQuotaStorageKey(serviceName, date);
    const current = parseInt(safeGetStorageItem(key) || '0', 10) || 0;
    const next = current + Math.max(1, amount);
    safeSetStorageItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function recordAiTelemetryForUser<T extends Partial<AllowedUserRecord>>(
  userEmail?: string,
  usersList?: T[],
  date: Date | string | number = new Date()
): T[] | undefined {
  incrementDailyQuotaCount('ai', 1, date);
  if (!Array.isArray(usersList) || !userEmail) return usersList;

  const cleanEmail = userEmail.trim().toLowerCase();
  const d = date instanceof Date ? date : new Date(date);
  const nowIso = d.toISOString();
  const todayKey = getCurrentLocalDayKey(d);

  return usersList.map((u) => {
    if ((u.email || '').trim().toLowerCase() === cleanEmail) {
      const prevDaily = u.aiDailyDate === todayKey ? Number(u.aiDailyCount) || 0 : 0;
      return {
        ...u,
        aiUsageCount: (Number(u.aiUsageCount) || 0) + 1,
        aiDailyCount: prevDaily + 1,
        aiDailyDate: todayKey,
        lastAiUsedAt: nowIso
      };
    }
    return u;
  });
}

export type AdministrativeUserGroup = 'admins' | 'paying' | 'trials' | 'expired_disabled';

/**
 * Classifies a user into one of four administrative groups:
 * - 'admins': system administrators
 * - 'paying': active annual/paid subscribers
 * - 'trials': active trial users
 * - 'expired_disabled': expired trials, expired subscriptions, disabled, or locked out users
 */
export function classifyUserGroup(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): AdministrativeUserGroup {
  const status = getUserSubscriptionStatus(user, now);
  if (status === 'admin') return 'admins';
  if (status === 'paid_active') return 'paying';
  if (status === 'trial_active') return 'trials';
  return 'expired_disabled';
}

/**
 * Helper to compute an epoch / priority weight for subscription status sorting.
 */
function getSubscriptionSortWeight(user?: Partial<AllowedUserRecord> | null, now: Date | string | number = new Date()): number {
  const status = getUserSubscriptionStatus(user, now);
  if (status === 'admin') return 9999999999999;
  if (status === 'paid_active') {
    return user?.paidExpiresAt ? new Date(user.paidExpiresAt).getTime() : 8888888888888;
  }
  if (status === 'trial_active') {
    return user?.trialExpiresAt ? new Date(user.trialExpiresAt).getTime() : 7777777777777;
  }
  if (status === 'trial_expired' || status === 'paid_expired') return 1000;
  if (status === 'locked_out') return 500;
  if (status === 'disabled') return 100;
  return 0;
}

export type SortField = 'name' | 'email' | 'group' | 'capacity' | 'status' | string | null;
export type SortDirection = 'asc' | 'desc';

/**
 * Sorts a list of users by specified column and direction.
 * Supports Hebrew locale sorting for text, and numeric sorting for capacity and subscription expiration.
 */
export function sortUsersList<T extends Partial<AllowedUserRecord>>(
  users: T[] = [],
  sortField: SortField = null,
  sortDirection: SortDirection = 'asc',
  studentCountByEmail: Map<string, number> = new Map(),
  now: Date | string | number = new Date()
): T[] {
  if (!Array.isArray(users)) return [];
  if (!sortField || !sortDirection || (sortDirection !== 'asc' && sortDirection !== 'desc')) {
    return [...users];
  }

  const factor = sortDirection === 'asc' ? 1 : -1;

  return [...users].sort((a, b) => {
    if (sortField === 'name') {
      const nameA = String(a?.name || '').trim();
      const nameB = String(b?.name || '').trim();
      return factor * nameA.localeCompare(nameB, 'he', { sensitivity: 'base' });
    }

    if (sortField === 'email') {
      const emailA = String(a?.email || '').trim().toLowerCase();
      const emailB = String(b?.email || '').trim().toLowerCase();
      return factor * emailA.localeCompare(emailB, 'en', { sensitivity: 'base' });
    }

    if (sortField === 'group') {
      const grpA = String(a?.group || '').trim();
      const grpB = String(b?.group || '').trim();
      return factor * grpA.localeCompare(grpB, 'he', { sensitivity: 'base' });
    }

    if (sortField === 'capacity') {
      const countA = studentCountByEmail.get((a?.email || '').trim().toLowerCase()) || 0;
      const countB = studentCountByEmail.get((b?.email || '').trim().toLowerCase()) || 0;
      return factor * (countA - countB);
    }

    if (sortField === 'status') {
      const weightA = getSubscriptionSortWeight(a, now);
      const weightB = getSubscriptionSortWeight(b, now);
      return factor * (weightA - weightB);
    }

    return 0;
  });
}
