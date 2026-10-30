/**
 * Domain specification for TALA's 10-step End-to-End Guided Onboarding Journey
 * and the realistic Israeli Special Education Demo Dataset ("יונתן לוי").
 *
 * Adheres to:
 * - 10 pedagogical stages covering the full teacher workflow (intake to Matya sharing)
 * - Zero-trust data isolation (demo student is tagged with isDemo: true)
 * - Authentic Israeli pedagogical terminology (תל"א, שילוב, מתי״א, קול ההורה, 4 רמות תיווך)
 */

export const ONBOARDING_TOTAL_STEPS = 10;

export const ONBOARDING_STEPS = [
  {
    id: 1,
    key: 'getting_started',
    title: 'מבוא למערכת ומרחב העבודה',
    shortTitle: 'מבוא',
    stepNumberLabel: 'צעד 1 מתוך 10',
    targetView: 'landing',
    targetSection: null,
    isImplemented: true,
    pedagogicalRationale:
      'הכרת התפיסה האקולוגית: התלמיד אינו לקות מבודדת, אלא שלם המתפקד בסביבות שונות (כיתת אם, חצר, חדר שילוב ובית). המערכת מרכזת את כל המעטפת במקום אחד.',
    contextualGuidance:
      'ברוכה הבאה ל-TALA! כאן תוכלי לבנות תוכנית עבודה אקולוגית מותאמת אישית, לתעד מעקב יומי בשטח, לשלב את קול ההורים ולהפיק דוחות רשמיים למשרד החינוך במינימום מאמץ מנהלי.',
    fieldExamples:
      'בשלב זה תוכלי לבחור האם להתנסות בתלמיד הדגמה עשיר ("יונתן לוי") או לפתוח כרטיס תלמיד/ה אמיתי/ת ראשונ/ה מהשטח.',
    actionLabel: 'בחירת מצב עבודה (דמו / אמת)',
    tip: 'מומלץ להתחיל בהתנסות עם תלמיד הדוגמה כדי לראות כיצד התצפיות מתחברות לדוחות הסופיים.'
  },
  {
    id: 2,
    key: 'create_student',
    title: 'הוספת תלמיד ופרטים מזהים',
    shortTitle: 'הקמת תלמיד',
    stepNumberLabel: 'צעד 2 מתוך 10',
    targetView: 'student_form',
    targetSection: 'section_1_identity',
    isImplemented: true,
    pedagogicalRationale:
      'הבחנה מדויקת בין שלב חינוכי (גן/בי"ס) וסוג תוכנית (תל״א לחנ״מ לעומת תח״י/תח״א לשילוב), והגנה מחמירה על פרטיות (Zero PII). הגדרות אלו מעצבות את מבנה הדוחות.',
    contextualGuidance:
      'הזיני את פרטי הזיהוי החינוכיים. בחירת השלב החינוכי (גן או בי״ס) והמגדר מתאימה אוטומטית את מאגרי המטרות, סביבות התפקוד וניסוח הלשון בדוחות המערכת.',
    fieldExamples:
      'שם: יונתן לוי | מגדר: בן | שלב: בית ספר | כיתה: ב׳2 | מסגרת: בי״ס יסודי "ארזים" | תוכנית: תל״א שילוב.',
    actionLabel: 'צפייה בפרטי הזיהוי בטופס',
    tip: 'בדוחות מודפסים תוכלי לבחור להציג ראשי תיבות בלבד להגנה מרבית על צנעת הפרט.'
  },
  {
    id: 3,
    key: 'student_profile',
    title: 'פרופיל תפקודי ומוקדי כוח',
    shortTitle: 'פרופיל וכוחות',
    stepNumberLabel: 'צעד 3 מתוך 10',
    targetView: 'student_form',
    targetSection: 'section_2_profile',
    isImplemented: true,
    pedagogicalRationale:
      'בחינוך מיוחד אפקטיבי, תוכנית עבודה נבנית תמיד על בסיס מוקדי הכוח ותחומי העניין של התלמיד, ולא רק על קשייו. כוחות אלו מהווים את המנוף המרכזי להתקדמות.',
    contextualGuidance:
      'תארי את תפקוד התלמיד/ה. הקפידי לציין מוקדי כוח ותחומי עניין (תחביבים, כישורים חברתיים, חוסן) לצד מוקדים לחיזוק. מידע זה יזין את ניתוח ה-AI ויעצב את יעדי ההתערבות.',
    fieldExamples:
      'מוקדי כוח: יכולת ביטוי מילולית עשירה, אמפתיה לחברים, תשוקה לבנייה בלגו. מוקדים לחיזוק: ויסות תנועתי במליאה, שטף קריאה, התארגנות בתחילת שיעור.',
    actionLabel: 'מעבר לסקירת מוקדי הכוח והרקע',
    tip: 'שילוב תחומי עניין (כגון דינוזאורים או לגו) במשימות למידה מגביר משמעותית את המוטיבציה.'
  },
  {
    id: 4,
    key: 'set_goals',
    title: 'הגדרת מטרות ויעדים אקולוגיים',
    shortTitle: 'מטרות ויעדים',
    stepNumberLabel: 'צעד 4 מתוך 10',
    targetView: 'student_form',
    targetSection: 'section_3_goals',
    isImplemented: true,
    pedagogicalRationale:
      'יעד פדגוגי איכותי חייב להיות אופרטיבי, מדיד, מעוגן בסביבת תפקוד אמיתית ומוגדר בזמן (ששת עמודי התווך של TALA: יעד, קריטריון, זמן, סביבה, שותפים וכלים).',
    contextualGuidance:
      'הגדירי 2–4 יעדים אופרטיביים מתוך מאגר המטרות או בניסוח אישי. לכל יעד הגדירי: מדד ביצוע, לוח זמנים, שותפים וכלים. יעדים אלו מוזנים ישירות ליומן המעקב היומי.',
    fieldExamples:
      'יעד 1: ישיבה והשתתפות במליאה 20 דק׳ עם כרית תחושתית (4 מתוך 5 ימים). יעד 2: קריאת 40 מילים בדיוק 85%. יעד 3: פתרון קונפליקטים בחצר באמצעות "עצור-חשוב".',
    actionLabel: 'צפייה בטבלת היעדים האקולוגיים',
    tip: 'תוכלי לשלוף יעדים מוכנים מ"בנק המטרות" ולשמור יעדים ייחודיים שכתבת לבנק המטרות האישי שלך.'
  },
  {
    id: 5,
    key: 'daily_tracking',
    title: 'מעקב יומי ותיעוד תצפיות',
    shortTitle: 'מעקב יומי',
    stepNumberLabel: 'צעד 5 מתוך 10',
    targetView: 'daily_tracker',
    targetSection: null,
    isImplemented: true,
    pedagogicalRationale:
      'תיעוד שוטף וממוקד בזמן אמת מונע שכחה ופערי תצפית, ומספק ראיות אותנטיות להתקדמות לאורך חודשי השנה. רמת התיווך שנצפתה מעידה על מידת העצמאות האמיתית.',
    contextualGuidance:
      'הכירי את יומן המעקב הפדגוגי! כאן תוכלי לתעד תצפית מהשטח ב-10 שניות, לסמן את רמת התיווך שנצפתה (עצמאי, מילולי, חלקי, מלא), ולסנכרן אותה אוטומטית ליעדי התלמיד/ה.',
    fieldExamples:
      'תצפית (12/12): "השלים מליאת בוקר מלאה (20 דק׳) באופן עצמאי עם כרטיסיית ניווט." | רמת תיווך: עצמאי/ת לחלוטין.',
    actionLabel: 'מעבר ליומן המעקב הפדגוגי',
    tip: 'בכל תצפית מוצגת התאמה חכמה ליעד הרלוונטי כדי שלא תצטרכי לתייג ידנית.'
  },
  {
    id: 6,
    key: 'ongoing_documentation',
    title: 'תיעוד שוטף וניהול מסמך חי',
    shortTitle: 'תיעוד שוטף',
    stepNumberLabel: 'צעד 6 מתוך 10',
    targetView: 'student_form',
    targetSection: 'section_4_ongoing',
    isImplemented: true,
    pedagogicalRationale:
      'תוכנית לימודים אישית אינה מסמך בירוקרטי שננעל במגירה בספטמבר. היא כלי עבודה חי שמתעדכן ברציפות, ננעל לעריכה לקראת ועדות, ומלווה בהיסטוריית גרסאות בענן.',
    contextualGuidance:
      'תוכנית העבודה נשמרת אוטומטית בענן בכל שינוי. תוכלי לצפות בהתראת פערי תצפית (אם חלפו יותר מ-21 יום ללא תצפית ביעד), לנעול את המסמך מפני שינויים ולשחזר גרסאות קודמות.',
    fieldExamples:
      'חיווי שמירה: "נשמר בענן לפני 2 דקות" | התראת רצף: "נרשמו 4 תצפיות החודש, אין פערי תיעוד" | כפתור נעילה: "נעילת תוכנית לקראת ועדת אפיון וזכאות".',
    actionLabel: 'בדיקת חיווי שמירה ורצף תיעוד',
    tip: 'נעילת המסמך מגנה עליו מפני שינויים מקריים אך מאפשרת המשך צפייה והדפסה בכל עת.'
  },
  {
    id: 7,
    key: 'parent_voice',
    title: 'קול ההורים ושותפות חינוכית',
    shortTitle: 'קול ההורה',
    stepNumberLabel: 'צעד 7 מתוך 10',
    targetView: 'parent_voice',
    targetSection: 'parent_voice_control',
    isImplemented: true,
    pedagogicalRationale:
      'שותפות עם ההורים היא עקרון חוקי (תיקון 136 לחוק חינוך מיוחד) ופדגוגי ראשון במעלה. שיתוף ההורים בשאלון דיגיטלי ידידותי בנייד מעשיר את התוכנית וחוסך שעות פגישות.',
    contextualGuidance:
      'לחצי על כפתור "קול ההורה" כדי להפיק קישור מאובטח ללא PII ולשלוח אותו להורים בוואטסאפ. תשובותיהם לגבי חוזקות, קשיים וציפיות ישתלבו בלחיצת כפתור אחת ישירות בתוכנית!',
    fieldExamples:
      'קול ההורים (ענת ויואב): "יונתן בונה שעות בלגו בריכוז מדהים. קשה לו מאוד כשיש רעש גדול ועומס הוראות. הכי חשוב לנו שיחווה הצלחה וביטחון בקריאה."',
    actionLabel: 'פתיחת שער שיתוף קול ההורה',
    tip: 'הקישור המאובטח תקף ל-30 יום ואינו חושף שום מידע על תלמידים אחרים או פרטים מזהים מוקדמים.'
  },
  {
    id: 8,
    key: 'generating_reports',
    title: 'הפקת דוחות והערכות תקופתיות',
    shortTitle: 'הפקת דוחות',
    stepNumberLabel: 'צעד 8 מתוך 10',
    targetView: 'status_report',
    targetSection: 'section_5_eval',
    isImplemented: true,
    pedagogicalRationale:
      'סיכום תקופתי (מחצית, סוף שנה וועדות) דורש שזירה מדויקת של כל התצפיות שנאספו לאורך השנה לתוך הערכה מילולית רשמית, מבלי להשקיע שעות בכתיבה ידנית מאפס.',
    contextualGuidance:
      'זמן להפיק דוחות! TALA מרכזת את כל התצפיות והיעדים ומפיקה עבורך: הערכת מחצית מנומקת, הערכת סוף שנה, ודוח מצב תפקודי ב-15 סעיפים רשמיים המוכן לייצוא ל-Word ולהעתקה.',
    fieldExamples:
      'הערכת מחצית ליעד 1: "יונתן מפגין התקדמות ניכרת בישיבה במליאת הבוקר (75% הצלחה). שימוש עקבי בכרית תחושתית ובכרטיסיית ניווט הפחית את הצורך בתיווך."',
    actionLabel: 'צפייה בהערכת מחצית ומחולל דוח המצב',
    tip: 'בדוח המצב התפקודי תוכלי להעתיק ישירות את הסעיפים לפורמט הרשמי של משרד החינוך בלחיצת כפתור.'
  },
  {
    id: 9,
    key: 'ai_insights',
    title: 'הבנת תובנות ודוחות AI',
    shortTitle: 'תובנות AI',
    stepNumberLabel: 'צעד 9 מתוך 10',
    targetView: 'status_report',
    targetSection: 'section_ai_insights',
    isImplemented: true,
    pedagogicalRationale:
      'בינה מלאכותית כמסייעת פדגוגית אמינה (AI Assistant) תחת סמכות המורה: ה-AI מנתח תצפיות מצטברות ומציע ניסוחים מקצועיים, אך אינו ממציא נתונים (Zero Hallucination).',
    contextualGuidance:
      'ה-AI ב-TALA אינו מנחש – הוא שואב אך ורק מהתצפיות ומהיעדים שהזנת. הוא עוזר להצליב תצפיות שטח עם מטרות, לחלץ תובנות אובייקטיביות, ולנסח הערכות מקצועיות ללא מאמץ.',
    fieldExamples:
      'תובנת AI מתוך 4 תצפיות: "ניכרת עלייה מובהקת בעצמאות במליאת הבוקר לאחר שילוב אביזר תחושתי. מומלץ להרחיב את השימוש בכרטיסיית הניווט גם למעברים בין שיעורים."',
    actionLabel: 'סקירת תובנות ה-AI ומדדי ההתקדמות',
    tip: 'את תמיד שומרת על שיקול הדעת הפדגוגי המלא ויכולה לערוך, להוסיף או לתקן כל ניסוח של ה-AI.'
  },
  {
    id: 10,
    key: 'matya_settings',
    title: 'אזור אישי ושיתוף מסמכים במתי״א',
    shortTitle: 'אזור אישי ומתי״א',
    stepNumberLabel: 'צעד 10 מתוך 10',
    targetView: 'settings',
    targetSection: null,
    isImplemented: true,
    pedagogicalRationale:
      'עבודה בחינוך מיוחד היא עבודת צוות רב-מקצועית. שיתוף מסמכים בטוח בתוך גבולות המתי״א (Zero-Trust Tenant Isolation) מאפשר שיתוף פעולה הדוק בין מורות שילוב למטפלות פרא-רפואיות.',
    contextualGuidance:
      'באזור האישי תוכלי להגדיר את פרטי המורה, חתימה דיגיטלית שקופה וברירות מחדל לדוחות. בכפתור "שיתוף צוות" תוכלי לשתף תוכניות עם עמיתות מאותה המתי״א בלבד ולנהל צ׳אט צוותי מאובטח.',
    fieldExamples:
      'הגדרות מורה: שרה כהן, מורת שילוב, מתי״א תל אביב. שיתוף מתי״א: שיתוף פעולה עם יעל רז (מרפאה בעיסוק) לצורך מעקב אחר ויסות חושי במליאה ובחצר.',
    actionLabel: 'פתיחת הגדרות מורה ושיתוף צוות',
    tip: 'שיתוף פעולה במתי״א מבודד באופן הרמטי: אף מורה מחוץ למתי״א שלך לא תוכל לצפות בתוכניות או בעמיתים.'
  }
];

