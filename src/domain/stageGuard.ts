// Stage Guard — the single source of truth that keeps AI / local goal generation aligned with the
// student's educational stage (kindergarten vs. school).
//
// Why this exists: the student's stage is chosen explicitly by the teacher. Before this guard the
// stage only filtered the manual goal picker; the AI analysis received kindergarten-heavy bank
// examples, fell back to kindergarten environments for missing values, and the local fallback
// engine was kindergarten-only. Every goal-producing path must now pass through this module.

import {
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS,
  SCHOOL_EXTRA_DOMAINS,
  SCHOOL_ALLOWED_ENVIRONMENTS
} from './stageEnvironments';
import { adaptTextToGender } from './goalSizingAndMerge';
import { isGoalRelevantForStage, hasSchool } from '../studentStage.js';

export {
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS,
  SCHOOL_EXTRA_DOMAINS,
  SCHOOL_ALLOWED_ENVIRONMENTS
};

export type EducationalStage = 'kindergarten' | 'school';

export interface StageEnforceGoalOptions {
  curatedOtherStageTitles?: string[];
  isTalaMode?: boolean;
  includeBarePlaceWords?: boolean;
}

export interface BankGoalItem {
  id?: string;
  title: string;
  environment?: string;
  stages?: string[];
  suggestedObjectives?: string[];
  [key: string]: unknown;
}

export interface BankPromptOptions {
  maxItems?: number;
  maxObjectivesPerItem?: number;
  maxChars?: number;
}

const NOT_HEB = '[^\\u05D0-\\u05EA]';
// Hebrew one-letter prefixes that attach to a word (ו, ב, ל, ה, ש, כ, and "מה") – up to two, e.g. "ובמפגש".
// A lone "מ" is excluded on purpose: "מגננת" means "defensive", not "kindergarten teacher".
const HEB_PREFIX = '(?:[ובלהשכ]|מה){0,2}';

const escapeRx = (s: string): string => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface WordRxOptions {
  flags?: string;
  allowPrefix?: boolean;
  notFollowedBy?: string;
}

// Hebrew-aware whole-word / whole-phrase matcher (JS \b does not work with Hebrew letters).
// Capture groups: 1 = preceding non-Hebrew char (or start), 2 = attached prefix letters, 3 = phrase.
const wordRx = (
  phrase: string,
  { flags = '', allowPrefix = false, notFollowedBy = '' }: WordRxOptions = {}
): RegExp =>
  new RegExp(
    `(^|${NOT_HEB})(${allowPrefix ? HEB_PREFIX : ''})(${escapeRx(phrase)})(?=${NOT_HEB}|$)${
      notFollowedBy ? `(?!${notFollowedBy})` : ''
    }`,
    flags
  );

export function normalizeStage(stage?: unknown): EducationalStage | null {
  return stage === 'kindergarten' || stage === 'school' ? stage : null;
}

// ---------------------------------------------------------------------------
// 1. Kindergarten marker detection
// ---------------------------------------------------------------------------

const KINDERGARTEN_PREFIXABLE_MARKERS = [
  'גן ילדים',
  'גני ילדים',
  'גן חובה',
  'טרום חובה',
  'טרום-חובה',
  'מפגש בגן',
  'מרחב הגן',
  'צוות הגן',
  'גננת'
];

const KINDERGARTEN_BARE_MARKERS = ['בגן', 'ובגן', 'שבגן', 'לגן', 'מהגן'];
const NOT_PUBLIC_GARDEN = '\\s+ה?(?:שעשועים|חיות|לאומי|ציבורי|בוטני|העירוני|עירוני)';
const NOT_VERB_OR_PUBLIC_GARDEN = `(?:\\s+(?:על|בפני|מפני|כנגד|מול|מיוזמתו|בעצמו)|${NOT_PUBLIC_GARDEN})`;

