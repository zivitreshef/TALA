// === עזר להתאמה סמנטית סובלנית לשגיאות כתיב והקלדה (Fuzzy & Contextual Normalization) ===
export function normalizeHebrewTextForContext(raw) {
  if (!raw) return '';
  let s = raw
    // תיקון אוטומטי של שגיאות כתיב והקלדה נפוצות בהקשר חינוכי-טיפולי
    .replace(/מתקשא|מתקשהה|מיתקשה/g, 'מתקשה')
    .replace(/קופסה|קופסאות|קופסא/g, 'קופסא')
    .replace(/סדנה|סידנא|סדנאות/g, 'סדנא')
    .replace(/מיפגש|מפגס|במיפגש/g, 'מפגש')
    .replace(/תיקשורת|תקשרת/g, 'תקשורת')
    .replace(/חבירם|חבריים|חברם/g, 'חברים')
    .replace(/משותפ|משותפת/g, 'משותף')
    .replace(/מוטורקה|מוטוריקה|מוטורי/g, 'מוטורי')
    .replace(/וויזו|ויזו|ויזומוטורי/g, 'וויזו מוטורי')
    .replace(/גזרה|לגזר/g, 'גזירה')
    .replace(/הדבקא|להדבק/g, 'הדבקה')
    .replace(/קובייה|קובيا/g, 'קוביה')
    .replace(/וויסות|ויסת/g, 'ויסות')
    .replace(/ריגשי|רגשית/g, 'רגשי')
    .replace(/שירותם|שרותים/g, 'שירותים')
    .replace(/עצמיות|עצמאית|עצמאי/g, 'עצמאי')
    .replace(/התארגנת|להתארגן/g, 'התארגנות')
    .replace(/תיכנון|לתכנן/g, 'תכנון')
    .replace(/הيتמדה|להתמיד/g, 'התמדה')
    .replace(/קשב וריכוז|רכוז/g, 'ריכוז');
  return s;
}

// === מנוע הטיה אוטומטית ללשון זכר (בן) / לשון נקבה (בת) בעברית למטרות וליעדים ===
const GENDER_PHRASE_PAIRS = [
  ['מצייר, גוזר, מדביק', 'מציירת, גוזרת, מדביקה'],
  ["'אני לא יודע'", "'אני לא יודעת'"],
  ['"אני לא יודע"', '"אני לא יודעת"'],
  ['כשאינו מכיר', 'כשאינה מכירה'],
  ['שאינו מכיר', 'שאינה מכירה'],
  ['שכבר מכיר', 'שכבר מכירה'],
  ['שנשאל במפגש', 'שנשאלה במפגש'],
  ['ויהיה שותף', 'ותהיה שותפה'],
  ['יהיה שותף', 'תהיה שותפה'],
  ['ויוצא לפועל', 'ותוציא לפועל'],
  ['ויוציא לפועל', 'ותוציא לפועל'],
  ['יוצא לפועל', 'תוציא לפועל'],
  ['יוציא לפועל', 'תוציא לפועל']
];

