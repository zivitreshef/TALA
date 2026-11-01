/**
 * Domain module for Parent Voice Capability Invitations (TALA Parent Voice).
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
  customQuestions?: string[];
  overrideDefaults?: boolean;
  now?: Date;
}

export interface InviteDoc {
  ownerEmail: string;
  studentId: string;
  childFirstName: string;
  gender: 'boy' | 'girl';
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
  { childFirstName = '' }: { childFirstName?: string } = {}
): string {
  const name = String(childFirstName || '').trim();
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

export function getInviteQuestions({
  childName = '',
  gender = 'boy',
  customQuestions = [],
  overrideDefaults = false
}: {
  childName?: string;
  gender?: 'boy' | 'girl' | string;
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
    // שם פרטי בלבד - מוצג להורה בדף הציבורי
    childFirstName: String(childFirstName || '').trim().split(/\s+/)[0] || '',
    gender: gender === 'girl' ? 'girl' : 'boy',
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  };

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
  now: number = Date.now()
): InvitesSummary {
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

export function buildVoiceMergeText(invite?: Partial<InviteDoc> | null): string {
  const responses = sanitizeResponses(invite?.responses, invite?.customQuestions);
  const lines: string[] = [];

  if (!invite?.overrideDefaults) {
    INVITE_ANSWER_KEYS.forEach((key) => {
      if (responses[key]) {
        lines.push(`• ${MERGE_LABELS[key]}: ${responses[key].replace(/\s*\n\s*/g, ' ')}`);
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
  return ['— קול ההורים (כפי שנמסר על ידי ההורים) —', ...lines].join('\n');
}

export function appendToFreeText(
  existingText?: string | null,
  block?: string | null
): string {
  return [String(existingText || '').trim(), String(block || '').trim()].filter(Boolean).join('\n\n');
}
