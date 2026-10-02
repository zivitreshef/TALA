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
      reason: 'גישה נדחתה: כתובת האימייל אינה מופיעה ברשימת המשתמשים המורשים (Allowlist) של מערכת TALA.'
    };
  }

  if (!found.active) {
    return {
      allowed: false,
      reason: 'גישה נדחתה: חשבון משתמש זה הושהה על ידי מנהל/ת המערכת.'
    };
  }

  if (found.accessCode && found.accessCode !== cleanCode) {
    return {
      allowed: false,
      reason: 'קוד הגישה שהוזן שגוי עבור כתובת אימייל זו.'
    };
  }

  return {
    allowed: true,
    user: found
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