export function textHasKindergartenMarker(text?: string | null): boolean {
  const s = String(text || '');
  if (!s.trim()) return false;
  if (KINDERGARTEN_PREFIXABLE_MARKERS.some((m) => wordRx(m, { allowPrefix: true }).test(s))) return true;
  if (KINDERGARTEN_BARE_MARKERS.some((m) => wordRx(m, { notFollowedBy: NOT_PUBLIC_GARDEN }).test(s))) return true;
  return wordRx('הגן', { notFollowedBy: NOT_VERB_OR_PUBLIC_GARDEN }).test(s);
}

// ---------------------------------------------------------------------------
// 2. Kindergarten → school wording conversion
// ---------------------------------------------------------------------------

const KDG_TO_SCHOOL_PHRASES: [string, string][] = [
  ['בין הגן לבית', 'בין בית הספר לבית'],
  ['צוות הגן / הכיתה', 'צוות בית הספר'],
  ['מרחב הגן / הכיתה', 'מרחב הכיתה'],
  ['משחק במרחב הגן', 'פעילות במרחב הכיתה'],
  ['מפגש בגן', 'מפגש כיתתי'],
  ['מרחב הגן', 'מרחב הכיתה'],
  ['שגרת הגן', 'שגרת הכיתה'],
  ['צוות הגן', 'צוות בית הספר'],
  ['ילדי הגן', 'תלמידי הכיתה'],
  ['גננת השילוב', 'מורת השילוב'],
  ['גננת שילוב', 'מורת שילוב'],
  ['גננת', 'מחנכת']
];

const KDG_TO_SCHOOL_BARE_WORDS: [string, string][] = [
  ['שבגן', 'שבבית הספר'],
  ['ובגן', 'ובבית הספר'],
  ['בגן', 'בבית הספר'],
  ['לגן', 'לבית הספר'],
  ['מהגן', 'מבית הספר']
];

export function adaptTextToSchoolStage(
  text?: string | null,
  { includeBarePlaceWords = true }: { includeBarePlaceWords?: boolean } = {}
): string {
  if (typeof text !== 'string' || !text) return text || '';
  const swap = (to: string) => (_m: string, pre: string, prefix: string) => `${pre}${prefix}${to}`;
  let out = text;
  KDG_TO_SCHOOL_PHRASES.forEach(([from, to]) => {
    out = out.replace(wordRx(from, { flags: 'g', allowPrefix: true }), swap(to));
  });
  if (includeBarePlaceWords) {
    KDG_TO_SCHOOL_BARE_WORDS.forEach(([from, to]) => {
      out = out.replace(wordRx(from, { flags: 'g', notFollowedBy: NOT_PUBLIC_GARDEN }), swap(to));
    });
    out = out.replace(wordRx('הגן', { flags: 'g', notFollowedBy: NOT_VERB_OR_PUBLIC_GARDEN }), swap('בית הספר'));
  }
  return out;
}

const SCHOOL_TO_KDG_PHRASES: [string, string][] = [
  ['בין בית הספר לבית', 'בין הגן לבית'],
  ['צוות בית הספר', 'צוות הגן'],
  ['פעילות במרחב הכיתה', 'משחק במרחב הגן'],
  ['מרחב הכיתה', 'מרחב הגן'],
  ['מפגש כיתתי', 'מפגש בגן'],
  ['שגרת הכיתה', 'שגרת הגן'],
  ['תלמידי הכיתה', 'ילדי הגן'],
  ['ילדי הכיתה', 'ילדי הגן'],
  ['מורת השילוב', 'גננת השילוב'],
  ['מורת שילוב', 'גננת שילוב'],
  ['מורה לשילוב', 'גננת שילוב'],
  ['מחנכת הכיתה', 'הגננת'],
  ['מחנכת', 'גננת']
];

export function adaptTextToKindergartenStage(text?: string | null): string {
  if (typeof text !== 'string' || !text) return text || '';
  const swap = (to: string) => (_m: string, pre: string, prefix: string) => `${pre}${prefix}${to}`;
  let out = text;
  SCHOOL_TO_KDG_PHRASES.forEach(([from, to]) => {
    out = out.replace(wordRx(from, { flags: 'g', allowPrefix: true }), swap(to));
  });
  return out;
}

