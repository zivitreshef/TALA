/**
 * Seed Script: Populate 3 rich, realistic ABA special-education students
 * with observations, baseline points, behavior intervention plans and tracking
 * for behavior analyst Michal Dalyot (mreshef@bmc.com).
 *
 * Usage:
 *   node scripts/seedBehaviorAnalystData.js
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'tala-d9aaa';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const STUDENTS_COLLECTION_URL = `${BASE_FIRESTORE_URL}/tala_students`;

function getAccessToken() {
  const p = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return data.tokens?.access_token;
    } catch (_) {}
  }
  return null;
}

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

const STUDENTS = [
  // =========================================================================
  // תלמיד 1: איתי לוי (כיתה ג', בי"ס יסודי "אלונים") - הימנעות ממטלת כתיבה
  // =========================================================================
  {
    id: 'st_itai_levi_aba',
    name: 'איתי לוי',
    gender: 'boy',
    idNumber: '329845120',
    birthDate: '2018-03-14',
    schoolYear: 'תשפ"ז (2026-2027)',
    reportDate: '2026-11-15',
    educationalFramework: 'בית ספר יסודי אלונים',
    schoolName: 'אלונים',
    gradeClass: "כיתה ג'2",
    address: 'רחוב הרקפת 12, מעלות',
    phone: '054-8899123',
    ownerEmail: 'mreshef@bmc.com',
    homeroomTeacher: 'שירה אלון',
    integrationTeacher: 'מיכל דליות',
    educationalCounselor: 'תמר ברקוביץ',
    psychologistName: 'ד"ר ירון אילני',
    stage: 'school',
    status: 'פעיל',
    archived: false,
    pedagogicalSnippets: [
      {
        id: 'snip_itai_1',
        authorName: 'מיכל דליות',
        authorRole: 'מנתחת התנהגות',
        authorInitials: 'מ.ד',
        createdAt: '2026-09-20 11:30',
        text: 'בתצפית בשיעור עברית נצפה סירוב מידי כאשר חולק דף עבודה עם 6 שאלות פתוחות. לאחר קריעת הדף איתי יצא למרחב הציבורי. נדרש מיקוד בהימנעות ממטלה עקב עומס כתיבה.',
        type: 'text'
      },
      {
        id: 'snip_itai_2',
        authorName: 'שירה אלון',
        authorRole: 'מחנכת כיתה',
        authorInitials: 'ש.א',
        createdAt: '2026-10-18 10:15',
        text: 'משוב צוות: השבוע חל שיפור מרשים לאחר שולב כרטיס ההפסקה היזומה. איתי השתמש בו פעמיים ברציפות במקום לזרוק את הקלמר.',
        type: 'text'
      }
    ],
    behaviorAssessment: {
      id: 'ba_itai_1',
      assessorName: 'מיכל דליות',
      assessmentDate: '2026-09-22',
      backgroundInfo: 'איתי תלמיד כיתה ג\' במסגרת שילוב, מאובחן על הרצף האוטיסטי בתפקוד גבוה עם קשיי קשב וריכוז. מגלה יכולות קוגניטיביות מצוינות בתחומי החשבון והמדעים, עם מוטיבציה גבוהה לעבודה במחשב. ברקע קשיים משמעותיים בהתארגנות לכתיבה, רגישות תחושתית לעומס גרפו-מוטורי ונטייה לתסכול במעבר למשימות מורכבות בעברית.',
      targetBehaviors: [
        {
          id: 'tb_itai_1',
          name: 'סירוב וקריעת דפי עבודה בכיתה',
          operationalDefinition: 'השלכת מחברת/דף עבודה על הרצפה, קריעת הדף, סירוב מילולי נחרץ ("אני לא עושה את זה!") ויציאה למרחב מחוץ לכיתה ללא אישור.',
          measurementType: 'frequency',
          baselineAverage: 8,
          targetGoal: 1
        }
      ],
      baselineData: [
        { id: 'b_itai_1', date: '2026-09-15', sessionOrPeriod: 'שיעור 1 (עברית)', value: 8, notes: 'השלכת הדף ויציאה למסדרון' },
        { id: 'b_itai_2', date: '2026-09-18', sessionOrPeriod: 'שיעור 2 (שפה)', value: 9, notes: 'קריעת דף עבודה במשימת כתיבה' },
        { id: 'b_itai_3', date: '2026-09-22', sessionOrPeriod: 'שיעור 1 (הבנת הנקרא)', value: 7, notes: 'סירוב מילולי וישיבה תחת השולחן' },
        { id: 'b_itai_4', date: '2026-09-26', sessionOrPeriod: 'שיעור 3 (כתיבה חופשית)', value: 10, notes: 'תסכול גבוה סביב משימת סיפור' },
        { id: 'b_itai_5', date: '2026-09-29', sessionOrPeriod: 'שיעור 2 (תנ"ך)', value: 8, notes: 'יציאה לחצר ללא רשות' },
        { id: 'b_itai_6', date: '2026-10-02', sessionOrPeriod: 'שיעור 1 (עברית)', value: 9, notes: 'זריקת קלמר וקריעת דף' },
        { id: 'b_itai_7', date: '2026-10-05', sessionOrPeriod: 'שיעור 2 (מבדק שפה)', value: 7, notes: 'סירוב לפתוח את חוברת המבדק' }
      ],
      antecedentAnalysis: 'האירועים מתרחשים כמעט באופן בלעדי כאשר איתי נדרש לכתוב יותר מ-3 שורות ברצף במחברת שורות, או כאשר ניתנת הוראה כללית לכלל הכיתה ללא פירוק לשלבים מוחשיים. טריגר מרכזי נוסף הוא עייפות לאחר שיעור חינוך גופני.',
      mainHypothesizedFunction: 'escape',
      functionalHypothesisNarrative: 'כאשר איתי נתקל בדרישת כתיבה ארוכה המעוררת עומס גרפו-מוטורי (תנאי מקדים), הוא מגיב בסירוב, קריעת דף ויציאה מהכיתה (התנהגות מטרה), וכתוצאה מכך המשימה מופסקת והוא מועבר למרחב מנוחה שקט (תוצאה סביבתית המשמרת את ההימנעות ממטלה).',
      initialRecommendations: 'הוראת התנהגות חלופית תואמת תפקוד של בקשת הפסקה מוסדרת בכרטיסייה יזומה, צמצום מטלות כתיבה ומעבר להקלדה במחשב נייד או הקלטה קולית, וחיזוק מובנה על סיום שלבי ביניים.',
      isLocked: false,
      updatedAt: '2026-10-06T12:00:00Z'
    },
    behaviorPlan: {
      id: 'bip_itai_1',
      analystName: 'מיכל דליות',
      effectiveDate: '2026-10-08',
      reviewDate: '2026-12-15',
      targetBehaviors: [
        {
          id: 'tb_itai_1',
          name: 'סירוב וקריעת דפי עבודה בכיתה',
          operationalDefinition: 'השלכת מחברת/דף עבודה על הרצפה, קריעת הדף, סירוב מילולי ויציאה מהכיתה ללא אישור.',
          measurementType: 'frequency',
          baselineAverage: 8,
          targetGoal: 1
        }
      ],
      replacementBehaviors: [
        {
          targetBehaviorId: 'tb_itai_1',
          replacementSkill: 'שימוש בכרטיסיית "הפסקה יזומה" ובקשת עזרה מילולית ("אני צריך עזרה בחלק הזה")',
          teachingStrategies: 'סימולציות מקדימות עם מנתחת ההתנהגות, תרגול בשלבי חימום, הצבת כרטיסיית הפסקה בפינת השולחן וחיזוק מיידי בכל שימוש תקין.'
        }
      ],
      antecedentStrategies: 'פירוק מטלות כתיבה לכרטיסיות שלבים של 2 שורות בכל פעם, מתן אפשרות להקלדה בטאבלט, הטרמה ברורה 5 דקות לפני תחילת שיעורי שפה.',
      reinforcementSystem: {
        preferredReinforcers: '5 דקות משחק בסימולטור טיסה במחשב בסוף היום, כרטיסיית כוכבים מצטברת, תפקיד עוזר מעבדה.',
        scheduleOfReinforcement: 'חיזוק מיידי בכל הרמת כרטיסיית הפסקה במקום סירוב (FR1 בשבועיים הראשונים, ולאחר מכן מעבר ל-VR2).'
      },
      reactiveProtocol: {
        staffResponse: 'תגובה רגועה ללא קשר עין ממושך או תוכחה מילולית; הפניה שקטה של האצבע אל כרטיסיית ההפסקה. איסוף הדפים בשקט ללא משא ומתן.',
        crisisSafetyPlan: 'אם יוצא מהכיתה בסערת רגשות – איש צוות מלווה במרחק ביטחון ללא מגע, עד להגעה לחדר ההכלה השקט.'
      },
      ongoingTracking: [
        { id: 'tr_itai_1', date: '2026-10-12', period: 'שיעור 2', targetBehaviorOccurrences: 6, replacementBehaviorUsed: 1, reinforcementDelivered: true, notes: 'הרמת כרטיסייה פעם אחת במהלך השיעור' },
        { id: 'tr_itai_2', date: '2026-10-16', period: 'שיעור 2', targetBehaviorOccurrences: 5, replacementBehaviorUsed: 2, reinforcementDelivered: true, notes: 'השתמש בהפסקה יזומה פעמיים, תגובה רגועה' },
        { id: 'tr_itai_3', date: '2026-10-21', period: 'שיעור 3', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 3, reinforcementDelivered: true, notes: 'ביקש עזרה בכתיבה, השלים פסקה אחת' },
        { id: 'tr_itai_4', date: '2026-10-25', period: 'שיעור 2', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 4, reinforcementDelivered: true, notes: 'שיפור ברור – לא נרשמה קריעת דפים' },
        { id: 'tr_itai_5', date: '2026-10-29', period: 'שיעור 4', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 5, reinforcementDelivered: true, notes: 'הקליד במחשב נייד ונעזר בכרטיסיות' },
        { id: 'tr_itai_6', date: '2026-11-03', period: 'שיעור 2', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 6, reinforcementDelivered: true, notes: 'שיתוף פעולה חיובי לאורך מרבית השיעור' },
        { id: 'tr_itai_7', date: '2026-11-08', period: 'שיעור 1', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 7, reinforcementDelivered: true, notes: 'שיעור מלא עם אירוע סירוב קצר בודד' },
        { id: 'tr_itai_8', date: '2026-11-12', period: 'שיעור 3', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 8, reinforcementDelivered: true, notes: 'שליטה עצמית מרשימה, זכה בחיזוק המחשב' }
      ],
      isLocked: false,
      updatedAt: '2026-11-13T10:00:00Z'
    },
    behaviorObservations: [
      { id: 'obs_i_1', timestamp: 1792137600000, dateTime: '2026-10-12 09:15', location: 'כיתה ג2', activity: 'שיעור עברית', antecedent: 'חלוקת דף משימה בכתיבה', behavior: 'דחיפת השולחן והשלכת מחברת', intensity: 'moderate', durationMinutes: 6, consequence: 'הפניה שקטה לכרטיסיית הפסקה', perceivedFunction: 'escape', notes: 'נרגע לאחר 6 דקות' },
      { id: 'obs_i_2', timestamp: 1792483200000, dateTime: '2026-10-16 10:00', location: 'כיתה ג2', activity: 'שיעור שפה', antecedent: 'הוראה להעתיק מהלוח', behavior: 'אמר "נמאס לי" והרים כרטיסיית הפסקה', intensity: 'mild', durationMinutes: 3, consequence: 'אישור הפסקה מיידי וחיזוק מילולי חם', perceivedFunction: 'escape', notes: 'שימוש חיובי ראשון במיומנות חלופית' },
      { id: 'obs_i_3', timestamp: 1792915200000, dateTime: '2026-10-21 11:10', location: 'כיתה ג2', activity: 'שיעור הבנת הנקרא', antecedent: 'שאלה מורכבת במבחן פנימי', behavior: 'ביקש עזרה מילולית מהמורה שירה', intensity: 'mild', durationMinutes: 2, consequence: 'סיוע בפירוק השאלה לשני חלקים', perceivedFunction: 'escape', notes: 'השלים את התשובה בהצלחה' },
      { id: 'obs_i_4', timestamp: 1793260800000, dateTime: '2026-10-25 09:30', location: 'כיתה ג2', activity: 'שיעור כתיבה', antecedent: 'משימת סיכום פרק', behavior: 'סירוב ראשוני של דקה, ואז פתיחת המחשב הנייד', intensity: 'mild', durationMinutes: 2, consequence: 'חיזוק במדבקת כוכב', perceivedFunction: 'escape', notes: 'הקלדה חלקה של 4 שורות' },
      { id: 'obs_i_5', timestamp: 1793606400000, dateTime: '2026-10-29 11:45', location: 'כיתה ג2', activity: 'שיעור תנך', antecedent: 'הוראה לסמן שורות בספר', behavior: 'השתמש בכרטיסיית הפסקה ויצא לנשום מים', intensity: 'mild', durationMinutes: 4, consequence: 'חזר עצמאית והמשיך בעבודה', perceivedFunction: 'escape', notes: 'חזרה עצמאית מעודדת מאוד' },
      { id: 'obs_i_6', timestamp: 1794038400000, dateTime: '2026-11-03 09:20', location: 'כיתה ג2', activity: 'שיעור עברית', antecedent: 'דף עבודה דו-צדדי', behavior: 'קיפל את הדף לשניים וביקש לעשות צד אחד', intensity: 'mild', durationMinutes: 1, consequence: 'המורה הסכימה בחום', perceivedFunction: 'escape', notes: 'משא ומתן תקין ומותאם' },
      { id: 'obs_i_7', timestamp: 1794470400000, dateTime: '2026-11-08 08:30', location: 'כיתה ג2', activity: 'פתיחת יום', antecedent: 'כתיבת מטרות יומיות', behavior: 'סירוב מילולי קצר "אין לי כוח", הרים כרטיסייה', intensity: 'mild', durationMinutes: 2, consequence: 'הפוגה קצרה וחזרה לכתיבה', perceivedFunction: 'escape', notes: 'נרגע במהירות' },
      { id: 'obs_i_8', timestamp: 1794816000000, dateTime: '2026-11-12 11:15', location: 'כיתה ג2', activity: 'שיעור שפה', antecedent: 'משימת סיכום שבועי', behavior: 'עבודה רצופה של 25 דקות במחשב הנייד ללא סירוב', intensity: 'mild', durationMinutes: 0, consequence: 'זכייה ב-5 דקות סימולטור טיסה', perceivedFunction: 'escape', notes: 'התנהגות מטרה מאתגרת: 0 אירועים בשיעור זה!' }
    ],
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: new Date().toISOString()
  },

  // =========================================================================
  // תלמיד 2: נועם שרון (גן חובה "סביון") - קבלת תשומת לב במפגש
  // =========================================================================
  {
    id: 'st_noam_sharon_aba',
    name: 'נועם שרון',
    gender: 'boy',
    idNumber: '341258901',
    birthDate: '2021-05-20',
    schoolYear: 'תשפ"ז (2026-2027)',
    reportDate: '2026-11-15',
    educationalFramework: 'גן חובה סביון',
    schoolName: 'גן סביון',
    gradeClass: 'גן חובה',
    address: 'משעול היסמין 4, מעלות',
    phone: '052-7711244',
    ownerEmail: 'mreshef@bmc.com',
    educatorName: 'אורלי כרמי',
    integrationTeacher: 'מיכל דליות',
    educationalCounselor: 'שולמית רון',
    psychologistName: 'ד"ר ענת לוין',
    stage: 'kindergarten',
    status: 'פעיל',
    archived: false,
    pedagogicalSnippets: [
      {
        id: 'snip_noam_1',
        authorName: 'מיכל דליות',
        authorRole: 'מנתחת התנהגות',
        authorInitials: 'מ.ד',
        createdAt: '2026-09-22 09:40',
        text: 'במהלך מפגש הבוקר בגן נועם הפיל כסא וקפץ על ילד שישב לידו. נראה כי ההתנהגות מופיעה בדיוק כשהגננת פונה לשוחח עם ילד אחר. פונקציה משוערת: השגת תשומת לב (Attention).',
        type: 'text'
      }
    ],
    behaviorAssessment: {
      id: 'ba_noam_1',
      assessorName: 'מיכל דליות',
      assessmentDate: '2026-09-25',
      backgroundInfo: 'נועם ילד אנרגטי, סקרן ומלא קסם בגן חובה. אוהב לבנות דגמי מכוניות בלגו ולסייע בחצר הגן. לצד זאת, מתקשה מאוד בוויסות דחפים ובהמתנה לתורו במפגשי מליאה. כאשר תשומת לב הגננת מופנית לאחרים, נועם מפגין התנהגויות קוליות ופיזיות קיצוניות המושכות אליו מיקוד מיידי.',
      targetBehaviors: [
        {
          id: 'tb_noam_1',
          name: 'הפרעות קוליות ופיזיות במפגש הבוקר',
          operationalDefinition: 'צעקות בקול רם בזמן דיבור הגננת, קפיצה מהישיבה על השטיח, הפלת כסאות וקפיצה על ילדים יושבים.',
          measurementType: 'frequency',
          baselineAverage: 11,
          targetGoal: 2
        }
      ],
      baselineData: [
        { id: 'b_noam_1', date: '2026-09-16', sessionOrPeriod: 'מפגש בוקר', value: 12, notes: 'צעקות והפלת כסאות' },
        { id: 'b_noam_2', date: '2026-09-20', sessionOrPeriod: 'מפגש סיפור', value: 11, notes: 'קפיצה על חברים בשטיח' },
        { id: 'b_noam_3', date: '2026-09-24', sessionOrPeriod: 'מפגש מוזיקה', value: 14, notes: 'חטיפת תופים וצעקות' },
        { id: 'b_noam_4', date: '2026-09-27', sessionOrPeriod: 'מפגש בוקר', value: 10, notes: 'הפרעות חוזרות לגננת' },
        { id: 'b_noam_5', date: '2026-10-01', sessionOrPeriod: 'מפגש חגיגי', value: 13, notes: 'הפלת כסאות ובריחה לחצר' },
        { id: 'b_noam_6', date: '2026-10-04', sessionOrPeriod: 'מפגש שישי', value: 11, notes: 'הפרעה במהלך ברכת השבת' }
      ],
      antecedentAnalysis: 'התנהגויות אלו פורצות כאשר הגננת מפנה את תשומת לבה לילד אחר שמספר סיפור, או בעת שירים הכוללים ישיבה פסיבית ממושכת מעל 10 דקות.',
      mainHypothesizedFunction: 'attention',
      functionalHypothesisNarrative: 'כאשר תשומת הלב מוסרת מנועם אל שאר ילדי הגן (תנאי מקדים), הוא צועק ומפיל כסאות (התנהגות מטרה), וכתוצאה מכך הגננת והסייעת פונות אליו מיידית וכל הילדים מסתכלים עליו וצוחקים (חיזוק חיובי מובהק של תשומת לב).',
      initialRecommendations: 'מתן תפקיד פעיל במפגש, תשומת לב יזומה דיפרנציאלית (DRA), והתעלמות מתוכננת של הצוות מהפרעות קלות במקביל לחיזוק מיידי על ישיבה נאותה והרמת יד.',
      isLocked: false,
      updatedAt: '2026-10-06T14:00:00Z'
    },
    behaviorPlan: {
      id: 'bip_noam_1',
      analystName: 'מיכל דליות',
      effectiveDate: '2026-10-10',
      reviewDate: '2026-12-20',
      targetBehaviors: [
        {
          id: 'tb_noam_1',
          name: 'הפרעות קוליות ופיזיות במפגש הבוקר',
          operationalDefinition: 'צעקות בקול רם, קפיצה מהשטיח, הפלת כסאות ומגע פיזי בחברים.',
          measurementType: 'frequency',
          baselineAverage: 11,
          targetGoal: 2
        }
      ],
      replacementBehaviors: [
        {
          targetBehaviorId: 'tb_noam_1',
          replacementSkill: 'הצבעה שקטה לקבלת רשות דיבור ותפקיד עוזר הגננת בחלוקת אביזרים',
          teachingStrategies: 'תרגול הרמת יד שקטה במשחק מקדים, מתן תשומת לב חמה בכל פעם שמרים יד לפני שצועק.'
        }
      ],
      antecedentStrategies: 'הושבת נועם בשורה הראשונה בסמוך לגננת, קיצור משך הישיבה הפסיבית ל-10 דקות והפעלות תנועה משולבות.',
      reinforcementSystem: {
        preferredReinforcers: 'תשומת לב חמה ואישית, מדבקות כוכב מנצנצות, בחירת השיר הפותח של המפגש.',
        scheduleOfReinforcement: 'משוב חיובי ותשומת לב כל 3-5 דקות של ישיבה נאותה (DRO/DRA).'
      },
      reactiveProtocol: {
        staffResponse: 'התעלמות מתוכננת מצעקות ללא קשר עין, הפניית קשב לילד שיושב ומצביע יפה, ופנייה מיידית לנועם ברגע שהוא משתתק לשניה אחת.',
        crisisSafetyPlan: 'במקרה של סיכון פיזי לילד אחר – הרחקה שקטה של הסביבה והחזקה מרגיעה ללא מילים מיותרות.'
      },
      ongoingTracking: [
        { id: 'tr_noam_1', date: '2026-10-14', period: 'מפגש בוקר', targetBehaviorOccurrences: 8, replacementBehaviorUsed: 2, reinforcementDelivered: true, notes: 'מונה לעוזר הגננת לחלוקת תופים' },
        { id: 'tr_noam_2', date: '2026-10-19', period: 'מפגש בוקר', targetBehaviorOccurrences: 7, replacementBehaviorUsed: 3, reinforcementDelivered: true, notes: 'הרמת יד שקטה 3 פעמים לאורך המפגש' },
        { id: 'tr_noam_3', date: '2026-10-24', period: 'מפגש בוקר', targetBehaviorOccurrences: 5, replacementBehaviorUsed: 4, reinforcementDelivered: true, notes: 'התעלמות מתוכננת של הצוות קיצרה מאוד את משך ההפרעות' },
        { id: 'tr_noam_4', date: '2026-10-28', period: 'מפגש בוקר', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 5, reinforcementDelivered: true, notes: 'שיפור ניכר בישיבה על הכרית האישית' },
        { id: 'tr_noam_5', date: '2026-11-02', period: 'מפגש בוקר', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 6, reinforcementDelivered: true, notes: 'קיבל מדבקת כוכב ונבחר לבחור את שיר הסיום' },
        { id: 'tr_noam_6', date: '2026-11-07', period: 'מפגש בוקר', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 7, reinforcementDelivered: true, notes: 'הצביע בשקט וקיבל את זכות הדיבור ראשון' },
        { id: 'tr_noam_7', date: '2026-11-13', period: 'מפגש בוקר', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 8, reinforcementDelivered: true, notes: 'מפגש שקט כמעט לחלוטין! הצוות נלהב מהתוצאה' }
      ],
      isLocked: false,
      updatedAt: '2026-11-14T09:00:00Z'
    },
    behaviorObservations: [
      { id: 'obs_n_1', timestamp: 1792310400000, dateTime: '2026-10-14 09:00', location: 'שטיח הגן', activity: 'מפגש בוקר', antecedent: 'הגננת פנתה לילדה אחרת', behavior: 'צעק "תראו אותי" וקפץ מהשטיח', intensity: 'moderate', durationMinutes: 3, consequence: 'הגננת הזמינה אותו לחלק את התופים', perceivedFunction: 'attention', notes: 'נרגע מיד כשקיבל תפקיד' },
      { id: 'obs_n_2', timestamp: 1792742400000, dateTime: '2026-10-19 09:10', location: 'שטיח הגן', activity: 'מפגש בוקר', antecedent: 'שאלה של הגננת על מזג האוויר', behavior: 'הרמת יד שקטה ללא צעקה', intensity: 'mild', durationMinutes: 1, consequence: 'פנייה חמה: "כל הכבוד שנועם מצביע"', perceivedFunction: 'attention', notes: 'חיזוק מיידי מוצלח' },
      { id: 'obs_n_3', timestamp: 1793174400000, dateTime: '2026-10-24 09:05', location: 'שטיח הגן', activity: 'מפגש סיפור', antecedent: 'קריאת ספר על ידי הגננת', behavior: 'הפלת כרית וצעקת קולות חיות', intensity: 'mild', durationMinutes: 2, consequence: 'התעלמות מתוכננת – הגננת המשיכה לקרוא', perceivedFunction: 'attention', notes: 'הפסיק תוך פחות מ-2 דקות' },
      { id: 'obs_n_4', timestamp: 1793520000000, dateTime: '2026-10-28 09:15', location: 'שטיח הגן', activity: 'מפגש בוקר', antecedent: 'דיון על עונות השנה', behavior: 'הצבעה שקטה וישיבה זקופה', intensity: 'mild', durationMinutes: 0, consequence: 'קיבל מדבקת כוכב ונבחר להחזיק את תמונת הסתיו', perceivedFunction: 'attention', notes: 'התרגש מאוד מהתפקיד' },
      { id: 'obs_n_5', timestamp: 1793952000000, dateTime: '2026-11-02 09:00', location: 'שטיח הגן', activity: 'מפגש בוקר', antecedent: 'שיר פתיחה', behavior: 'ריקוד מותאם עם החברים ללא קפיצה עליהם', intensity: 'mild', durationMinutes: 0, consequence: 'משוב חיובי קבוצתי', perceivedFunction: 'attention', notes: 'השתלבות קבוצתית מעולה' },
      { id: 'obs_n_6', timestamp: 1794384000000, dateTime: '2026-11-07 09:20', location: 'שטיח הגן', activity: 'מפגש סיכום שבוע', antecedent: 'שיחה קבוצתית', behavior: 'הצבעה רגועה והמתנה לתורו', intensity: 'mild', durationMinutes: 0, consequence: 'זכות דיבור ראשון', perceivedFunction: 'attention', notes: 'דיבר בנעימות ושיתף על משחק בלגו' },
      { id: 'obs_n_7', timestamp: 1794902400000, dateTime: '2026-11-13 09:00', location: 'שטיח הגן', activity: 'מפגש בוקר', antecedent: 'הגננת פנתה לילד חדש', behavior: 'חיוך והצבעה שקטה', intensity: 'mild', durationMinutes: 0, consequence: 'קריצה חמה מהגננת וטפיחה מעודדת על הכתף', perceivedFunction: 'attention', notes: 'שליטה עצמית מושלמת' }
    ],
    createdAt: '2026-09-16T08:00:00Z',
    updatedAt: new Date().toISOString()
  },

  // =========================================================================
  // תלמיד 3: דניאל מזרחי (חטיבת ביניים "שחקים") - ויסות חושי במעברים קוליים
  // =========================================================================
  {
    id: 'st_daniel_mizrahi_aba',
    name: 'דניאל מזרחי',
    gender: 'boy',
    idNumber: '219482034',
    birthDate: '2014-08-11',
    schoolYear: 'תשפ"ז (2026-2027)',
    reportDate: '2026-11-15',
    educationalFramework: 'חטיבת ביניים שחקים',
    schoolName: 'שחקים',
    gradeClass: "כיתה ז'3",
    address: 'דרך הגליל 55, מעלות',
    phone: '050-9988312',
    ownerEmail: 'mreshef@bmc.com',
    homeroomTeacher: 'יורם שפירא',
    integrationTeacher: 'מיכל דליות',
    educationalCounselor: 'מירי קפלן',
    psychologistName: 'פרופ\' גדעון נבו',
    stage: 'school',
    status: 'פעיל',
    archived: false,
    pedagogicalSnippets: [
      {
        id: 'snip_dan_1',
        authorName: 'מיכל דליות',
        authorRole: 'מנתחת התנהגות',
        authorInitials: 'מ.ד',
        createdAt: '2026-09-24 12:10',
        text: 'תצפית בהפסקת הצהריים: בצלצול הפעמון דניאל כיסה את אוזניו בחוזקה, צעק וטרק את דלת הכיתה בעוצמה רבה. נדרש נוהל יציאה מוקדמת ואוזניות מנטרלות רעש להפחתת הגירוי החושי הבלתי נסבל.',
        type: 'text'
      }
    ],
    behaviorAssessment: {
      id: 'ba_daniel_1',
      assessorName: 'מיכל דליות',
      assessmentDate: '2026-09-28',
      backgroundInfo: 'דניאל תלמיד כיתה ז\' בחינוך מיוחד (כיתת תקשורת משולבת), מגלה עניין רב במחשבים וגרפיקה דיגיטלית. מתמודד עם רגישות שמיעתית קיצונית (היפראקוזיס) המובילה למצבי הצפה חושית מהירים במעברים הומי אדם.',
      targetBehaviors: [
        {
          id: 'tb_daniel_1',
          name: 'טריקת דלתות והתפרצות זעם בעומס קולי',
          operationalDefinition: 'כיסוי אוזניים בידיים, צעקות זעם, בעיטה בקירות, טריקה אלימה של דלתות הכיתה/מסדרון ובריחה לשירותים.',
          measurementType: 'frequency',
          baselineAverage: 6,
          targetGoal: 0
        }
      ],
      baselineData: [
        { id: 'b_dan_1', date: '2026-09-18', sessionOrPeriod: 'מעבר צלצול בוקר', value: 6, notes: 'טריקת דלת בצלצול' },
        { id: 'b_dan_2', date: '2026-09-21', sessionOrPeriod: 'הפסקת עשר במסדרון', value: 7, notes: 'צעקות וכיסוי אוזניים בהמולה' },
        { id: 'b_dan_3', date: '2026-09-25', sessionOrPeriod: 'סיום שיעור ספורט', value: 5, notes: 'הד חזק באולם הספורט' },
        { id: 'b_dan_4', date: '2026-09-29', sessionOrPeriod: 'מעבר להסעות', value: 6, notes: 'צפירות אוטובוסים והמולת תלמידים' },
        { id: 'b_dan_5', date: '2026-10-02', sessionOrPeriod: 'טקס פתיחת שנה', value: 8, notes: 'רמקולים בעוצמה גבוהה' },
        { id: 'b_dan_6', date: '2026-10-06', sessionOrPeriod: 'הפסקת צהריים', value: 5, notes: 'רעש עז במסדרון הכניסה' }
      ],
      antecedentAnalysis: 'רעשי רקע פתאומיים בעוצמה גבוהה: צלצול בית הספר, צעקות מרובות של תלמידים במסדרון הצר בהפסקה, והד מתכתי באולם הספורט.',
      mainHypothesizedFunction: 'sensory',
      functionalHypothesisNarrative: 'כאשר דניאל נחשף לעוצמות דציבלים גבוהות ולדחיסות קולית במסדרון (תנאי מקדים), מתרחשת תגובת הישרדות חושית של כיסוי אוזניים, טריקת דלת ובריחה (התנהגות מטרה), המובילה להתרחקות מהרעש (הפחתת הגירוי הבלתי נסבל כתוצאה סביבתית).',
      initialRecommendations: 'הסדרה מראש של אוזניות מבטלות רעש (Active Noise Cancelling), מעבר 3 דקות לפני הצלצול, ומרחב ויסות שקט זמין בכל עת.',
      isLocked: false,
      updatedAt: '2026-10-07T11:00:00Z'
    },
    behaviorPlan: {
      id: 'bip_daniel_1',
      analystName: 'מיכל דליות',
      effectiveDate: '2026-10-09',
      reviewDate: '2026-12-25',
      targetBehaviors: [
        {
          id: 'tb_daniel_1',
          name: 'טריקת דלתות והתפרצות זעם בעומס קולי',
          operationalDefinition: 'כיסוי אוזניים בידיים, צעקות זעם, טריקת דלתות ובריחה.',
          measurementType: 'frequency',
          baselineAverage: 6,
          targetGoal: 0
        }
      ],
      replacementBehaviors: [
        {
          targetBehaviorId: 'tb_daniel_1',
          replacementSkill: 'ענידת אוזניות מנטרלות רעש 3 דקות לפני הצלצול ומעבר שקט לחדר שלווה',
          teachingStrategies: 'לוח זמנים ויזואלי בשעון היד של דניאל עם התראה רטטת 3 דקות לפני סיום השיעור.'
        }
      ],
      antecedentStrategies: 'כיבוי עוצמת הרמקול הסמוך לכיתתו, יציאה מוקדמת ב-3 דקות מהכיתה לפני המולת המסדרון, שהייה בחדר המוזיקה בהפסקות.',
      reinforcementSystem: {
        preferredReinforcers: 'זמן עריכת וידאו במחשב הנייד, גישה לספריית המדעים, שובר זמן שקט אישי.',
        scheduleOfReinforcement: 'משוב יומי ותגמול שבועי על מעברים שקטים.'
      },
      reactiveProtocol: {
        staffResponse: 'במקרה של הצפה – אסור בתכלית האיסור לדבר אליו בקול רם או לגעת בו. הגשת האוזניות בשקט ופתיחת דלת חדר השלווה.',
        crisisSafetyPlan: 'במצב הצפה חריף: שהייה של 15 דקות בחדר שלווה מוחשך עם תאורה עמומה ומוזיקה מרגיעה.'
      },
      ongoingTracking: [
        { id: 'tr_dan_1', date: '2026-10-15', period: 'מעבר בוקר', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 2, reinforcementDelivered: true, notes: 'הרכיב אוזניות אך נלחץ מעט ברגע הצלצול' },
        { id: 'tr_dan_2', date: '2026-10-21', period: 'הפסקת עשר', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 3, reinforcementDelivered: true, notes: 'יצא 3 דקות מוקדם – מעבר רגוע בהרבה' },
        { id: 'tr_dan_3', date: '2026-10-27', period: 'מעבר צהריים', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 4, reinforcementDelivered: true, notes: 'הגיע לחדר שלווה עצמאית ללא טריקת דלת' },
        { id: 'tr_dan_4', date: '2026-11-02', period: 'צלצול סיום', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 5, reinforcementDelivered: true, notes: 'ענידת אוזניות מוצלחת ויציאה מוקדמת' },
        { id: 'tr_dan_5', date: '2026-11-08', period: 'הפסקה גדולה', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 6, reinforcementDelivered: true, notes: 'שהה בחדר המוזיקה, רגוע ונינוח' },
        { id: 'tr_dan_6', date: '2026-11-14', period: 'יום מלא', targetBehaviorOccurrences: 0, replacementBehaviorUsed: 6, reinforcementDelivered: true, notes: 'יום ללא אף התפרצות או טריקת דלת! הצלחה מדהימה' }
      ],
      isLocked: false,
      updatedAt: '2026-11-14T14:30:00Z'
    },
    behaviorObservations: [
      { id: 'obs_d_1', timestamp: 1792396800000, dateTime: '2026-10-15 08:30', location: 'מסדרון קומה ב', activity: 'צלצול בוקר', antecedent: 'צלצול חזק של הפעמון', behavior: 'כיסה אוזניים ונכנס בריצה לכיתה', intensity: 'moderate', durationMinutes: 4, consequence: 'הגשת אוזניות על ידי הסייע', perceivedFunction: 'sensory', notes: 'נרגע ברגע שהרכיב אוזניות' },
      { id: 'obs_d_2', timestamp: 1792915200000, dateTime: '2026-10-21 10:15', location: 'כיתה ז3', activity: 'הפסקת עשר', antecedent: 'המולת תלמידים ביציאה להפסקה', behavior: 'ענידת אוזניות 3 דקות לפני הצלצול', intensity: 'mild', durationMinutes: 0, consequence: 'מעבר רגוע ושקט לחדר שלווה', perceivedFunction: 'sensory', notes: 'יישום מצטיין של המיומנות החלופית' },
      { id: 'obs_d_3', timestamp: 1793433600000, dateTime: '2026-10-27 12:45', location: 'חדר שלווה', activity: 'הפוגה חושית', antecedent: 'רעש מהרחוב מחוץ לחלון', behavior: 'הדלקת מוזיקת גשם באוזניות', intensity: 'mild', durationMinutes: 5, consequence: 'ויסות עצמי מלא', perceivedFunction: 'sensory', notes: 'עצמאות מלאה בוויסות' },
      { id: 'obs_d_4', timestamp: 1793952000000, dateTime: '2026-11-02 13:30', location: 'שער בית הספר', activity: 'סיום יום והסעות', antecedent: 'צפירות של רכבי הסעות', behavior: 'ענידת אוזניות והליכה שקטה להסעה', intensity: 'mild', durationMinutes: 0, consequence: 'מחמאה מהסייע', perceivedFunction: 'sensory', notes: 'עלייה שלווה להסעה' },
      { id: 'obs_d_5', timestamp: 1794470400000, dateTime: '2026-11-08 11:45', location: 'חדר מוזיקה', activity: 'הפסקה גדולה', antecedent: 'רעש במסדרונות', behavior: 'נגינה שקטה באורגנית עם אוזניות', intensity: 'mild', durationMinutes: 0, consequence: 'הנאה ותחושת רוגע', perceivedFunction: 'sensory', notes: 'פתרון פנטסטי להפסקות' },
      { id: 'obs_d_6', timestamp: 1794988800000, dateTime: '2026-11-14 10:00', location: 'כיתה ז3', activity: 'שיעור מחשבים', antecedent: 'מעבר בין שיעורים', behavior: 'מעבר חלק ללא שום סימני מצוקה', intensity: 'mild', durationMinutes: 0, consequence: 'חיזוק בזמן עריכת וידאו', perceivedFunction: 'sensory', notes: '0 התפרצויות בכל היום' }
    ],
    createdAt: '2026-09-18T08:00:00Z',
    updatedAt: new Date().toISOString()
  }
];

async function seedStudents() {
  console.log('====================================================');
  console.log('🚀 Seeding 3 ABA Students for Michal Dalyot (mreshef@bmc.com)');
  console.log('====================================================');

  const token = getAccessToken();
  if (!token) {
    console.error('❌ Could not get Firebase access token.');
    process.exit(1);
  }

  for (const st of STUDENTS) {
    console.log(`\nWriting student: ${st.name} (${st.id})...`);
    const docUrl = `${STUDENTS_COLLECTION_URL}/${st.id}`;
    const fields = {};
    for (const [k, v] of Object.entries(st)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }

    const res = await fetch(docUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (res.ok) {
      console.log(`✅ Student "${st.name}" successfully created/updated in Firestore!`);
    } else {
      console.error(`❌ Failed to save student ${st.name}:`, res.status, await res.text());
    }
  }

  // Set user preferences in Firestore for mreshef@bmc.com
  console.log('\nSetting user preferences for Michal Dalyot...');
  const prefUrl = `${BASE_FIRESTORE_URL}/tala_user_preferences/mreshef_bmc_com`;
  const prefs = {
    userEmail: 'mreshef@bmc.com',
    fullName: 'מיכל דליות',
    professionalTitle: 'מנתחת התנהגות מוסמכת',
    institutionalAffiliation: "מתי'א מעלות",
    defaultPrivacyMode: 'full_name',
    reportDateFormat: 'dd_mm_yyyy',
    aiWritingTone: 'formal',
    showBesad: true,
    besadText: "בס'ד",
    privateGoals: [],
    updatedAt: new Date().toISOString()
  };

  const prefFields = {};
  for (const [k, v] of Object.entries(prefs)) {
    prefFields[k] = toFirestoreValue(v);
  }

  const prefRes = await fetch(prefUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: prefFields })
  });

  if (prefRes.ok) {
    console.log('✅ User preferences saved successfully in Firestore!');
  } else {
    console.warn('⚠️ Could not save user preferences in Firestore:', prefRes.status, await prefRes.text());
  }

  console.log('\n====================================================');
  console.log('🎉 Seeding completed successfully!');
  console.log('====================================================');
}

seedStudents();
