export const INITIAL_BEHAVIOR_STUDENTS: any[] = [
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
        { id: 'tr_itai_1', date: '2026-10-12', period: 'שיעור 2', targetBehaviorOccurrences: 6, replacementBehaviorUsed: 1, reinforcementDelivered: true, durationMinutes: 8, notes: 'הרמת כרטיסייה פעם אחת, צמצום משך הסירוב' },
        { id: 'tr_itai_2', date: '2026-10-14', period: 'שיעור 1', targetBehaviorOccurrences: 6, replacementBehaviorUsed: 1, reinforcementDelivered: false, durationMinutes: 7, notes: 'עומס כתיבה בפתיחת שיעור, הצוות איחר בהגשת החיזוק' },
        { id: 'tr_itai_3', date: '2026-10-16', period: 'שיעור 2', targetBehaviorOccurrences: 5, replacementBehaviorUsed: 2, reinforcementDelivered: true, durationMinutes: 5, notes: 'השתמש בהפסקה יזומה פעמיים, תגובה רגועה ומותאמת' },
        { id: 'tr_itai_4', date: '2026-10-19', period: 'שיעור 3', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 3, reinforcementDelivered: true, durationMinutes: 4, notes: 'ביקש עזרה בכתיבה, השלים פסקה אחת בהצלחה' },
        { id: 'tr_itai_5', date: '2026-10-22', period: 'שיעור 1', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 3, reinforcementDelivered: true, durationMinutes: 4, notes: 'השתמש בכרטיסייה פעמיים, נרגע במהירות' },
        { id: 'tr_itai_6', date: '2026-10-25', period: 'שיעור 2', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 4, reinforcementDelivered: true, durationMinutes: 3, notes: 'שיפור ברור – לא נרשמה שום קריעת דפים' },
        { id: 'tr_itai_7', date: '2026-10-29', period: 'שיעור 4', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 5, reinforcementDelivered: true, durationMinutes: 2, notes: 'הקליד במחשב נייד ונעזר בכרטיסיות פירוק שלבים' },
        { id: 'tr_itai_8', date: '2026-11-03', period: 'שיעור 2', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 2, notes: 'שיתוף פעולה חיובי לאורך מרבית השיעור' },
        { id: 'tr_itai_9', date: '2026-11-05', period: 'שיעור 3', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 1, notes: 'התמודד יפה עם מטלה קצרה, יצא להפסקה יזומה אחת' },
        { id: 'tr_itai_10', date: '2026-11-08', period: 'שיעור 1', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 7, reinforcementDelivered: true, durationMinutes: 1, notes: 'שיעור מלא עם אירוע סירוב קצר בודד בתחילת השיעור' },
        { id: 'tr_itai_11', date: '2026-11-12', period: 'שיעור 3', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 8, reinforcementDelivered: true, durationMinutes: 0, notes: 'שליטה עצמית מרשימה, עבד 25 דקות במחשב וזכה בחיזוק' },
        { id: 'tr_itai_12', date: '2026-11-15', period: 'שיעור 2', targetBehaviorOccurrences: 0, replacementBehaviorUsed: 8, reinforcementDelivered: true, durationMinutes: 0, notes: 'שיעור מושלם ללא אף סירוב! השלים את כל שלבי הכתיבה במחשב' }
      ],
      isLocked: false,
      updatedAt: '2026-11-15T12:00:00Z'
    },
    behaviorObservations: [
      { id: 'obs_i_1', timestamp: 1792137600000, dateTime: '2026-10-12 09:15', location: 'כיתה ג2', activity: 'שיעור 2 (שפה)', antecedent: 'חלוקת דף משימה בכתיבה עם 6 שאלות', behavior: 'דחיפת השולחן והשלכת מחברת לרצפה', intensity: 'moderate', durationMinutes: 8, consequence: 'הפניה שקטה לכרטיסיית הפסקה', perceivedFunction: 'escape', notes: 'נרגע לאחר 8 דקות' },
      { id: 'obs_i_2', timestamp: 1792310400000, dateTime: '2026-10-14 08:30', location: 'כיתה ג2', activity: 'שיעור 1 (עברית)', antecedent: 'הוראה להעתיק 4 שורות מהלוח', behavior: 'קריעת דף שורות וסירוב מילולי נחרץ', intensity: 'severe', durationMinutes: 7, consequence: 'הרחקת גירויים והמתנה שקטה', perceivedFunction: 'escape', notes: 'הצוות שמר על איפוק' },
      { id: 'obs_i_3', timestamp: 1792483200000, dateTime: '2026-10-16 10:00', location: 'כיתה ג2', activity: 'שיעור 2 (שפה)', antecedent: 'משימת כתיבת משפטים', behavior: 'אמר "נמאס לי" והרים כרטיסיית הפסקה', intensity: 'mild', durationMinutes: 3, consequence: 'אישור הפסקה מיידי וחיזוק מילולי חם', perceivedFunction: 'escape', notes: 'שימוש חיובי ראשון במיומנות חלופית' },
      { id: 'obs_i_4', timestamp: 1792742400000, dateTime: '2026-10-19 10:45', location: 'כיתה ג2', activity: 'שיעור 3 (הבנת הנקרא)', antecedent: 'שאלה מורכבת במבחן פנימי', behavior: 'ביקש עזרה מילולית מהמורה שירה', intensity: 'mild', durationMinutes: 2, consequence: 'סיוע בפירוק השאלה לשני חלקים', perceivedFunction: 'escape', notes: 'השלים את התשובה בהצלחה' },
      { id: 'obs_i_5', timestamp: 1793001600000, dateTime: '2026-10-22 08:40', location: 'כיתה ג2', activity: 'שיעור 1 (עברית)', antecedent: 'פתיחת חוברת בעמוד חדש', behavior: 'השתמש בכרטיסיית הפסקה ויצא לשתות מים', intensity: 'mild', durationMinutes: 4, consequence: 'חזר עצמאית והמשיך בעבודה', perceivedFunction: 'escape', notes: 'חזרה עצמאית מעודדת מאוד' },
      { id: 'obs_i_6', timestamp: 1793260800000, dateTime: '2026-10-25 09:30', location: 'כיתה ג2', activity: 'שיעור 2 (כתיבה)', antecedent: 'משימת סיכום פרק', behavior: 'סירוב ראשוני של דקה, ואז פתיחת המחשב הנייד', intensity: 'mild', durationMinutes: 2, consequence: 'חיזוק במדבקת כוכב', perceivedFunction: 'escape', notes: 'הקלדה חלקה של 4 שורות' },
      { id: 'obs_i_7', timestamp: 1793606400000, dateTime: '2026-10-29 11:45', location: 'כיתה ג2', activity: 'שיעור 4 (תנ"ך)', antecedent: 'הוראה לסמן שורות בספר', behavior: 'הרמת כרטיסיית הפסקה ובקשת טאבלט', intensity: 'mild', durationMinutes: 3, consequence: 'מתן אישור לעבודה בטאבלט', perceivedFunction: 'escape', notes: 'שימוש עצמאי באסטרטגיה' },
      { id: 'obs_i_8', timestamp: 1794038400000, dateTime: '2026-11-03 09:20', location: 'כיתה ג2', activity: 'שיעור 2 (שפה)', antecedent: 'דף עבודה דו-צדדי', behavior: 'קיפל את הדף לשניים וביקש לעשות צד אחד', intensity: 'mild', durationMinutes: 1, consequence: 'המורה הסכימה בחום', perceivedFunction: 'escape', notes: 'משא ומתן תקין ומותאם' },
      { id: 'obs_i_9', timestamp: 1794470400000, dateTime: '2026-11-08 08:30', location: 'כיתה ג2', activity: 'שיעור 1 (פתיחת יום)', antecedent: 'כתיבת מטרות יומיות', behavior: 'סירוב מילולי קצר "אין לי כוח", הרים כרטיסייה', intensity: 'mild', durationMinutes: 2, consequence: 'הפוגה קצרה וחזרה לכתיבה', perceivedFunction: 'escape', notes: 'נרגע במהירות' },
      { id: 'obs_i_10', timestamp: 1794816000000, dateTime: '2026-11-12 11:15', location: 'כיתה ג2', activity: 'שיעור 3 (שפה)', antecedent: 'משימת סיכום שבועי', behavior: 'עבודה רצופה של 25 דקות במחשב הנייד ללא סירוב', intensity: 'mild', durationMinutes: 0, consequence: 'זכייה ב-5 דקות סימולטור טיסה', perceivedFunction: 'escape', notes: 'התנהגות מטרה מאתגרת: 0 אירועים בשיעור זה!' }
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
        { id: 'tr_noam_1', date: '2026-10-14', period: 'שיעור 1', targetBehaviorOccurrences: 8, replacementBehaviorUsed: 2, reinforcementDelivered: true, durationMinutes: 6, notes: 'מונה לעוזר הגננת לחלוקת תופים, התלהב מהתפקיד' },
        { id: 'tr_noam_2', date: '2026-10-16', period: 'שיעור 1', targetBehaviorOccurrences: 7, replacementBehaviorUsed: 2, reinforcementDelivered: true, durationMinutes: 5, notes: 'הרמת יד שקטה פעמיים, צעקה כשהפנו מבט לילד אחר' },
        { id: 'tr_noam_3', date: '2026-10-19', period: 'שיעור 2', targetBehaviorOccurrences: 7, replacementBehaviorUsed: 3, reinforcementDelivered: true, durationMinutes: 4, notes: 'הרמת יד שקטה 3 פעמים לאורך המפגש' },
        { id: 'tr_noam_4', date: '2026-10-21', period: 'שיעור 1', targetBehaviorOccurrences: 6, replacementBehaviorUsed: 3, reinforcementDelivered: false, durationMinutes: 5, notes: 'הגננת הייתה עסוקה עם הורה, נועם קפץ על השטיח' },
        { id: 'tr_noam_5', date: '2026-10-24', period: 'שיעור 1', targetBehaviorOccurrences: 5, replacementBehaviorUsed: 4, reinforcementDelivered: true, durationMinutes: 3, notes: 'התעלמות מתוכננת של הצוות קיצרה מאוד את משך ההפרעות' },
        { id: 'tr_noam_6', date: '2026-10-28', period: 'שיעור 1', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 5, reinforcementDelivered: true, durationMinutes: 2, notes: 'שיפור ניכר בישיבה על הכרית האישית בשורה הראשונה' },
        { id: 'tr_noam_7', date: '2026-11-02', period: 'שיעור 2', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 2, notes: 'קיבל מדבקת כוכב ונבחר לבחור את שיר הסיום' },
        { id: 'tr_noam_8', date: '2026-11-04', period: 'שיעור 1', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 1, notes: 'הצביע והמתין בסבלנות לתורו' },
        { id: 'tr_noam_9', date: '2026-11-07', period: 'שיעור 1', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 7, reinforcementDelivered: true, durationMinutes: 1, notes: 'הצביע בשקט וקיבל את זכות הדיבור ראשון' },
        { id: 'tr_noam_10', date: '2026-11-10', period: 'שיעור 1', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 7, reinforcementDelivered: true, durationMinutes: 1, notes: 'עזר בחלוקת לוחות ציור, שיתוף פעולה נפלא' },
        { id: 'tr_noam_11', date: '2026-11-13', period: 'שיעור 1', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 8, reinforcementDelivered: true, durationMinutes: 0, notes: 'מפגש שקט כמעט לחלוטין! הצוות נלהב מהתוצאה' },
        { id: 'tr_noam_12', date: '2026-11-15', period: 'שיעור 1', targetBehaviorOccurrences: 0, replacementBehaviorUsed: 8, reinforcementDelivered: true, durationMinutes: 0, notes: 'אפס הפרעות! ישב לאורך כל המפגש, הצביע וקיבל חיזוק חם' }
      ],
      isLocked: false,
      updatedAt: '2026-11-15T12:00:00Z'
    },
    behaviorObservations: [
      { id: 'obs_n_1', timestamp: 1792310400000, dateTime: '2026-10-14 09:00', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש בוקר)', antecedent: 'הגננת פנתה לילדה אחרת שסיפרה חוויות', behavior: 'צעק "תראו אותי" וקפץ מהשטיח', intensity: 'moderate', durationMinutes: 5, consequence: 'הגננת הזמינה אותו לחלק את התופים', perceivedFunction: 'attention', notes: 'נרגע מיד כשקיבל תפקיד' },
      { id: 'obs_n_2', timestamp: 1792483200000, dateTime: '2026-10-16 09:15', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש בוקר)', antecedent: 'ילד אחר דיבר במפגש', behavior: 'הפלת כסא פלסטיק וצחוק רם', intensity: 'moderate', durationMinutes: 4, consequence: 'התעלמות שקטה והפניית קשב לילד שמצביע', perceivedFunction: 'attention', notes: 'נרגע ברגע שהוחזר המיקוד' },
      { id: 'obs_n_3', timestamp: 1792742400000, dateTime: '2026-10-19 09:10', location: 'שטיח הגן', activity: 'שיעור 2 (מפגש סיפור)', antecedent: 'שאלה של הגננת על מזג האוויר', behavior: 'הרמת יד שקטה ללא צעקה', intensity: 'mild', durationMinutes: 1, consequence: 'פנייה חמה: "כל הכבוד שנועם מצביע בשקט"', perceivedFunction: 'attention', notes: 'חיזוק מיידי מוצלח' },
      { id: 'obs_n_4', timestamp: 1792915200000, dateTime: '2026-10-21 09:00', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש בוקר)', antecedent: 'תור ארוך במענה לשאלות', behavior: 'קפיצה על ילד לידו בניסיון למשוך תשומת לב', intensity: 'moderate', durationMinutes: 4, consequence: 'הרחקה רגועה לכרית האישית ותזכורת להרמת יד', perceivedFunction: 'attention', notes: 'התאושש לאחר תזכורת' },
      { id: 'obs_n_5', timestamp: 1793174400000, dateTime: '2026-10-24 09:05', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש סיפור)', antecedent: 'קריאת ספר על ידי הגננת', behavior: 'הפלת כרית וצעקת קולות חיות', intensity: 'mild', durationMinutes: 2, consequence: 'התעלמות מתוכננת – הגננת המשיכה לקרוא', perceivedFunction: 'attention', notes: 'הפסיק תוך פחות מ-2 דקות' },
      { id: 'obs_n_6', timestamp: 1793520000000, dateTime: '2026-10-28 09:15', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש בוקר)', antecedent: 'דיון על עונות השנה', behavior: 'הצבעה שקטה וישיבה זקופה', intensity: 'mild', durationMinutes: 0, consequence: 'קיבל מדבקת כוכב ונבחר להחזיק את תמונת הסתיו', perceivedFunction: 'attention', notes: 'התרגש מאוד מהתפקיד' },
      { id: 'obs_n_7', timestamp: 1793952000000, dateTime: '2026-11-02 09:00', location: 'שטיח הגן', activity: 'שיעור 2 (מפגש מוזיקה)', antecedent: 'שיר פתיחה בתנועה', behavior: 'ריקוד מותאם עם החברים ללא קפיצה עליהם', intensity: 'mild', durationMinutes: 0, consequence: 'משוב חיובי קבוצתי', perceivedFunction: 'attention', notes: 'השתלבות קבוצתית מעולה' },
      { id: 'obs_n_8', timestamp: 1794124800000, dateTime: '2026-11-04 09:10', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש בוקר)', antecedent: 'חלוקת לוחות מחיקים', behavior: 'המתנה בישיבה שקטה עד הגעת תורו', intensity: 'mild', durationMinutes: 0, consequence: 'קיבל לוח ראשון עם מחמאה אישית', perceivedFunction: 'attention', notes: 'סבלנות מרשימה' },
      { id: 'obs_n_9', timestamp: 1794384000000, dateTime: '2026-11-07 09:20', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש סיכום שבוע)', antecedent: 'שיחה קבוצתית על השבת', behavior: 'הצבעה רגועה והמתנה לתורו', intensity: 'mild', durationMinutes: 0, consequence: 'זכות דיבור ראשון', perceivedFunction: 'attention', notes: 'דיבר בנעימות ושיתף על משחק בלגו' },
      { id: 'obs_n_10', timestamp: 1794902400000, dateTime: '2026-11-13 09:00', location: 'שטיח הגן', activity: 'שיעור 1 (מפגש בוקר)', antecedent: 'הגננת פנתה לילד חדש שהצטרף', behavior: 'חיוך והצבעה שקטה', intensity: 'mild', durationMinutes: 0, consequence: 'קריצה חמה מהגננת וטפיחה מעודדת על הכתף', perceivedFunction: 'attention', notes: 'שליטה עצמית מושלמת' }
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
        { id: 'tr_dan_1', date: '2026-10-15', period: 'שיעור 1', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 2, reinforcementDelivered: true, durationMinutes: 8, notes: 'הרכיב אוזניות אך נלחץ מעט ברגע הצלצול' },
        { id: 'tr_dan_2', date: '2026-10-18', period: 'שיעור 3', targetBehaviorOccurrences: 4, replacementBehaviorUsed: 2, reinforcementDelivered: false, durationMinutes: 7, notes: 'צלצול הופעל במפתיע ללא הטרמה, דניאל כיסה אוזניים ורץ' },
        { id: 'tr_dan_3', date: '2026-10-21', period: 'שיעור 3', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 3, reinforcementDelivered: true, durationMinutes: 5, notes: 'יצא 3 דקות מוקדם – מעבר רגוע בהרבה' },
        { id: 'tr_dan_4', date: '2026-10-25', period: 'שיעור 4', targetBehaviorOccurrences: 3, replacementBehaviorUsed: 3, reinforcementDelivered: true, durationMinutes: 4, notes: 'הרכבת אוזניות עצמאית בעקבות התראת רטט בשעון' },
        { id: 'tr_dan_5', date: '2026-10-27', period: 'שיעור 4', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 4, reinforcementDelivered: true, durationMinutes: 3, notes: 'הגיע לחדר שלווה עצמאית ללא שום טריקת דלת' },
        { id: 'tr_dan_6', date: '2026-10-30', period: 'שיעור 2', targetBehaviorOccurrences: 2, replacementBehaviorUsed: 4, reinforcementDelivered: true, durationMinutes: 2, notes: 'מעבר שקט עם אוזניות במסדרון' },
        { id: 'tr_dan_7', date: '2026-11-02', period: 'שיעור 5', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 5, reinforcementDelivered: true, durationMinutes: 1, notes: 'ענידת אוזניות מוצלחת ויציאה מוקדמת לפני ההמולה' },
        { id: 'tr_dan_8', date: '2026-11-05', period: 'שיעור 3', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 5, reinforcementDelivered: true, durationMinutes: 1, notes: 'שהייה בחדר המוזיקה, ויסות מלא' },
        { id: 'tr_dan_9', date: '2026-11-08', period: 'שיעור 3', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 1, notes: 'שהה בחדר המוזיקה, רגוע ונינוח' },
        { id: 'tr_dan_10', date: '2026-11-11', period: 'שיעור 2', targetBehaviorOccurrences: 1, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 0, notes: 'מעבר שקט עם אוזניות, ללא סימני מצוקה' },
        { id: 'tr_dan_11', date: '2026-11-14', period: 'שיעור 4', targetBehaviorOccurrences: 0, replacementBehaviorUsed: 6, reinforcementDelivered: true, durationMinutes: 0, notes: 'יום ללא אף התפרצות או טריקת דלת! הצלחה מדהימה' },
        { id: 'tr_dan_12', date: '2026-11-16', period: 'שיעור 3', targetBehaviorOccurrences: 0, replacementBehaviorUsed: 7, reinforcementDelivered: true, durationMinutes: 0, notes: 'מעבר עצמאי לחלוטין עם אוזניות לחדר שלווה, חיוך ושלווה' }
      ],
      isLocked: false,
      updatedAt: '2026-11-16T08:00:00Z'
    },
    behaviorObservations: [
      { id: 'obs_d_1', timestamp: 1792396800000, dateTime: '2026-10-15 08:30', location: 'מסדרון קומה ב', activity: 'שיעור 1 (מעבר בוקר)', antecedent: 'צלצול חזק של הפעמון בכניסה', behavior: 'כיסה אוזניים ונכנס בריצה לכיתה תוך טריקת דלת', intensity: 'severe', durationMinutes: 8, consequence: 'הגשת אוזניות על ידי הסייע ושהייה בפינה שקטה', perceivedFunction: 'sensory', notes: 'נרגע ברגע שהרכיב אוזניות' },
      { id: 'obs_d_2', timestamp: 1792656000000, dateTime: '2026-10-18 10:00', location: 'מסדרון כיתות', activity: 'שיעור 3 (הפסקת עשר)', antecedent: 'צלצול פתאומי ללא התראה מוקדמת', behavior: 'צעקות זעם ובריחה לכיוון השירותים', intensity: 'moderate', durationMinutes: 6, consequence: 'ליווי שקט של הסייע ללא מגע עד להרגעה', perceivedFunction: 'sensory', notes: 'ההטרמה חיונית למניעת הצפה' },
      { id: 'obs_d_3', timestamp: 1792915200000, dateTime: '2026-10-21 10:15', location: 'כיתה ז3', activity: 'שיעור 3 (הפסקת עשר)', antecedent: 'המולת תלמידים ביציאה להפסקה', behavior: 'ענידת אוזניות 3 דקות לפני הצלצול', intensity: 'mild', durationMinutes: 0, consequence: 'מעבר רגוע ושקט לחדר שלווה', perceivedFunction: 'sensory', notes: 'יישום מצטיין של המיומנות החלופית' },
      { id: 'obs_d_4', timestamp: 1793260800000, dateTime: '2026-10-25 11:55', location: 'כיתה ז3', activity: 'שיעור 4 (מעבר צהריים)', antecedent: 'התראת רטט בשעון היד לקראת סיום שיעור', behavior: 'הוצאת האוזניות מהתיק וענידתן בשקט', intensity: 'mild', durationMinutes: 0, consequence: 'חיזוק מילולי שקט מהמורה יורם', perceivedFunction: 'sensory', notes: 'תגובה עצמאית להתראה' },
      { id: 'obs_d_5', timestamp: 1793433600000, dateTime: '2026-10-27 12:45', location: 'חדר שלווה', activity: 'שיעור 4 (הפוגה חושית)', antecedent: 'רעש שיפוצים מהרחוב מחוץ לחלון', behavior: 'הדלקת מוזיקת גשם מרגיעה באוזניות', intensity: 'mild', durationMinutes: 4, consequence: 'ויסות עצמי מלא ללא התערבות צוות', perceivedFunction: 'sensory', notes: 'עצמאות מלאה בוויסות' },
      { id: 'obs_d_6', timestamp: 1793692800000, dateTime: '2026-10-30 09:45', location: 'מסדרון כניסה', activity: 'שיעור 2 (הפסקה)', antecedent: 'קבוצת תלמידים צעקה במסדרון', behavior: 'הגברת הווליום של מנגינת הרקע והליכה בקצב מדוד', intensity: 'mild', durationMinutes: 2, consequence: 'הגעה שלווה לכיתה הבאה', perceivedFunction: 'sensory', notes: 'התגברות על טריגר סביבתי' },
      { id: 'obs_d_7', timestamp: 1793952000000, dateTime: '2026-11-02 13:30', location: 'שער בית הספר', activity: 'שיעור 5 (סיום יום והסעות)', antecedent: 'צפירות של רכבי הסעות ומנועי אוטובוס', behavior: 'ענידת אוזניות והליכה שקטה להסעה', intensity: 'mild', durationMinutes: 0, consequence: 'מחמאה מהסייע המלווה', perceivedFunction: 'sensory', notes: 'עלייה שלווה להסעה' },
      { id: 'obs_d_8', timestamp: 1794211200000, dateTime: '2026-11-05 10:45', location: 'חדר מוזיקה', activity: 'שיעור 3 (הפסקה גדולה)', antecedent: 'רעש עז במסדרון הראשי', behavior: 'כניסה עצמאית לחדר מוזיקה וסגירת הדלת ברכות', intensity: 'mild', durationMinutes: 0, consequence: 'זמן נגינה שקט באורגנית', perceivedFunction: 'sensory', notes: 'בחירה מוצלחת במרחב ויסות' },
      { id: 'obs_d_9', timestamp: 1794470400000, dateTime: '2026-11-08 11:45', location: 'חדר מוזיקה', activity: 'שיעור 3 (הפסקה גדולה)', antecedent: 'המולה סביב הקפיטריה', behavior: 'נגינה שקטה באורגנית עם אוזניות', intensity: 'mild', durationMinutes: 0, consequence: 'הנאה ותחושת רוגע ושליטה', perceivedFunction: 'sensory', notes: 'פתרון פנטסטי להפסקות' },
      { id: 'obs_d_10', timestamp: 1794988800000, dateTime: '2026-11-14 10:00', location: 'כיתה ז3', activity: 'שיעור 4 (שיעור מחשבים)', antecedent: 'מעבר המוני בין שיעורים', behavior: 'מעבר חלק עם אוזניות ללא שום סימני מצוקה', intensity: 'mild', durationMinutes: 0, consequence: 'חיזוק בזמן עריכת וידאו במחשב', perceivedFunction: 'sensory', notes: '0 התפרצויות בכל היום' }
    ],
    createdAt: '2026-09-18T08:00:00Z',
    updatedAt: new Date().toISOString()
  }
];
