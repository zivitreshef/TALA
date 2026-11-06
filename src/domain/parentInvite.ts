/**
 * Domain module for Parent & Educational Team Voice Capability Invitations (TALA Voice).
 * Zero UI / Firebase dependencies – pure, deterministic and testable.
 *
 * The public link is a capability URL: the 128-bit random token is also the document
 * ID in Firestore. The link contains only the child's first name, zero PII or id numbers.
 */

export const INVITE_COLLECTION = 'tala_invites';
export const INVITE_TTL_DAYS = 7;
export const MAX_ANSWER_LENGTH = 1500;
export const MAX_CUSTOM_QUESTIONS = 5;
export const MAX_QUESTION_LENGTH = 150;
export const INVITE_ANSWER_KEYS = ['strengths', 'challenges', 'goal'] as const;
export const CUSTOM_ANSWER_KEYS = [
  'custom_0',
  'custom_1',
  'custom_2',
  'custom_3',
  'custom_4'
] as const;

export type InviteAnswerKey = typeof INVITE_ANSWER_KEYS[number];
export type CustomAnswerKey = typeof CUSTOM_ANSWER_KEYS[number];

const TOKEN_REGEX = /^[A-Za-z0-9_-]{22}$/;
const SHARE_ROUTE_PREFIX = '#/share-input/';

const MERGE_LABELS: Record<InviteAnswerKey, string> = {
  strengths: 'חוזקות ותחומי עניין',
  challenges: 'קשיים ואתגרים',
  goal: 'מה חשוב להשיג השנה'
};

const STAFF_MERGE_LABELS: Record<InviteAnswerKey, string> = {
  strengths: 'חוזקות ותפקוד חיובי שנצפו',
  challenges: 'אתגרים ומוקדי קושי בתפקוד',
  goal: 'המלצות, התאמות ויעדים להמשך'
};

export const PREDEFINED_STAFF_ROLES: readonly string[] = [
  'מרפאה בעיסוק',
  'קלינאית תקשורת',
  'מנתחת התנהגות',
  'מטפלת רגשית / באומנויות',
  'פסיכולוג/ית',
  'יועצ/ת חינוכי/ת',
  'מורת שילוב / גננת שילוב',
  'מורה מקצועי/ת',
  'תומכת למידה',
  'מתכללת מתי"א',
  'פיזיותרפיסט/ית'
];

export interface StaffRecipientCandidate {
  id: string;
  role: string;
  name: string;
  fieldKey: string;
  label: string;
}

export interface InviteQuestion {
  key: string;
  label: string;
  isCustom?: boolean;
}

export interface BuildInviteDocParams {
  ownerEmail: string;
  studentId: string | number;
  childFirstName?: string;
  gender?: 'boy' | 'girl' | string;
  inviteType?: 'parent' | 'staff';
  recipientRole?: string;
  recipientName?: string;
  customQuestions?: string[];
  overrideDefaults?: boolean;
  now?: Date;
}

export interface InviteDoc {
  ownerEmail: string;
  studentId: string;
  childFirstName: string;
  gender: 'boy' | 'girl';
  inviteType?: 'parent' | 'staff';
  recipientRole?: string;
  recipientName?: string;
  status: 'pending' | 'submitted' | string;
  createdAt: Date;
  expiresAt: Date;
  customQuestions?: string[];
  overrideDefaults?: boolean;
  responses?: Record<string, string>;
  reviewedAction?: string;
  [key: string]: unknown;
}

export type InviteState = 'missing' | 'expired' | 'submitted' | 'pending';

export interface InvitesSummary {
  status: 'received' | 'waiting' | 'none';
  unreviewed: Array<Partial<InviteDoc>>;
  history: Array<Partial<InviteDoc>>;
  pending: Partial<InviteDoc> | null;
}