/**
 * Complete, realistic Israeli Special Education Demo Student: "יונתן לוי"
 *
 * Demonstrates a full pedagogical journey:
 * - Second-grade student with ADHD and sensory regulation needs in an inclusion framework (שילוב)
 * - 3 ecological goals with criteria, timeline, tools, and partners
 * - 4 dated observations illustrating all 4 support levels
 * - Authentic parent voice responses submitted via WhatsApp
 * - Completed mid-year evaluation
 * - Full 15-section Ministry-format status report
 * - Matya collaboration record with OT therapist
 */
export const DEMO_STUDENT_DATA = {
  id: 'demo_yonatan_levi',
  isDemo: true,
  ownerEmail: 'demo@tala.internal',
  name: 'יונתן לוי (תלמיד לדוגמה)',
  gender: 'boy',
  idNumber: '039874512',
  birthDate: '15/04/2018',
  age: '7.5',
  educationalFramework: 'בית ספר ארזים',
  gradeClass: 'כיתה ב׳2',
  stage: 'school',
  stageSource: 'demo_dataset',
  stageReason: 'תלמיד כיתה ב׳ במסגרת בית ספר יסודי',
  stageUpdatedAt: '2025-09-01T08:00:00.000Z',
  schoolYear: 'תשפ"ו (2025-2026)',
  planType: 'תוכנית לימודים אישית (תל"א) - שילוב',
  address: 'רחוב הבנים 18, תל אביב',
  phone: '052-8765432',
  status: 'בטיוטה',
  isLocked: false,
  lastSavedAt: '12:00',
  createdAt: '2025-09-01T08:00:00.000Z',
  updatedAt: '2026-01-15T10:30:00.000Z',

  // Multidisciplinary Team & Matya
  matyaAffiliation: 'מתי״א תל אביב',
  schoolName: 'בית ספר יסודי "ארזים"',
  homeroomTeacher: 'מיכל שליו',
  inclusionTeacher: 'שרה כהן',
  integrationTeacher: 'שרה כהן',
  matyaCoordinator: 'דפנה לוין',
  occupationalTherapist: 'יעל רז (מרפאה בעיסוק, מתי״א)',
  paraMedicalTeam: 'יעל רז (מרפאה בעיסוק, מתי״א)',
  schoolPsychologist: 'ד״ר רונית שחר',
  psychologistName: 'ד״ר רונית שחר',
  learningSupportAssistant: 'נועה ברק',
  counselorName: 'גלית מור',

  // Section 2: General Profile & Background
  teacherFreeText:
    'יונתן לומד בכיתה רגילה ומקבל תמיכה שבועית מסל שילוב. מאובחן עם הפרעת קשב ופעלתנות יתר (ADHD) וקשיי ויסות חושי. מפגין סקרנות יוצאת דופן ואינטליגנציה תקינה, אך מתקשה להתמיד במשימות כתיבה ממושכות, מגלה מוסחות גבוהה ברעש כיתתי, ונזקק לתיווך במעברים בין שיעור להפסקה. בתחום האורייני קיים פער ברכישת שטף ודיוק בקריאה.',
  freeTextAnalyzed: true,
  studentGeneralBackground:
    'יונתן תלמיד כיתה ב׳2 בבית ספר יסודי "ארזים", מתגורר עם הוריו (ענת ויואב) ואחותו הצעירה. מאובחן עם הפרעת קשב ופעלתנות יתר (ADHD) ורגישות תחושתית שמיעתית ותנועתית. ילד סקרן, נבון ובעל דמיון עשיר ותשוקה למדע ובנייה בלגו.',
  studentSupportReceived:
    'שעות שילוב פרטניות וקבוצתיות במתי״א (הוראה מותאמת בשפה - שרה כהן), הדרכת מרפאה בעיסוק מהמתי״א (יעל רז) להתאמות סביבתיות וויסות חושי בכיתה, וליווי רגשי-התנהגותי.',
  studentMainGoal:
    'קידום יכולת הוויסות העצמי וההתארגנות של יונתן בכיתת האם ובחצר, לצד ביסוס שטף ודיוק בקריאה לחיזוק תחושת המסוגלות העצמית והשייכות החברתית.',
  talaFocusDomains: ['ניהול עצמי', 'קריאה והפקת משמעות', 'תקשורת ויחסים בינאישיים'],
  talaProfileRows: [
    {
      id: 'prof_self_management',
      category: 'התנהגותי - רגשי - חברתי',
      domain: 'ניהול עצמי',
      strengths: 'מוטיבציה גבוהה להצליח, נענה היטב לחיזוקים חיוביים ולתפקידים בכיתה, נעזר בעזרים חזותיים.',
      strengthsAndFacilitators: 'מוטיבציה גבוהה להצליח, נענה היטב לחיזוקים חיוביים ולתפקידים בכיתה, נעזר בעזרים חזותיים.',
      toStrengthen: 'ויסות תנועתי בישיבה ממושכת במליאה, התארגנות במעברים בין שיעור להפסקה והתמודדות עם תסכול.',
      areasToStrengthenAndBarriers: 'ויסות תנועתי בישיבה ממושכת במליאה, התארגנות במעברים בין שיעור להפסקה והתמודדות עם תסכול.'
    },
    {
      id: 'prof_communication',
      category: 'התנהגותי - רגשי - חברתי',
      domain: 'תקשורת ויחסים בינאישיים',
      strengths: 'ילד אהוב ואמפתי, יוזם אינטראקציות, בעל חוש הומור ויכולת הבעה מילולית עשירה.',
      strengthsAndFacilitators: 'ילד אהוב ואמפתי, יוזם אינטראקציות, בעל חוש הומור ויכולת הבעה מילולית עשירה.',
      toStrengthen: 'פתרון קונפליקטים במשחקי כדור בחצר ללא תגובה אימפולסיבית, פנייה לתיווך מבוגר בעת הצורך.',
      areasToStrengthenAndBarriers: 'פתרון קונפליקטים במשחקי כדור בחצר ללא תגובה אימפולסיבית, פנייה לתיווך מבוגר בעת הצורך.'
    },
    {
      id: 'prof_reading',
      category: 'לימודי',
      domain: 'קריאה והפקת משמעות',
      strengths: 'הבנת הנשמע מצוינת, אוצר מילים רחב וסקרנות רבה לטקסטים עיוניים על בעלי חיים ומדע.',
      strengthsAndFacilitators: 'הבנת הנשמע מצוינת, אוצר מילים רחב וסקרנות רבה לטקסטים עיוניים על בעלי חיים ומדע.',
      toStrengthen: 'דיוק ושטף בקריאה קולית של טקסט מנוקד, מעקב חזותי בין שורות והתמדה בקריאה עצמאית.',
      areasToStrengthenAndBarriers: 'דיוק ושטף בקריאה קולית של טקסט מנוקד, מעקב חזותי בין שורות והתמדה בקריאה עצמאית.'
    }
  ],
  strengthsExisting:
    'יכולת ביטוי מילולית עשירה וכושר שכנוע, אמפתיה רבה כלפי חבריו לכיתה, סקרנות רבה לתחומי מדע וטבע, זיכרון חזותי יוצא דופן ובנייה יצירתית ומורכבת בלגו.',
  strengthsToEmpower:
    'התמדה במשימות כתובות, ויסות תנועתי בזמן ישיבה ממושכת במליאת הבוקר, שימוש בכרטיסיות ניווט עצמי, ופתרון קונפליקטים מילוליים בחצר ללא התפרצות.',
  recommendations:
    'מומלץ לשלב הפוגות תנועתיות קצרות ויזומות, להשתמש בכרית ישיבה תחושתית ובסרגל קריאה מרווח, לחזק התנהגויות ויסות חיוביות, ולתווך במעברים באמצעות לוח זמנים חזותי.',
  evalReportFreeText:
    'במהלך מחצית א׳ חלה התקדמות בולטת ביכולת הוויסות העצמי של יונתן בכיתת האם. שילוב כרית הישיבה התחושתית וכרטיסיית הניווט העצמי אפשרו לו להשתתף במליאת הבוקר באופן עצמאי ברוב ימות השבוע. בתחום האורייני ניכרת עלייה במוטיבציה ובדיוק הקריאה במפגשים פרטניים.',
  evalReportSummary:
    'יונתן מגלה מעורבות גבוהה בתוכנית העבודה. שיתוף הפעולה בין מחנכת הכיתה, מורת השילוב, המרפאה בעיסוק במתי״א וההורים יצר מעטפת עקבית שמסייעת לו לחוות הצלחות יומיומיות בכיתה ובחצר.',
  statusReportUpdatedAt: '15/01/2026',
  statusReportSections: [
    {
      sectionNumber: 1,
      title: 'רקע כללי ומסגרת חינוכית',
      content: 'יונתן תלמיד כיתה ב׳2 בבי״ס "ארזים", משולב בכיתה רגילה עם תמיכה מסל שילוב ומתי״א תל אביב.'
    },
    {
      sectionNumber: 2,
      title: 'מוקדי כוח ותחומי עניין',
      content: 'יכולת ביטוי מילולית עשירה, אמפתיה חברתית, סקרנות למדע וטבע, זיכרון חזותי ויכולת בנייה מורכבת בלגו.'
    },
    {
      sectionNumber: 3,
      title: 'תפקוד התנהגותי, רגשי וויסות',
      content: 'התקדמות ניכרת בוויסות במליאת הבוקר (75% הצלחה) הודות לכרית ישיבה תחושתית וכרטיסיית ניווט עצמי.'
    },
    {
      sectionNumber: 4,
      title: 'תפקוד לימודי ואורייני',
      content: 'שיפור בדיוק הקריאה הקולית בטקסטים מנוקדים מרווחים (80% דיוק) בליווי סרגל קריאה וטקסטים מותאמים לתחומי עניינו.'
    },
    {
      sectionNumber: 5,
      title: 'תפקוד חברתי והשתלבות בהפסקות',
      content: 'השתלבות חיובית במשחקי כדור בחצר ושימוש גובר באסטרטגיית "עצור-חשוב" ופנייה למורה תורנית בעת קונפליקט.'
    },
    {
      sectionNumber: 6,
      title: 'שותפות עם ההורים והמלצות להמשך',
      content: 'קשר רציף והדוק עם ההורים (ענת ויואב). מומלץ להמשיך את המענה מסל שילוב והדרכת המתי״א גם במחצית ב׳.'
    }
  ],

  // Section 3: 3 Ecological Goals across Behavioral, Literacy, and Social domains
  goals: [
    {
      id: 'g_demo_1',
      title: 'ויסות והתארגנות במליאת הבוקר',
      domain: 'תפקוד התנהגותי ורגשי',
      subDomain: 'ויסות עצמי והתארגנות',
      mainGoal:
        'יונתן ישב במקומו וישתתף בפעילות מליאת הבוקר במשך 20 דקות רצופות, תוך שימוש עצמאי בכרית ישיבה תחושתית ובכרטיסיית ניווט עצמי.',
      objectives:
        '1. יונתן ישב על כרית תחושתית במליאת הבוקר במשך 20 דקות ב-4 מתוך 5 ימים.\n2. יונתן יסמן בכרטיסיית הניווט האישית בקשה להפוגה יזומה במקום קימה אימפולסיבית.',
      activityParticipation: 'השתתפות פעילה במפגש הבוקר הכיתתי, הקשבה לשיח והצבעה בטרם דיבור.',
      opportunities: 'שימוש בלוח זמנים חזותי שולחני, מתן תפקיד אחראי בתחילת הבוקר, חיזוק מיידי.',
      opportunitiesIntegration: 'תרגול מקדים של שימוש בכרטיסיית הניווט וזיהוי סימני הצפה ראשוניים.',
      opportunitiesTherapist: 'התאמת כרית פיתה תחושתית והדרכת הצוות על הפוגות תנועתיות מובנות (יעל רז, מרפאה בעיסוק).',
      learningAccommodations: 'מקום ישיבה קבוע בקדמת הכיתה הרחק מדלת הכניסה, שימוש בכרית תחושתית.',
      performanceStandard: 'ב-4 מתוך 5 ימי לימוד בשבוע, לאורך 3 שבועות עוקבים',
      evaluationCriteria: 'ב-4 מתוך 5 ימי לימוד בשבוע, לאורך 3 שבועות עוקבים',
      timeline: 'אמצע שנה (פברואר 2026)',
      duration: 'חצי שנה (מחצית)',
      environment: 'כיתת אם / מליאת בוקר',
      partners: 'מחנכת (מיכל שליו), מורת שילוב (שרה כהן), סייעת כיתתית',
      toolsAndMethods: 'לוח זמנים חזותי שולחני, כרית פיתה תחושתית, כרטיסיית בקשת הפוגה יזומה',
      progress: 75,
      currentProgress: 75,
      targetProgress: 80,
      achievementStatus: 'הושג חלקית',
      midYearEvaluation:
        'יונתן הגיע ל-75% הצלחה (יעד: 80%). הוא משתמש בכרית התחושתית באופן יומיומי ונשאר ישוב לאורך רוב מליאת הבוקר. בתצפית מ-12/12 השלים 20 דקות עצמאיות לחלוטין.',
      endYearEvaluation: '',
      notes: 'נרשמה התקדמות מצוינת לאחר הכנסת כרית הישיבה התחושתית בשיתוף המרפאה בעיסוק.',
      observations: [
        {
          id: 'obs_demo_4',
          date: '12/12/2025',
          timestamp: '2025-12-12T08:30:00.000Z',
          authorName: 'שרה כהן',
          supportLevel: 'עצמאי לחלוטין',
          note: 'השלים מליאת בוקר מלאה (20 דקות) ללא צורך בהתערבות או תזכורת. עשה שימוש עצמאי בכרטיסיית הניווט.'
        },
        {
          id: 'obs_demo_1',
          date: '18/10/2025',
          timestamp: '2025-10-18T08:25:00.000Z',
          authorName: 'שרה כהן',
          supportLevel: 'תזכורת מילולית',
          note: 'השתתף במליאת הבוקר 18 דקות עם כרית תחושתית. נזקק לתזכורת שקטה אחת בלבד כדי להישאר ישוב.'
        }
      ]
    },
    {
      id: 'g_demo_2',
      title: 'דיוק ושטף בקריאת טקסט מנוקד',
      domain: 'תפקוד שפתי ואורייני',
      subDomain: 'קריאה וכתיבה',
      mainGoal:
        'יונתן יקרא קטע מידע מנוקד באורך 40 מילים בשטף ובדיוק של 85%, ויאתר 2 פרטי מידע מפורשים בתשובה לשאלות הבנה.',
      objectives:
        '1. קריאה קולית של טקסט מנוקד (40 מילים) בדיוק של 85% בעזרת סרגל קריאה.\n2. איתור וסימון במרקר של 2 פרטי מידע מפורשים מתוך הטקסט.',
      activityParticipation: 'קריאת טקסטים עיוניים קצרים בשיעורי שפה ובמפגשים פרטניים בחדר שילוב.',
      opportunities: 'בחירת טקסטים בתחומי העניין של יונתן (בעלי חיים, דינוזאורים, חלל).',
      opportunitiesIntegration: 'הוראה מפורשת של תנועות, פירוק מילים להברות וקריאה חוזרת מתוזמנת.',
      opportunitiesTherapist: 'התאמת עיצוב חזותי של דף הקריאה להפחתת עומס חזותי.',
      learningAccommodations: 'טקסט מוגדל ברווח כפול, שימוש בסרגל קריאה חלופי והקראת שאלות.',
      performanceStandard: 'ב-3 מפגשים פרטניים עוקבים ברמת דיוק של 85%',
      evaluationCriteria: 'ב-3 מפגשים פרטניים עוקבים ברמת דיוק של 85%',
      timeline: 'סוף שנה (יוני 2026)',
      duration: 'עד סוף השנה',
      environment: 'חדר שילוב / למידה פרטנית',
      partners: 'מורת שילוב (שרה כהן), הורים (תרגול קריאה קולית בבית)',
      toolsAndMethods: 'סרגל קריאה חלופי, טקסט מוגדל ברווח כפול, מרקר להדגשת מילות מפתח',
      progress: 60,
      currentProgress: 60,
      targetProgress: 80,
      achievementStatus: 'בתהליך',
      midYearEvaluation:
        'נרשמה התקדמות ל-60% הצלחה. דיוק הקריאה בקטעים מנוקדים מרווחים השתפר ל-80%, והוא מצליח לאתר פרטי מידע בעזרת מרקר מנחה.',
      endYearEvaluation: '',
      notes: 'מוטיבציה גבוהה במיוחד כשהטקסט עוסק בבעלי חיים או בנושאי מדע.',
      observations: [
        {
          id: 'obs_demo_2',
          date: '04/11/2025',
          timestamp: '2025-11-04T10:15:00.000Z',
          authorName: 'שרה כהן',
          supportLevel: 'תיווך חלקי',
          note: 'קרא 35 מילים מתוך טקסט על בעלי חיים בדיוק של 80% תוך שימוש בסרגל קריאה. גילה מוטיבציה גבוהה.'
        }
      ]
    },
    {
      id: 'g_demo_3',
      title: 'פתרון קונפליקטים בהפסקות בחצר',
      domain: 'תפקוד חברתי',
      subDomain: 'מיומנויות חברתיות ומשחק',
      mainGoal:
        'יונתן ישתלב במשחק כדור בחצר ההפסקות במשך 15 דקות לפחות, ובמקרה של אי-הסכמה ישתמש באסטרטגיית "עצור-חשוב" או יפנה למורה התורנית ללא אלימות מילולית.',
      objectives:
        '1. השתתפות במשחק קבוצתי מובנה בחצר במשך 15 דקות ב-4 מתוך 5 הפסקות.\n2. פנייה עצמאית למורה תורנית או שימוש בכרטיסיית "עצור-חשוב" בעת ויכוח.',
      activityParticipation: 'משחק כדורגל ומשחקי חצר עם קבוצת השווים בהפסקות.',
      opportunities: 'שיחת הכנה קצרה של 2 דקות לפני היציאה להפסקה והגדרת תפקיד במשחק.',
      opportunitiesIntegration: 'סימולציות ומשחקי תפקידים של מצבי תסכול וניצחון/הפסד בחדר השילוב.',
      opportunitiesTherapist: 'תרגול טכניקות הרגעה נשימתיות ותחושתיות בעת הצפה רגשית.',
      learningAccommodations: 'תיווך מקדים לפני הפסקה ומתן משוב חיובי מיידי עם החזרה לכיתה.',
      performanceStandard: 'ב-4 מתוך 5 הפסקות בשבוע',
      evaluationCriteria: 'ב-4 מתוך 5 הפסקות בשבוע',
      timeline: 'אמצע שנה (פברואר 2026)',
      duration: 'חצי שנה (מחצית)',
      environment: 'חצר בית הספר / הפסקה פעילה',
      partners: 'מורה תורנית, מחנכת כיתה, מורת שילוב',
      toolsAndMethods: 'כרטיסיית כיס מאוירת עם 3 שלבי פתרון קונפליקט, שיחת הכנה קצרה לפני היציאה לחצר',
      progress: 70,
      currentProgress: 70,
      targetProgress: 80,
      achievementStatus: 'הושג חלקית',
      midYearEvaluation:
        'התקדמות ל-70% הצלחה. יונתן מפנים את מודל "עצור-חשוב" ופונה לעזרת המורה התורנית בהפסקות בעת תסכול במקום להגיב באימפולסיביות.',
      endYearEvaluation: '',
      notes: 'משתף פעולה יפה במשחקים מובנים; זקוק לתזכורת לקראת סיום ההפסקה.',
      observations: [
        {
          id: 'obs_demo_3',
          date: '22/11/2025',
          timestamp: '2025-11-22T10:05:00.000Z',
          authorName: 'מיכל שליו',
          supportLevel: 'עצמאי לחלוטין',
          note: 'שיחק כדורגל בחצר 15 דקות. בעת ויכוח על גול ניגש מיד למורה התורנית וביקש תיווך במקום לצעוק.'
        }
      ]
    }
  ],

  // Section 5: Daily Tracking Observations illustrating 4 support levels
  observations: [
    {
      id: 'obs_demo_1',
      date: '18/10/2025',
      goalId: 'g_demo_1',
      goalTitle: 'ויסות והתארגנות במליאת הבוקר',
      teacherName: 'שרה כהן',
      supportLevel: 'verbal_prompt',
      supportLevelLabel: 'תזכורת מילולית',
      text: 'השתתף במליאת הבוקר 18 דקות עם כרית תחושתית. נזקק לתזכורת שקטה אחת בלבד כדי להישאר ישוב.'
    },
    {
      id: 'obs_demo_2',
      date: '04/11/2025',
      goalId: 'g_demo_2',
      goalTitle: 'דיוק ושטף בקריאת טקסט מנוקד',
      teacherName: 'שרה כהן',
      supportLevel: 'partial_mediation',
      supportLevelLabel: 'תיווך חלקי',
      text: 'קרא 35 מילים מתוך טקסט על בעלי חיים בדיוק של 80% תוך שימוש בסרגל קריאה. גילה מוטיבציה גבוהה.'
    },
    {
      id: 'obs_demo_3',
      date: '22/11/2025',
      goalId: 'g_demo_3',
      goalTitle: 'פתרון קונפליקטים בהפסקות בחצר',
      teacherName: 'מיכל שליו',
      supportLevel: 'independent',
      supportLevelLabel: 'עצמאי לחלוטין',
      text: 'שיחק כדורגל בחצר 15 דקות. בעת ויכוח על גול ניגש מיד למורה התורנית וביקש תיווך במקום לצעוק.'
    },
    {
      id: 'obs_demo_4',
      date: '12/12/2025',
      goalId: 'g_demo_1',
      goalTitle: 'ויסות והתארגנות במליאת הבוקר',
      teacherName: 'שרה כהן',
      supportLevel: 'independent',
      supportLevelLabel: 'עצמאי לחלוטין',
      text: 'השלים מליאת בוקר מלאה (20 דקות) ללא צורך בהתערבות או תזכורת. עשה שימוש עצמאי בכרטיסיית הניווט.'
    }
  ],

  // Section 7: Parent Voice (received via secure WhatsApp invitation)
  parentVoice: {
    isSubmitted: true,
    submittedAt: '2025-10-15T17:42:00.000Z',
    parentNames: 'ענת ויואב לוי',
    strengths:
      'יונתן ילד מלא קסם ורגישות. בבית הוא בונה עולמות שלמים בלגו במשך שעות בריכוז מדהים. הוא מאוד אוהב לעזור עם בעלי חיים ותמיד מרגיש כשמישהו סביבו עצוב.',
    difficulties:
      'קשה לו מאוד כשיש רעש גדול או עומס של הוראות בבת אחת. כשהוא מתוסכל משיעורי בית בקריאה הוא לפעמים מתפרץ או בוכה שהוא "לא רוצה לנסות".',
    priorities:
      'הכי חשוב לנו שיונתן יחווה הצלחה, ירגיש בטוח ושייך בכיתה, שישפר את הביטחון בקריאה ושילמד לבקש הפוגה כשהוא מוצף במקום להתפרץ.',
    additionalNotes: 'נשמח לעדכון תקופתי בוואטסאפ או בטלפון לגבי התקדמותו בישיבה במליאה.'
  },

  // Section 8: Mid-Year Evaluation synthesizing goals and field observations
  midYearEvaluation: {
    evalPeriod: 'מחצית א׳ תשפ"ו',
    evalDate: '15/01/2026',
    generalSummary:
      'במהלך מחצית א׳ חלה התקדמות בולטת ביכולת הוויסות העצמי של יונתן בכיתת האם. שילוב כרית הישיבה התחושתית וכרטיסיית הניווט העצמי אפשרו לו להשתתף במליאת הבוקר באופן עצמאי ברוב ימות השבוע. בתחום האורייני ניכרת עלייה במוטיבציה ובדיוק הקריאה במפגשים פרטניים, במיוחד בטקסטים הקשורים לתחומי עניינו. בחצר חלה הפחתה משמעותית בהתפרצויות בעת קונפליקט.',
    goalEvals: [
      {
        goalId: 'g_demo_1',
        title: 'ויסות והתארגנות במליאת הבוקר',
        evalText:
          'יונתן הגיע ל-75% הצלחה (יעד: 80%). הוא משתמש בכרית התחושתית באופן יומיומי ונשאר ישוב לאורך רוב מליאת הבוקר. בתצפית מ-12/12 השלים 20 דקות עצמאיות לחלוטין.',
        recommendation: 'להמשיך בתוכנית תוך עידוד לשימוש עצמאי בכרטיסיית ההפוגה.'
      },
      {
        goalId: 'g_demo_2',
        title: 'דיוק ושטף בקריאת טקסט מנוקד',
        evalText:
          'נרשמה התקדמות ל-60% הצלחה. דיוק הקריאה בקטעים מנוקדים מרווחים השתפר ל-80%, והוא מצליח לאתר פרטי מידע בעזרת מרקר מנחה.',
        recommendation: 'להמשיך תרגול פרטני שבועי ולהגדיל בהדרגה את אורך הטקסט.'
      },
      {
        goalId: 'g_demo_3',
        title: 'פתרון קונפליקטים בהפסקות בחצר',
        evalText:
          'התקדמות ל-70% הצלחה. יונתן מפנים את מודל "עצור-חשוב" ופונה לעזרת המורה התורנית בהפסקות בעת תסכול במקום להגיב באימפולסיביות.',
        recommendation: 'להמשיך שיחות הכנה קצרות לפני היציאה לחצר ולחזק התנהגות שיתופית.'
      }
    ]
  },

  // Section 9: 15-Section Status Report Data
  statusReport: {
    reportType: 'דוח מצב תפקודי לוועדת אפיון וזכאות',
    academicYear: 'תשפ"ו (2025-2026)',
    sectionsCount: 15,
    keySectionsSummary: {
      frameworkRationale: 'זכאות לסל שילוב בבית ספר יסודי לחיזוק אורייני, רגשי והתנהגותי',
      strengthsSummary: 'אינטליגנציה תקינה, שפה עשירה, אמפתיה חברתית, יכולת בנייה יצירתית',
      difficultiesSummary: 'הפרעת קשב ופעלתנות יתר, מוסחות ברעש, עומס תחושתי ופער ברכישת שטף קריאה',
      interventionsProvided: 'הוראה מותאמת בשילוב, ליווי מרפאה בעיסוק מתי״א, התאמות סביבתיות בכיתה',
      parentPartnership: 'קשר רציף ותומך עם ההורים, תרגול משותף בבית והסכמה מלאה על היעדים',
      recommendationsForNextYear: 'המשך זכאות לתמיכה מסל שילוב לקראת כיתה ג׳ עם דגש על שפה וויסות'
    }
  },

  // Section 10: Team Collaboration & Matya Sharing
  sharedWith: ['yael.ot@matya-tlv.org.il'],
  sharedWithDetails: [
    {
      email: 'yael.ot@matya-tlv.org.il',
      name: 'יעל רז',
      role: 'מרפאה בעיסוק (מתי״א תל אביב)',
      sharedAt: '2025-09-10T11:00:00.000Z',
      permission: 'edit_notes'
    }
  ],
  teamMessages: [
    {
      id: 'tm_1',
      senderEmail: 'sarah.c@school-erez.org.il',
      senderName: 'שרה כהן (מורת שילוב)',
      timestamp: '2025-10-18T13:15:00.000Z',
      text: 'הוספתי את מטרות הוויסות לישיבה במליאה. כרית הפיתה שהמלצת עליה עושה פלאים!'
    },
    {
      id: 'tm_2',
      senderEmail: 'yael.ot@matya-tlv.org.il',
      senderName: 'יעל רז (מרפאה בעיסוק מתי״א)',
      timestamp: '2025-10-19T09:40:00.000Z',
      text: 'שמחה מאוד לשמוע. לקראת ישיבת המעקב אוסיף תרגיל התארגנות קצר לפני היציאה לחצר.'
    }
  ]
};

