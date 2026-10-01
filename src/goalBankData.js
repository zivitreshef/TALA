// מאגר מטרות ויעדים דינמי (מבוסס על תבנית הגישה האקולוגית + מאגר מתי"א ר"ג)

export const ENVIRONMENTS_LIST = [
  'מרחב הגן',
  'סדנא',
  'שירותים',
  'חצר',
  'מפגש מליאה / קבוצה',
  'קריאה - רמת פענוח ושטף',
  'מוכנות לקריאה והבחנה שמיעתית',
  'הבנת הנקרא',
  'אסטרטגיות קורא מיומן',
  'כתיבה, גרפומוטוריקה וכתב',
  'כתיב',
  'מבע רעיוני והבעה בכתב',
  'הבעה בעל-פה ושיח'
];

export const INITIAL_GOAL_BANK = [
  // === מתוך דוגמה 1: הגישה האקולוגית ===
  {
    id: 'gb_eco_1',
    title: 'ירחיב וישכלל את מיומנויותיו במשחק הסוציודרמטי',
    environment: 'מרחב הגן',
    usageCount: 18,
    defaultActivity:
      'ניגש לכל פינות הגן, נוטה להשתמש באותם החפצים במשחק חזרתי ותבניתי. נראה שלרוב משחק ליד הילדים ולא משחק במשחק משותף עם לקיחת תפקיד.',
    suggestedObjectives: [
      'יגוון בבחירת המשחק ובשימוש באביזרים הקיימים בגן.',
      'יצטרף למשחק קיים של ילדים, תוך שאילת שאלות על המשחק ולקיחת תפקיד.',
      'יפעל בצורה מווסתת במרחב הגן בפעילויות השונות.'
    ],
    defaultOpportunities:
      '• המבוגר יזמין את הילד למשחק משותף עם ילד או שניים תוך תיווך ומודלינג.\n• המבוגר יזמן שימוש מגוון באביזרים ותיבות שונות.\n• המבוגר יזמין את הילד פעם ביום לפעילות מפתחת יכולות ויסות למשך כ-10 דק (בהתייעצות והדרכה של מרפאה בעיסוק).',
    defaultPartners: 'צוות הגן, סייעת אישית, מטפלת רגשית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'ייקח חלק במשחק משותף עם ילדים תוך שימוש מגוון באביזרים שונים בגן.',
    facilitatingQuestions: [
      {
        q: '1. באילו פינות או אביזרים במרחב הגן הילד בוחר לשחק כיום, ומה אופי האינטראקציה שלו עם ילדים סביבו?',
        suggestions: ['משחק ליד ילדים באופן חזרתי', 'בוחר פינה קבועה ונמנע ממשחקי תפקידים', 'מתקשה בוויסות במעבר בין משחקים']
      },
      {
        q: '2. איזה תיווך של מבוגר עוזר לו להצטרף למשחק משותף (למשל: הזמנה עם חבר אחד, מודלינג של לקיחת תפקיד)?',
        suggestions: ['תיווך ומודלינג בקבוצה של 2 ילדים', 'חשיפה הדרגתית לתיבות משחק חדשות', 'פעילות ויסות יומית של 10 דקות']
      },
      {
        q: '3. מי השותפים המרכזיים לתהליך בגן ומה יהווה סימן להצלחה בסוף התקופה?',
        suggestions: ['צוות הגן, סייעת, מרפאה בעיסוק ומטפלת רגשית', 'הצטרפות עצמאית למשחק תפקידים עם חברים']
      }
    ]
  },
  {
    id: 'gb_eco_2',
    title: 'יתנסה בפעילויות השונות בסדנא תוך שימוש במיומנויות תכנון, התארגנות והפקת תוצר מתאים',
    environment: 'סדנא',
    usageCount: 15,
    defaultActivity:
      'לא ניגש לשולחנות הסדנא מיוזמתו. אם מזמינים אותו ניגש לפעילות, לעיתים מתנגד ונזקק לשכנוע. כשמתנסה נזקק לתיווך לצורך התארגנות, תכנון ותוצר מתאים.',
    suggestedObjectives: [
      'ייגש לשולחן פעילות בסדנא.',
      'יצליח להתמיד בפעילות במשך 10 דקות או עד הפקת תוצר רצוי.',
      'יתכנן ויתארגן לקראת פעילות באופן מותאם בעזרת תיווך.',
      'יצליח להשתמש בחומרים המוצעים בסדנא באופן מווסת בעזרת תיווך ומודלינג של מבוגר.'
    ],
    defaultOpportunities:
      '• המבוגר יכין את הילד לקראת פעילות בסדנא בעזרת כרטיסיות סדר יום.\n• המבוגר יכוון את הילד בבחירת פעילות מתוך המגוון הקיים.\n• המבוגר יתווך את שלבי ההתארגנות לקראת הפעילות.\n• המבוגר יעזור בתכנון התוצר שברצונו להפיק.',
    defaultPartners: 'צוות הגן, סייעת אישית, עבודה עם מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יגיע לשולחנות הסדנא באופן עצמאי, יתנסה תוך תכנון והתארגנות יעילים.',
    facilitatingQuestions: [
      {
        q: '1. כיצד הילד מגיב כיום להזמנה לשולחן הסדנא ובאילו שלבים (בחירת חומר, תכנון, התמדה) הוא מתקשה?',
        suggestions: ['נזקק לשכנוע כדי לגשת לשולחן', 'מתקשה בהתארגנות ובתכנון שלבי העבודה', 'מתקשה להתמיד מעבר למספר דקות']
      },
      {
        q: '2. אילו עזרים חזותיים או הטרמות (כגון כרטיסיות סדר יום, בחירה בין 2 אפשרויות) יסייעו לו?',
        suggestions: ['הכנה מראש עם כרטיסיות סדר יום', 'בחירה ממוקדת מתוך 2 חומרים', 'פירוק המשימה לשלבי תכנון קצרים']
      },
      {
        q: '3. מה משך ההתמדה המצופה ואיך נדע שהמטרה הושגה?',
        suggestions: ['התמדה של 10 דקות עד הפקת תוצר', 'גישה עצמאית לשולחן הסדנא ותכנון יעיל']
      }
    ]
  },
  {
    id: 'gb_eco_3',
    title: 'ייגש לשירותים באופן עצמאי לצורך פינוי צרכיו (צואה)',
    environment: 'שירותים',
    usageCount: 11,
    defaultActivity:
      'גמול בפיפי והולך לשירותים באופן קבוע ועצמאי בכך. צואה עושה במכנסיים, מתקשה להיכנס לשירותים באופן עצמאי.',
    suggestedObjectives: [
      'יביע באופן מילולי שהוא צריך להתפנות.',
      'ייגש לשירותים ללא תזכורת ממבוגר.'
    ],
    defaultOpportunities:
      '• הצוות יזמין את הילד באופן יזום לשירותים פעם ביום.\n• הצוות יתזכר את הילד לגשת לשירותים פעמיים ביום.\n• הצוות יעשה תהליך הכנה בעזרת כרטיסיות סדר יום.',
    defaultPartners: 'צוות הגן, סייעת אישית, הורים',
    defaultDuration: 'כשלושה חודשים',
    defaultEvaluation: 'ייגש לשירותים באופן עצמאי וסדיר לצורך פינוי צואה.',
    facilitatingQuestions: [
      {
        q: '1. מה רמת העצמאות הנוכחית של הילד בשירותים ומה החסם העיקרי כרגע?',
        suggestions: ['גמול מפיפי אך מתקשה בפינוי צואה בשירותים', 'זקוק לתזכורת והכנה רגשית לפני כניסה לשירותים']
      },
      {
        q: '2. באילו זמנים קבועים בסדר היום נכון לתזכר או להזמין אותו באופן יזום?',
        suggestions: ['הזמנה יזומה קבועה פעם ביום ותזכורת פעמיים ביום', 'שימוש בכרטיסיות סדר יום חזותיות']
      },
      {
        q: '3. כיצד יתבצע שיתוף הפעולה עם ההורים בבית ומה טווח הזמן להשגת המטרה?',
        suggestions: ['תיאום רציף עם ההורים וסייעת אישית למשך כ-3 חודשים']
      }
    ]
  },

  // === מתוך דוגמה 2: מאגר מטרות ויעדים לבניית תח"י / מתי"א ר"ג ===
  {
    id: 'gb_matya_read_1',
    title: 'התלמיד יקרא קריאה שוטפת, רהוטה ומדויקת של טקסטים הנלמדים בכיתה תוך שליטה בצופן האלפביתי ותוך הבנת הכתוב',
    environment: 'קריאה - רמת פענוח ושטף',
    usageCount: 14,
    defaultActivity:
      'התלמיד מזהה חלק מהאותיות והתנועות אך קורא בקצב איטי ומתקשה בפענוח מילים חדשות או מורכבות באופן אוטומטי.',
    suggestedObjectives: [
      'יזהה, יכיר וישלוט באופן אוטומטי באותיות, שמות האותיות, תנועות, סימני ניקוד וצירופים.',
      'יישם את הידע האלפביתי בתוך מילים חדשות, נבנות ולא מוכרות.',
      'ידייק בקריאת מילים, משפטים וטקסטים עם ובלי ניקוד ברמת הכיתה.',
      'יקרא בשטף המתאים לרמת בני גילו ויתייחס לסימני פיסוק בהטעמה.'
    ],
    defaultOpportunities:
      '• תרגול יומיומי מדורג עם כרטיסיות הברות, תנועות וצירופים.\n• קריאה מתווכת של טקסטים קצרים מנוקדים והדגשת סימני פיסוק.\n• משחקי שטף קריאה וקריאה חוזרת של פסקאות מוכרות.',
    defaultPartners: 'מורת שילוב / מתי"א, מחנכת הכיתה, הורים (תרגול קריאה בבית)',
    defaultDuration: 'מחצית שנת לימודים',
    defaultEvaluation: 'קריאה קולית מדויקת ושוטפת של טקסט מותאם לגילו בקצב מצופה וללא שגיאות פענוח.',
    facilitatingQuestions: [
      {
        q: '1. באילו רכיבים של הצופן האלפביתי (אותיות, תנועות, ניקוד, צירופים) התלמיד כבר שולט ובאילו הוא מתקשה?',
        suggestions: ['מתקשה בתנועות I/E ובצירופי שווא', 'מזהה אותיות אך מפענח באופן מצרף ואיטי', 'קורא מילים בודדות אך מתקשה ברצף משפט']
      },
      {
        q: '2. מהי רמת הקריאות הנוכחית ואיזה יעד שטף (מילים לדקה / דיוק) נרצה להציב?',
        suggestions: ['שיפור דיוק בקריאת טקסט מנוקד', 'קריאה מוטעמת תוך התייחסות לסימני פיסוק']
      },
      {
        q: '3. אילו אמצעי הוראה מותאמת (כרטיסיות ניווט, פירוק הברות, קריאה חוזרת) ישולבו בעבודה הפרטנית ובכיתה?',
        suggestions: ['תרגול פונולוגי וכרטיסיות תנועות', 'קריאה חוזרת מתווכת וסימון סימני פיסוק בצבע']
      }
    ]
  },
  {
    id: 'gb_matya_read_2',
    title: 'התלמיד יפתח הבחנה שמיעתית ומודעות פונולוגית כמוכנות לקריאה',
    environment: 'מוכנות לקריאה והבחנה שמיעתית',
    usageCount: 10,
    defaultActivity:
      'התלמיד מגלה סקרנות לספרים אך מתקשה בזיהוי צליל פותח וסוגר ובפירוק והרכבה של מילים למרכיביהן השמיעתיים.',
    suggestedObjectives: [
      'יזהה ויפריד צליל פותח וצליל סוגר במילה.',
      'יפרק וירכיב מילה למרכיביה השמיעתיים (הברות, גוף וצליל, פונמות).',
      'יזהה חריזה וישחק במשחקי צלילים באופן שוטף.'
    ],
    defaultOpportunities:
      '• משחקי מודעות פונולוגית מבוססי תמונות, חפצים מוחשיים ותנועה.\n• תרגול פירוק והרכבת מילים בעזרת מחיאות כף ודסקיות צבעוניות.',
    defaultPartners: 'גננת / מורת שילוב, קלינאית תקשורת, הורים',
    defaultDuration: 'כשלושה חודשים',
    defaultEvaluation: 'זיהוי עצמאי ומדויק של צליל פותח/סוגר ופירוק מילים להברות ב-85% מהמקרים.',
    facilitatingQuestions: [
      {
        q: '1. האם הקושי המרכזי הוא בזיהוי צליל פותח, צליל סוגר, או בפירוק והרכבת מילה להברות?',
        suggestions: ['קושי בזיהוי צליל סוגר ומיזוג פונמי', 'קושי בפירוק מילים דו-הברתיות ורב-הברתיות']
      },
      {
        q: '2. אילו משחקים מוחשיים או חזותיים מעוררים אצלו מוטיבציה וקשב?',
        suggestions: ['משחקי קלפים ותמונות', 'שילוב תנועה, חרוזים ומחיאות כף']
      },
      {
        q: '3. מי מהצוות המקצועי והמשפחה ישתף פעולה בתרגול היומיומי?',
        suggestions: ['גננת שילוב, קלינאית תקשורת ותרגול קצר בבית עם ההורים']
      }
    ]
  },
  {
    id: 'gb_matya_comp_1',
    title: 'התלמיד יבין משמעות גלויה וסמויה ברמת מילה, משפט, קטע ונושא',
    environment: 'הבנת הנקרא',
    usageCount: 16,
    defaultActivity:
      'התלמיד מאתר פרטים גלויים פשוטים בטקסט, אך מתקשה בהבנת משמעות סמויה, הסקת מסקנות, זיהוי רעיון מרכזי והבחנה בין עיקר לטפל.',
    suggestedObjectives: [
      'יאתר פרטים רלוונטיים ברמת משפט וקטע ויסדר אירועים ברצף.',
      'ירחיב את אוצר המילים (מילים נרדפות, הפכים, פירוש מילה מהקשר).',
      'יבחין בין עיקר לטפל ויתאים רעיון מרכזי לפסקה ולקטע.',
      'יבין קשרים לוגיים של סיבה-תוצאה וניגוד ויסיק מסקנות מן הכתוב ובין השורות.'
    ],
    defaultOpportunities:
      '• שימוש במארגנים גרפיים ומיפוי טקסט חזותי.\n• הטרמת אוצר מילים ומושגים מרכזיים לפני קריאת הקטע.\n• תיווך שאלות מדרג חשיבה עולה (מגלוי לסמוי) וסימון מילות קישור.',
    defaultPartners: 'מורת שילוב / הוראה מותאמת, מחנכת הכיתה',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'מענה תקין ומנומק בעל-פה ובכתב על שאלות הבנה ברמה גלויה וסמויה בטקסט מותאם.',
    facilitatingQuestions: [
      {
        q: '1. באיזו רמת הבנה (מילה, משפט, פסקה, משמעות סמויה) ניכר הקושי המרכזי של התלמיד?',
        suggestions: ['מבין פרטים גלויים אך מתקשה בהסקת מסקנות ורעיון מרכזי', 'אוצר מילים מצומצם שמעכב הבנת רצף הקטע']
      },
      {
        q: '2. אילו כלים (סימון במרקר, תרשים זרימה, כרטיסיות פיצוח שאלה) עוזרים לו לארגן את המידע?',
        suggestions: ['סימון מילות מפתח ומילות קישור בצבעים', 'עבודה עם תרשים סיבה-תוצאה וכרטיסיית ניווט']
      },
      {
        q: '3. האם המענה להערכה יתבצע בעל-פה, בכתב, או בשילוב השניים?',
        suggestions: ['שילוב מענה בעל-פה ובכתב עם תיווך מדורג']
      }
    ]
  },
  {
    id: 'gb_matya_comp_2',
    title: 'התלמיד יכתוב או יספר את תוכן הסיפור הרלוונטי בכתב ובעל-פה על סמך קריאה או האזנה',
    environment: 'הבנת הנקרא',
    usageCount: 9,
    defaultActivity:
      'לאחר קריאה או האזנה לסיפור, התלמיד מוסר פרטים חלקיים בלבד ומתקשה בשמירה על רצף סיפורי תקין (פתיחה, אמצע, סוף).',
    suggestedObjectives: [
      'ידייק בפרטי הסיפור (ללא הוספה או השמטה של פרטים מהותיים).',
      'יזהה ויתייחס לדמויות, לאירוע המרכזי ולעמדת הכותב.',
      'ישמור על רצף הסיפור ומבנה תקין (פתיחה, אמצע, סוף) תוך לכידות רעיונית.'
    ],
    defaultOpportunities:
      '• שימוש בתבנית "מפת סיפור" (דמויות, רקע, בעיה, פתרון).\n• סידור כרטיסיות רצף אירועים ושחזור בעל-פה לפני הכתיבה.',
    defaultPartners: 'מורת שילוב, מחנכת הכיתה',
    defaultDuration: 'כשלושה חודשים',
    defaultEvaluation: 'מסירת תוכן סיפור באופן מדויק, רציף ומאורגן בעל-פה ובכתב.',
    facilitatingQuestions: [
      {
        q: '1. כיצד התלמיד משחזר סיפור כיום (האם משמיט פרטים, קופץ בין אירועים, מתקשה במיקוד)?',
        suggestions: ['קופץ מהתחלה לסוף ומשמיט את האירוע המרכזי', 'מוסיף פרטים שאינם בטקסט ומתקשה ברצף']
      },
      {
        q: '2. האם קל לו יותר לשחזר בעקבות האזנה או קריאה עצמית?',
        suggestions: ['קל יותר לאחר האזנה ושיח מקדים עם תמונות רצף']
      },
      {
        q: '3. איזה כלי עזר חזותי נשלב כדי לבסס מבנה של פתיחה-אמצע-סוף?',
        suggestions: ['מפת סיפור חזותית וכרטיסיות רצף אירועים']
      }
    ]
  },
  {
    id: 'gb_matya_strat_1',
    title: 'התלמיד יכיר, יפתח ויפעיל אסטרטגיות קריאה יעילות במיטבו (טרום, בזמן ובעקבות הקריאה)',
    environment: 'אסטרטגיות קורא מיומן',
    usageCount: 12,
    defaultActivity:
      'התלמיד ניגש לקריאת טקסט באופן מיידי ללא סריקה מקדימה של מקדמי ארגון (כותרת, איורים) ומתקשה בבקרה עצמית ובסיכום המידע.',
    suggestedObjectives: [
      'יפיק מידע בטרם הקריאה בהסתמך על מקדמי ארגון (כותרת, איורים, פסקאות, ראשי פרקים) וישער השערות.',
      'יפרש מילים קשות בזמן הקריאה באמצעות הקשר, ידע תחבירי (שורשים, מוספיות) או מילון.',
      'יאתר ויסמן משפטי מפתח בכל פסקה ויכתוב משפט מכליל או תקציר.',
      'יארגן את מידע הטקסט בסכמה, טבלה או תרשים זרימה ויפעיל תהליכי בקרה.'
    ],
    defaultOpportunities:
      '• עבודה שיטתית עם כרטיסיית ניווט: "לפני קריאה – בזמן קריאה – אחרי קריאה".\n• תרגול מיומנות פיצוח שאלות וזיהוי מילות שאלה.\n• הדגמת סימון משפטי מפתח ומיפוי פסקאות.',
    defaultPartners: 'מורת הוראה מותאמת, מחנכת ומורי מקצועות רבי-מלל',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'שימוש עצמאי באסטרטגיות טרום-קריאה, סימון משפטי מפתח וארגון מידע בטקסט עיוני/סיפורי.',
    facilitatingQuestions: [
      {
        q: '1. באיזה שלב של הקריאה (טרום קריאה, בזמן הקריאה, או בעקבות הקריאה) התלמיד זקוק לחיזוק המשמעותי ביותר?',
        suggestions: ['דילוג על מקדמי ארגון בטרום-קריאה', 'קושי בזיהוי משפטי מפתח וסיכום פסקה בעקבות הקריאה']
      },
      {
        q: '2. כיצד הוא מתמודד כיום עם מילים קשות או שאלות מורכבות בטקסט?',
        suggestions: ['מדלג על מילים לא מובנות ומתקשה בפיצוח שאלות']
      },
      {
        q: '3. אילו התאמות וכלי עזר יוצמדו לשולחנו גם בשיעורים בכיתה?',
        suggestions: ['כרטיסיית שלבי קריאה ופיצוח שאלה אישית']
      }
    ]
  },
  {
    id: 'gb_matya_write_1',
    title: 'התלמיד יפתח מוכנות גרפומוטורית, ארגון בדף ויכולת כתיבה קריאה ושוטפת',
    environment: 'כתיבה, גרפומוטוריקה וכתב',
    usageCount: 11,
    defaultActivity:
      'התלמיד מתעייף מהר בכתיבה, מתקשה בשמירה על כתיבה בתוך השורה, רווחים אחידים בין מילים ועיצוב תואם של האותיות.',
    suggestedObjectives: [
      'יאחז נכון את העיפרון וישב בתנוחה מותאמת.',
      'יכתוב בתוך השורה תוך שמירה על רווח תקין בין המילים וגודל אחיד של אותיות.',
      'יעצב אותיות לפי כיוונן הנכון ויכתוב בכתב קריא וברור בקצב המתאים לבני גילו.'
    ],
    defaultOpportunities:
      '• שימוש במחברת מותאמת (שורות מודגשות) ואביזרי אחיזה לעיפרון.\n• תרגול קצר וממוקד של עיצוב אותיות וכיווניות עם משוב מיידי.\n• שימוש בסרגל רווח חזותי בין מילים.',
    defaultPartners: 'מורת שילוב, מרפאה בעיסוק, מחנכת',
    defaultDuration: 'מחצית שנת לימודים',
    defaultEvaluation: 'כתיבת פסקה בכתב קריא, מאורגן בשורה ועם רווחים תקינים בין מילים.',
    facilitatingQuestions: [
      {
        q: '1. האם הקושי המרכזי הוא באחיזת העיפרון והתעייפות, בארגון בשורה וברווחים, או בעיצוב האותיות?',
        suggestions: ['קושי בשמירה על השורה ורווחים בין מילים', 'עיצוב אותיות לא אחיד והתעייפות מהירה']
      },
      {
        q: '2. אילו התאמות סביבתיות ופיזיות (מחברת חכמה, מאחז עיפרון, הפחתת עומס העתקה) יסייעו לו?',
        suggestions: ['מחברת שורות מודגשות וצמצום העתקה מהלוח']
      },
      {
        q: '3. האם מתקיימת הדרכה או התייעצות עם מרפאה בעיסוק?',
        suggestions: ['כן, בשילוב מרפאה בעיסוק ומחנכת הכיתה']
      }
    ]
  },
  {
    id: 'gb_matya_spell_1',
    title: 'התלמיד יפתח יכולת לכתיבה בכתיב נכון',
    environment: 'כתיב',
    usageCount: 8,
    defaultActivity:
      'התלמיד כותב עם שגיאות כתיב מרובות (השמטות אותיות אהו"י, החלפת אותיות הומופוניות וקושי באותיות סופיות ומוספיות).',
    suggestedObjectives: [
      'ייצג כל פונמה בגרפמה מותאמת ויכתוב את כל מרכיבי המילה הנשמעת.',
      'ישתמש בתבנית חזותית, שמיעתית ומורפולוגית (שורשים, תחיליות, סיומות) של המילה.',
      'יישם חוקי כתיבה בסיסיים (אותיות סופיות, ה\' הידיעה, ו\' החיבור, סיומת יחיד-רבים).',
      'יפתח מודעות לאותיות הומופוניות (ק/כ, ת/ט, ח/כ, ס/ש) ויפעיל בקרה עצמית לאחר הכתיבה.'
    ],
    defaultOpportunities:
      '• הוראת משפחות מילים ושורשים והדגשת תבניות כתיב חוזרות.\n• בניית "מילון אישי" של מילים שכיחות ושימוש בכרטיסי בקרה לבדיקת כתיב.',
    defaultPartners: 'מורת הוראה מותאמת, מחנכת הכיתה',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'צמצום משמעותי בשגיאות כתיב במילים שכיחות ויישום חוקי כתיב שנלמדו בכתיבה חופשית.',
    facilitatingQuestions: [
      {
        q: '1. מהו סוג שגיאות הכתיב השכיח ביותר אצל התלמיד (השמטות צלילים, אותיות הומופוניות, אותיות סופיות)?',
        suggestions: ['החלפת אותיות הומופוניות והשמטת אימות קריאה', 'קושי בכתיבת מוספיות (ו\' החיבור, ה\' הידיעה) ואותיות סופיות']
      },
      {
        q: '2. איזה ערוץ למידה חזק יותר אצלו – חזותי (צילום תבנית המילה) או מורפולוגי/חוקתי (הבנת שורש וחוק)?',
        suggestions: ['שילוב תבנית חזותית צבעונית והבנת משפחות שורשים']
      },
      {
        q: '3. כיצד נעודד אותו לבצע בקרה עצמית על הטקסט שכתב?',
        suggestions: ['שימוש בכרטיסיית בקרת כתיב ומילון מילים שכיחות אישי']
      }
    ]
  },
  {
    id: 'gb_matya_expr_write_1',
    title: 'התלמיד יפתח וישפר יכולת הבעה בכתב (מבע רעיוני) במגוון עולמות שיח',
    environment: 'מבע רעיוני והבעה בכתב',
    usageCount: 13,
    defaultActivity:
      'התלמיד מתקשה בפיתוח רעיון בכתב, כותב משפטים קצרים ודלים ללא מילות קישור ומתקשה בארגון מבנה של פסקה או סיפור.',
    suggestedObjectives: [
      'יביע רעיון או נושא ברמת משפט, קטע וסיפור בבהירות ותוך מיקוד בנושא.',
      'יקפיד על רצף הגיוני של משפטים ופסקאות וישתמש במילות קישור מתאימות ובמבנה תחבירי תקין.',
      'ישתמש באוצר מילים מותאם לנושא, לנמען ולמטרת הטקסט (סיפור, תיאור, הסבר, הבעת דעה).',
      'יפעיל תהליכי בקרה: "יכתוב בעיניים של קורא ויקרא בעיניים של כותב".'
    ],
    defaultOpportunities:
      '• תכנון מוקדם של הכתיבה באמצעות שמש אסוציאציות או תבנית פסקה (משפט פתיחה, פירוט/הדגמה, משפט סיום).\n• שימוש בדף עזר של מילות קישור ומחסן מילים עשיר לפני הכתיבה.',
    defaultPartners: 'מורת שילוב, מחנכת הכיתה',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'כתיבת קטע לכיד, ממוקד ובעל מבנה תחבירי תקין ושימוש הולם במילות קישור.',
    facilitatingQuestions: [
      {
        q: '1. באיזה שלב של הכתיבה התלמיד נעצר (העלאת רעיונות, ניסוח משפטים, או חיבור ביניהם לפסקה)?',
        suggestions: ['מתקשה בהעלאת רעיונות ובפתיחת הכתיבה', 'כותב משפטים קצרים ללא מילות קישור ופיתוח']
      },
      {
        q: '2. אילו עזרים (שמש אסוציאציות, מחסן מילות קישור, פתילי משפטים) מקלים עליו את ההבעה?',
        suggestions: ['תכנון בשמש אסוציאציות ושימוש במחסן מילות קישור']
      },
      {
        q: '3. באילו סוגות (סיפור אישי, הבעת דעה, טקסט מידע) נמקד את התרגול הקרוב?',
        suggestions: ['כתיבת חוויה אישית וכתיבת פסקת טיעון/דעה קצרה']
      }
    ]
  },
  {
    id: 'gb_matya_oral_1',
    title: 'התלמיד יפתח וישפר יכולת הבעה בעל-פה, הקשבה והשתלבות בשיחה',
    environment: 'הבעה בעל-פה ושיח',
    usageCount: 10,
    defaultActivity:
      'בשיח קבוצתי או כיתתי התלמיד ממעט להשתתף מיוזמתו, או עונה תשובות קצרות וקטועות ומתקשה בשחזור רציף ובהנמקה בעל-פה.',
    suggestedObjectives: [
      'יפתח יכולת הקשבה, תגובה מותאמת והשתלבות בשיחה.',
      'יענה תשובה תקינה, עניינית, ברורה וברצף הגיוני תוך התאמת התוכן לנושא ולנמען.',
      'יתאר, יספר וישחזר אירוע, חוויה או סיפור באופן ברור ותקין תחבירית.',
      'יטען וידון על נושא תוך ביסוס טיעון בנימוקים רלוונטיים (סיבה-תוצאה, השוואה, דוגמה).'
    ],
    defaultOpportunities:
      '• שיח מונחה בקבוצה קטנה עם כרטיסיות תור ותבניות מענה ("אני חושב ש... מפני ש...").\n• תרגול שחזור חוויות וסיפורים בעזרת שאלות מכוונות (מי, מתי, איפה, מה קרה).',
    defaultPartners: 'צוות חינוכי, קלינאית תקשורת / מורת שילוב, הורים',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'השתתפות פעילה בשיח ומתן תשובות שלמות, מנומקות וברצף הגיוני בעל-פה.',
    facilitatingQuestions: [
      {
        q: '1. כיצד התלמיד מתבטא בעל-פה כיום במפגש פרטני לעומת קבוצה או מליאה?',
        suggestions: ['במפגש פרטני משתף אך בקבוצה נמנע מדיבור', 'מתקשה בארגון המסר המילולי ומתן תשובה מלאה']
      },
      {
        q: '2. אילו תבניות שפה או עזרים חזותיים יעזרו לו לארגן תשובה שלמה ומנומקת?',
        suggestions: ['תבניות פתיחה למענה וכרטיסיות מילות שאלה']
      },
      {
        q: '3. באילו הזדמנויות יומיומיות בכיתה/בגן ניתן לחזק את הביטחון שלו בדיבור?',
        suggestions: ['הכנה מראש לפני מפגש והצגת נושא קצר בקבוצה קטנה']
      }
    ]
  }
];