const GENDER_WORD_PAIRS = [
  // פעלים בזמן עתיד (גוף שלישי יחיד: הוא י... <-> היא ת...)
  ['ישחק', 'תשחק'],
  ['וישחק', 'ותשחק'],
  ['יתנסה', 'תתנסה'],
  ['ויתנסה', 'ותתנסה'],
  ['ימתין', 'תמתין'],
  ['וימתין', 'ותמתין'],
  ['יצליח', 'תצליח'],
  ['ויצליח', 'ותצליח'],
  ['ישמור', 'תשמור'],
  ['וישמור', 'ותשמור'],
  ['יצעד', 'תצעד'],
  ['ויצעד', 'ותצעד'],
  ['יבחר', 'תבחר'],
  ['ויבחר', 'ותבחר'],
  ['יארגן', 'תארגן'],
  ['ויארגן', 'ותארגן'],
  ['יזכור', 'תזכור'],
  ['ויזכור', 'ותזכור'],
  ['יפנה', 'תפנה'],
  ['ויפנה', 'ותפנה'],
  ['יזמין', 'תזמין'],
  ['ויזמין', 'ותזמין'],
  ['ישים', 'תשים'],
  ['וישים', 'ותשים'],
  ['יגיב', 'תגיב'],
  ['ויגיב', 'ותגיב'],
  ['יביע', 'תביע'],
  ['ויביע', 'ותביע'],
  ['יפתח', 'תפתח'],
  ['ויפתח', 'ותפתח'],
  ['יתאר', 'תתאר'],
  ['ויתאר', 'ותתאר'],
  ['יחשף', 'תחשף'],
  ['ייחשף', 'תיחשף'],
  ['ויחשף', 'ותחשף'],
  ['וייחשף', 'ותיחשף'],
  ['ישמע', 'תשמע'],
  ['וישמע', 'ותשמע'],
  ['יתייחס', 'תתייחס'],
  ['יתיחס', 'תתיחס'],
  ['ויתייחס', 'ותתייחס'],
  ['ויתיחס', 'ותתיחס'],
  ['יפיק', 'תפיק'],
  ['ויפיק', 'ותפיק'],
  ['יספר', 'תספר'],
  ['ויספר', 'ותספר'],
  ['ילמד', 'תלמד'],
  ['וילמד', 'ותלמד'],
  ['יעביר', 'תעביר'],
  ['ויעביר', 'ותעביר'],
  ['יחזק', 'תחזק'],
  ['ויחזק', 'ותחזק'],
  ['יענה', 'תענה'],
  ['ויענה', 'ותענה'],
  ['יחזור', 'תחזור'],
  ['ויחזור', 'ותחזור'],
  ['ישתתף', 'תשתתף'],
  ['וישתתף', 'ותשתתף'],
  ['ירכוש', 'תרכוש'],
  ['וירכוש', 'ותרכוש'],
  ['ישכלל', 'תשכלל'],
  ['וישכלל', 'ותשכלל'],
  ['יעבוד', 'תעבוד'],
  ['ויעבוד', 'ותעבוד'],
  ['יתארגן', 'תתארגן'],
  ['ויתארגן', 'ותתארגן'],
  ['יגזור', 'תגזור'],
  ['ויגזור', 'ותגזור'],
  ['ידביק', 'תדביק'],
  ['וידביק', 'ותדביק'],
  ['יצבע', 'תצבע'],
  ['ויצבע', 'ותצבע'],
  ['יוציא', 'תוציא'],
  ['ויוציא', 'ותוציא'],
  ['יזום', 'תזום'],
  ['ויזום', 'ותזום'],
  ['יוביל', 'תוביל'],
  ['ויוביל', 'ותוביל'],
  ['ישמיע', 'תשמיע'],
  ['וישמיע', 'ותשמיע'],
  ['ישיים', 'תשיים'],
  ['וישיים', 'ותשיים'],
  ['יחכה', 'תחכה'],
  ['ויחכה', 'ותחכה'],
  ['ירחיב', 'תרחיב'],
  ['וירחיב', 'ותרחיב'],
  ['יצטרף', 'תצטרף'],
  ['ויצטרף', 'ותצטרף'],
  ['יבחין', 'תבחין'],
  ['ויבחין', 'ותבחין'],
  ['ינקוב', 'תנקוב'],
  ['וינקוב', 'ותנקוב'],
  ['יזהה', 'תזהה'],
  ['ויזהה', 'ותזהה'],
  ['ימעיט', 'תמעיט'],
  ['וימעיט', 'ותמעיט'],
  ['ימעוט', 'תמעיט'],
  ['יאמר', 'תאמר'],
  ['ויאמר', 'ותאמר'],
  ['ייגש', 'תיגש'],
  ['וייגש', 'ותיגש'],
  ['יגש', 'תגש'],
  ['ויגש', 'ותגש'],
  ['יתנהל', 'תתנהל'],
  ['ויתנהל', 'ותתנהל'],
  ['ישב', 'תשב'],
  ['וישב', 'ותשב'],
  ['יאכל', 'תאכל'],
  ['ויאכל', 'ותאכל'],
  ['יקבל', 'תקבל'],
  ['ויקבל', 'ותקבל'],
  ['ייעזר', 'תיעזר'],
  ['וייעזר', 'ותיעזר'],
  ['יעזר', 'תעזר'],
  ['ויעזר', 'ותעזר'],
  ['יתקדם', 'תתקדם'],
  ['ויתקדם', 'ותתקדם'],
  ['יפעל', 'תפעל'],
  ['ויפעל', 'ותפעל'],
  ['יבקש', 'תבקש'],
  ['ויבקש', 'ותבקש'],
  ['ישתף', 'תשתף'],
  ['וישתף', 'ותשתף'],
  ['יתמיד', 'תתמיד'],
  ['ויתמיד', 'ותתמיד'],
  ['יישם', 'תיישם'],
  ['ויישם', 'ותיישם'],
  ['ישלים', 'תשלים'],
  ['וישלים', 'ותשלים'],
  ['יסיים', 'תסיים'],
  ['ויסיים', 'ותסיים'],
  ['יתמודד', 'תתמודד'],
  ['ויתמודד', 'ותתמודד'],
  ['יעצור', 'תעצור'],
  ['ויעצור', 'ותעצור'],
  ['יקשיב', 'תקשיב'],
  ['ויקשיב', 'ותקשיב'],
  ['ישאל', 'תשאל'],
  ['וישאל', 'ותשאל'],
  ['ישחזר', 'תשחזר'],
  ['וישחזר', 'ותשחזר'],
  ['ידגים', 'תדגים'],
  ['וידגים', 'ותדגים'],
  ['יחקה', 'תחקה'],
  ['ויחקה', 'ותחקה'],
  ['יצייר', 'תצייר'],
  ['ויצייר', 'ותצייר'],
  ['יעתיק', 'תעתיק'],
  ['ויעתיק', 'ותעתיק'],
  ['יכתוב', 'תכתוב'],
  ['ויכתוב', 'ותכתוב'],
  ['יקרא', 'תקרא'],
  ['ויקרא', 'ותקרא'],
  ['ימנה', 'תמנה'],
  ['וימנה', 'ותמנה'],
  ['יספור', 'תספור'],
  ['ויספור', 'ותספור'],
  ['ימיין', 'תמיין'],
  ['וימיין', 'ותמיין'],
  ['יתאים', 'תתאים'],
  ['ויתאים', 'ותתאים'],
  ['ירכיב', 'תרכיב'],
  ['וירכיב', 'ותרכיב'],
  ['יבנה', 'תבנה'],
  ['ויבנה', 'ותבנה'],
  // הווה, תארים וכינויי שייכות
  ['מצייר', 'מציירת'],
  ['גוזר', 'גוזרת'],
  ['מדביק', 'מדביקה'],
  ['מכיר', 'מכירה'],
  ['שנשאל', 'שנשאלה'],
  ['יודע', 'יודעת'],
  ['בעצמו', 'בעצמה'],
  ['לתורו', 'לתורה'],
  ['דבריו', 'דבריה'],
  ['מיוזמתו', 'מיוזמתה'],
  ['יכולותיו', 'יכולותיה'],
  ['מיומנויותיו', 'מיומנויותיה'],
  ['רגשותיו', 'רגשותיה'],
  ['צרכיו', 'צרכיה'],
  ['זקוק', 'זקוקה'],
  ['נזקק', 'נזקקת'],
  ['צריך', 'צריכה'],
  ['ניגש', 'ניגשת'],
  ['יושב', 'יושבת'],
  ['בוחר', 'בוחרת'],
  ['פועל', 'פועלת'],
  ['נמנע', 'נמנעת']
];

