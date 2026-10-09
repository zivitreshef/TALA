// Student stage detection (kindergarten vs school)
// Determines if student is in kindergarten or school based on:
// 1. educationalFramework / "מסגרת חינוכית" (highest priority)
// 2. teacherFreeText (raw teacher text)
// 3. birthDate (fallback only if 1-2 give no unambiguous signal)

const KDG_KEYWORDS = [
  'גן',
  'גני',
  'בגן',
  'מהגן',
  'לגן',
  'הגן',
  'גננת',
  'לגננת',
  'מהגננת',
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
  s = s.replace(/גני-/g, 'גני ');
  // Strip surrounding punctuation except double quotes in abbreviations and single quotes in class names (e.g. כיתה א')
  s = s.replace(/[.,:;()[\]{}]/g, ' ');
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function tokenize(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(/\s+/).filter(Boolean);
}

export function hasKindergarten(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return false;

  return tokens.some((token) => {
    const cleanToken = token.replace(/['׳]$/, '');
    if (KDG_KEYWORDS.includes(token) || KDG_KEYWORDS.includes(cleanToken)) return true;
    if (token === 'בגן' || token === 'לגן' || token === 'מהגן' || token === 'הגן' || token === 'גן' || token === 'גני' || token.startsWith('גן-')) return true;
    return false;
  });
}

export function hasSchool(text) {
  const norm = normalizeText(text);
  const tokens = tokenize(text);
  if (tokens.length === 0) return false;

  // Check multi-word phrase keywords first
  if (
    norm.includes('בית-הספר') ||
    norm.includes('בית ספר') ||
    norm.includes('בית הספר') ||
    norm.includes('בית ספרי') ||
    norm.includes('בית-ספר') ||
    norm.includes('ביה"ס') ||
    norm.includes('בי"ס')
  ) {
    return true;
  }

  // Check single token keywords against non-ambiguous tokens
  const nonAmbiguousTokens = tokens.filter((t) => !BARE_AMBIGUOUS.includes(t));
  if (nonAmbiguousTokens.length === 0) return false;

  return nonAmbiguousTokens.some((rawToken) => {
    // Strip Hebrew conjunction/preposition prefixes like ובכיתה -> בכיתה / כיתה
    const token = rawToken.replace(/^[ובלמה]+(?=כיתה|כתה)/, '');
    const cleanToken = token.replace(/['׳]$/, '');
    if (SCHOOL_KEYWORDS.includes(rawToken) || SCHOOL_KEYWORDS.includes(token) || SCHOOL_KEYWORDS.includes(cleanToken)) return true;
    if (cleanToken.startsWith('כיתה') || cleanToken.startsWith('כתה')) return true;
    return false;
  });
}

function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d)) return d;
  const s = String(d).trim();
  if (!s) return null;

  // Try Israeli DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY first
  const m = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    if (year < 100) year += year >= 30 ? 1900 : 2000;
    const dt2 = new Date(year, month, day);
    if (!isNaN(dt2)) return dt2;
  }

  // Fallback to ISO / Standard Date parse
  const dt = new Date(s);
  if (!isNaN(dt)) return dt;

  return null;
}

function calcAgeYears(birthDate, referenceDate) {
  const b = parseDate(birthDate);
  if (!b) return null;
  const ref = referenceDate ? parseDate(referenceDate) : new Date();
  if (!ref || isNaN(ref)) return null;

  let ageYears = ref.getFullYear() - b.getFullYear();
  let monthDiff = ref.getMonth() - b.getMonth();
  let dayDiff = ref.getDate() - b.getDate();

  if (dayDiff < 0) {
    monthDiff -= 1;
  }
  if (monthDiff < 0) {
    ageYears -= 1;
    monthDiff += 12;
  }

  let age = ageYears + monthDiff / 12;
  if (age < 0) age = 0;
  return age;
}

export function formatPromptWithStudentContext(prompt, formData = {}) {
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
