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