export function adaptTextToGender(text, gender = 'boy') {
  if (!text || typeof text !== 'string') return text || '';
  const targetIsGirl = gender === 'girl' || gender === 'בת' || gender === 'נקבה';
  let out = text;

  // 1. Phrase-level replacements
  GENDER_PHRASE_PAIRS.forEach(([malePhrase, femalePhrase]) => {
    const from = targetIsGirl ? malePhrase : femalePhrase;
    const to = targetIsGirl ? femalePhrase : malePhrase;
    if (out.includes(from)) {
      out = out.split(from).join(to);
    }
  });

  // 2. Hebrew whole-word replacements (using non-Hebrew boundary lookarounds)
  GENDER_WORD_PAIRS.forEach(([maleWord, femaleWord]) => {
    const from = targetIsGirl ? maleWord : femaleWord;
    const to = targetIsGirl ? femaleWord : maleWord;
    const rx = new RegExp(`(^|[^א-ת])(${from})(?=[^א-ת]|$)`, 'g');
    out = out.replace(rx, `$1${to}`);
  });

  // Normalize "יוצא לפועל" -> "יוציא לפועל" in masculine if needed
  if (!targetIsGirl) {
    out = out.replace(/(^|[^א-ת])ויוצא לפועל(?=[^א-ת]|$)/g, '$1ויוציא לפועל');
    out = out.replace(/(^|[^א-ת])יוצא לפועל(?=[^א-ת]|$)/g, '$1יוציא לפועל');
  }

  return out;
}

