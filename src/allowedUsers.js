// רשימת המשתמשים המורשים (Allowlist) לגישה למערכת TALA
export const DEFAULT_ALLOWED_USERS = [
  {
    id: 'u_admin_1',
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    role: 'admin', // 'admin' | 'teacher'
    title: 'מנהלת מערכת',
    accessCode: 'TALA2026',
    active: true
  },
  {
    id: 'u_teacher_1',
    email: 'teacher@tala.edu.il',
    name: 'מיכל כהן',
    role: 'teacher',
    title: 'גננת שילוב / מורת מתי"א',
    accessCode: '1234',
    active: true
  },
  {
    id: 'u_teacher_2',
    email: 'gan@tala.edu.il',
    name: 'רונית לוי',
    role: 'teacher',
    title: 'מנהלת גן ורכזת תכניות עבודה',
    accessCode: '1234',
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
        const migrated = parsed.map((u) =>
          (u.email?.toLowerCase() === 'zivit.reshef@gmail.com' || u.id === 'u_admin_1') &&
          u.title === 'מנהלת מערכת ומדריכה פדגוגית'
            ? { ...u, title: 'מנהלת מערכת' }
            : u
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (e) {
    console.warn('Failed to load allowed users from storage', e);
  }
  return DEFAULT_ALLOWED_USERS;
}

export function saveAllowedUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

export function verifyAllowedUser(email, accessCode, usersList) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (accessCode || '').trim();
  const list = usersList || loadAllowedUsers();

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

  if (found.accessCode && found.accessCode !== cleanCode) {
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

  // Successful login: reset failed attempts counter (for regular users; for admin, keep lockedOut alert until dismissed if any)
  let updatedUsersList = null;
  if ((found.failedLoginAttempts || 0) > 0 && !isMainAdmin) {
    updatedUsersList = list.map((u) =>
      u.id === found.id ? { ...u, failedLoginAttempts: 0 } : u
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

