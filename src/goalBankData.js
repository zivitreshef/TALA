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

// === מנוע "הנדסה לאחור" פדגוגי (Reverse Engineering) מטקסט גולמי של המורה לדוח רשמי קוהרנטי ומדויק ===
export function reverseEngineerRawTextLocally(rawText, currentFormData, goalBank) {
  const text = (rawText || '').trim();
  const bank = getSortedGoalBank(goalBank);
  if (!text) return null;

  // 1. זיהוי מין התלמיד/ה (זכר/נקבה) מתוך פעלים, שמות תואר וכינויים בטקסט
  const femaleIndicators = [
    /\bילדה\b/, /\bתלמידה\b/, /\bהיא\b/, /\bשלה\b/, /\bלה\b/, /\bאותה\b/, /\bבעצמה\b/,
    /\bאוהבת\b/, /\bקוראת\b/, /\bכותבת\b/, /\bיושבת\b/, /\bניגשת\b/, /\bמשחקת\b/,
    /\bמשתתפת\b/, /\bמדברת\b/, /\bנעימה\b/, /\bחברותית\b/, /\bסקרנית\b/, /\bחכמה\b/,
    /\bנבונה\b/, /\bזקוקה\b/, /\bצריכה\b/, /\bמוסחת\b/, /\bמתעייפת\b/, /\bנמנעת\b/,
    /\bמתנגדת\b/, /\bמבינה\b/, /\bמזהה\b/, /\bמצליחה\b/, /\bעצמאית\b/, /\bרגישה\b/,
    /\bמתוקה\b/, /\bמקסימה\b/, /\bשקטה\b/, /\bפעילה\b/, /\bקשובה\b/, /\bמפנימה\b/
  ];
  const maleIndicators = [
    /\bילד\b/, /\bתלמיד\b/, /\bהוא\b/, /\bשלו\b/, /\bלו\b/, /\bאותו\b/, /\bבעצמו\b/,
    /\bאוהב\b/, /\bקורא\b/, /\bכותב\b/, /\bיושב\b/, /\bניגש\b/, /\bמשחק\b/,
    /\bמשתתף\b/, /\bמדבר\b/, /\bנעים\b/, /\bחברותי\b/, /\bסקרן\b/, /\bחכם\b/,
    /\bנבון\b/, /\bזקוק\b/, /\bצריך\b/, /\bמוסח\b/, /\bמתעייף\b/, /\bנמנע\b/,
    /\bמתנגד\b/, /\bמבין\b/, /\bמזהה\b/, /\bמצליח\b/, /\bעצמאי\b/, /\bרגיש\b/,
    /\bמתוק\b/, /\bמקסים\b/, /\bשקט\b/, /\bפעיל\b/, /\bקשוב\b/, /\bמפנים\b/
  ];

  let femaleScore = 0;
  let maleScore = 0;
  femaleIndicators.forEach((rx) => { if (rx.test(text)) femaleScore += 1; });
  maleIndicators.forEach((rx) => { if (rx.test(text)) maleScore += 1; });
  const isFemale = femaleScore > maleScore;

  // מילון הטיות מגדר לניסוח קוהרנטי ומדויק
  const g = {
    childNoun: isFemale ? 'הילדה' : 'הילד',
    studentNoun: isFemale ? 'התלמידה' : 'התלמיד',
    pronoun: isFemale ? 'היא' : 'הוא',
    toPronoun: isFemale ? 'לה' : 'לו',
    possessive: isFemale ? 'שלה' : 'שלו',
    develop: isFemale ? 'תפתח' : 'יפתח',
    improve: isFemale ? 'תשפר' : 'ישפר',
    expand: isFemale ? 'תרחיב ותשכלל' : 'ירחיב וישכלל',
    acquire: isFemale ? 'תרכוש' : 'ירכוש',
    practice: isFemale ? 'תתרגל' : 'יתרגל',
    use: isFemale ? 'תשתמש' : 'ישתמש',
    participate: isFemale ? 'תשתתף' : 'ישתתף',
    persevere: isFemale ? 'תתמיד' : 'יתמיד',
    initiate: isFemale ? 'תיזום' : 'ייזום',
    approach: isFemale ? 'תיגש' : 'ייגש',
    express: isFemale ? 'תביע' : 'יביע',
    read: isFemale ? 'תקרא' : 'יקרא',
    write: isFemale ? 'תכתוב' : 'יכתוב',
    understand: isFemale ? 'תבין' : 'יבין',
    organize: isFemale ? 'תתארגן ותתכנן' : 'יתארגן ויתכנן',
    regulate: isFemale ? 'תווסת' : 'יווסת',
    identify: isFemale ? 'תזהה' : 'יזהה',
    apply: isFemale ? 'תיישם' : 'יישם',
    succeed: isFemale ? 'תצליח' : 'יצליח',
    characterized: isFemale ? 'מתאפיינת' : 'מתאפיין',
    demonstrates: isFemale ? 'מגלה' : 'מגלה',
    functions: isFemale ? 'מתפקדת' : 'מתפקד',
    needs: isFemale ? 'זקוקה' : 'זקוק',
    struggles: isFemale ? 'מתקשה' : 'מתקשה',
    assisted: isFemale ? 'תסתייע' : 'יסתייע',
    independentAdj: isFemale ? 'עצמאית' : 'עצמאי'
  };

  // 2. חילוץ שם התלמיד/ה ומסגרת חינוכית אם צוינו בטקסט הגולמי
  let detectedName = currentFormData.name || '';
  const nonNameWords = new Set([
    'ילד', 'ילדה', 'תלמיד', 'תלמידה', 'נעים', 'נעימה', 'חמוד', 'חמודה', 'מתוק', 'מתוקה',
    'חברותי', 'חברותית', 'סקרן', 'סקרנית', 'הוא', 'היא', 'בעל', 'בעלת', 'לומד', 'לומדת',
    'נבון', 'נבונה', 'חכם', 'חכמה', 'שקט', 'שקטה', 'בגן', 'בכיתה', 'מגלה', 'מתקשה'
  ]);

  if (!detectedName || detectedName === 'תלמיד/ה חדש/ה') {
    const explicitMatch =
      text.match(/(?:שם הילד\/ה|שם התלמיד\/ה|שם הילד|שם הילדה|שם התלמיד|שם התלמידה|התלמיד|התלמידה|הילד|הילדה)\s*[:\-]?\s*([א-ת]{2,11})/) ||
      text.match(/^([א-ת]{2,11})\s+(?:הוא|היא|ילד|ילדה|תלמיד|תלמידה|בן|בת|לומד|לומדת)\b/);
    if (explicitMatch && explicitMatch[1] && !nonNameWords.has(explicitMatch[1])) {
      detectedName = explicitMatch[1].trim();
    }
  }

  const firstName =
    detectedName && detectedName !== 'תלמיד/ה חדש/ה'
      ? detectedName.trim().split(/\s+/)[0]
      : g.studentNoun;

  // זיהוי מסגרת (גן מול בית ספר/כיתה)
  let detectedFramework = currentFormData.educationalFramework || '';
  if (!detectedFramework) {
    const fwMatch = text.match(/(?:לומד|לומדת|נמצא|נמצאת)?\s*(?:ב|מסגרת:?)\s*((?:גן|כיתה|בית ספר|בי"ס)\s+[א-ת0-9"']+)/);
    if (fwMatch && fwMatch[1]) {
      detectedFramework = fwMatch[1].trim();
    }
  }

  const schoolMarkers = ['כיתה', 'בית ספר', 'שיעור', 'לוח', 'מחברת', 'קריאה', 'כתיבה', 'כתיב', 'הבנת הנקרא', 'חשבון', 'תלמיד', 'תלמידה', 'מבחן', 'הפסקה', 'ש.ב'];
  const kdgMarkers = ['גן', 'גננת', 'פינות הגן', 'סדנא', 'משחק סוציודרמטי', 'גמילה', 'צואה'];
  const schoolCount = schoolMarkers.filter((m) => text.includes(m)).length;
  const kdgCount = kdgMarkers.filter((m) => text.includes(m)).length;
  const isSchoolSetting = schoolCount >= kdgCount && kdgCount === 0 ? true : schoolCount > kdgCount;

  const subjectLabel = isSchoolSetting ? g.studentNoun : g.childNoun;
  const defaultStaffPartners = isSchoolSetting
    ? 'מחנכת הכיתה, מורת שילוב / הוראה מותאמת, הורים'
    : 'צוות הגן, גננת שילוב, סייעת אישית, הורים';

  // 3. פירוק חכם של הטקסט ליחידות משמעותיות (מבלי לחתוך משפטים באמצע על כל פסיק!)
  // מפצלים לפי נקודה, שורה חדשה, נקודה-פסיק, או מילות ניגוד/קישור מובהקות
  const rawSentences = text
    .replace(/\r\n/g, '\n')
    .split(/(?:[.\n;]+|\s+(?:אבל|אך|אולם|יחד עם זאת|עם זאת|לעומת זאת|מאידך|מצד שני|בנוסף לכך)\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  // בתוך משפט ארוך, נפצל בפסיק רק אם אחרי הפסיק מופיעה פתיחה חדשה מובהקת של קושי או חוזק
  const semanticClauses = [];
  rawSentences.forEach((sent) => {
    const subParts = sent
      .split(/,\s*(?=(?:מתקשה|זקוק|זקוקה|צריך|צריכה|לא מצליח|לא מצליחה|לא ניגש|לא ניגשת|נמנע|נמנעת|מוסח|מוסחת|מתעייף|מתעייפת|אוהב|אוהבת|מצטיין|מצטיינת|בעל|בעלת|מגלה|קשה לו|קשה לה|יש לו קושי|יש לה קושי)\b)/)
      .map((p) => p.replace(/^[,\-•*]\s*/, '').trim())
      .filter((p) => p.length > 2);
    semanticClauses.push(...subParts);
  });

  // 4. סיווג מדויק של כל יחידת משמעות ל"חוזקות וכוחות קיימים" מול "אתגרים ומוקדים לחיזוק"
  const challengePatterns = [
    /מתקשה/, /קושי/, /קשיים/, /קשה ל[וה]/, /זקוק/, /זקוקה/, /צריך/, /צריכה/, /נדרש/, /נדרשת/,
    /\bלא\s+/, /\bאינ[וה]\s+/, /נמנע/, /נמנעת/, /מתנגד/, /מתנגדת/, /חזרתי/, /תבניתי/, /נוקשות/,
    /התפרצו/, /בכי/, /תסכול/, /מוסח/, /מוסחת/, /מתעייף/, /מתעייפת/, /שגיאות/, /איטי/, /איטית/,
    /\bדל\b/, /\bדלה\b/, /קטוע/, /גמילה/, /צואה/, /קקי/, /מכנסיים/, /ליד הילדים/, /חולמנ/,
    /קם\b/, /קמה\b/, /מסתובב/, /תלות/, /חסר/, /חסרה/, /לשפר/, /לפתח/, /לחזק/, /חיזוק/, /מעכב/
  ];

  const positivePatterns = [
    /נעים/, /נעימה/, /חברותי/, /חברותית/, /סקרן/, /סקרנית/, /חכם/, /חכמה/, /נבון/, /נבונה/,
    /וורבלי/, /ורבלי/, /אנרגי/, /הומור/, /טוב לב/, /טובת לב/, /קשוב/, /קשובה/, /מפנים/, /מפנימה/,
    /אהוב/, /אהובה/, /משתף פעולה/, /משתפת פעולה/, /מוטיבציה/, /אוהב/, /אוהבת/, /מצליח/, /מצליחה/,
    /מצטיין/, /מצטיינת/, /שולט/, /שולטת/, /יצירתי/, /יצירתית/, /עצמאי/, /עצמאית/, /שמח/, /חייכנ/,
    /ידע כללי/, /ידע עולם/, /זיכרון טוב/, /יכולת טובה/, /ריכוז טובה/, /קשר טוב/, /עוזר/, /עוזרת/
  ];

  const strengthClauses = [];
  const challengeClauses = [];

  semanticClauses.forEach((clause) => {
    const isChallenge =
      challengePatterns.some((rx) => rx.test(clause)) &&
      !/ללא\s+(?:קושי|קשיים|בעיות)/.test(clause);
    const isPositive = positivePatterns.some((rx) => rx.test(clause));

    if (isChallenge) {
      challengeClauses.push(clause);
    } else if (isPositive) {
      strengthClauses.push(clause);
    } else {
      // משפט תיאורי ניטרלי: אם יש בו מילים לימודיות/תפקודיות של קושי נסווג לאתגר, אחרת לרקע חיובי
      strengthClauses.push(clause);
    }
  });

  // 5. פונקציה להפיכת משפט גולמי של חוזק לניסוח פדגוגי רשמי וקוהרנטי
  const formalizeStrengthClause = (rawClause) => {
    let c = rawClause
      .replace(/^(?:הילד\/ה|התלמיד\/ה|הילד|הילדה|התלמיד|התלמידה)\s+/i, '')
      .replace(new RegExp(`^${firstName}\\s+(?:הוא|היא)?\\s*`), '')
      .replace(/^(?:הוא|היא)\s+/, '')
      .trim();

    if (!c) return '';

    // העשרה סמנטית של ביטויים יומיומיים לשפה פדגוגית מקצועית
    c = c
      .replace(/\bילד מתוק\b|\bילדה מתוקה\b|\bמתוק\b|\bמתוקה\b/g, isFemale ? 'בעלת מזג נעים ונוח' : 'בעל מזג נעים ונוח')
      .replace(/\bילד נעים\b|\bילדה נעימה\b/g, isFemale ? 'בעלת נוכחות נעימה וחיובית' : 'בעל נוכחות נעימה וחיובית')
      .replace(/\bעוזר לחברים\b|\bעוזרת לחברים\b/g, isFemale ? 'מגלה אמפתיה ונכונות לסייע לחבריה' : 'מגלה אמפתיה ונכונות לסייע לחבריו')
      .replace(/\bיש לו ידע כללי רחב\b|\bיש לה ידע כללי רחב\b/g, isFemale ? 'בעלת ידע עולם רחב ועשיר' : 'בעל ידע עולם רחב ועשיר')
      .replace(/\bאוהב ללמוד\b|\bאוהבת ללמוד\b/g, isFemale ? 'מגלה סקרנות לימודית ומוטיבציה ללמידה' : 'מגלה סקרנות לימודית ומוטיבציה ללמידה');

    if (!/^(?:בעל|בעלת|מגלה|מקיים|מקיימת|יוצר|יוצרת|משתף|משתפת|מפנים|מפנימה|אוהב|אוהבת|שולט|שולטת|יכולת|ניכר|ניכרת)/.test(c)) {
      c = `${g.characterized} ב${c.startsWith('כך ש') ? c : `תפקוד חיובי: ${c}`}`;
    }
    return `• ${c.charAt(0).toUpperCase() + c.slice(1)}`;
  };

  // פונקציה להפיכת משפט קושי גולמי לניסוח מקצועי עבור עמודת "כוחות להעצמה וחיזוק"
  const formalizeEmpowerClause = (rawClause) => {
    let c = rawClause
      .replace(/^(?:אבל|אך|אולם| עם זאת|יחד עם זאת|כמו כן|בנוסף)\s+/g, '')
      .replace(new RegExp(`^${firstName}\\s+`), '')
      .replace(/^(?:הוא|היא)\s+/, '')
      .trim();

    if (c.startsWith('קשה לו ל') || c.startsWith('קשה לה ל')) {
      c = 'חיזוק היכולת ל' + c.replace(/^קשה ל[וה] ל/, '');
    } else if (c.startsWith('מתקשה ב')) {
      c = 'חיזוק ופיתוח מיומנויות ב' + c.replace(/^מתקשה ב/, '');
    } else if (c.startsWith('מתקשה ל')) {
      c = 'ביסוס היכולת ל' + c.replace(/^מתקשה ל/, '');
    } else if (c.startsWith('זקוק לחיזוק ב') || c.startsWith('זקוקה לחיזוק ב')) {
      c = 'העצמה וחיזוק בתחום ' + c.replace(/^זקוקה? לחיזוק ב/, '');
    } else if (c.startsWith('זקוק ל') || c.startsWith('זקוקה ל')) {
      c = 'מתן מענה ותיווך מותאם ל' + c.replace(/^זקוקה? ל/, '');
    } else if (c.startsWith('לא מצליח ל') || c.startsWith('לא מצליחה ל')) {
      c = 'פיתוח מסוגלות וכלים ל' + c.replace(/^לא מצליחה? ל/, '');
    } else if (!/^(?:חיזוק|פיתוח|שיפור|הרחבת|ביסוס|ויסות|רכישת)/.test(c)) {
      c = `חיזוק והעצמה סביב: ${c}`;
    }

    return `• ${c}`;
  };

  // 6. מאגר תבניות פדגוגיות מקיף (14 תחומים) הבונה מטרות מדויקות אך ורק מתוך משפטי הקושי של התלמיד/ה!
  const pedagogicalDomains = [
    {
      id: 'dom_reading_fluency',
      bankId: 'gb_matya_read_1',
      environment: 'קריאה - רמת פענוח ושטף',
      triggerRx: /קריאה|קורא|קוראת|פענוח|שטף|אותיות|ניקוד|תנועות|צופן אלפביתי|מילים חדשות/,
      buildGoal: (matchedClauses) => ({
        environment: 'קריאה - רמת פענוח ושטף',
        activityParticipation: `בהתאם להערכת הצוות בחלק הקריאה: ${matchedClauses.join('. ')}. ${firstName} ${g.needs} לתיווך מדורג לביסוס שליטה אוטומטית באבני היסוד של הקריאה ושיפור הדיוק והשטף.`,
        title: `${subjectLabel} ${g.read} קריאה שוטפת, רהוטה ומדויקת של טקסטים מותאמים תוך שליטה בצופן האלפביתי והבנת הכתוב`,
        objectives: `• ${g.identify} ${isFemale ? 'ותשלוט' : 'וישלוט'} באופן אוטומטי באותיות, תנועות, סימני ניקוד וצירופים.\n• ${g.apply} את הידע האלפביתי בפענוח מילים חדשות ומשפטים ברמת הכיתה.\n• ${g.read} בקצב מותאם ותוך התייחסות לסימני פיסוק והטעמה.`,
        opportunities: `• תרגול יומיומי מובנה עם כרטיסיות תנועות, הברות וצירופים עבור ${firstName}.\n• קריאה מתווכת וחוזרת של פסקאות קצרות ומנוקדות לחיזוק האוטומטיות והשטף.\n• סימון חזותי של תנועות וסימני פיסוק בטקסט ומתן משוב חיובי מיידי.`,
        partners: 'מורת שילוב / הוראה מותאמת, מחנכת הכיתה, הורים (תרגול קריאה קצר בבית)',
        duration: 'מחצית שנת לימודים עד סוף השנה',
        evaluationCriteria: `קריאה קולית מדויקת ושוטפת של טקסט מותאם לרמת ${firstName} תוך צמצום משמעותי בשגיאות פענוח.`
      })
    },
    {
      id: 'dom_phonological',
      bankId: 'gb_matya_read_2',
      environment: 'מוכנות לקריאה והבחנה שמיעתית',
      triggerRx: /פונולוג|שמיעתי|צליל פותח|צליל סוגר|הברות|חריזה|מוכנות לקריאה|מיזוג צלילים/,
      buildGoal: (matchedClauses) => ({
        environment: 'מוכנות לקריאה והבחנה שמיעתית',
        activityParticipation: `בתחום המוכנות לקריאה והמודעות הפונולוגית: ${matchedClauses.join('. ')}. סביבה רב-חושית ומשחקית מאפשרת ל${firstName} גיוס קשב ושיתוף פעולה.`,
        title: `${subjectLabel} ${g.develop} הבחנה שמיעתית ומודעות פונולוגית מבוססת כתשתית לרכישת הקריאה והכתיבה`,
        objectives: `• ${g.identify} ${isFemale ? 'ותפריד' : 'ויפריד'} צליל פותח וצליל סוגר במילה באופן עצמאי.\n• ${isFemale ? 'תפרקותרכיב' : 'יפרק וירכיב'} מילים למרכיביהן השמיעתיים (הברות ופונמות).\n• ${g.identify} חריזה וצירופי צלילים בפעילויות שפתיות.`,
        opportunities: `• משחקי מודעות פונולוגית מבוססי תמונות, חפצים מוחשיים ותנועה עם ${firstName}.\n• פירוק והרכבת מילים בעזרת עזרים חזותיים (דסקיות צבעוניות, מחיאות כף).`,
        partners: isSchoolSetting ? 'מורת שילוב, קלינאית תקשורת, מחנכת והורים' : 'גננת, גננת שילוב, קלינאית תקשורת והורים',
        duration: 'כשלושה חודשים',
        evaluationCriteria: 'זיהוי מדויק ועצמאי של צליל פותח/סוגר ופירוק מילים להברות ב-85% מהמקרים.'
      })
    },
    {
      id: 'dom_reading_comp',
      bankId: 'gb_matya_comp_1',
      environment: 'הבנת הנקרא',
      triggerRx: /הבנת הנקרא|משמעות סמויה|משמעות גלויה|רעיון מרכזי|עיקר וטפל|הסקת מסקנות|להבין טקסט|שאלות הבנה|שחזור סיפור/,
      buildGoal: (matchedClauses) => ({
        environment: 'הבנת הנקרא',
        activityParticipation: `בתחום הבנת הנקרא ועיבוד טקסט: ${matchedClauses.join('. ')}. ${firstName} ${g.needs} לתיווך וארגון חזותי של המידע לשם הפקת משמעות גלויה וסמויה.`,
        title: `${subjectLabel} ${g.understand} משמעות גלויה וסמויה בטקסט ${isFemale ? 'ותפיק' : 'ויפיק'} מידע ברמת משפט, פסקה וקטע שלם`,
        objectives: `• ${isFemale ? 'תאתר' : 'יאתר'} פרטים רלוונטיים בטקסט ${isFemale ? 'ותסדר' : 'ויסדר'} אירועים ברצף הגיוני.\n• ${isFemale ? 'תבחין' : 'יבחין'} בין עיקר לטפל ${isFemale ? 'ותזהה' : 'ויזהה'} את הרעיון המרכזי בפסקה.\n• ${isFemale ? 'תסיק' : 'יסיק'} מסקנות מתוך הכתוב ${isFemale ? 'ותענה' : 'ויענה'} תשובות מנומקות בעל-פה ובכתב.`,
        opportunities: `• הטרמת אוצר מילים ומושגים מרכזיים עבור ${firstName} טרם קריאת הטקסט.\n• שימוש במארגנים גרפיים, מפת סיפור וכרטיסיית "פיצוח שאלה".\n• סימון מילות מפתח ומילות קישור בצבעים ותיווך מדורג מגלוי לסמוי.`,
        partners: 'מורת הוראה מותאמת / שילוב, מחנכת הכיתה',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'מענה עצמאי, מדויק ומנומק על שאלות הבנה ברמה גלויה וסמויה בטקסט מותאם.'
      })
    },
    {
      id: 'dom_graphomotor_writing',
      bankId: 'gb_matya_write_1',
      environment: 'כתיבה, גרפומוטוריקה וכתב',
      triggerRx: /גרפומוטור|כתב יד|אחיזת עיפרון|העתקה מהלוח|להעתיק|שורה|רווחים בין מילים|עיצוב אותיות|מתעייף בכתיבה|מתעייפת בכתיבה|קצב כתיבה/,
      buildGoal: (matchedClauses) => ({
        environment: 'כתיבה, גרפומוטוריקה וכתב',
        activityParticipation: `בתפקודי הכתיבה והגרפומוטוריקה: ${matchedClauses.join('. ')}. התאמת כלי הכתיבה והפחתת עומס מוטורי מסייעים ל${firstName} לשמר פניות ללמידה.`,
        title: `${subjectLabel} ${g.develop} מיומנויות גרפומוטוריות, התארגנות תקינה בדף וכתיבה קריאה ושוטפת`,
        objectives: `• ${g.write} בתוך השורה תוך שמירה על גודל אותיות אחיד ורווחים תקינים בין מילים.\n• ${isFemale ? 'תעצב' : 'יעצב'} אותיות בכיווניות נכונה ובכתב יד קריא וברור.\n• ${g.persevere} במשימות כתיבה והעתקה מותאמות לאורך זמן מבלי להתעייף.`,
        opportunities: `• שימוש במחברת בעלת שורות מודגשות, סרגל רווח חזותי ומאחז עיפרון מותאם ל${firstName}.\n• חלוקת משימות כתיבה והעתקה מהלוח למקטעים קצרים ומתן דפי עזר מודפסים במידת הצורך.\n• תרגול ממוקד בהדרכת מרפאה בעיסוק ומורת שילוב.`,
        partners: 'מורת שילוב, מרפאה בעיסוק, מחנכת הכיתה',
        duration: 'מחצית שנת לימודים',
        evaluationCriteria: 'כתיבת פסקה בכתב קריא, מאורגן בשורה ובעל רווחים תקינים בקצב מותאם.'
      })
    },
    {
      id: 'dom_spelling',
      bankId: 'gb_matya_spell_1',
      environment: 'כתיב',
      triggerRx: /שגיאות כתיב|כתיב|הומופוניות|אותיות סופיות|אימות קריאה|השמטות אותיות/,
      buildGoal: (matchedClauses) => ({
        environment: 'כתיב',
        activityParticipation: `בתחום הכתיב: ${matchedClauses.join('. ')}. ${firstName} ${g.needs} להקניית תבניות מילה חזותיות וחוקי כתיב מובנים.`,
        title: `${subjectLabel} ${g.develop} שליטה בכתיב נכון ומודעות מורפולוגית וחזותית בכתיבה`,
        objectives: `• ${g.write} מילים שכיחות בכתיב תקין תוך ייצוג מלא של כלל מרכיבי המילה.\n• ${g.apply} חוקי כתיב בסיסיים (אותיות סופיות, אימות קריאה, מוספיות ושורשים).\n• ${isFemale ? 'תפעיל' : 'יפעיל'} בקרה עצמית לבדיקת ותיקון שגיאות כתיב לאחר הכתיבה.`,
        opportunities: `• הוראת משפחות מילים ושורשים והדגשת תבניות כתיב חוזרות בצבע עבור ${firstName}.\n• בניית "מילון אישי" של מילים שכיחות וכרטיסיית בקרה לבדיקת הטקסט.`,
        partners: 'מורת הוראה מותאמת / שילוב, מחנכת הכיתה',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'צמצום משמעותי בשגיאות הכתיב במילים שכיחות ויישום חוקי כתיב בכתיבה חופשית.'
      })
    },
    {
      id: 'dom_written_expression',
      bankId: 'gb_matya_expr_write_1',
      environment: 'מבע רעיוני והבעה בכתב',
      triggerRx: /הבעה בכתב|מבע רעיוני|ניסוח בכתב|מילות קישור|כתיבת פסקה|כתיבה חופשית|לנסח משפט|אוצר מילים בכתב/,
      buildGoal: (matchedClauses) => ({
        environment: 'מבע רעיוני והבעה בכתב',
        activityParticipation: `בתחום ההבעה בכתב והמבע הרעיוני: ${matchedClauses.join('. ')}. שימוש במארגני חשיבה ותבניות כתיבה מקל על ${firstName} לארגן ולהרחיב את רעיונותי${isFemale ? 'ה' : 'ו'}.`,
        title: `${subjectLabel} ${g.develop} ${g.improve} יכולת הבעה בכתב (מבע רעיוני) בהירה, ממוקדת ולכידה`,
        objectives: `• ${g.express} רעיון שלם בכתב ברמת משפט ופסקה תוך שמירה על מבנה תחבירי תקין.\n• ${g.use} במילות קישור מתאימות ובאוצר מילים עשיר ומותאם לנושא.\n• ${g.organize} טקסט קצר בעל פתיחה, גוף וסיום לפני ובזמן הכתיבה.`,
        opportunities: `• תכנון מוקדם של הכתיבה עם ${firstName} באמצעות "שמש אסוציאציות" או תבנית פסקה.\n• הצמדת דף עזר אישי עם מחסן מילות קישור ופתילי משפטים.`,
        partners: 'מורת שילוב, מחנכת הכיתה',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'כתיבת פסקה לכידה, ממוקדת ובעלת רצף הגיוני ושימוש הולם במילות קישור.'
      })
    },
    {
      id: 'dom_oral_expression',
      bankId: 'gb_matya_oral_1',
      environment: 'הבעה בעל-פה ושיח',
      triggerRx: /הבעה בעל|שיח|שיחה|דיבור|אוצר מילים דל|לנסח בעל|שליפה|שפה|קלינאית תקשורת|משפטים קצרים בעל/,
      buildGoal: (matchedClauses) => ({
        environment: 'הבעה בעל-פה ושיח',
        activityParticipation: `בתחום השפה וההבעה בעל-פה: ${matchedClauses.join('. ')}. בסביבה אינטימית ומתווכת ${firstName} ${isFemale ? 'משתפת' : 'משתף'} פעולה באופן מיטבי יותר.`,
        title: `${subjectLabel} ${g.develop} ${g.improve} יכולת הבעה בעל-פה, ארגון מסר מילולי והשתלבות בשיח`,
        objectives: `• ${isFemale ? 'תענה' : 'יענה'} תשובות שלמות, מנומקות וענייניות ברצף הגיוני.\n• ${isFemale ? 'תתאר ותשחזר' : 'יתאר וישחזר'} חוויה, אירוע או תוכן נלמד באופן בהיר ותקין תחבירית.\n• ${g.participate} בשיח קבוצתי תוך הקשבה והתייחסות מותאמת לדברי האחר.`,
        opportunities: `• תרגול שיח מונחה בקבוצה קטנה עם תבניות מענה ("אני חושב/ת ש... מפני ש...").\n• שימוש בשאלות מכוונות (מי, מתי, איפה, מה קרה) לתמיכה בארגון המסר המילולי של ${firstName}.`,
        partners: 'צוות חינוכי, קלינאית תקשורת / מורת שילוב, הורים',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'השתתפות פעילה בשיח ומתן תשובות שלמות, מאורגנות ומנומקות בעל-פה.'
      })
    },
    {
      id: 'dom_attention_circle',
      bankId: null,
      environment: isSchoolSetting ? 'למידה בכיתה / קשב וריכוז' : 'מפגש מליאה / קבוצה',
      triggerRx: /קשב|ריכוז|מוסח|מוסחת|לשבת במפגש|לשבת בשיעור|קם|קמה|מסתובב|מסתובבת|חולמנות|טווח קשב|מיקוד/,
      buildGoal: (matchedClauses) => ({
        environment: isSchoolSetting ? 'למידה בכיתה / קשב וריכוז' : 'מפגש מליאה / קבוצה',
        activityParticipation: `בזמן ${isSchoolSetting ? 'שיעור ולמידה בכיתה' : 'מפגש מליאה ופעילות קבוצתית'}: ${matchedClauses.join('. ')}. מיקום מותאם, משימות קצרות וגירויים חזותיים מסייעים ל${firstName} בגיוס ושימור הקשב.`,
        title: `${subjectLabel} ${isFemale ? 'תאריך' : 'יאריך'} את טווח הקשב והריכוז ${isFemale ? 'ותשתתף' : 'וישתתף'} באופן מווסת ופעיל ב${isSchoolSetting ? 'שיעור' : 'מפגש'}`,
        objectives: `• ${isFemale ? 'תשמור' : 'ישמור'} על ישיבה מווסתת ומיקוד קשב לאורך פרקי זמן מתארכים ב${isSchoolSetting ? 'שיעור' : 'מפגש'}.\n• ${isFemale ? 'תשלים' : 'ישלים'} משימה לימודית מוגדרת תוך הפחתת מסיחים סביבתיים.\n• ${g.participate} באופן פעיל ומותאם בעזרת איתות מוסכם עם המבוגר.`,
        opportunities: `• הושבת ${firstName} במיקום קרוב ומופחת גירויים והטרמה על מבנה ה${isSchoolSetting ? 'שיעור' : 'מפגש'}.\n• פירוק מטלות ליחידות קצרות ותחומות בזמן ושילוב הפוגות תנועתיות יזומות.\n• מתן חיזוקים חיוביים מיידיים על שמירה על קשב והתמדה.`,
        partners: defaultStaffPartners,
        duration: 'עד סוף השנה',
        evaluationCriteria: `הארכת משך הקשב והמעורבות הפעילה ב${isSchoolSetting ? 'שיעורים' : 'מפגשים'} והשלמת משימות באופן עקבי.`
      })
    },
    {
      id: 'dom_emotional_sensory_reg',
      bankId: null,
      environment: 'ויסות רגשי וחושי',
      triggerRx: /ויסות|תסכול|התפרצו|בכי|כעס|הצפה|רגשי|חושי|מעברים|שינויים|מתנגד|מתנגדת|סף תסכול/,
      buildGoal: (matchedClauses) => ({
        environment: 'ויסות רגשי וחושי',
        activityParticipation: `בתחום הוויסות הרגשי והחושי והתמודדות עם מעברים: ${matchedClauses.join('. ')}. קשר בטוח, הטרמה מראש ומענה רגשי מכיל מסייעים ל${firstName} להירגע ולחזור לתפקוד.`,
        title: `${subjectLabel} ${g.develop} מיומנויות ויסות רגשי וחושי ויכולת התמודדות מותאמת במצבי תסכול, קושי ומעברים`,
        objectives: `• ${g.identify} סימני הצפה או תסכול מוקדמים ${isFemale ? 'ותיעזר' : 'וייעזר'} במבוגר או באסטרטגיית הרגעה מוסכמת.\n• ${g.express} תחושות, קושי או צורך באופן מילולי מותאם במקום תגובה התנהגותית/הימנעות.\n• ${isFemale ? 'תעבור' : 'יעבור'} בין פעילויות ושינויים בסדר היום באופן רגוע ומווסת בעזרת הטרמה.`,
        opportunities: `• הטרמה חזותית ומילולית ל${firstName} לפני מעברים ושינויים צפויים בסדר היום.\n• שיקוף רגשי, תיקוף ("אני רואה שזה מתסכל...") והקניית "ארגז כלים להרגעה" (פינת רוגע, נשימות, פנייה לאיש צוות).\n• הדרכה ושיתוף פעולה עם מטפלת רגשית / מרפאה בעיסוק.`,
        partners: `${defaultStaffPartners}, מטפלת רגשית / מרפאה בעיסוק`,
        duration: 'עד סוף השנה',
        evaluationCriteria: 'הפחתה ניכרת בעוצמת ותדירות מצבי התסכול, שימוש עצמאי יותר בכלי ויסות ומעבר רגוע בין פעילויות.'
      })
    },
    {
      id: 'dom_social_play',
      bankId: 'gb_eco_1',
      environment: isSchoolSetting ? 'אינטראקציה חברתית והפסקה' : 'מרחב הגן / אינטראקציה חברתית',
      triggerRx: /משחק סוציודרמטי|משחק משותף|ליד הילדים|אינטראקציות חברתיות|קושי חברתי|קשיים חברתיים|חברתית|תפקיד במשחק|תור במשחק|נוקשות|תבניתי|להצטרף למשחק|בהפסקה עם חברים/,
      buildGoal: (matchedClauses) => ({
        environment: isSchoolSetting ? 'אינטראקציה חברתית והפסקה' : 'מרחב הגן',
        activityParticipation: `בתחום החברתי והמשחק המשותף: ${matchedClauses.join('. ')}. תיווך בקבוצה קטנה ומודלינג של איש צוות תומכים ב${firstName} ביצירת קשר הדדי עם קבוצת השווים.`,
        title: isSchoolSetting
          ? `${subjectLabel} ${g.expand} מיומנויות חברתיות, תקשורת בינאישית ושיתוף פעולה עם בני קבוצת השווים`
          : `${subjectLabel} ${g.expand} את מיומנויותי${isFemale ? 'ה' : 'ו'} במשחק המשותף והסוציודרמטי ובאינטראקציה חברתית`,
        objectives: `• ${isFemale ? 'תצטרף' : 'יצטרף'} למשחק או פעילות משותפת עם חבר/ה אחד/ת או שניים באופן מותאם.\n• ${isFemale ? 'תגלה' : 'יגלה'} גמישות מחשבתית, שמירה על תור והדדיות בשיח ובמשחק.\n• ${isFemale ? 'תגוון' : 'יגוון'} בבחירת המשחקים, הפעילויות והשותפים לאינטראקציה.`,
        opportunities: `• הזמנה יזומה של ${firstName} למשחק/פעילות מובנית בזוג או בקבוצה קטנה תוך תיווך ומודלינג של מבוגר.\n• תרגול מיומנויות הצטרפות למשחק, פתרון קונפליקטים וגמישות בבחירת תפקידים.\n• עידוד וחיזוק יוזמות חברתיות חיוביות לאורך היום.`,
        partners: `${defaultStaffPartners}, מטפלת רגשית`,
        duration: 'עד סוף השנה',
        evaluationCriteria: `השתתפות פעילה, הדדית ומווסתת של ${firstName} במשחק ובאינטראקציה חברתית עם בני גיל${isFemale ? 'ה' : 'ו'}.`
      })
    },
    {
      id: 'dom_workshop_planning',
      bankId: 'gb_eco_2',
      environment: isSchoolSetting ? 'תכנון, התארגנות ותפקודים ניהוליים' : 'סדנא',
      triggerRx: /סדנא|יצירה|תכנון|התארגנות|תוצר|שולחן פעילות|ציוד|ילקוט|מוטוריקה עדינה|גזירה|הדבקה|מתחיל משימה|רצף עבודה/,
      buildGoal: (matchedClauses) => ({
        environment: isSchoolSetting ? 'תכנון, התארגנות ולמידה' : 'סדנא',
        activityParticipation: `בתחום התכנון, ההתארגנות והביצוע: ${matchedClauses.join('. ')}. פירוק המשימה לשלבים חזותיים ברורים מסייע ל${firstName} להתארגן ולהתמיד עד להפקת תוצר.`,
        title: isSchoolSetting
          ? `${subjectLabel} ${g.develop} מיומנויות תכנון, התארגנות עם ציוד לימודי ועבודה עצמאית בשלבים`
          : `${subjectLabel} ${isFemale ? 'תתנסה' : 'יתנסה'} בפעילויות השונות בסדנא תוך שימוש במיומנויות תכנון, התארגנות והפקת תוצר מתאים`,
        objectives: `• ${g.approach} למשימה/לשולחן הפעילות ו${g.organize} עם הציוד והחומרים הנדרשים בעזרת תיווך מדורג.\n• ${isFemale ? 'תפעל' : 'יפעל'} לפי רצף שלבים מובנה (תכנון, ביצוע ובקרה).\n• ${g.persevere} בפעילות במשך כ-10-15 דקות או עד להשלמת המשימה/התוצר.`,
        opportunities: `• הכנה מראש עם כרטיסיות שלבי עבודה וסדר יום חזותי עבור ${firstName}.\n• צמצום היסחים והצעת בחירה ממוקדת בין 2 אפשרויות.\n• תיווך שלבי ההתארגנות והתכנון על ידי מבוגר ומתן משוב מעצים על התהליך.`,
        partners: `${defaultStaffPartners}, מרפאה בעיסוק`,
        duration: 'עד סוף השנה',
        evaluationCriteria: `גישה עצמאית יותר למשימה, התארגנות יעילה והתמדה עד להשלמת תוצר מותאם.`
      })
    },
    {
      id: 'dom_toilet_adl',
      bankId: 'gb_eco_3',
      environment: 'שירותים / עצמאות בתפקודי יומיום (ADL)',
      triggerRx: /שירותים|גמילה|צואה|קקי|פיפי|להתפנות|מכנסיים|צרכים|היגיינה|עצמאות ב/,
      buildGoal: (matchedClauses) => ({
        environment: 'שירותים',
        activityParticipation: `בתחום העצמאות והתפקוד בשירותים: ${matchedClauses.join('. ')}. תהליך עקבי, רגוע ומתואם בין הצוות להורים תומך בביטחון של ${firstName}.`,
        title: `${subjectLabel} ${g.approach} לשירותים באופן עצמאי ומווסת לצורך התפנות ושמירה על היגיינה אישית`,
        objectives: `• ${g.express} באופן מילולי או במוסכם כאשר ${g.pronoun} ${g.needs} להתפנות.\n• ${g.approach} לשירותים באופן סדיר עם הפחתה הדרגתית של תזכורות ממבוגר.`,
        opportunities: `• הזמנה יזומה וקבועה של ${firstName} לשירותים בנקודות זמן מוגדרות בסדר היום.\n• הכנה ותמיכה באמצעות כרטיסיות סדר יום חזותיות וחיזוק חיובי לאורך התהליך.\n• תיאום רציף ואחידות במענה בין צוות המסגרת להורים בבית.`,
        partners: 'צוות הגן / המסגרת, סייעת אישית, הורים',
        duration: 'כשלושה חודשים',
        evaluationCriteria: 'הליכה עצמאית, רגועה וסדירה לשירותים.'
      })
    },
    {
      id: 'dom_math',
      bankId: null,
      environment: 'חשבון וחשיבה מתמטית',
      triggerRx: /חשבון|מתמטיקה|מספרים|כמות|חיבור|חיסור|כפל|חילוק|בעיות מילוליות|הנדסה|חשיבה כמותית/,
      buildGoal: (matchedClauses) => ({
        environment: 'חשבון וחשיבה מתמטית',
        activityParticipation: `בתחום החשבון והחשיבה הכמותית: ${matchedClauses.join('. ')}. שימוש באמצעי המחשה וייצוגים חזותיים מסייע ל${firstName} בהבנת מושגים מתמטיים.`,
        title: `${subjectLabel} ${g.develop} הבנה כמותית, שליטה בפעולות החשבון ויישום אסטרטגיות לפתרון תרגילים ובעיות`,
        objectives: `• ${isFemale ? 'תבין ותיישם' : 'יבין ויישם'} את המושגים הכמותיים ופעולות החשבון הנלמדות בעזרת אמצעי המחשה.\n• ${isFemale ? 'תפתור' : 'יפתור'} תרגילים ובעיות מילוליות מותאמות תוך עבודה לפי שלבים מובנים.\n• ${isFemale ? 'תבסס' : 'יבסס'} שליטה בעובדות יסוד מתמטיות בקצב מותאם אישית.`,
        opportunities: `• עבודה עם אביזרים מוחשיים, ישר המספרים וכרטיסיות שלבי פתרון עבור ${firstName}.\n• פירוק בעיות מילוליות לשלבים (מה ידוע, מה נשאל, בחירת הפעולה ופתרון).\n• תרגול הדרגתי ממוחשי לחצי-מוחשי ולמופשט.`,
        partners: 'מורת שילוב / הוראה מותאמת, מורה לחשבון / מחנכת, הורים',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'פתרון נכון ועצמאי של תרגילים ומשימות חשבוניות מותאמות לרמת הלימוד.'
      })
    },
    {
      id: 'dom_gross_motor_yard',
      bankId: null,
      environment: 'חצר / מוטוריקה גסה ומרחב',
      triggerRx: /חצר|מוטוריקה גסה|מתקנים|ריצה|קפיצה|כדור|שיווי משקל|תנועה במרחב|מסורבל/,
      buildGoal: (matchedClauses) => ({
        environment: 'חצר',
        activityParticipation: `בפעילות בחצר ובמוטוריקה הגסה: ${matchedClauses.join('. ')}. תיווך תנועתי ומשחקים מובנים בחצר מעודדים את ${firstName} להתנסות בטוחה.`,
        title: `${subjectLabel} ${g.expand} את המיומנויות המוטוריות והשתתפות הפעילה והמווסתת במרחב החצר`,
        objectives: `• ${isFemale ? 'תתנסה' : 'יתנסה'} במגוון מתקנים ומשחקי תנועה וכדור בחצר בביטחון.\n• ${g.participate} במשחקי חצר מובנים עם בני קבוצת השווים תוך שמירה על כללי בטיחות ווויסות גופני.`,
        opportunities: `• הזמנת ${firstName} למסלולי תנועה ומשחקי חצר מובנים בקבוצה קטנה.\n• עידוד ותיווך הדרגתי להתנסות במתקנים ובמשחקי כדור.`,
        partners: defaultStaffPartners,
        duration: 'עד סוף השנה',
        evaluationCriteria: 'השתתפות פעילה, בטוחה ומווסתת בפעילויות ובמשחקים במרחב החצר.'
      })
    }
  ];

  // 7. שיוך משפטי הקושי של התלמיד/ה לתחומים הפדגוגיים (רק מתוך challengeClauses, לעולם לא מתוך חוזקות!)
  const matchedGoals = [];
  const consumedClauseIndices = new Set();

  // אם לא זוהה אף משפט קושי מפורש, נבדוק את כלל המשפטים
  const candidateChallengeClauses =
    challengeClauses.length > 0 ? challengeClauses : semanticClauses;

  pedagogicalDomains.forEach((dom) => {
    const matchingForDomain = [];
    candidateChallengeClauses.forEach((cl, idx) => {
      if (dom.triggerRx.test(cl)) {
        matchingForDomain.push(cl);
        consumedClauseIndices.add(idx);
      }
    });

    if (matchingForDomain.length > 0) {
      const built = dom.buildGoal(matchingForDomain);
      matchedGoals.push({
        id: 'g_rev_' + Date.now() + '_' + matchedGoals.length,
        ...built
      });
    }
  });

  // 8. עבור כל משפט קושי ספציפי של המורה שלא נכנס לאחד מ-14 התחומים המוגדרים – נייצר מטרה קוהרנטית ומותאמת אישית!
  candidateChallengeClauses.forEach((cl, idx) => {
    if (consumedClauseIndices.has(idx)) return;
    if (matchedGoals.length >= 5) return; // עד 5 מטרות מרכזיות וממוקדות בדוח

    const coreTopic = cl
      .replace(/^(?:אבל|אך|אולם|כמו כן|בנוסף)\s+/g, '')
      .replace(new RegExp(`^${firstName}\\s+`), '')
      .replace(/^(?:הוא|היא)\s+/, '')
      .replace(/^(?:מתקשה ב|מתקשה ל|קשה לו ב|קשה לה ב|קשה לו ל|קשה לה ל|זקוק לחיזוק ב|זקוקה לחיזוק ב|זקוק ל|זקוקה ל|יש קושי ב)/, '')
      .trim();

    if (coreTopic.length < 3) return;

    const defaultEnv = isSchoolSetting ? 'מרחב הכיתה והלמידה' : 'מרחב הגן';
    matchedGoals.push({
      id: 'g_rev_custom_' + Date.now() + '_' + idx,
      environment: defaultEnv,
      activityParticipation: `על פי הערכת הצוות החינוכי: ${cl}. מתן תיווך מותאם, הטרמה ופירוק לשלבים מאפשרים ל${firstName} להתקדם בתחום זה.`,
      title: `${subjectLabel} ${g.develop} ${g.improve} את יכולותי${isFemale ? 'ה' : 'ו'} בתחום: ${coreTopic}`,
      objectives: `• ${isFemale ? 'תגלה' : 'יגלה'} מעורבות ונכונות להתנסות בפעילויות הקשורות ל${coreTopic} בעזרת תיווך מבוגר.\n• ${isFemale ? 'תיישם' : 'יישם'} אסטרטגיות וכלים מותאמים לשיפור התפקוד ב${coreTopic}.\n• ${isFemale ? 'תפעל' : 'יפעל'} באופן עצמאי ומווסת יותר במצבים אלו לאורך סדר היום.`,
      opportunities: `• תיווך אישי, מודלינג ופירוק המשימה לשלבים קצרים וברורים עבור ${firstName}.\n• שימוש בעזרים חזותיים ומתן משוב חיובי ומעצים בזמן אמת.`,
      partners: defaultStaffPartners,
      duration: 'עד סוף השנה',
      evaluationCriteria: `שיפור עקבי וניכר בתפקוד של ${firstName} ב${coreTopic} והשתתפות פעילה בסביבה החינוכית.`
    });
  });

  // 9. הרכבת טבלת הסיכום העליונה (מוקדי כוח קיימים + כוחות להעצמה וחיזוק) בניסוח פדגוגי רשמי וקוהרנטי
  const formattedExistingLines = strengthClauses
    .map(formalizeStrengthClause)
    .filter(Boolean);

  const formattedExisting =
    formattedExistingLines.length > 0
      ? formattedExistingLines.join('\n')
      : `• ${subjectLabel} ${g.characterized} בסקרנות טבעית וברצון להצליח ולהתקדם\n• ${isFemale ? 'מגיבה' : 'מגיב'} היטב לחיזוקים חיוביים, לעידוד ולקשר אישי חם ובטוח עם הצוות החינוכי\n• ${isFemale ? 'בעלת' : 'בעל'} פוטנציאל למידה והתפתחות משמעותי בסביבה מתווכת ומותאמת`;

  const formattedEmpowerLines = challengeClauses
    .map(formalizeEmpowerClause)
    .filter(Boolean);

  matchedGoals.forEach((goalObj) => {
    if (formattedEmpowerLines.length < 6) {
      const summaryLine = `• ${goalObj.environment}: ${goalObj.title.replace(/^(?:התלמיד\/ה|התלמיד|התלמידה|הילד\/ה|הילד|הילדה)\s+/, '')}`;
      if (!formattedEmpowerLines.some((l) => l.includes(goalObj.environment))) {
        formattedEmpowerLines.push(summaryLine);
      }
    }
  });

  const formattedEmpower =
    formattedEmpowerLines.length > 0
      ? formattedEmpowerLines.join('\n')
      : '• הרחבת העצמאות והתפקוד המווסת בסביבות הפעילות והלמידה השונות\n• חיזוק מיומנויות רגשיות, חברתיות ולימודיות בהתאם למטרות התוכנית';

  // 10. בניית פרק המלצות מערכתיות קוהרנטי ומותאם אישית לתלמיד/ה
  const environmentsMentioned = [...new Set(matchedGoals.map((item) => item.environment))].join(', ');
  const formalRecommendations =
    `1. עבודה מערכתית ועקבית של הצוות החינוכי והטיפולי בתחומי המיקוד שהוגדרו (${environmentsMentioned}), תוך הישענות על מוקדי הכוח של ${firstName} ומתן חוויות הצלחה.\n` +
    `2. התאמת הסביבה הלימודית: שימוש בהטרמה, עזרים חזותיים, פירוק משימות לשלבים קצרים ותיווך מדורג המותאם לקצב של ${firstName}.\n` +
    `3. שמירה על קשר רציף, שיתוף ותיאום ציפיות עם ההורים לחיזוק העקביות והעברת המיומנויות בין המסגרת החינוכית לבית.`;

  return {
    name: detectedName || currentFormData.name,
    educationalFramework: detectedFramework || currentFormData.educationalFramework,
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