export function adaptPartnersToStage(
  partnersText?: string | null,
  stage?: string | null,
  isTalaMode: boolean = false
): string {
  const s = normalizeStage(stage);
  if (!s) return partnersText || '';
  const current = String(partnersText || '').trim();
  if (!current) {
    return getDefaultPartnersForStage(s, isTalaMode);
  }
  if (s === 'kindergarten') {
    let out = current;
    out = out.replace(/מורת\s+ה?שילוב/g, 'גננת שילוב');
    out = out.replace(/מורה\s+לשילוב/g, 'גננת שילוב');
    out = out.replace(/מחנכת(?:\s+הכיתה)?/g, 'גננת');
    return out;
  }
  if (s === 'school') {
    let out = current;
    out = out.replace(/גננת\s+ה?שילוב/g, 'מורת שילוב');
    out = out.replace(/גננת(?:\s+מובילה)?/g, 'מחנכת');
    out = out.replace(/צוות\s+הגן/g, 'צוות בית הספר');
    return out;
  }
  return current;
}

// ---------------------------------------------------------------------------
// 3. Environment validation & remapping
// ---------------------------------------------------------------------------

export function isEnvironmentAllowedForStage(
  environment?: string | null,
  stage?: string | null
): boolean {
  const env = String(environment || '').trim();
  const s = normalizeStage(stage);
  if (!s) return true;
  if (!env) return false;
  if (s === 'school') return (SCHOOL_ALLOWED_ENVIRONMENTS as readonly string[]).includes(env);
  return !(SCHOOL_ALLOWED_ENVIRONMENTS as readonly string[]).includes(env) && !textHasSchoolOnlyEnvironmentHint(env);
}

function textHasSchoolOnlyEnvironmentHint(env: string): boolean {
  return (SCHOOL_ENVIRONMENTS as readonly string[]).some((schoolEnv) => env.includes(schoolEnv));
}

const SCHOOL_ENV_RULES: [string, RegExp][] = [
  ['מתמטיקה', /מתמטיק|חשבון|כמויות|מספרים|כפל|חילוק|חיבור וחיסור|גאומטר|הנדס|שברים/],
  ['כתיבה', /כתיב|כותב|לכתוב|כתב יד|העתק|איות|מחברת|חיבור/],
  ['קריאה והפקת משמעות', /קריא|קורא|לקרוא|פענוח|שטף|הבנת הנקרא|טקסט|ניקוד/],
  ['כשירות לשונית – ידע לשוני', /ידע לשוני|לשוני|אוצר מילים|תחביר|מורפולוג|פונולוג|דקדוק|הברות|הברה|חריז/],
  ['האזנה ודיבור – כשירות תקשורתית', /האזנה|הקשב|דיבור|מדבר|שיח|הבעה|מילולי|תקשורתית|הוראות|סיפור|מפגש/],
  ['ניידות וטיפול עצמי', /ניידות|טיפול עצמי|שירותים|היגיינה|לבוש|אוכל|ארוחה|התמצאות/],
  ['תקשורת ויחסים בינאישיים', /חברים|חברתי|חברה|בינאישי|יחסים|הפסק|חצר|משחק משותף|קבוצ/],
  ['ניהול עצמי', /ניהול עצמי|ויסות|מווסת|התפרצ|כעס|תסכול|התנהגות|גבולות|התארגנות|ארגון|ציוד|קשב|ריכוז|מוסח|מעבר|שגרה|עצמאות|משחק/]
];
const SCHOOL_DEFAULT_ENV = 'האזנה ודיבור – כשירות תקשורתית';