/**
 * Returns a step definition by its 1-based numerical ID.
 */
export function getStepById(stepId) {
  const numericId = Number(stepId);
  return ONBOARDING_STEPS.find((s) => s.id === numericId) || null;
}

/**
 * Returns the next step in the journey, or null if at the end.
 */
export function getNextStep(currentStepId) {
  const nextId = Number(currentStepId) + 1;
  return nextId <= ONBOARDING_TOTAL_STEPS ? getStepById(nextId) : null;
}

/**
 * Returns the previous step in the journey, or null if at the start.
 */
export function getPreviousStep(currentStepId) {
  const prevId = Number(currentStepId) - 1;
  return prevId >= 1 ? getStepById(prevId) : null;
}

/**
 * Checks whether an object is the isolated demo student record.
 */
export function isDemoStudent(student) {
  if (!student) return false;
  return Boolean(
    student.isDemo === true ||
      student.id === 'demo_yonatan_levi' ||
      (student.ownerEmail && String(student.ownerEmail).includes('demo@tala.internal'))
  );
}

/**
 * Creates a fresh clone of the demo student plan with current timestamps.
 */
export function createFreshDemoStudent() {
  const cloned = JSON.parse(JSON.stringify(DEMO_STUDENT_DATA));
  cloned.lastSavedAt = new Date().toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return cloned;
}