export function adaptGoalToGender(goalObj, gender = 'boy') {
  if (!goalObj) return goalObj;
  const adapted = {
    ...goalObj,
    title: adaptTextToGender(goalObj.title || '', gender),
    activityParticipation: adaptTextToGender(goalObj.activityParticipation || '', gender),
    objectives: adaptTextToGender(goalObj.objectives || '', gender),
    evaluationCriteria: adaptTextToGender(goalObj.evaluationCriteria || '', gender)
  };
  if (goalObj.aiSnapshot && typeof goalObj.aiSnapshot === 'object') {
    adapted.aiSnapshot = {
      ...goalObj.aiSnapshot,
      title: adaptTextToGender(goalObj.aiSnapshot.title || '', gender),
      activityParticipation: adaptTextToGender(goalObj.aiSnapshot.activityParticipation || '', gender),
      objectives: adaptTextToGender(goalObj.aiSnapshot.objectives || '', gender),
      evaluationCriteria: adaptTextToGender(goalObj.aiSnapshot.evaluationCriteria || '', gender)
    };
  }
  return adapted;
}

// === עזרים לחישוב גיל התלמיד/ה, תאריך הזנת המטרות ותיחום משך זמן יחסי לפי T-Shirt Size (S / M / L) ===

function parseFlexibleDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime()) && d.getMonth() === month - 1) return d;
  }
  const ymdMatch = trimmed.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime()) && d.getMonth() === month - 1) return d;
  }
  return null;
}

function formatDateHe(dateObj) {
  const d = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function addMonthsClamped(baseDate, monthsToAdd) {
  const d = new Date(baseDate.getTime());
  const origDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthsToAdd);
  const maxDayInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(origDay, maxDayInTargetMonth));
  return d;
}

