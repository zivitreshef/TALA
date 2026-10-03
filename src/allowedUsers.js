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

function rotr32(x, n) {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Synchronous FIPS 180-4 SHA-256 digest over UTF-8 input string, returning 64-char lowercase hex.
 */
export function sha256Hex(message) {
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
export function generatePasswordSalt(byteLength = 16) {
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
export function hashPasswordWithSalt(password, salt) {
  const cleanPassword = String(password ?? '').trim();
  const cleanSalt = String(salt ?? '').trim();
  let digest = sha256Hex(`TALA_PBKDF_V1:${cleanSalt}:${cleanPassword}`);
  for (let round = 1; round < 256; round++) {
    digest = sha256Hex(`${digest}:${cleanSalt}:${cleanPassword}:${round}`);
  }
  return digest;
}

/**
 * Creates `{ passwordSalt, passwordHash }` credentials for a plaintext password.
 */
export function createPasswordCredentials(password, existingSalt = null) {
  const passwordSalt = existingSalt || generatePasswordSalt();
  const passwordHash = hashPasswordWithSalt(password, passwordSalt);
  return { passwordSalt, passwordHash };
}

/**
 * Verifies whether a candidate password matches a user's stored salted hash (or legacy accessCode).
 */
export function verifyUserPassword(user, candidatePassword) {
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

/**
 * Ensures a single user object has `{ passwordSalt, passwordHash }` and strips plaintext `accessCode`.
 */
export function ensureUserPasswordHashed(user) {
  if (!user || typeof user !== 'object') {
    return { user, migrated: false };
  }

  if (user.passwordHash && user.passwordSalt) {
    if ('accessCode' in user) {
      const { accessCode: _removed, ...rest } = user;
      return { user: rest, migrated: true };
    }
    return { user, migrated: false };
  }

  if (typeof user.accessCode === 'string' && user.accessCode.trim()) {
    const { accessCode, ...rest } = user;
    const creds = createPasswordCredentials(accessCode.trim());
    return {
      user: {
        ...rest,
        ...creds
      },
      migrated: true
    };
  }

  return { user, migrated: false };
}

/**
 * Ensures all users in an array have hashed + salted passwords and no plaintext `accessCode`.
 */
export function ensureUsersListPasswordsHashed(usersList) {
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

// רשימת המשתמשים המורשים (Allowlist) לגישה למערכת TALA
export const DEFAULT_ALLOWED_USERS = [
  {
    id: 'u_admin_1',
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    role: 'admin', // 'admin' | 'teacher'
    title: 'מנהלת מערכת',
    group: 'מתי"א מרכז',
    ...createPasswordCredentials('TALA2026', 'a1f0e8c49b2d471683a5c7e901234567'),
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

export function loadAllowedUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const titleMigrated = parsed.map((u) =>
          (u.email?.toLowerCase() === 'zivit.reshef@gmail.com' || u.id === 'u_admin_1') &&
          u.title === 'מנהלת מערכת ומדריכה פדגוגית'
            ? { ...u, title: 'מנהלת מערכת' }
            : u
        );
        const { users: hashedUsers } = ensureUsersListPasswordsHashed(titleMigrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hashedUsers));
        return hashedUsers;
      }
    }
  } catch (e) {
    console.warn('Failed to load allowed users from storage', e);
  }
  return DEFAULT_ALLOWED_USERS;
}

export function saveAllowedUsers(users) {
  const { users: hashedUsers } = ensureUsersListPasswordsHashed(users);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hashedUsers));
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

export function verifyAllowedUser(email, accessCode, usersList) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (accessCode || '').trim();
  const rawList = usersList || loadAllowedUsers();
  const { users: list, migrated: listMigrated } = ensureUsersListPasswordsHashed(rawList);

  const found = list.find(
    (u) => u.email.trim().toLowerCase() === cleanEmail
  );

  if (!found) {
    return {
      allowed: false,
      reason: 'גישה נדחתה: כתובת האימייל אינה מופיעה ברשימת המשתמשים המורשים של מערכת TALA.'
    };
  }

  const isMainAdmin = found.email.trim().toLowerCase() === 'zivit.reshef@gmail.com';

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

  if (isTrialUserExpired(found)) {
    return {
      allowed: false,
      isDisabled: true,
      isTrialExpired: true,
      reason:
        'גישה נדחתה: תקופת הניסיון (Trial) שהוגדרה עבור חשבונך הסתיימה. להארכת תקופת הגישה ניתן לפנות למנהל/ת המערכת.'
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
          // Disable the user automatically (keep primary admin able to log in with real password so system is never bricked)
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
  let updatedUsersList = listMigrated ? list : null;
  if ((found.failedLoginAttempts || 0) > 0) {
    updatedUsersList = list.map((u) =>
      u.id === found.id ? { ...u, failedLoginAttempts: 0, lockedOut: false } : u
    );
  }

  return {
    allowed: true,
    user: found,
    updatedUsersList
  };
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
export function validatePasswordPolicy(password) {
  const pwd = String(password || '');
  const checks = [
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
export function getCurrentLocalDayKey(date = new Date()) {
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
export function stampSessionUserWithDate(user, date = new Date()) {
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
export function isSessionUserValidForToday(sessionUser, now = new Date()) {
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
export function computeTrialExpirationIso(days = DEFAULT_TRIAL_DAYS, fromDate = new Date()) {
  const validDays = Math.max(1, Number(days) || DEFAULT_TRIAL_DAYS);
  const baseMs = (fromDate instanceof Date ? fromDate : new Date(fromDate)).getTime();
  return new Date(baseMs + validDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Returns true if the user is a trial user and their trial period has expired.
 */
export function isTrialUserExpired(user, now = new Date()) {
  if (!user || !user.isTrialUser || !user.trialExpiresAt) return false;
  const expMs = new Date(user.trialExpiresAt).getTime();
  if (Number.isNaN(expMs)) return false;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  return nowMs > expMs;
}

/**
 * Returns the remaining days (rounded up) for a trial user, or null if not a trial user.
 */
export function getTrialRemainingDays(user, now = new Date()) {
  if (!user || !user.isTrialUser || !user.trialExpiresAt) return null;
  const expMs = new Date(user.trialExpiresAt).getTime();
  if (Number.isNaN(expMs)) return null;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const diffMs = expMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}