const KINDERGARTEN_ENV_RULES: [string, RegExp][] = [
  ['סדנא / יצירה', /כתיב|כותב|העתק|ציור|גזיר|יצירה|מוטורי/],
  ['שירותים', /שירותים|היגיינה|לבוש|ניקיון|טיפול עצמי/],
  ['אוכל', /אוכל|ארוחה/],
  ['משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה', /מתמטיק|חשבון|כמויות|מספרים|משחקי שולחן|קופסא/],
  ['חצר', /חצר|הפסק|חברים|חברתי|בינאישי|ניידות/],
  ['פעילות שאינה בשגרה', /מעבר|שגרה|שינוי/],
  ['מפגש בגן', /האזנה|דיבור|שיח|סיפור|קריא|לשוני|אוצר מילים|הבעה|מילולי|קשב|ריכוז/]
];
const KINDERGARTEN_DEFAULT_ENV = 'משחק במרחב הגן';

function pickEnvByRules(rules: [string, RegExp][], sources: (string | undefined)[], fallback: string): string {
  for (const src of sources) {
    const text = String(src || '');
    if (!text.trim()) continue;
    for (const [env, rx] of rules) {
      if (rx.test(text)) return env;
    }
  }
  return fallback;
}

export function getDefaultEnvironmentForStage(stage?: string | null): string {
  return normalizeStage(stage) === 'school' ? SCHOOL_DEFAULT_ENV : KINDERGARTEN_ENVIRONMENTS[0];
}

export function remapEnvironmentForStage(
  environment?: string | null,
  stage?: string | null,
  goal: Record<string, unknown> = {}
): string {
  const s = normalizeStage(stage);
  const env = String(environment || '').trim();
  if (!s) return env;
  if (isEnvironmentAllowedForStage(env, s)) return env;

  const rest = [
    goal.activityParticipation as string | undefined,
    goal.objectives as string | undefined,
    goal.evaluationCriteria as string | undefined
  ]
    .filter(Boolean)
    .join(' ');
  const sources = [env, goal.title as string | undefined, rest];

  if (s === 'school') {
    return pickEnvByRules(SCHOOL_ENV_RULES, sources, SCHOOL_DEFAULT_ENV);
  }
  return pickEnvByRules(KINDERGARTEN_ENV_RULES, sources, KINDERGARTEN_DEFAULT_ENV);
}

// ---------------------------------------------------------------------------
// 4. Partners defaults
// ---------------------------------------------------------------------------

export function getDefaultPartnersForStage(stage?: string | null, isTalaMode: boolean = false): string {
  if (normalizeStage(stage) === 'kindergarten') {
    return isTalaMode ? 'גננת, גננת שילוב, מטפלת באומנויות' : 'גננת, גננת שילוב, הורים';
  }
  return isTalaMode ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'מחנכת, מורת שילוב, הורים';
}

// ---------------------------------------------------------------------------
// 5. Goal enforcement
// ---------------------------------------------------------------------------

const GOAL_TEXT_FIELDS = [
  'title',
  'activityParticipation',
  'objectives',
  'opportunities',
  'opportunitiesIntegration',
  'opportunitiesTherapist',
  'learningAccommodations',
  'partners',
  'evaluationCriteria'
] as const;

