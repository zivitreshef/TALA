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
} from './stageEnvironments.js';
import { adaptTextToGender } from './goalSizingAndMerge.js';
import { isGoalRelevantForStage, hasSchool } from '../studentStage.js';

export {
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS,
  SCHOOL_EXTRA_DOMAINS,
  SCHOOL_ALLOWED_ENVIRONMENTS
};

const NOT_HEB = '[^\\u05D0-\\u05EA]';
// Hebrew one-letter prefixes that attach to a word (ו, ב, ל, ה, ש, כ, and "מה") – up to two, e.g. "ובמפגש".
// A lone "מ" is excluded on purpose: "מגננת" means "defensive", not "kindergarten teacher".
const HEB_PREFIX = '(?:[ובלהשכ]|מה){0,2}';

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Hebrew-aware whole-word / whole-phrase matcher (JS \b does not work with Hebrew letters).
// Capture groups: 1 = preceding non-Hebrew char (or start), 2 = attached prefix letters, 3 = phrase.
const wordRx = (phrase, { flags = '', allowPrefix = false, notFollowedBy = '' } = {}) =>
  new RegExp(
    `(^|${NOT_HEB})(${allowPrefix ? HEB_PREFIX : ''})(${escapeRx(phrase)})(?=${NOT_HEB}|$)${
      notFollowedBy ? `(?!${notFollowedBy})` : ''
    }`,
    flags
  );

export function normalizeStage(stage) {
  return stage === 'kindergarten' || stage === 'school' ? stage : null;
}

// ---------------------------------------------------------------------------
// 1. Kindergarten marker detection
// ---------------------------------------------------------------------------

// Explicit kindergarten phrases (may carry attached prefixes, e.g. "שהגננת", "במפגש בגן").
// Bare "גן" is intentionally excluded (e.g. "רמת גן", "גן חיות").
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
// Bare place words – matched exactly (no extra prefixes) so words like "בלגן" never match.
const KINDERGARTEN_BARE_MARKERS = ['בגן', 'ובגן', 'שבגן', 'לגן', 'מהגן'];
// Public gardens are not kindergartens: "בגן השעשועים", "לגן החיות", "הגן הלאומי"...
const NOT_PUBLIC_GARDEN = '\\s+ה?(?:שעשועים|חיות|לאומי|ציבורי|בוטני|העירוני|עירוני)';
// "הגן" as a noun, but not the verb "הגן על" ("defended") and not a public garden.
const NOT_VERB_OR_PUBLIC_GARDEN = `(?:\\s+על|${NOT_PUBLIC_GARDEN})`;

export function textHasKindergartenMarker(text) {
  const s = String(text || '');
  if (!s.trim()) return false;
  if (KINDERGARTEN_PREFIXABLE_MARKERS.some((m) => wordRx(m, { allowPrefix: true }).test(s))) return true;
  if (KINDERGARTEN_BARE_MARKERS.some((m) => wordRx(m, { notFollowedBy: NOT_PUBLIC_GARDEN }).test(s))) return true;
  return wordRx('הגן', { notFollowedBy: NOT_VERB_OR_PUBLIC_GARDEN }).test(s);
}

// ---------------------------------------------------------------------------
// 2. Kindergarten → school wording conversion (for free-text fields of a school student's goal)
// ---------------------------------------------------------------------------

