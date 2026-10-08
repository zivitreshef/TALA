// Student stage detection (kindergarten vs school)
// Determines if student is in kindergarten or school based on:
// 1. educationalFramework / "מסגרת חינוכית" (highest priority)
// 2. teacherFreeText (raw teacher text)
// 3. birthDate (fallback only if 1-2 give no unambiguous signal)

export const __STUDENT_STAGE_MODULE_LOADED__ = true;

// Force module inclusion - side effect on window with all exports
if (typeof window !== 'undefined') {
  window.__STUDENT_STAGE_EXPORTS__ = {
    detectStudentStage,
    formatPromptWithStudentContext,
    hasKindergarten,
    hasSchool,
    normalizeText,
    KDG_KEYWORDS,
    SCHOOL_KEYWORDS,
    BARE_AMBIGUOUS,
  };
}

const KDG_KEYWORDS = [
  'גן',
  'גני',
  'גני-',
  'בגן',
  'גננת',
  'לגן',
  'מהגן',
  'הגן',
  'הגננות'
];

const SCHOOL_KEYWORDS = [
  'בית-הספר',
  'בית־הספר',
  'בית ספר',
  'בית-הספר',
  'כתה',
  'כיתה',
  'כיתת',
  'בכיתה',
  'לכיתה',
  'מהכיתה',
  'בית הספר',
  'ביה"ס',
  "ביה'ס",
  'בי"ס',
  'בית ספרי',
  'בית-ספר',
  'למורה',
  'המורות',
  'מורי'
];

const BARE_AMBIGUOUS = ['מורה', 'המורה'];

export function normalizeText(text) {
  if (text == null) return '';
  let s = String(text);
  // NBSP and whitespace
  s = s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ');
  // Normalize dashes/maqaf
  s = s.replace(/[\u05BE\u2013\u2014]/g, '-'); // maqaf, en/em dash -> hyphen
  // Normalize quotes for abbreviations
  s = s.replace(/ביה['׳"]ס/g, 'ביה"ס');
  s = s.replace(/בי['׳"]ס/g, 'בי"ס');
  // Strip trailing dash on גני-
  s = s.replace(/גני-/g, 'גני');
  // Strip surrounding punctuation
  s = s.replace(/[.,:;()[\]{}]/g, ' ');
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function hasKindergarten(text) {
  const n = normalizeText(text);
  if (!n) return false;
  return KDG_KEYWORDS.some((k) => n.includes(k));
}

export function hasSchool(text) {
  const n = normalizeText(text);
  if (!n) return false;
  // Check bare ambiguous alone - if text is exactly ambiguous or only ambiguous tokens, don't count as school
  const tokens = n.split(/\s+/).filter(Boolean);
  const onlyAmbiguous = tokens.length > 0 && tokens.every((t) => BARE_AMBIGUOUS.includes(t));
  if (onlyAmbiguous) return false;
  return SCHOOL_KEYWORDS.some((k) => n.includes(k));
}

function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d)) return d;
  const s = String(d).trim();
  if (!s) return null;
  // Try common formats; if fails, return null
  const dt = new Date(s);
  if (!isNaN(dt)) return dt;
  // Try Israeli DD/MM/YYYY
  const m = s.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (m) {
    const day = parseInt(m[1]);
    const month = parseInt(m[2]) - 1;
    let year = parseInt(m[3]);
    if (year < 100) year += year >= 30 ? 1900 : 2000;
    const dt2 = new Date(year, month, day);
    if (!isNaN(dt2)) return dt2;
  }
  return null;
}

function calcAgeYears(birthDate, referenceDate) {
  const b = parseDate(birthDate);
  if (!b) return null;
  const ref = referenceDate ? parseDate(referenceDate) : new Date();
  if (!ref || isNaN(ref)) return null;
  let age = (ref.getTime() - b.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 0) age = 0;
  return age;
}

export function formatPromptWithStudentContext(prompt, formData) {
  const stageContext = `
[STUDENT_CONTEXT]
stage: ${formData.stage || 'unknown'}
stage_source: ${formData.stageSource || 'no_data'}
stage_reason: ${formData.stageReason || 'no unambiguous signal'}
stage_updated_at: ${formData.stageUpdatedAt || new Date().toISOString()}
[/STUDENT_CONTEXT]
`.trim();

  return `${stageContext}

${prompt}`;
}

export function detectStudentStage(fields = {}, referenceDate) {
  const {
    educationalFramework,
    מסגרת_חינוכית,
    teacherFreeText,
    birthDate
  } = fields;

  const fw = educationalFramework || מסגרת_חינוכית || '';

  // 1. Educational framework (highest priority)
  if (fw) {
    const k = hasKindergarten(fw);
    const s = hasSchool(fw);
    if (k && !s) {
      return {
        stage: 'kindergarten',
        stageSource: 'educational_framework',
        stageReason: `matched kindergarten keywords in educationalFramework: "${normalizeText(fw)}"`,
        stageUpdatedAt: new Date().toISOString()
      };
    }
    if (s && !k) {
      return {
        stage: 'school',
        stageSource: 'educational_framework',
        stageReason: `matched school keywords in educationalFramework: "${normalizeText(fw)}"`,
        stageUpdatedAt: new Date().toISOString()
      };
    }
    if (k && s) {
      return {
        stage: 'unknown',
        stageSource: 'conflict',
        stageReason: `both kindergarten and school keywords in educationalFramework: "${normalizeText(fw)}"`,
        stageUpdatedAt: new Date().toISOString()
      };
    }
    // no match in fw, continue to teacher text
  }

  // 2. Teacher free text
  if (teacherFreeText) {
    const k = hasKindergarten(teacherFreeText);
    const s = hasSchool(teacherFreeText);
    if (k && !s) {
      return {
        stage: 'kindergarten',
        stageSource: 'teacher_text',
        stageReason: `matched kindergarten keywords in teacherFreeText: "${normalizeText(teacherFreeText)}"`,
        stageUpdatedAt: new Date().toISOString()
      };
    }
    if (s && !k) {
      return {
        stage: 'school',
        stageSource: 'teacher_text',
        stageReason: `matched school keywords in teacherFreeText: "${normalizeText(teacherFreeText)}"`,
        stageUpdatedAt: new Date().toISOString()
      };
    }
    if (k && s) {
      return {
        stage: 'unknown',
        stageSource: 'conflict',
        stageReason: `both kindergarten and school keywords in teacherFreeText: "${normalizeText(teacherFreeText)}"`,
        stageUpdatedAt: new Date().toISOString()
      };
    }
    // no match
  }

  // 3. Birth date fallback
  if (birthDate) {
    const age = calcAgeYears(birthDate, referenceDate);
    if (age != null) {
      if (age < 6.0) {
        return {
          stage: 'kindergarten',
          stageSource: 'birth_date',
          stageReason: `age ${age.toFixed(2)} < 6.0 -> kindergarten`,
          stageUpdatedAt: new Date().toISOString()
        };
      }
      if (age >= 6.0) {
        return {
          stage: 'school',
          stageSource: 'birth_date',
          stageReason: `age ${age.toFixed(2)} >= 6.0 -> school`,
          stageUpdatedAt: new Date().toISOString()
        };
      }
    }
  }

  // 4. No data
  return {
    stage: 'unknown',
    stageSource: 'no_data',
    stageReason: 'no unambiguous signal from educationalFramework/teacherFreeText/birthDate',
    stageUpdatedAt: new Date().toISOString()
  };
}