export function resolveStudentAgeAndDateInfo(formData = {}, rawText = '') {
  const entryDateObj = parseFlexibleDate(formData?.date) || new Date();
  const entryDateFormatted = formatDateHe(entryDateObj);

  const plus1Month = formatDateHe(addMonthsClamped(entryDateObj, 1));
  const plus2Months = formatDateHe(addMonthsClamped(entryDateObj, 2));
  const plus3Months = formatDateHe(addMonthsClamped(entryDateObj, 3));
  const plus4Months = formatDateHe(addMonthsClamped(entryDateObj, 4));
  const plus6Months = formatDateHe(addMonthsClamped(entryDateObj, 6));

  const endYearNum =
    entryDateObj.getMonth() >= 6 ? entryDateObj.getFullYear() + 1 : entryDateObj.getFullYear();
  const endOfYear = `30/06/${endYearNum}`;

  // חילוץ גיל הילד/ה מתאריך לידה או מהטקסט החופשי
  let ageYears = null;
  let ageDescription = '';

  const birthDateObj = parseFlexibleDate(formData?.birthDate);
  if (birthDateObj && birthDateObj < entryDateObj) {
    const totalMonths =
      (entryDateObj.getFullYear() - birthDateObj.getFullYear()) * 12 +
      (entryDateObj.getMonth() - birthDateObj.getMonth());
    if (totalMonths > 0 && totalMonths < 260) {
      const yrs = Math.floor(totalMonths / 12);
      const remMos = totalMonths % 12;
      ageYears = +(totalMonths / 12).toFixed(1);
      ageDescription =
        remMos > 0
          ? `${yrs} שנים ו-${remMos} חודשים (ת.ל: ${formatDateHe(birthDateObj)})`
          : `${yrs} שנים (ת.ל: ${formatDateHe(birthDateObj)})`;
    }
  }

  if (ageYears === null && rawText) {
    const numAgeMatch = rawText.match(/(?:בן|בת|גיל)\s*(\d{1,2}(?:\.\d+)?)\s*(וחצי)?/);
    if (numAgeMatch) {
      let val = parseFloat(numAgeMatch[1]);
      if (numAgeMatch[2] && !String(numAgeMatch[1]).includes('.')) val += 0.5;
      if (val >= 1 && val <= 21) {
        ageYears = val;
        ageDescription = `${val} שנים (צוין בתיאור המורה)`;
      }
    } else {
      const hebWordAges = {
        שנתיים: 2,
        שלוש: 3,
        ארבע: 4,
        חמש: 5,
        שש: 6,
        שבע: 7,
        שמונה: 8,
        תשע: 9,
        עשר: 10
      };
      const wordMatch = rawText.match(
        /(?:בן|בת|גיל)\s*(שנתיים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)(?:\s+(וחצי))?/
      );
      if (wordMatch && hebWordAges[wordMatch[1]]) {
        let val = hebWordAges[wordMatch[1]];
        if (wordMatch[2]) val += 0.5;
        ageYears = val;
        ageDescription = `${val} שנים (צוין בתיאור המורה)`;
      }
    }
  }

  const fw = `${formData?.educationalFramework || ''} ${rawText || ''}`;
  if (!ageDescription) {
    if (/טרום\s*טרום|פעוטון|מעון/.test(fw)) {
      ageYears = 3;
      ageDescription = 'גילאי גן טרום-טרום חובה (כ-3 שנים)';
    } else if (/טרום\s*חובה/.test(fw)) {
      ageYears = 4;
      ageDescription = 'גילאי גן טרום-חובה (כ-4 שנים)';
    } else if (/גן\s*חובה/.test(fw)) {
      ageYears = 5.5;
      ageDescription = 'גילאי גן חובה (כ-5–6 שנים)';
    } else if (/כיתה|בית ספר|בי"ס/.test(fw)) {
      ageYears = 7;
      ageDescription = 'גילאי בית ספר יסודי';
    } else {
      ageYears = 4.5;
      ageDescription = 'גילאי הגן (כ-4–5 שנים)';
    }
  }

  return {
    entryDateObj,
    entryDateFormatted,
    plus1Month,
    plus2Months,
    plus3Months,
    plus4Months,
    plus6Months,
    endOfYear,
    ageYears,
    ageDescription
  };
}

export const DURATION_TSHIRT_OPTIONS = [
  { size: 'S', label: 'חודש (קצר/ממוקד)', value: 'חודש' },
  { size: 'S+', label: 'חודשיים', value: 'חודשיים' },
  { size: 'M', label: '3 חודשים', value: '3 חודשים' },
  { size: 'M+', label: '4 חודשים', value: '4 חודשים' },
  { size: 'L', label: 'חצי שנה (מחצית)', value: 'חצי שנה' },
  { size: 'XL', label: 'עד סוף השנה (שנתי)', value: 'עד סוף השנה' }
];