// Unambiguous kindergarten staff / setting phrases (attached prefixes are kept, e.g. "שהגננת" → "שהמחנכת").
// Ordered: longer / more specific phrases first.
const KDG_TO_SCHOOL_PHRASES = [
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

// Bare place words (matched exactly). They may describe the child's past ("עבר מהגן"), so they are
// only converted when `includeBarePlaceWords` is true (the teacher's own text never mentions kindergarten).
const KDG_TO_SCHOOL_BARE_WORDS = [
  ['שבגן', 'שבבית הספר'],
  ['ובגן', 'ובבית הספר'],
  ['בגן', 'בבית הספר'],
  ['לגן', 'לבית הספר'],
  ['מהגן', 'מבית הספר']
];

export function adaptTextToSchoolStage(text, { includeBarePlaceWords = true } = {}) {
  if (typeof text !== 'string' || !text) return text;
  const swap = (to) => (_m, pre, prefix) => `${pre}${prefix}${to}`;
  let out = text;
  KDG_TO_SCHOOL_PHRASES.forEach(([from, to]) => {
    out = out.replace(wordRx(from, { flags: 'g', allowPrefix: true }), swap(to));
  });
  if (includeBarePlaceWords) {
    KDG_TO_SCHOOL_BARE_WORDS.forEach(([from, to]) => {
      out = out.replace(wordRx(from, { flags: 'g', notFollowedBy: NOT_PUBLIC_GARDEN }), swap(to));
    });
    // "הגן" (noun) → "בית הספר", but keep the verb "הגן על" and public gardens.
    out = out.replace(wordRx('הגן', { flags: 'g', notFollowedBy: NOT_VERB_OR_PUBLIC_GARDEN }), swap('בית הספר'));
  }
  return out;
}

// Unambiguous school staff / setting phrases mapped to kindergarten equivalents
const SCHOOL_TO_KDG_PHRASES = [
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

export function adaptTextToKindergartenStage(text) {
  if (typeof text !== 'string' || !text) return text;
  const swap = (to) => (_m, pre, prefix) => `${pre}${prefix}${to}`;
  let out = text;
  SCHOOL_TO_KDG_PHRASES.forEach(([from, to]) => {
    out = out.replace(wordRx(from, { flags: 'g', allowPrefix: true }), swap(to));
  });
  return out;
}

export function adaptPartnersToStage(partnersText, stage, isTalaMode = false) {
  const s = normalizeStage(stage);
  if (!s) return partnersText;
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

export function isEnvironmentAllowedForStage(environment, stage) {
  const env = String(environment || '').trim();
  const s = normalizeStage(stage);
  if (!s) return true;
  if (!env) return false;
  if (s === 'school') return SCHOOL_ALLOWED_ENVIRONMENTS.includes(env);
  // Kindergarten: tolerate custom environments, but never school-only ones.
  return !SCHOOL_ALLOWED_ENVIRONMENTS.includes(env) && !textHasSchoolOnlyEnvironmentHint(env);
}

function textHasSchoolOnlyEnvironmentHint(env) {
  return SCHOOL_ENVIRONMENTS.some((schoolEnv) => env.includes(schoolEnv));
}

// Ordered keyword rules. Sources are checked by priority: environment → title → remaining text.
const SCHOOL_ENV_RULES = [
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

const KINDERGARTEN_ENV_RULES = [
  ['סדנא / יצירה', /כתיב|כותב|העתק|ציור|גזיר|יצירה|מוטורי/],
  ['שירותים', /שירותים|היגיינה|לבוש|ניקיון|טיפול עצמי/],
  ['אוכל', /אוכל|ארוחה/],
  ['משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה', /מתמטיק|חשבון|כמויות|מספרים|משחקי שולחן|קופסא/],
  ['חצר', /חצר|הפסק|חברים|חברתי|בינאישי|ניידות/],
  ['פעילות שאינה בשגרה', /מעבר|שגרה|שינוי/],
  ['מפגש בגן', /האזנה|דיבור|שיח|סיפור|קריא|לשוני|אוצר מילים|הבעה|מילולי|קשב|ריכוז/]
];
const KINDERGARTEN_DEFAULT_ENV = 'משחק במרחב הגן';

function pickEnvByRules(rules, sources, fallback) {
  for (const src of sources) {
    const text = String(src || '');
    if (!text.trim()) continue;
    for (const [env, rx] of rules) {
      if (rx.test(text)) return env;
    }
  }
  return fallback;
}

export function getDefaultEnvironmentForStage(stage) {
  return normalizeStage(stage) === 'school' ? SCHOOL_DEFAULT_ENV : KINDERGARTEN_ENVIRONMENTS[0];
}

/**
 * Returns an environment that is valid for the given stage. Valid environments are kept as-is.
 */
export function remapEnvironmentForStage(environment, stage, goal = {}) {
  const s = normalizeStage(stage);
  const env = String(environment || '').trim();
  if (!s) return env;
  if (isEnvironmentAllowedForStage(env, s)) return env;

  const rest = [
    goal.activityParticipation,
    goal.objectives,
    goal.evaluationCriteria
  ]
    .filter(Boolean)
    .join(' ');
  const sources = [env, goal.title, rest];

  if (s === 'school') {
    return pickEnvByRules(SCHOOL_ENV_RULES, sources, SCHOOL_DEFAULT_ENV);
  }
  return pickEnvByRules(KINDERGARTEN_ENV_RULES, sources, KINDERGARTEN_DEFAULT_ENV);
}

// ---------------------------------------------------------------------------
// 4. Partners defaults
// ---------------------------------------------------------------------------

export function getDefaultPartnersForStage(stage, isTalaMode = false) {
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
];

const normalizeTitleKey = (title) =>
  adaptTextToGender(String(title || ''), 'boy')
    .replace(/[^\w\u05D0-\u05EA\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Titles of curated (built-in) bank goals that belong ONLY to the given stage.
 * Pass INITIAL_GOAL_BANK — custom bank items are excluded on purpose because their stage tags may be
 * unreliable (older versions defaulted every custom goal to kindergarten).
 */
export function getCuratedTitlesExclusiveToStage(curatedBank = [], stage) {
  const s = normalizeStage(stage);
  if (!s || !Array.isArray(curatedBank)) return [];
  return curatedBank
    .filter((item) => {
      const stages = Array.isArray(item?.stages) && item.stages.length > 0 ? item.stages : [];
      return stages.length > 0 && stages.every((st) => st === s);
    })
    .map((item) => item.title)
    .filter(Boolean);
}

/**
 * Enforces the student's stage on a single goal.
 * @returns {{ goal: object|null, dropped: boolean, corrected: boolean, reason: string }}
 */
export function enforceGoalStage(goal, stage, options = {}) {
  const s = normalizeStage(stage);
  if (!goal || !s) return { goal, dropped: false, corrected: false, reason: '' };

  const { curatedOtherStageTitles = [], isTalaMode = false, includeBarePlaceWords = true } = options;

  if (s === 'school') {
    const title = String(goal.title || '');
    const titleKey = normalizeTitleKey(title);
    const curatedKdgKeys = new Set(curatedOtherStageTitles.map(normalizeTitleKey).filter(Boolean));
    // A title that also names a school setting is a transition goal (e.g. "מעבר מהגן לכיתה א'") – keep it.
    const isTransitionTitle = hasSchool(title);
    if (textHasKindergartenMarker(title) && !isTransitionTitle) {
      return { goal: null, dropped: true, corrected: false, reason: 'kindergarten_title' };
    }
    if (titleKey && curatedKdgKeys.has(titleKey)) {
      return { goal: null, dropped: true, corrected: false, reason: 'kindergarten_bank_goal' };
    }

    const next = { ...goal };
    GOAL_TEXT_FIELDS.forEach((f) => {
      if (typeof next[f] !== 'string') return;
      const bare = includeBarePlaceWords && !(f === 'title' && isTransitionTitle);
      next[f] = adaptTextToSchoolStage(next[f], { includeBarePlaceWords: bare });
    });
    next.environment = remapEnvironmentForStage(goal.environment, 'school', next);
    if (!String(next.partners || '').trim()) {
      next.partners = getDefaultPartnersForStage('school', isTalaMode);
    }
    const corrected =
      next.environment !== goal.environment ||
      GOAL_TEXT_FIELDS.some((f) => (next[f] || '') !== (goal[f] || ''));
    return { goal: next, dropped: false, corrected, reason: corrected ? 'adapted_to_school' : '' };
  }

  // Kindergarten: adapt school staff/setting terminology in text fields and partners, and remap environment
  const next = { ...goal };
  let corrected = false;
  GOAL_TEXT_FIELDS.forEach((f) => {
    if (typeof next[f] !== 'string') return;
    const adapted = adaptTextToKindergartenStage(next[f]);
    if (adapted !== next[f]) {
      next[f] = adapted;
      corrected = true;
    }
  });
  const adaptedPartners = adaptPartnersToStage(next.partners, 'kindergarten', isTalaMode);
  if (adaptedPartners !== next.partners) {
    next.partners = adaptedPartners;
    corrected = true;
  }
  const nextEnv = remapEnvironmentForStage(next.environment, 'kindergarten', next);
  if (nextEnv !== next.environment) {
    next.environment = nextEnv;
    corrected = true;
  }
  return {
    goal: next,
    dropped: false,
    corrected,
    reason: corrected ? 'adapted_to_kindergarten' : ''
  };
}

/**
 * Stage to record in the shared goal bank for a goal used by a student of `studentStage`.
 * A goal that clearly belongs to the other stage (e.g. a legacy kindergarten goal on a school
 * student) keeps that other stage, so it never "leaks" into the wrong picker / AI prompt.
 */
export function resolveGoalStageForBank(goal, studentStage) {
  const s = normalizeStage(studentStage);
  const env = String(goal?.environment || '').trim();
  if (!s) return inferStagesFromEnvironment(env)[0];
  if (s === 'school') {
    const looksKindergarten =
      KINDERGARTEN_ENVIRONMENTS.includes(env) ||
      textHasKindergartenMarker(env) ||
      textHasKindergartenMarker(goal?.title);
    return looksKindergarten ? 'kindergarten' : 'school';
  }
  return SCHOOL_ALLOWED_ENVIRONMENTS.includes(env) ? 'school' : 'kindergarten';
}

/**
 * Default stage tags for a bank item that has none, inferred from its environment.
 * Unknown/custom environments keep the historical default (kindergarten).
 */
export function inferStagesFromEnvironment(environment) {
  const env = String(environment || '').trim();
  if (SCHOOL_ALLOWED_ENVIRONMENTS.includes(env)) return ['school'];
  return ['kindergarten'];
}

// ---------------------------------------------------------------------------
// 6. Prompt helpers
// ---------------------------------------------------------------------------

/**
 * Goal bank items that may be shown to the AI as examples for a student of the given stage.
 * Requires BOTH a matching stage tag and an environment that is valid for the stage.
 */
export function filterBankForStage(bank = [], stage) {
  const s = normalizeStage(stage);
  const list = Array.isArray(bank) ? bank : [];
  if (!s) return list;
  return list.filter((item) => {
    if (!item || !item.title) return false;
    if (!isGoalRelevantForStage(item, s)) return false;
    const env = String(item.environment || '').trim();
    if (s === 'school') {
      return SCHOOL_ALLOWED_ENVIRONMENTS.includes(env) && !textHasKindergartenMarker(item.title);
    }
    return !SCHOOL_ALLOWED_ENVIRONMENTS.includes(env);
  });
}

/**
 * Builds the goal-bank reference block for the AI prompt, filtered by stage and capped by length
 * so the full prompt never exceeds the AI proxy limit (a rejected prompt silently triggers the
 * local fallback engine).
 */
export function buildBankReferenceForPrompt(bank = [], stage, gender = 'boy', options = {}) {
  const { maxItems = 20, maxObjectivesPerItem = 3, maxChars = 4000 } = options;
  const items = filterBankForStage(bank, stage).slice(0, maxItems);
  const lines = [];
  let total = 0;
  for (const b of items) {
    const objectives = (b.suggestedObjectives || [])
      .slice(0, maxObjectivesPerItem)
      .map((o) => adaptTextToGender(o, gender))
      .join(' ; ');
    const line = `- סביבת השתתפות: "${b.environment}" | מטרה: "${adaptTextToGender(b.title, gender)}" | יעדים אפשריים: ${objectives}`;
    if (total + line.length + 1 > maxChars) break;
    lines.push(line);
    total += line.length + 1;
  }
  return lines.join('\n');
}

/**
 * Mandatory stage rules for goal-generating prompts.
 * Written in Hebrew AND English on purpose: privacy masking replaces the student's
 * educational-framework text everywhere in the prompt (e.g. a framework literally named "בית ספר"),
 * so the English lines guarantee the rule survives masking.
 */
export function buildStageRulesBlock(stage) {
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

export function getStageLabelHe(stage) {
  return normalizeStage(stage) === 'school' ? 'בית ספר' : normalizeStage(stage) === 'kindergarten' ? 'גן ילדים' : 'לא ידוע';
}