const normalizeTitleKey = (title?: string | null): string =>
  adaptTextToGender(String(title || ''), 'boy')
    .replace(/[^\w\u05D0-\u05EA\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function getCuratedTitlesExclusiveToStage(
  curatedBank: Array<{ title?: string; stages?: string[] }> = [],
  stage?: string | null
): string[] {
  const s = normalizeStage(stage);
  if (!s || !Array.isArray(curatedBank)) return [];
  return curatedBank
    .filter((item) => {
      const stages = Array.isArray(item?.stages) && item.stages.length > 0 ? item.stages : [];
      return stages.length > 0 && stages.every((st) => st === s);
    })
    .map((item) => item.title!)
    .filter(Boolean);
}

export interface EnforceGoalResult<T> {
  goal: T | null;
  dropped: boolean;
  corrected: boolean;
  reason: string;
}

export function enforceGoalStage<T extends Record<string, unknown>>(
  goal?: T | null,
  stage?: string | null,
  options: StageEnforceGoalOptions = {}
): EnforceGoalResult<T> {
  const s = normalizeStage(stage);
  if (!goal || !s) return { goal: goal || null, dropped: false, corrected: false, reason: '' };

  const { curatedOtherStageTitles = [], isTalaMode = false, includeBarePlaceWords = true } = options;

  if (s === 'school') {
    const title = String(goal.title || '');
    const titleKey = normalizeTitleKey(title);
    const curatedKdgKeys = new Set(curatedOtherStageTitles.map(normalizeTitleKey).filter(Boolean));
    const isTransitionTitle = hasSchool(title);
    if (textHasKindergartenMarker(title) && !isTransitionTitle) {
      return { goal: null, dropped: true, corrected: false, reason: 'kindergarten_title' };
    }
    if (titleKey && curatedKdgKeys.has(titleKey)) {
      return { goal: null, dropped: true, corrected: false, reason: 'kindergarten_bank_goal' };
    }

    const next: Record<string, unknown> = { ...goal };
    GOAL_TEXT_FIELDS.forEach((f) => {
      if (typeof next[f] !== 'string') return;
      const bare = includeBarePlaceWords && !(f === 'title' && isTransitionTitle);
      next[f] = adaptTextToSchoolStage(next[f] as string, { includeBarePlaceWords: bare });
    });
    next.environment = remapEnvironmentForStage(goal.environment as string, 'school', next);
    if (!String(next.partners || '').trim()) {
      next.partners = getDefaultPartnersForStage('school', isTalaMode);
    }
    const corrected =
      next.environment !== goal.environment ||
      GOAL_TEXT_FIELDS.some((f) => (next[f] || '') !== (goal[f] || ''));
    return { goal: next as T, dropped: false, corrected, reason: corrected ? 'adapted_to_school' : '' };
  }

  // Kindergarten
  const next: Record<string, unknown> = { ...goal };
  let corrected = false;
  GOAL_TEXT_FIELDS.forEach((f) => {
    if (typeof next[f] !== 'string') return;
    const adapted = adaptTextToKindergartenStage(next[f] as string);
    if (adapted !== next[f]) {
      next[f] = adapted;
      corrected = true;
    }
  });
  const adaptedPartners = adaptPartnersToStage(next.partners as string, 'kindergarten', isTalaMode);
  if (adaptedPartners !== next.partners) {
    next.partners = adaptedPartners;
    corrected = true;
  }
  const nextEnv = remapEnvironmentForStage(next.environment as string, 'kindergarten', next);
  if (nextEnv !== next.environment) {
    next.environment = nextEnv;
    corrected = true;
  }
  return {
    goal: next as T,
    dropped: false,
    corrected,
    reason: corrected ? 'adapted_to_kindergarten' : ''
  };
}

export function resolveGoalStageForBank(
  goal?: Record<string, unknown> | null,
  studentStage?: string | null
): EducationalStage {
  const s = normalizeStage(studentStage);
  const env = String(goal?.environment || '').trim();
  if (!s) return inferStagesFromEnvironment(env)[0];
  if (s === 'school') {
    const looksKindergarten =
      (KINDERGARTEN_ENVIRONMENTS as readonly string[]).includes(env) ||
      textHasKindergartenMarker(env) ||
      textHasKindergartenMarker(goal?.title as string);
    return looksKindergarten ? 'kindergarten' : 'school';
  }
  return (SCHOOL_ALLOWED_ENVIRONMENTS as readonly string[]).includes(env) ? 'school' : 'kindergarten';
}

export function inferStagesFromEnvironment(environment?: string | null): EducationalStage[] {
  const env = String(environment || '').trim();
  if ((SCHOOL_ALLOWED_ENVIRONMENTS as readonly string[]).includes(env)) return ['school'];
  return ['kindergarten'];
}

// ---------------------------------------------------------------------------
// 6. Prompt helpers
// ---------------------------------------------------------------------------

export function filterBankForStage<T extends BankGoalItem>(
  bank: T[] = [],
  stage?: string | null
): T[] {
  const s = normalizeStage(stage);
  const list = Array.isArray(bank) ? bank : [];
  if (!s) return list;
  return list.filter((item) => {
    if (!item || !item.title) return false;
    if (!isGoalRelevantForStage(item, s)) return false;
    const env = String(item.environment || '').trim();
    if (s === 'school') {
      return (SCHOOL_ALLOWED_ENVIRONMENTS as readonly string[]).includes(env) && !textHasKindergartenMarker(item.title);
    }
    return !(SCHOOL_ALLOWED_ENVIRONMENTS as readonly string[]).includes(env);
  });
}

export function buildBankReferenceForPrompt(
  bank: BankGoalItem[] = [],
  stage?: string | null,
  gender: string = 'boy',
  options: BankPromptOptions = {}
): string {
  const { maxItems = 20, maxObjectivesPerItem = 3, maxChars = 4000 } = options;
  const items = filterBankForStage(bank, stage).slice(0, maxItems);
  const lines: string[] = [];
  let total = 0;
  for (const b of items) {
    const objectives = (b.suggestedObjectives || [])
      .slice(0, maxObjectivesPerItem)
      .map((o) => adaptTextToGender(o, gender))
      .join(' ; ');
    const line = `- סביבת השתתפות: "${b.environment || ''}" | מטרה: "${adaptTextToGender(b.title, gender)}" | יעדים אפשריים: ${objectives}`;
    if (total + line.length + 1 > maxChars) break;
    lines.push(line);
    total += line.length + 1;
  }
  return lines.join('\n');
}

export function buildStageRulesBlock(stage?: string | null): string {
  const s = normalizeStage(stage);
  if (s === 'school') {
    const allowed = SCHOOL_ALLOWED_ENVIRONMENTS.map((e) => `"${e}"`).join(' | ');
    return `הנחיה מחייבת – שלב חינוכי (נבחר במפורש על ידי המורה): תלמיד/ה בביה"ס (בית-ספר יסודי / על-יסודי) – לא גן ילדים!
- אסור בהחלט להציע מטרות, יעדים, סביבות, שותפים או ניסוחים של גן ילדים (למשל: מפגש בגן, משחק במרחב הגן, פינות הגן, סדנא, חצר הגן, גננת, צוות הגן).
- שדה "environment" בכל מטרה חייב להיות בדיוק אחד מהערכים הבאים: ${allowed}.
- השותפים הם צוות ביה"ס (מחנכת, מורת שילוב, יועצת, מטפלים, הורים) – לא צוות גן.
MANDATORY EDUCATIONAL STAGE: SCHOOL student (teacher-selected). Never output kindergarten goals, kindergarten environments or kindergarten staff. Every goal "environment" MUST be exactly one of the allowed values listed above.`;
  }
  if (s === 'kindergarten') {
    const allowed = KINDERGARTEN_ENVIRONMENTS.map((e) => `"${e}"`).join(' | ');
    return `הנחיה מחייבת – שלב חינוכי (נבחר במפורש על ידי המורה): ילד/ה בגן ילדים.
- שדה "environment" בכל מטרה חייב להיות אחד מסביבות הגן הבאות: ${allowed}.
- אין להשתמש בתחומי בית-ספר (כתיבה, קריאה והפקת משמעות, כשירות לשונית, האזנה ודיבור – כשירות תקשורתית, מתמטיקה) כסביבה.
- השותפים בכל יעד/מטרה ("partners") הם אך ורק צוות הגן: גננת (או גננת מובילה), גננת שילוב, הורים / מטפלת באומנויות / סייעת.
- אסור בהחלט לכלול מונחים של בית ספר כגון "מחנכת", "מורת שילוב", "שיעור", "צלצול", "כיתה"! בגן אין מחנכת ואין מורת שילוב – יש אך ורק גננת וגננת שילוב.
MANDATORY EDUCATIONAL STAGE: KINDERGARTEN child (teacher-selected). Every goal "environment" MUST be one of the kindergarten environments listed above; never use school subject areas as the environment. Never output school staff like "מחנכת" or "מורת שילוב" — kindergarten staff is "גננת", "גננת שילוב", "הורים".`;
  }
  return '';
}

export function getStageLabelHe(stage?: string | null): string {
  return normalizeStage(stage) === 'school' ? 'בית ספר' : normalizeStage(stage) === 'kindergarten' ? 'גן ילדים' : 'לא ידוע';
}


/**
 * Builds pedagogical prompt guidance for generating concrete, actionable, role-specific
 * interventions and accommodations (אמצעי ביצוע ויעדים) in student work plans.
 * Enforces field-tested Special Education principles, avoids generic slogans,
 * and tailors strategies to the specific role (educator, integration, therapist).
 */
export function buildPedagogicalOpportunitiesGuidance(stage?: string | null): string {
  const isKindergarten = normalizeStage(stage) === 'kindergarten';
  const roleEducator = isKindergarten ? 'הגננת' : 'המורה / המחנכת';
  const roleIntegration = isKindergarten ? 'גננת השילוב' : 'מורת השילוב';
  const settingName = isKindergarten ? 'הגן' : 'הכיתה';

  return `הנחיה פדגוגית מחייבת לכתיבת אמצעי ביצוע ("opportunities", "opportunitiesIntegration", "opportunitiesTherapist"):
- פירוט יישומי, מקצועי ויצירתי ממוקד שטח: כל אמצעי חייב לענות על השאלה "מה איש החינוך עושה בפועל?". היעד מתאר את ביצוע התלמיד/ה, והאמצעי מתאר את הפעולה, הטכניקה, האביזר או שגרת העבודה של איש החינוך.
- איסור מוחלט על ניסוחים כלליים וסיסמאות:
  * אין להסתפק ב: "המורה תציב גבולות", "המורה תתווך", "המורה תחזק התנהגות חיובית", "יינתן מענה רגשי" או "יתקיים תרגול".
  * דוגמה ליישום גבולות: במקום "המורה תציב גבולות לילד", יש לנסח: "${roleEducator} תגדיר מראש שניים-שלושה כללים ברורים וקצרים, תציג אותם באמצעות תמונות או סמלים, תזכיר לילד את הכלל לפני מצבים מועדים לקושי ותשתמש במסר מילולי קצר ועקבי בעת חריגה ממנו, תוך מתן בחירה בין שתי חלופות מקובלות".
  * דוגמה ליישום חיזוק: במקום "המורה תחזק התנהגות חיובית", יש לנסח: "${roleEducator} תזהה ותשקף באופן מיידי התנהגות רצויה, תוך ציון מדויק של הפעולה שביצע הילד (למשל: 'ראיתי שחיכית לתורך בזמן המשחק'), בשילוב לוח הצלחות חזותי עם חיזוק מצטבר בהתאם ליכולת הילד".
- חלוקה מותאמת לפי תפקידים:
  * "opportunities" (${roleEducator}): שגרות ${settingName}, ארגון הסביבה, כללים מוקדמים ותיווך מניעתי.
  * "opportunitiesIntegration" (${roleIntegration}): הוראה מותאמת, פירוק משימות, תיווך חזותי והוראה רב-חושית.
  * "opportunitiesTherapist" (מטפלת באומנויות / פרא-רפואית): כלים השלכתיים, ויסות חושי-רגשי, משחק ועיבוד חוויות.
- העדפת כלים מעשיים מעולמות החינוך המיוחד, ניתוח התנהגות, למידה חווייתית ותיווך חזותי. יש לפרט את דרך הביצוע ולא רק את שם האסטרטגיה.
- הימנעות מהמצאת פרטים: יש להישען אך ורק על המידע שנמסר על הילד/ה, ללא המצאת אבחנות, אביזרים או קשיים שלא צוינו.
- רמת פירוט נדרשת: כל אמצעי צריך להיות ברור ומעשי כך שאיש חינוך מחליף יוכל ליישם אותו בפועל ללא צורך בהסבר נוסף.`;
}