export function generateInviteToken(cryptoObj: Crypto = globalThis.crypto): string {
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

export function isValidInviteToken(token?: unknown): token is string {
  return typeof token === 'string' && TOKEN_REGEX.test(token);
}

export function parseInviteTokenFromHash(hash = ''): string | null {
  const raw = String(hash || '');
  if (!raw.startsWith(SHARE_ROUTE_PREFIX)) return null;
  const token = raw.slice(SHARE_ROUTE_PREFIX.length);
  return isValidInviteToken(token) ? token : null;
}

export function buildInviteUrl(baseHref: string, token: string): string {
  const base = String(baseHref || '').split('#')[0].split('?')[0];
  return `${base}${SHARE_ROUTE_PREFIX}${token}`;
}

export function buildWhatsAppShareUrl(
  inviteUrl: string,
  {
    childFirstName = '',
    inviteType = 'parent',
    recipientName = '',
    recipientRole = ''
  }: {
    childFirstName?: string;
    inviteType?: 'parent' | 'staff';
    recipientName?: string;
    recipientRole?: string;
  } = {}
): string {
  const name = String(childFirstName || '').trim();
  if (inviteType === 'staff') {
    const greeting = recipientName ? `שלום ${recipientName.trim()}` : 'שלום';
    const rolePart = recipientRole ? ` (${recipientRole.trim()})` : '';
    const text = `${greeting}${rolePart}, לקראת בניית או עדכון תוכנית העבודה${name ? ' של ' + name : ''} נשמח לקבל את ההתייחסות המקצועית שלך בקישור הקצר הבא (כ-2 דקות):\n${inviteUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  const text = `שלום, לקראת בניית תוכנית העבודה${name ? ' של ' + name : ''} נשמח לשמוע את דעתכם. זה לוקח כ-3 דקות:\n${inviteUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function pick(gender: string, boyText: string, girlText: string): string {
  return gender === 'girl' ? girlText : boyText;
}

export function sanitizeCustomQuestions(questions: unknown = []): string[] {
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

export function getDefaultQuestions({
  childName = '',
  gender = 'boy'
}: { childName?: string; gender?: 'boy' | 'girl' | string } = {}): string[] {
  const name = String(childName || '').trim() || pick(gender, 'הילד', 'הילדה');
  return [
    pick(
      gender,
      `מה ${name} אוהב לעשות ובמה הוא מצליח?`,
      `מה ${name} אוהבת לעשות ובמה היא מצליחה?`
    ),
    `באילו מצבים קשה ל${name} כרגע?`,
    `מה הכי חשוב לכם שנעבוד עליו עם ${name} השנה?`
  ];
}

export function getDefaultStaffQuestions({
  childName = '',
  gender = 'boy',
  recipientRole = ''
}: {
  childName?: string;
  gender?: 'boy' | 'girl' | string;
  recipientRole?: string;
} = {}): string[] {
  const name = String(childName || '').trim() || pick(gender, 'התלמיד', 'התלמידה');
  const roleContext = recipientRole ? ` במפגשי ${recipientRole.trim()}` : ' במפגשים ובשיעורים איתך';
  return [
    pick(
      gender,
      `מהן החוזקות ומוקדי הכוח של ${name} כפי שבאים לידי ביטוי${roleContext}?`,
      `מהן החוזקות ומוקדי הכוח של ${name} כפי שבאים לידי ביטוי${roleContext}?`
    ),
    pick(
      gender,
      `באילו אתגרים או קשיים ${name} מתמודד, ומה עוזר לו להתווסת ולהצליח?`,
      `באילו אתגרים או קשיים ${name} מתמודדת, ומה עוזר לה להתווסת ולהצליח?`
    ),
    `אילו מטרות, יעדים או התאמות חשוב בעיניך לשלב בתוכנית ובמעקב של ${name}?`
  ];
}

export function getInviteQuestions({
  childName = '',
  gender = 'boy',
  inviteType = 'parent',
  recipientRole = '',
  customQuestions = [],
  overrideDefaults = false
}: {
  childName?: string;
  gender?: 'boy' | 'girl' | string;
  inviteType?: 'parent' | 'staff';
  recipientRole?: string;
  customQuestions?: string[];
  overrideDefaults?: boolean;
} = {}): InviteQuestion[] {
  const cleanCustom = sanitizeCustomQuestions(customQuestions);

  if (overrideDefaults && cleanCustom.length > 0) {
    return cleanCustom.map((label, idx) => ({
      key: `custom_${idx}`,
      label,
      isCustom: true
    }));
  }

  if (inviteType === 'staff') {
    const staffDefaults = getDefaultStaffQuestions({ childName, gender, recipientRole });
    const baseStaff: InviteQuestion[] = [
      { key: 'strengths', label: staffDefaults[0] },
      { key: 'challenges', label: staffDefaults[1] },
      { key: 'goal', label: staffDefaults[2] }
    ];
    const custom: InviteQuestion[] = cleanCustom.map((label, idx) => ({
      key: `custom_${idx}`,
      label,
      isCustom: true
    }));
    return [...baseStaff, ...custom];
  }

  const name = String(childName || '').trim() || pick(gender, 'הילד', 'הילדה');
  const base: InviteQuestion[] = [
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

  const custom: InviteQuestion[] = cleanCustom.map((label, idx) => ({
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
  inviteType = 'parent',
  recipientRole = '',
  recipientName = '',
  customQuestions = [],
  overrideDefaults = false,
  now = new Date()
}: BuildInviteDocParams): InviteDoc {
  const owner = String(ownerEmail || '').trim().toLowerCase();
  if (!owner || !studentId) throw new Error('ownerEmail and studentId are required');
  const cleanQuestions = sanitizeCustomQuestions(customQuestions);

  const docData: InviteDoc = {
    ownerEmail: owner,
    studentId: String(studentId),
    // שם פרטי בלבד - מוצג בדף הציבורי
    childFirstName: String(childFirstName || '').trim().split(/\s+/)[0] || '',
    gender: gender === 'girl' ? 'girl' : 'boy',
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  };

  if (inviteType === 'staff') {
    docData.inviteType = 'staff';
    const cleanRole = String(recipientRole || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
    const cleanName = String(recipientName || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
    if (cleanRole) docData.recipientRole = cleanRole;
    if (cleanName) docData.recipientName = cleanName;
  }

  if (cleanQuestions.length > 0) {
    docData.customQuestions = cleanQuestions;
    if (overrideDefaults) {
      docData.overrideDefaults = true;
    }
  }

  return docData;
}

export function sanitizeResponses(
  rawResponses: Record<string, unknown> = {},
  _customQuestions: unknown = []
): Record<string, string> {
  const clean: Record<string, string> = {};
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

export function hasAnyAnswer(
  responses?: Record<string, unknown>,
  customQuestions: unknown = []
): boolean {
  return Object.keys(sanitizeResponses(responses || {}, customQuestions)).length > 0;
}

export function toMillis(value: unknown): number {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number') return value;
  return NaN;
}

export function getInviteState(invite?: Partial<InviteDoc> | null, now: number = Date.now()): InviteState {
  if (!invite) return 'missing';
  if (invite.status === 'submitted') return 'submitted';
  const expiresMs = toMillis(invite.expiresAt);
  if (Number.isNaN(expiresMs) || now >= expiresMs) return 'expired';
  return 'pending';
}

export function summarizeInvites(
  invites: Array<Partial<InviteDoc>> = [],
  now: number = Date.now(),
  filterType: 'parent' | 'staff' | 'all' = 'parent'
): InvitesSummary {
  const filtered = invites.filter((i) => {
    if (filterType === 'all') return true;
    const iType = i.inviteType === 'staff' ? 'staff' : 'parent';
    return iType === filterType;
  });
  const list = [...filtered].sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
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

export function buildVoiceMergeText(invite?: Partial<InviteDoc> | null): string {
  const responses = sanitizeResponses(invite?.responses, invite?.customQuestions);
  const lines: string[] = [];
  const isStaff = invite?.inviteType === 'staff';
  const labelsMap = isStaff ? STAFF_MERGE_LABELS : MERGE_LABELS;

  if (!invite?.overrideDefaults) {
    INVITE_ANSWER_KEYS.forEach((key) => {
      if (responses[key]) {
        lines.push(`• ${labelsMap[key]}: ${responses[key].replace(/\s*\n\s*/g, ' ')}`);
      }
    });
  }

  const customQuestions = sanitizeCustomQuestions(invite?.customQuestions);
  CUSTOM_ANSWER_KEYS.forEach((key, idx) => {
    if (responses[key]) {
      const qLabel = customQuestions[idx] || `שאלה מותאמת ${idx + 1}`;
      lines.push(`• ${qLabel}: ${responses[key].replace(/\s*\n\s*/g, ' ')}`);
    }
  });

  if (lines.length === 0) return '';
  if (isStaff) {
    const role = String(invite?.recipientRole || '').trim();
    const name = String(invite?.recipientName || '').trim();
    const who = [name, role].filter(Boolean).join(' – ') || 'איש/אשת צוות';
    return [`— התייחסות צוות מקצועי (${who}) —`, ...lines].join('\n');
  }
  return ['— קול ההורים (כפי שנמסר על ידי ההורים) —', ...lines].join('\n');
}

export function buildStaffObservationNote(invite?: Partial<InviteDoc> | null): {
  authorName: string;
  note: string;
} {
  const responses = sanitizeResponses(invite?.responses, invite?.customQuestions);
  const role = String(invite?.recipientRole || '').trim();
  const name = String(invite?.recipientName || '').trim();
  const authorName = [name, role].filter(Boolean).join(' · ') || 'צוות רב-מקצועי';

  const parts: string[] = [];
  if (responses.strengths) parts.push(`חוזקות: ${responses.strengths.replace(/\s*\n\s*/g, ' ')}`);
  if (responses.challenges) parts.push(`אתגרים ומענים: ${responses.challenges.replace(/\s*\n\s*/g, ' ')}`);
  if (responses.goal) parts.push(`המלצות להמשך: ${responses.goal.replace(/\s*\n\s*/g, ' ')}`);

  const customQuestions = sanitizeCustomQuestions(invite?.customQuestions);
  CUSTOM_ANSWER_KEYS.forEach((key, idx) => {
    if (responses[key]) {
      const qLabel = customQuestions[idx] || `הערה ${idx + 1}`;
      parts.push(`${qLabel}: ${responses[key].replace(/\s*\n\s*/g, ' ')}`);
    }
  });

  const note = parts.join(' | ').slice(0, 400);
  return { authorName: authorName.slice(0, 80), note };
}

/**
 * Extracts structured, clickable staff recipient candidates directly from the student's
 * populated team fields so the teacher can select them with 1 click without typing errors.
 */
export function extractStaffRecipientsFromStudent(
  formData: Record<string, unknown> = {},
  isKindergarten = false
): StaffRecipientCandidate[] {
  const rawFields: Array<{ key: string; role: string }> = [
    { key: 'homeroomTeacher', role: isKindergarten ? 'גננת' : 'מחנכת' },
    { key: 'integrationTeacher', role: isKindergarten ? 'גננת שילוב' : 'מורת שילוב' },
    { key: 'learningSupportAssistant', role: 'תומכת למידה' },
    { key: 'counselorName', role: 'יועצת' },
    { key: 'psychologistName', role: 'פסיכולוגית' },
    { key: 'matyaCoordinator', role: 'מתכללת מטעם המתי"א' },
    { key: 'emotionalTherapist', role: 'מטפלת רגשית / באומנויות' },
    { key: 'paraMedicalTeam', role: 'צוות פרא רפואי' },
    { key: 'additionalPartners', role: 'שותף/ה לתוכנית' }
  ];

  const candidates: StaffRecipientCandidate[] = [];
  const seen = new Set<string>();

  for (const { key, role } of rawFields) {
    const rawVal = String(formData[key] || '').trim();
    if (!rawVal) continue;

    // For multi-person fields (paraMedicalTeam, additionalPartners, emotionalTherapist),
    // split cleanly by comma/semicolon ONLY outside of parentheses
    const segments =
      key === 'paraMedicalTeam' || key === 'additionalPartners' || key === 'emotionalTherapist'
        ? rawVal.split(/[,;]+(?![^(]*\))/).map((s) => s.trim()).filter(Boolean)
        : [rawVal];

    segments.forEach((seg, idx) => {
      // Check if segment has role in parentheses e.g. "יעל רז (מרפאה בעיסוק)"
      const parenMatch = seg.match(/^([^(]+)\(([^)]+)\)$/);
      const parsedName = parenMatch ? parenMatch[1].trim() : seg.trim();
      const parsedRole = parenMatch ? parenMatch[2].trim() : role;
      const dedupeKey = `${parsedRole}::${parsedName}`.toLowerCase();
      if (!parsedName || seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      candidates.push({
        id: `${key}_${idx}_${parsedName}`,
        role: parsedRole,
        name: parsedName,
        fieldKey: key,
        label: `${parsedRole}: ${parsedName}`
      });
    });
  }

  return candidates;
}

export function appendToFreeText(
  existingText?: string | null,
  block?: string | null
): string {
  return [String(existingText || '').trim(), String(block || '').trim()].filter(Boolean).join('\n\n');
}