export function normalizeAndSizeGoalDuration(goalObj, rawText = '', formData = {}, dateInfo = null) {
  const info = dateInfo || resolveStudentAgeAndDateInfo(formData, rawText);
  const rawDur = String(goalObj?.duration || '').trim();
  const explicitSize = String(goalObj?.tShirtSize || '').trim().toUpperCase();

  // אם ה-AI כבר כלל תאריך יחסי מפורש (DD/MM/YYYY) בתוך המשך, נשמור אותו
  if (/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(rawDur)) {
    return rawDur;
  }

  // אם ה-AI החזיר משך זמן מילולי קצר/בינוני ללא תאריך – נוסיף תאריך יחסי מתאריך הזנת המטרות
  if (/שבועיים|שלושה שבועות|חודש אחד|^חודש$|^כחודש$|4 שבועות|1 month/i.test(rawDur)) {
    return `חודש (עד ${info.plus1Month})`;
  }
  if (/חודש\s*וחצי|6 שבועות|חודשיים|שני חודשים|2 חודשים|2 months/i.test(rawDur)) {
    return `חודשיים (עד ${info.plus2Months})`;
  }
  if (/שלושה חודשים|3 חודשים|רבעון|3 months/i.test(rawDur)) {
    return `3 חודשים (עד ${info.plus3Months})`;
  }
  if (/ארבעה חודשים|4 חודשים|4 months/i.test(rawDur)) {
    return `4 חודשים (עד ${info.plus4Months})`;
  }
  if (/חצי שנה|6 חודשים|שישה חודשים|מחצית/i.test(rawDur)) {
    return `חצי שנה (עד ${info.plus6Months})`;
  }

  // סיווג T-Shirt Size (SMALL / MEDIUM / LARGE) לפי גיל הילד/ה, רמתו/ה, הקושי והיקף המטרה
  const combinedGoalText = `${goalObj?.environment || ''} ${goalObj?.title || ''} ${goalObj?.objectives || ''} ${goalObj?.activityParticipation || ''}`;
  const normalizedRaw = normalizeHebrewTextForContext(rawText || '');

  // בדיקת רמת תפקוד וחוזקות לעומת חומרת הקושי בטקסט של המורה
  const hasHighBaseline =
    /ריכוז טובה|יכולת ריכוז|וורבלי|ורבלי|חכם|חכמה|נבון|נבונה|מפנים|מפנימה|קולט|קולטת|עצמאי|עצמאית/.test(
      normalizedRaw
    );
  const hasMildQualifier =
    /לעיתים|קצת|מעט|נקודתי|קל|קלה|תזכורת|הכוונה קלה|בתחילת/.test(normalizedRaw);
  const hasSevereChallenge =
    /מתקשה מאוד|קושי משמעותי|קושי רב|התפרצויות|תיווך רציף|תיווך צמוד|עזרה מלאה|אינו מדבר|אינה מדברת/.test(
      normalizedRaw
    );

  // זיהוי מטרות ממוקדות/קצרות טווח (SMALL: חודש עד חודשיים)
  const isSmallFocusedScope =
    /אוכל|ארוחה|שירותים|היגיינה|יתארגן עם ציוד|יבחר משחק בעצמו|יבחר סביבה|בצורה מתוכננת|פנייה מילולית/.test(
      combinedGoalText
    );
  const objectivesLinesCount = String(goalObj?.objectives || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length;

  if (explicitSize === 'S' || explicitSize === 'SMALL') {
    return hasHighBaseline || hasMildQualifier || objectivesLinesCount <= 2
      ? `חודש (עד ${info.plus1Month})`
      : `חודשיים (עד ${info.plus2Months})`;
  }

  if (explicitSize === 'M' || explicitSize === 'MEDIUM') {
    return hasHighBaseline
      ? `חודשיים (עד ${info.plus2Months})`
      : `3 חודשים (עד ${info.plus3Months})`;
  }

  if (explicitSize === 'L' || explicitSize === 'LARGE' || explicitSize === 'XL') {
    return hasSevereChallenge
      ? `עד סוף השנה (עד ${info.endOfYear})`
      : `חצי שנה (עד ${info.plus6Months})`;
  }

  // היוריסטיקה חכמה כאשר ה-AI החזיר "עד סוף השנה" גנרי או כאשר מופעל המנוע המקומי:
  if (isSmallFocusedScope && !hasSevereChallenge) {
    if (hasHighBaseline || hasMildQualifier || (info.ageYears && info.ageYears >= 5)) {
      return `חודש (עד ${info.plus1Month})`;
    }
    return `חודשיים (עד ${info.plus2Months})`;
  }

  if (/שאינה בשגרה|ויסות|מעברים|התפרצ|תסכול/.test(combinedGoalText)) {
    return hasSevereChallenge
      ? `עד סוף השנה (עד ${info.endOfYear})`
      : `חצי שנה (עד ${info.plus6Months})`;
  }

  if (/סדנא|יצירה|וויזו מוטורי|גזירה|ציור/.test(combinedGoalText)) {
    if (hasHighBaseline && /מתוכננת|ציוד|עצמאי/.test(goalObj?.title || '')) {
      return `חודש (עד ${info.plus1Month})`;
    }
    return hasHighBaseline
      ? `חודשיים (עד ${info.plus2Months})`
      : `3 חודשים (עד ${info.plus3Months})`;
  }

  if (/מפגש בגן|שיח|סיפור|שולחן|קופסא|בנייה/.test(combinedGoalText)) {
    if (hasHighBaseline && hasMildQualifier) {
      return `חודש (עד ${info.plus1Month})`;
    }
    if (hasHighBaseline || objectivesLinesCount <= 3) {
      return `חודשיים (עד ${info.plus2Months})`;
    }
    return `3 חודשים (עד ${info.plus3Months})`;
  }

  if (/חצר|מעגל חברתי|מרחב הגן/.test(combinedGoalText)) {
    if (hasHighBaseline && !hasSevereChallenge) {
      return `3 חודשים (עד ${info.plus3Months})`;
    }
    return `חצי שנה (עד ${info.plus6Months})`;
  }

  return hasHighBaseline
    ? `חודשיים (עד ${info.plus2Months})`
    : `3 חודשים (עד ${info.plus3Months})`;
}

// === עזרים לנעילת מטרות שנערכו / נוספו / הוסרו על ידי המורה בניתוח חוזר (Re-Analysis Protection) ===

export function isGoalEmpty(goalObj) {
  if (!goalObj) return true;
  return (
    !(goalObj.title || '').trim() &&
    !(goalObj.activityParticipation || '').trim() &&
    !(goalObj.objectives || '').trim() &&
    !(goalObj.opportunities || '').trim() &&
    !(goalObj.evaluationCriteria || '').trim()
  );
}

export function attachAiBaselineToGoal(goalObj) {
  if (!goalObj) return goalObj;
  return {
    ...goalObj,
    isAiGenerated: true,
    isTeacherModified: false,
    isTeacherAdded: false,
    aiSnapshot: {
      environment: (goalObj.environment || '').trim(),
      activityParticipation: (goalObj.activityParticipation || '').trim(),
      title: (goalObj.title || '').trim(),
      objectives: (goalObj.objectives || '').trim(),
      opportunities: (goalObj.opportunities || '').trim(),
      partners: (goalObj.partners || '').trim(),
      duration: (goalObj.duration || '').trim(),
      evaluationCriteria: (goalObj.evaluationCriteria || '').trim()
    }
  };
}

export function isGoalProtectedFromAiOverwrite(goalObj) {
  if (!goalObj || isGoalEmpty(goalObj)) return false;
  if (goalObj.isTeacherModified || goalObj.isTeacherAdded) return true;
  if (goalObj.aiSnapshot && typeof goalObj.aiSnapshot === 'object') {
    const compareFields = [
      'environment',
      'activityParticipation',
      'title',
      'objectives',
      'opportunities',
      'partners',
      'duration',
      'evaluationCriteria'
    ];
    return compareFields.some(
      (f) => (goalObj[f] || '').trim() !== (goalObj.aiSnapshot[f] || '').trim()
    );
  }
  return false;
}

function normalizeGoalKeyForMatch(str) {
  return adaptTextToGender(String(str || ''), 'boy')
    .replace(/[^\wא-ת\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function doSingleGoalPairMatch(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;

  const titleA = normalizeGoalKeyForMatch(a.title);
  const titleB = normalizeGoalKeyForMatch(b.title);
  if (titleA && titleB && (titleA === titleB || titleA.includes(titleB) || titleB.includes(titleA))) {
    return true;
  }

  const envA = (a.environment || '').trim();
  const envB = (b.environment || '').trim();
  if (envA && envB && envA === envB && titleA && titleB) {
    const wordsA = titleA.split(' ').filter((w) => w.length >= 3);
    const wordsB = new Set(titleB.split(' ').filter((w) => w.length >= 3));
    const shared = wordsA.filter((w) => wordsB.has(w));
    if (shared.length >= 2) return true;
  }
  return false;
}

export function doGoalsReferToSameTopic(goalA, goalB) {
  if (!goalA || !goalB) return false;
  if (doSingleGoalPairMatch(goalA, goalB)) return true;
  if (goalA.aiSnapshot && doSingleGoalPairMatch(goalA.aiSnapshot, goalB)) return true;
  if (goalB.aiSnapshot && doSingleGoalPairMatch(goalA, goalB.aiSnapshot)) return true;
  if (goalA.aiSnapshot && goalB.aiSnapshot && doSingleGoalPairMatch(goalA.aiSnapshot, goalB.aiSnapshot)) {
    return true;
  }
  return false;
}

export function mergeReanalyzedGoals({
  existingGoals = [],
  candidateNewGoals = [],
  removedGoals = [],
  gender = 'boy'
}) {
  const protectedGoals = (existingGoals || []).filter((g) => isGoalProtectedFromAiOverwrite(g));
  const removedList = Array.isArray(removedGoals) ? removedGoals : [];

  // 1. סנן מטרות שהמורה מחקה בעבר או שכבר קיימות ברשימת המטרות הנעולות של המורה
  const filteredCandidates = [];
  (candidateNewGoals || []).forEach((cand) => {
    if (!cand || isGoalEmpty(cand)) return;
    const adaptedCand = attachAiBaselineToGoal(adaptGoalToGender(cand, gender));

    const isRemoved = removedList.some((rem) => doGoalsReferToSameTopic(adaptedCand, rem));
    if (isRemoved) return;

    const isAlreadyProtected = protectedGoals.some((prot) =>
      doGoalsReferToSameTopic(adaptedCand, prot)
    );
    if (isAlreadyProtected) return;

    const isDuplicateInCandidates = filteredCandidates.some((prev) =>
      doGoalsReferToSameTopic(adaptedCand, prev)
    );
    if (isDuplicateInCandidates) return;

    filteredCandidates.push(adaptedCand);
  });

  // 2. אם אין מטרות נעולות כלל – החזר את המטרות החדשות (או השאר הקיימות אם כל המטרות הוסרו)
  if (protectedGoals.length === 0) {
    return filteredCandidates;
  }

  // 3. שמור על המטרות שהמורה ערכה/הוסיפה במקומן המדויק (ללא שום שינוי!), ושבץ את המטרות המנותחות החדשות בשאר המקומות
  const merged = [];
  let candidateCursor = 0;

  (existingGoals || []).forEach((existingGoal) => {
    if (isGoalProtectedFromAiOverwrite(existingGoal)) {
      // שמירה מוחלטת As-Is על המטרה שהמורה שינתה/הוסיפה
      merged.push(existingGoal);
    } else if (candidateCursor < filteredCandidates.length) {
      merged.push(filteredCandidates[candidateCursor]);
      candidateCursor += 1;
    }
  });

  while (candidateCursor < filteredCandidates.length) {
    merged.push(filteredCandidates[candidateCursor]);
    candidateCursor += 1;
  }

  return merged;
}