const GOAL_BANK_STORAGE_KEY = 'tala_ecological_goal_bank_v1';

export function loadGoalBank() {
  try {
    const saved = localStorage.getItem(GOAL_BANK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load goal bank from localStorage', e);
  }
  return INITIAL_GOAL_BANK;
}

export function saveGoalBank(bank) {
  localStorage.setItem(GOAL_BANK_STORAGE_KEY, JSON.stringify(bank));
}

// מחזיר את כל המטרות ממוינות דינמית לפי שכיחות שימוש (מהנפוצה ביותר לנדירה ביותר)
export function getSortedGoalBank(bank) {
  const list = bank || loadGoalBank();
  return [...list].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
}

// עדכון מונה שימוש במטרה קיימת או הוספת מטרה חדשה למאגר הגלובלי לשימוש עתידי
export function recordGoalUsageOrAdd(goalData, currentBank) {
  const bank = [...(currentBank || loadGoalBank())];
  const cleanTitle = (goalData.title || '').trim();
  if (!cleanTitle) return bank;

  const existingIndex = bank.findIndex(
    (item) => item.title.trim() === cleanTitle
  );

  if (existingIndex >= 0) {
    const existing = bank[existingIndex];
    const newObjList = [...(existing.suggestedObjectives || [])];
    if (goalData.objectives) {
      const lines = goalData.objectives
        .split('\n')
        .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
        .filter(Boolean);
      lines.forEach((line) => {
        if (!newObjList.includes(line)) {
          newObjList.push(line);
        }
      });
    }

    bank[existingIndex] = {
      ...existing,
      usageCount: (existing.usageCount || 1) + 1,
      environment: goalData.environment || existing.environment,
      defaultActivity: existing.defaultActivity || goalData.activityParticipation || '',
      suggestedObjectives: newObjList,
      defaultOpportunities: existing.defaultOpportunities || goalData.opportunities || '',
      defaultPartners: existing.defaultPartners || goalData.partners || '',
      defaultDuration: existing.defaultDuration || goalData.duration || '',
      defaultEvaluation: existing.defaultEvaluation || goalData.evaluationCriteria || ''
    };
  } else {
    const objLines = (goalData.objectives || '')
      .split('\n')
      .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);

    const newEntry = {
      id: 'gb_custom_' + Date.now(),
      title: cleanTitle,
      environment: goalData.environment || 'מרחב הגן',
      usageCount: 1,
      defaultActivity: goalData.activityParticipation || '',
      suggestedObjectives: objLines.length > 0 ? objLines : ['יישום המטרה בהדרגה בסביבה הטבעית תוך תיווך מותאם.'],
      defaultOpportunities: goalData.opportunities || '',
      defaultPartners: goalData.partners || 'צוות חינוכי, הורים',
      defaultDuration: goalData.duration || 'עד סוף השנה',
      defaultEvaluation: goalData.evaluationCriteria || '',
      facilitatingQuestions: generateDefaultQuestionsForCustomGoal(cleanTitle, goalData.environment)
    };
    bank.push(newEntry);
  }

  saveGoalBank(bank);
  return bank;
}

