// === קול ההורים: לוגיקה טהורה (ללא Firebase / React) ===
//
// הקישור הציבורי הוא capability URL: ה-token (128 ביט אקראיים) הוא גם מזהה המסמך
// ב-Firestore. אין בקישור או במסמך שם משפחה / ת.ז / כל פרט מזהה מלבד שם פרטי.

export const INVITE_COLLECTION = 'tala_invites';
export const INVITE_TTL_DAYS = 7;
export const MAX_ANSWER_LENGTH = 1500;
export const MAX_CUSTOM_QUESTIONS = 3;
export const MAX_QUESTION_LENGTH = 150;
export const INVITE_ANSWER_KEYS = ['strengths', 'challenges', 'goal'];
export const CUSTOM_ANSWER_KEYS = ['custom_0', 'custom_1', 'custom_2'];

const TOKEN_REGEX = /^[A-Za-z0-9_-]{22}$/;
const SHARE_ROUTE_PREFIX = '#/share-input/';

const MERGE_LABELS = {
  strengths: 'חוזקות ותחומי עניין',
  challenges: 'קשיים ואתגרים',
  goal: 'מה חשוב להשיג השנה'
};

export function generateInviteToken(cryptoObj = globalThis.crypto) {
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Secure random generator is not available');
  }
  const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isValidInviteToken(token) {
  return typeof token === 'string' && TOKEN_REGEX.test(token);
}

export function parseInviteTokenFromHash(hash = '') {
  const raw = String(hash || '');
  if (!raw.startsWith(SHARE_ROUTE_PREFIX)) return null;
  const token = raw.slice(SHARE_ROUTE_PREFIX.length);
  return isValidInviteToken(token) ? token : null;
}

// האתר מתארח ב-GitHub Pages (אין rewrite לנתיבים), לכן הנתיב הוא hash-route.
export function buildInviteUrl(baseHref, token) {
  const base = String(baseHref || '').split('#')[0].split('?')[0];
  return `${base}${SHARE_ROUTE_PREFIX}${token}`;
}

export function buildWhatsAppShareUrl(inviteUrl, { childFirstName = '' } = {}) {
  const name = String(childFirstName || '').trim();
  const text = `שלום, לקראת בניית תוכנית העבודה${name ? ' של ' + name : ''} נשמח לשמוע את דעתכם. זה לוקח כ-3 דקות:\n${inviteUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function pick(gender, boyText, girlText) {
  return gender === 'girl' ? girlText : boyText;
}

export function sanitizeCustomQuestions(questions = []) {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) =>
      String(q || '')
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, MAX_QUESTION_LENGTH)
    )
    .filter(Boolean)
    .slice(0, MAX_CUSTOM_QUESTIONS);
}

export function getInviteQuestions({ childName = '', gender = 'boy', customQuestions = [] } = {}) {
  const name = String(childName || '').trim() || pick(gender, 'הילד', 'הילדה');
  const base = [
    {
      key: 'strengths',
      label: pick(
        gender,
        `מה ${name} אוהב לעשות ובמה הוא מצליח?`,
        `מה ${name} אוהבת לעשות ובמה היא מצליחה?`
      )
    },
    { key: 'challenges', label: `באילו מצבים קשה ל${name} כרגע?` },
    { key: 'goal', label: `מה הכי חשוב לכם שנעבוד עליו עם ${name} השנה?` }
  ];

  const custom = sanitizeCustomQuestions(customQuestions).map((label, idx) => ({
    key: `custom_${idx}`,
    label,
    isCustom: true
  }));

  return [...base, ...custom];
}

export function buildInviteDoc({
  ownerEmail,
  studentId,
  childFirstName = '',
  gender = 'boy',
  customQuestions = [],
  now = new Date()
}) {
  const owner = String(ownerEmail || '').trim().toLowerCase();
  if (!owner || !studentId) throw new Error('ownerEmail and studentId are required');
  const cleanQuestions = sanitizeCustomQuestions(customQuestions);

  const docData = {
    ownerEmail: owner,
    studentId: String(studentId),
    // שם פרטי בלבד - מוצג להורה בדף הציבורי
    childFirstName: String(childFirstName || '').trim().split(/\s+/)[0] || '',
    gender: gender === 'girl' ? 'girl' : 'boy',
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  };

  if (cleanQuestions.length > 0) {
    docData.customQuestions = cleanQuestions;
  }

  return docData;
}

export function sanitizeResponses(rawResponses = {}, customQuestions = []) {
  const clean = {};
  INVITE_ANSWER_KEYS.forEach((key) => {
    const value = String(rawResponses?.[key] ?? '').trim().slice(0, MAX_ANSWER_LENGTH);
    if (value) clean[key] = value;
  });
  CUSTOM_ANSWER_KEYS.forEach((key) => {
    const value = String(rawResponses?.[key] ?? '').trim().slice(0, MAX_ANSWER_LENGTH);
    if (value) clean[key] = value;
  });
  return clean;
}

export function hasAnyAnswer(responses, customQuestions = []) {
  return Object.keys(sanitizeResponses(responses, customQuestions)).length > 0;
}

export function toMillis(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  return NaN;
}

// 'missing' | 'expired' | 'submitted' | 'pending'
export function getInviteState(invite, now = Date.now()) {
  if (!invite) return 'missing';
  if (invite.status === 'submitted') return 'submitted';
  const expiresMs = toMillis(invite.expiresAt);
  if (Number.isNaN(expiresMs) || now >= expiresMs) return 'expired';
  return 'pending';
}

// === צד המורה: סיכום מצב, והעברת התשובות לתיאור החופשי ===

// status: 'received' (יש מענה שטרם נבדק) | 'waiting' (יש קישור פעיל) | 'none'
export function summarizeInvites(invites = [], now = Date.now()) {
  const list = [...invites].sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
  const unreviewed = list.filter(
    (i) => i.status === 'submitted' && !i.reviewedAction && hasAnyAnswer(i.responses, i.customQuestions)
  );
  const history = list.filter(
    (i) => i.status === 'submitted' && i.reviewedAction && hasAnyAnswer(i.responses, i.customQuestions)
  );
  const pending = list.find((i) => getInviteState(i, now) === 'pending') || null;
  const status = unreviewed.length ? 'received' : pending ? 'waiting' : 'none';
  return { status, unreviewed, history, pending };
}

export function buildVoiceMergeText(invite) {
  const responses = sanitizeResponses(invite?.responses, invite?.customQuestions);
  const lines = INVITE_ANSWER_KEYS.filter((key) => responses[key]).map(
    (key) => `• ${MERGE_LABELS[key]}: ${responses[key].replace(/\s*\n\s*/g, ' ')}`
  );

  const customQuestions = sanitizeCustomQuestions(invite?.customQuestions);
  CUSTOM_ANSWER_KEYS.forEach((key, idx) => {
    if (responses[key]) {
      const qLabel = customQuestions[idx] || `שאלה מותאמת ${idx + 1}`;
      lines.push(`• ${qLabel}: ${responses[key].replace(/\s*\n\s*/g, ' ')}`);
    }
  });

  if (lines.length === 0) return '';
  return ['— קול ההורים (כפי שנמסר על ידי ההורים) —', ...lines].join('\n');
}

export function appendToFreeText(existingText, block) {
  return [String(existingText || '').trim(), String(block || '').trim()].filter(Boolean).join('\n\n');
}