// === ניהול מאגר מטרות דינמי על ידי מנהל מערכת (Admin: הוספה, עריכה, מחיקה) ===

export function addGoalByAdmin(goalInput, currentBank) {
  const bank = [...(currentBank || loadGoalBank())];
  const cleanTitle = (goalInput.title || '').trim();
  if (!cleanTitle) return bank;

  const objectivesArray = Array.isArray(goalInput.suggestedObjectives)
    ? goalInput.suggestedObjectives.map((s) => s.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    : String(goalInput.suggestedObjectives || '')
        .split('\n')
        .map((s) => s.replace(/^[•\-*]\s*/, '').trim())
        .filter(Boolean);

  const newEntry = {
    id: 'gb_admin_' + Date.now(),
    title: cleanTitle,
    environment: (goalInput.environment || 'מרחב הגן').trim(),
    usageCount: Number(goalInput.usageCount) >= 0 ? Number(goalInput.usageCount) : 1,
    defaultActivity: (goalInput.defaultActivity || '').trim(),
    suggestedObjectives:
      objectivesArray.length > 0
        ? objectivesArray
        : ['יישום המטרה בהדרגה בסביבה הטבעית תוך תיווך מותאם.'],
    defaultOpportunities: (goalInput.defaultOpportunities || '').trim(),
    defaultPartners: (goalInput.defaultPartners || 'צוות חינוכי, הורים').trim(),
    defaultDuration: (goalInput.defaultDuration || 'עד סוף השנה').trim(),
    defaultEvaluation: (goalInput.defaultEvaluation || '').trim(),
    facilitatingQuestions: generateDefaultQuestionsForCustomGoal(
      cleanTitle,
      goalInput.environment
    )
  };

  bank.unshift(newEntry);
  saveGoalBank(bank);
  return bank;
}

export function updateGoalByAdmin(goalId, updatedFields, currentBank) {
  const bank = [...(currentBank || loadGoalBank())];
  const idx = bank.findIndex((g) => g.id === goalId);
  if (idx === -1) return bank;

  const existing = bank[idx];
  const objectivesArray = Array.isArray(updatedFields.suggestedObjectives)
    ? updatedFields.suggestedObjectives.map((s) => s.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    : String(updatedFields.suggestedObjectives ?? (existing.suggestedObjectives || []).join('\n'))
        .split('\n')
        .map((s) => s.replace(/^[•\-*]\s*/, '').trim())
        .filter(Boolean);

  const updatedTitle = (updatedFields.title ?? existing.title).trim();
  const updatedEnv = (updatedFields.environment ?? existing.environment).trim();

  bank[idx] = {
    ...existing,
    title: updatedTitle,
    environment: updatedEnv,
    usageCount:
      updatedFields.usageCount !== undefined
        ? Math.max(0, Number(updatedFields.usageCount) || 0)
        : existing.usageCount,
    defaultActivity: updatedFields.defaultActivity ?? existing.defaultActivity ?? '',
    suggestedObjectives: objectivesArray,
    defaultOpportunities: updatedFields.defaultOpportunities ?? existing.defaultOpportunities ?? '',
    defaultPartners: updatedFields.defaultPartners ?? existing.defaultPartners ?? '',
    defaultDuration: updatedFields.defaultDuration ?? existing.defaultDuration ?? 'עד סוף השנה',
    defaultEvaluation: updatedFields.defaultEvaluation ?? existing.defaultEvaluation ?? ''
  };

  saveGoalBank(bank);
  return bank;
}

export function deleteGoalByAdmin(goalId, currentBank) {
  const bank = (currentBank || loadGoalBank()).filter((g) => g.id !== goalId);
  saveGoalBank(bank);
  return bank;
}

// === מנוע "הנדסה לאחור" (Reverse Engineering) מטקסט גולמי של המורה לדוח רשמי מלא ===
export function reverseEngineerRawTextLocally(rawText, currentFormData, goalBank) {
  const text = (rawText || '').trim();
  const bank = getSortedGoalBank(goalBank);
  if (!text) return null;

  // 1. ניסיון לחלץ שם תלמיד/ה או מסגרת אם צוינו בטקסט הגולמי והשדה ריק/ברירת מחדל
  let detectedName = currentFormData.name || '';
  if (!detectedName || detectedName === 'תלמיד/ה חדש/ה') {
    const nameMatch =
      text.match(/(?:התלמיד\/ה|התלמיד|התלמידה|הילד\/ה|הילד|הילדה|שם הילד:?|שם:?)\s+([א-ת]{2,12}(?:\s+[א-ת]{2,12})?)/) ||
      text.match(/^([א-ת]{2,10})\s+(?:הוא|היא|ילד|ילדה|תלמיד|תלמידה|בן|בת)\b/);
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      const stopWords = ['ילד', 'ילדה', 'תלמיד', 'תלמידה', 'נעים', 'נעימה', 'חמוד', 'חמודה', 'מתוק', 'מתוקה'];
      if (!stopWords.includes(candidate.split(/\s+/)[0])) {
        detectedName = candidate;
      }
    }
  }

  const firstName = (detectedName && detectedName !== 'תלמיד/ה חדש/ה' ? detectedName : 'הילד/ה')
    .trim()
    .split(/\s+/)[0];

  // 2. פירוק הטקסט הגולמי למשפטים וסיווגם למוקדי כוח קיימים מול מוקדים להעצמה/קשיים
  const clauses = text
    .split(/[.,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const challengeKeywords = [
    'מתקשה', 'קושי', 'קשיים', 'זקוק', 'זקוקה', 'צריך', 'צריכה', 'לא ניגש', 'לא ניגשת',
    'נמנע', 'נמנעת', 'מתנגד', 'מתנגדת', 'חזרתי', 'תבניתי', 'נוקשות', 'ויסות', 'התפרצויות',
    'בכי', 'תסכול', 'מוסח', 'מוסחת', 'קשב', 'ריכוז נמוך', 'מתעייף', 'מתעייפת', 'שגיאות',
    'איטי', 'איטית', 'דל', 'דלה', 'קטוע', 'גמילה', 'צואה', 'פיפי', 'שירותים', 'לבד', 'ליד הילדים',
    'חיזוק', 'העצמה', 'שיפור', 'לפתח', 'לשפר', 'להרחיב', 'מתסכל', 'חסר', 'חסרה'
  ];

  const positiveKeywords = [
    'נעים', 'נעימה', 'חברותי', 'חברותית', 'סקרן', 'סקרנית', 'חכם', 'חכמה', 'נבון', 'נבונה',
    'וורבלי', 'ורבלי', 'אנרגיות', 'הומור', 'טוב לב', 'קשוב', 'קשובה', 'מפנים', 'מפנימה',
    'אהוב', 'אהובה', 'משתף פעולה', 'משתפת פעולה', 'מוטיבציה', 'אוהב', 'אוהבת', 'מצליח', 'מצליחה',
    'טובה', 'טוב', 'יפה', 'יצירתי', 'יצירתית', 'עצמאי', 'עצמאית', 'בולט', 'בולטת', 'חיובי', 'שמח'
  ];

  const existingList = [];
  const empowerList = [];

  clauses.forEach((clause) => {
    // אם משפט מכיל "אך" / "אבל" / "יחד עם זאת", נפצל אותו לחוזק ולקושי
    const contrastSplit = clause.split(/\s+(?:אך|אבל|אולם|יחד עם זאת|מאידך)\s+/);
    if (contrastSplit.length === 2) {
      const partA = contrastSplit[0].trim();
      const partB = contrastSplit[1].trim();
      if (partA.length > 2) existingList.push(partA);
      if (partB.length > 2) empowerList.push(partB);
      return;
    }

    const hasChallenge = challengeKeywords.some((kw) => clause.includes(kw));
    const hasPositive = positiveKeywords.some((kw) => clause.includes(kw));

    if (hasChallenge && ! clause.startsWith('ללא קושי')) {
      empowerList.push(clause);
    } else if (hasPositive) {
      existingList.push(clause);
    } else if (existingList.length <= empowerList.length) {
      existingList.push(clause);
    } else {
      empowerList.push(clause);
    }
  });

  // ניסוח פורמלי ומקצועי למוקדי כוח קיימים
  const formattedExisting =
    existingList.length > 0
      ? existingList
          .map((item) => {
            const clean = item.replace(/^[•\-*]\s*/, '').trim();
            return `• ${clean}`;
          })
          .join('\n')
      : '• ילד/ה בעל/ת סקרנות טבעית ורצון להצליח\n• מגיב/ה היטב לחיזוקים חיוביים ולקשר אישי חם עם הצוות החינוכי\n• בעל/ת פוטנציאל למידה והתפתחות בסביבה מתווכת ותומכת';

  // 3. זיהוי מטרות מתאימות מתוך מאגר המטרות הדינמי + יצירת מטרות מותאמות אישית מהטקסט הגולמי
  const domainMatchers = [
    {
      bankId: 'gb_eco_1',
      keywords: ['משחק', 'סוציודרמטי', 'חברתי', 'חברים', 'ליד הילדים', 'תפקיד', 'פינות הגן', 'אינטראקציות חברתיות', 'נוקשות', 'תבניתי']
    },
    {
      bankId: 'gb_eco_2',
      keywords: ['סדנא', 'יצירה', 'שולחן פעילות', 'תכנון', 'התארגנות', 'תוצר', 'חומרים', 'גזירה', 'הדבקה', 'ציור']
    },
    {
      bankId: 'gb_eco_3',
      keywords: ['שירותים', 'גמילה', 'צואה', 'קקי', 'פיפי', 'להתפנות', 'מכנסיים', 'צרכים']
    },
    {
      bankId: 'gb_matya_read_1',
      keywords: ['קריאה', 'פענוח', 'שטף', 'אותיות', 'ניקוד', 'תנועות', 'קורא', 'קוראת', 'טקסטים']
    },
    {
      bankId: 'gb_matya_read_2',
      keywords: ['פונולוגית', 'פונולוגי', 'שמיעתית', 'צליל פותח', 'צליל סוגר', 'הברות', 'חריזה', 'מוכנות לקריאה']
    },
    {
      bankId: 'gb_matya_comp_1',
      keywords: ['הבנת הנקרא', 'משמעות סמויה', 'משמעות גלויה', 'רעיון מרכזי', 'עיקר וטפל', 'הסקת מסקנות', 'אוצר מילים']
    },
    {
      bankId: 'gb_matya_comp_2',
      keywords: ['שחזור סיפור', 'תוכן הסיפור', 'רצף סיפורי', 'פתיחה אמצע סוף', 'האזנה לסיפור']
    },
    {
      bankId: 'gb_matya_strat_1',
      keywords: ['אסטרטגיות קריאה', 'טרום קריאה', 'מקדמי ארגון', 'משפטי מפתח', 'פיצוח שאלות', 'סיכום']
    },
    {
      bankId: 'gb_matya_write_1',
      keywords: ['גרפומוטורי', 'גרפומוטוריקה', 'כתב יד', 'אחיזת עיפרון', 'שורה', 'רווחים', 'עיצוב אותיות', 'העתקה מהלוח', 'מתעייף בכתיבה']
    },
    {
      bankId: 'gb_matya_spell_1',
      keywords: ['כתיב', 'שגיאות כתיב', 'הומופוניות', 'אותיות סופיות', 'אימות קריאה']
    },
    {
      bankId: 'gb_matya_expr_write_1',
      keywords: ['הבעה בכתב', 'מבע רעיוני', 'ניסוח בכתב', 'מילות קישור', 'כתיבת פסקה', 'כתיבה חופשית']
    },
    {
      bankId: 'gb_matya_oral_1',
      keywords: ['הבעה בעל פה', 'הבעה בעל-פה', 'שיח', 'שיחה', 'דיבור', 'מפגש', 'מליאה', 'להשתתף בשיחה', 'בעל פה']
    }
  ];

  const matchedGoals = [];
  const usedBankIds = new Set();

  domainMatchers.forEach((matcher) => {
    const isMatched = matcher.keywords.some((kw) => text.includes(kw));
    if (isMatched) {
      const bankItem = bank.find((b) => b.id === matcher.bankId);
      if (bankItem && !usedBankIds.has(bankItem.id)) {
        usedBankIds.add(bankItem.id);
        // אתר משפטים רלוונטיים מהטקסט הגולמי עבור תיאור הפעילות וההשתתפות
        const relevantClauses = clauses.filter((c) =>
          matcher.keywords.some((kw) => c.includes(kw))
        );
        const rawContextActivity =
          relevantClauses.length > 0
            ? relevantClauses.join('. ') + '.'
            : bankItem.defaultActivity;

        const personalizedOpps = (bankItem.defaultOpportunities || '')
          .replace(/הילד\/ה/g, firstName)
          .replace(/הילד/g, firstName);

        matchedGoals.push({
          id: 'g_rev_' + Date.now() + '_' + matchedGoals.length,
          environment: bankItem.environment,
          activityParticipation: rawContextActivity || bankItem.defaultActivity || '',
          title: bankItem.title,
          objectives: (bankItem.suggestedObjectives || []).map((o) => `• ${o}`).join('\n'),
          opportunities: personalizedOpps,
          partners: bankItem.defaultPartners || 'צוות חינוכי, הורים',
          duration: bankItem.defaultDuration || 'עד סוף השנה',
          evaluationCriteria: bankItem.defaultEvaluation || ''
        });
      }
    }
  });

  // בדיקה נוספת מול כל מטרה מותאמת אישית במאגר (לפי התאמת מילים בכותרת או בסביבה)
  bank.forEach((bankItem) => {
    if (usedBankIds.has(bankItem.id)) return;
    const significantWords = bankItem.title
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['התלמיד', 'הילד', 'יפתח', 'ישפר', 'באופן', 'בצורה'].includes(w));
    const hits = significantWords.filter((w) => text.includes(w));
    if (hits.length >= 2) {
      usedBankIds.add(bankItem.id);
      matchedGoals.push({
        id: 'g_rev_custom_' + Date.now() + '_' + matchedGoals.length,
        environment: bankItem.environment,
        activityParticipation: bankItem.defaultActivity || `בסביבת ${bankItem.environment}, ${firstName} זקוק/ה לתיווך מותאם לחיזוק תפקוד זה.`,
        title: bankItem.title,
        objectives: (bankItem.suggestedObjectives || []).map((o) => `• ${o}`).join('\n'),
        opportunities: (bankItem.defaultOpportunities || '').replace(/הילד/g, firstName),
        partners: bankItem.defaultPartners || 'צוות חינוכי, הורים',
        duration: bankItem.defaultDuration || 'עד סוף השנה',
        evaluationCriteria: bankItem.defaultEvaluation || ''
      });
    }
  });

  // אם הטקסט מזכיר ויסות רגשי/חושי או קשב/ריכוז ולא נוצרה לכך מטרה ייעודית, נייצר מטרה פורמלית מותאמת
  if (
    (text.includes('ויסות') || text.includes('תסכול') || text.includes('רגשי') || text.includes('מעברים')) &&
    matchedGoals.length < 4
  ) {
    const regClauses = clauses.filter(
      (c) => c.includes('ויסות') || c.includes('תסכול') || c.includes('רגשי') || c.includes('מעברים')
    );
    matchedGoals.push({
      id: 'g_rev_reg_' + Date.now(),
      environment: 'מרחב הגן / הכיתה',
      activityParticipation:
        regClauses.length > 0
          ? regClauses.join('. ') + '.'
          : `${firstName} מתקשה לעיתים בוויסות רגשי וחושי במצבי תסכול או במעברים בין פעילויות וזקוק/ה לתיווך מרגיע ומכיל.`,
      title: 'יפתח/תפתח מיומנויות ויסות רגשי וחושי והתמודדות מותאמת במצבי תסכול ומעברים',
      objectives:
        '• יזהה/תזהה מצבי הצפה או תסכול וייעזר/תיעזר במבוגר או באמצעי הרגעה מוסכם.\n• יעבור/תעבור בין פעילויות בסדר היום באופן רגוע ומווסת בעזרת הטרמה.\n• יביע/תביע רגשות וצרכים באופן מילולי מותאם.',
      opportunities: `• הטרמה מראש לפני מעברים ושינויים בסדר היום באמצעות כרטיסיות חזותיות.\n• הקצאת "פינת רוגע" או פעילות סנסו-מוטורית מווסתת ל${firstName} בליווי איש צוות.\n• שיקוף רגשי ותיווך מילולי למציאת פתרונות במצבי תסכול.`,
      partners: 'צוות חינוכי, סייעת אישית, מטפלת רגשית / מרפאה בעיסוק, הורים',
      duration: 'עד סוף השנה',
      evaluationCriteria: 'הפחתה בעוצמת ותדירות מצבי התסכול ומעבר מווסת ועצמאי בין פעילויות.'
    });
  }

  // אם עדיין לא זוהו מטרות ספציפיות מתוך מילות מפתח, נייצר מטרות פורמליות מתוך משפטי הקושי/העצמה עצמם!
  if (matchedGoals.length === 0) {
    const sourceEmpower = empowerList.length > 0 ? empowerList.slice(0, 3) : [text];
    sourceEmpower.forEach((empClause, idx) => {
      const cleanClause = empClause
        .replace(/^(?:מתקשה ב|זקוק לחיזוק ב|זקוקה לחיזוק ב|קושי ב)/, '')
        .trim();
      matchedGoals.push({
        id: 'g_rev_gen_' + Date.now() + '_' + idx,
        environment: 'מרחב הגן / הכיתה',
        activityParticipation: `על פי תצפיות הצוות: ${empClause}. נדרש תיווך מדורג והתאמת הסביבה החינוכית.`,
        title: `חיזוק ושיפור התפקוד בתחום: ${cleanClause}`,
        objectives: `• יגלה/תגלה מעורבות ויוזמה בפעילויות הקשורות ל${cleanClause}.\n• יתנסה/תתנסה בהדרגה במשימות מותאמות תוך היעזרות בתיווך של מבוגר.\n• יפעל/תפעל באופן עצמאי ומווסת יותר בסביבה הטבעית.`,
        opportunities: `• מתן הטרמה, מודלינג ופירוק המשימה לשלבים קצרים וברורים עבור ${firstName}.\n• מתן חיזוקים חיוביים ומשוב מעצים בזמן אמת.`,
        partners: 'צוות חינוכי, סייעת אישית, הורים',
        duration: 'עד סוף השנה',
        evaluationCriteria: `שיפור עקבי וניכר ב${cleanClause} והשתתפות פעילה בסדר היום.`
      });
    });
  }

  // 4. בניית עמודת "כוחות להעצמה וחיזוק" מתוך משפטי הקושי + המטרות שחולצו
  const formattedEmpowerItems = [];
  empowerList.forEach((emp) => {
    const cleaned = emp
      .replace(/^(?:אך|אבל|ומנגד)\s+/, '')
      .replace(/^(?:זקוק לחיזוק ב|זקוקה לחיזוק ב|מתקשה ב|מתקשה עם)\s*/, '')
      .trim();
    if (cleaned) {
      formattedEmpowerItems.push(`• ${cleaned}`);
    }
  });
  matchedGoals.forEach((g) => {
    const shortGoal = `${g.environment}: ${g.title}`;
    if (!formattedEmpowerItems.some((item) => item.includes(g.environment))) {
      formattedEmpowerItems.push(`• ${shortGoal}`);
    }
  });

  const formattedEmpower =
    formattedEmpowerItems.length > 0
      ? formattedEmpowerItems.join('\n')
      : '• הרחבת העצמאות והתפקוד בסביבות הפעילות השונות\n• חיזוק מיומנויות חברתיות, לימודיות ורגשיות בהתאם למטרות התוכנית';

  // 5. בניית המלצות פורמליות לראש/תחתית המסמך
  const environmentsMentioned = [...new Set(matchedGoals.map((g) => g.environment))].join(', ');
  const formalRecommendations =
    `1. המשך עבודה מערכתית ועקבית של הצוות החינוכי והטיפולי בסביבות הפעילות (${environmentsMentioned}), תוך הדרגתיות והתבססות על מוקדי הכוח של ${firstName}.\n` +
    `2. שילוב עזרים חזותיים (כרטיסיות סדר יום, הטרמה מראש לפני מעברים ומודלינג) לתמיכה בהתארגנות, ויסות וביטחון עצמי.\n` +
    `3. שמירה על קשר רציף, שיתוף ותיאום ציפיות עם ההורים לחיזוק העקביות והעברת המיומנויות בין המסגרת החינוכית לבית.`;

  return {
    name: detectedName || currentFormData.name,
    strengthsExisting: formattedExisting,
    strengthsToEmpower: formattedEmpower,
    goals: matchedGoals,
    recommendations: formalRecommendations
  };
}


export function generateDefaultQuestionsForCustomGoal(goalTitle, environment) {
  const envLabel = environment || 'הסביבה החינוכית';
  return [
    {
      q: `1. כיצד הילד/ה מתפקד/ת כיום ב"${envLabel}" ביחס למטרה "${goalTitle}", ומהם הגורמים המאפשרים והמגבילים בסביבה?`,
      suggestions: [
        'זקוק/ה להזמנה ותיווך של מבוגר כדי להתחיל',
        'מגלה מוטיבציה אך מתקשה בהתארגנות ובהתמדה',
        'מתפקד/ת באופן חלקי וזקוק/ה להטרמה חזותית'
      ]
    },
    {
      q: '2. אילו 2-3 צעדים אופרטיביים (יעדים) ואמצעי תיווך יומיומיים יעזרו להשיג את המטרה?',
      suggestions: [
        'שימוש בכרטיסיות סדר יום ומודלינג של איש צוות',
        'פירוק הפעילות לשלבים קצרים ומתן חיזוק חיובי',
        'תרגול פרטני ובקבוצה קטנה פעמיים בשבוע'
      ]
    },
    {
      q: '3. מי השותפים לתהליך (צוות, מטפלים, הורים), מה משך הזמן, וכיצד נמדוד הצלחה (אמות מידה להערכה)?',
      suggestions: [
        'צוות חינוכי, סייעת והורים | עד סוף השנה',
        'מורת שילוב, מרפאה בעיסוק והורים | כשלושה חודשים',
        'ביצוע עצמאי וסדיר של הפעילות בסביבה הטבעית'
      ]
    }
  ];
}

// === פונקציות עזר להסתרת פרטים מזהים בהדפסה (ראשי תיבות והשחרה) ===

// הופך שם מלא לראשי תיבות בעברית: למשל "נועם לוי" -> "נ.ל."
export function toHebrewAcronym(fullName) {
  if (!fullName || !fullName.trim()) return 'א.א.';
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) {
    return `${parts[0].charAt(0)}.`;
  }
  return parts.map((p) => p.charAt(0)).join('.') + '.';
}

// מחליף ערך רגיש (ת.ז, טלפון, כתובת, ת.ל) בבלוקים מושחרים עבור הדפסה חסויה
export function maskSensitiveValue(val, fallbackLength = 8) {
  if (!val || !String(val).trim()) {
    return '████████';
  }
  const len = Math.max(5, Math.min(14, String(val).trim().length));
  return '█'.repeat(len);
}

// מחליף אוטומטית את שם הילד/ה (שם מלא או שם פרטי) בראשי תיבות בתוך כל טקסט חופשי או מטרה בהדפסה
export function redactStudentNameInText(text, studentFullName, hideDetails) {
  if (!text) return '';
  if (!hideDetails || !studentFullName || !studentFullName.trim()) return text;

  const acronym = toHebrewAcronym(studentFullName);
  const parts = studentFullName.trim().split(/\s+/).filter((p) => p.length >= 2);
  let result = text;

  // החלפת השם המלא
  const fullTrimmed = studentFullName.trim();
  if (fullTrimmed.length >= 2) {
    result = result.split(fullTrimmed).join(acronym);
  }

  // החלפת השם הפרטי ושם המשפחה
  parts.forEach((part) => {
    if (part.length >= 2) {
      result = result.split(part).join(acronym);
    }
  });

  return result;
}

// נתוני תלמיד ראשוניים לדוגמה (מבוסס במדויק על הדוגמה הראשונה שצורפה)
export const INITIAL_STUDENTS_DATA = [
  {
    id: 'st_demo_1',
    date: new Date().toLocaleDateString('he-IL'),
    schoolYear: 'תשפ"ו (2025-2026)',
    planType: 'תל"א (תוכנית לימודים אישית)',
    name: 'נועם ישראלי',
    idNumber: '345678912',
    birthDate: '14/05/2021',
    educationalFramework: 'גן שקד - חינוך מיוחד / שילוב',
    address: 'רחוב הרצל 24, רמת גן',
    phone: '052-8765432',
    teacherFreeText:
      'ילד נעים, חברותי וסקרן בעל יכולת ריכוז טובה. וורבלי, חכם ומלא אנרגיות, בעל חוש הומור, טוב לב וקשוב לסביבה. מפנים כללים וגבולות ויצר קשר טוב עם הצוות. זקוק לחיזוק באינטראקציות חברתיות, הפחתת נוקשות ותבניתיות, הרחבת משחק סוציודרמטי, ויסות רגשי וחושי, התנסות בעבודה בסדנא וגמילה מצואה בשירותים.',
    strengthsExisting:
      '• ילד נעים, חברותי וסקרן\n• יכולת ריכוז טובה\n• וורבלי, חכם ומלא אנרגיות, חוש הומור\n• טוב לב וקשוב לסביבה\n• מפנים כללים וגבולות\n• יצר קשר טוב עם הצוות',
    strengthsToEmpower:
      '• אינטראקציות חברתיות\n• נוקשות ותבניתיות\n• משחק סוציודרמטי\n• ויסות רגשי וחושי\n• עבודה בסדנא\n• גמילה (קקי)',
    recommendations:
      'המשך עבודה מערכתית עקבית בשיתוף ההורים והצוות הפרא-רפואי, שימוש בעזרים חזותיים (כרטיסיות סדר יום) להטרמת מעברים וחיזוק יוזמות חברתיות במרחב הגן.',
    status: 'מוכן להדפסה',
    lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    goals: [
      {
        id: 'g_row_1',
        environment: 'שירותים',
        activityParticipation:
          'גמול בפיפי והולך לשירותים באופן קבוע ועצמאי בכך. צואה עושה במכנסיים, מתקשה להיכנס לשירותים באופן עצמאי.',
        title: 'ייגש לשירותים באופן עצמאי לצורך פינוי צרכיו (צואה)',
        objectives:
          '• יביע באופן מילולי שהוא צריך להתפנות.\n• ייגש לשירותים ללא תזכורת ממבוגר.',
        opportunities:
          '• הצוות יזמין את נועם באופן יזום לשירותים פעם ביום.\n• הצוות יתזכר את נועם לגשת לשירותים פעמיים ביום.\n• הצוות יעשה לנועם תהליך הכנה בעזרת כרטיסיות סדר יום.',
        partners: 'צוות בגן, סייעת אישית',
        duration: 'כשלושה חודשים',
        evaluationCriteria: 'ייגש לשירותים באופן עצמאי וסדיר לצורך פינוי צואה'
      },
      {
        id: 'g_row_2',
        environment: 'סדנא',
        activityParticipation:
          'לא ניגש לשולחנות הסדנא מיוזמתו. אם מזמינים אותו ניגש לפעילות, לעיתים מתנגד ונזקק לשכנוע. כשמתנסה נזקק לתיווך לצורך התארגנות, תכנון ותוצר מתאים.',
        title: 'יתנסה בפעילויות השונות בסדנא תוך שימוש במיומנויות תכנון, התארגנות והפקת תוצר מתאים',
        objectives:
          '• ייגש לשולחן פעילות בסדנא.\n• יצליח להתמיד בפעילות במשך 10 דק או עד הפקת תוצר רצוי.\n• יתכנן ויתארגן לקראת פעילות באופן מותאם בעזרת תיווך.\n• יצליח להשתמש בחומרים המוצעים בסדנא באופן מווסת בעזרת תיווך ומודלינג של מבוגר.',
        opportunities:
          '• המבוגר יכין את נועם לקראת פעילות בסדנא בעזרת כרטיסיות סדר יום.\n• המבוגר יכוון את נועם בבחירת פעילות מתוך המגוון הקיים.\n• המבוגר יתווך לנועם את שלבי ההתארגנות לקראת הפעילות.\n• המבוגר יעזור לנועם בתכנון התוצר שברצונו להפיק.',
        partners: 'צוות הגן, סייעת אישית, עבודה עם מרפאה בעיסוק',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'יגיע לשולחנות הסדנא באופן עצמאי, יתנסה תוך תכנון והתארגנות יעילים.'
      },
      {
        id: 'g_row_3',
        environment: 'מרחב הגן',
        activityParticipation:
          'ניגש לכל פינות הגן, נוטה להשתמש באותם החפצים במשחק חזרתי ותבניתי. נראה שלרוב משחק ליד הילדים ולא משחק במשחק משותף עם לקיחת תפקיד.',
        title: 'ירחיב וישכלל את מיומנויותיו במשחק הסוציודרמטי',
        objectives:
          '• יגוון בבחירת המשחק ובשימוש באביזרים הקיימים בגן.\n• יצטרף למשחק קיים של ילדים, תוך שאילת שאלות על המשחק ולקיחת תפקיד.\n• יפעל בצורה מווסתת במרחב הגן בפעילויות השונות.',
        opportunities:
          '• המבוגר יזמין את נועם למשחק משותף עם ילד או שניים תוך תיווך ומודלינג.\n• המבוגר יזמן שימוש מגוון באביזרים ותיבות שונות.\n• המבוגר יזמין את נועם פעם ביום לפעילות מפתחת יכולות ויסות למשך כ-10 דק (בהתייעצות והדרכה של מרפאה בעיסוק).',
        partners: 'צוות הגן, סייעת אישית, מטפלת רגשית, מרפאה בעיסוק',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'ייקח חלק במשחק משותף עם ילדים תוך שימוש מגוון באביזרים שונים בגן'
      }
    ]
  }
];
