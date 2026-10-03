// מאגר מטרות ויעדים דינמי (מבוסס על סביבות ההשתתפות בגן)

export const ENVIRONMENTS_LIST = [
  'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
  'מפגש בגן',
  'משחק במרחב הגן',
  'סדנא / יצירה',
  'חצר',
  'שירותים',
  'אוכל',
  'פעילות שאינה בשגרה'
];

export const SCHOOL_YEARS_LIST = [
  'תשפ"ד (2023-2024)',
  'תשפ"ה (2024-2025)',
  'תשפ"ו (2025-2026)',
  'תשפ"ז (2026-2027)',
  'תשפ"ח (2027-2028)',
  'תשפ"ט (2028-2029)',
  'תש"צ (2029-2030)'
];

const TABLE_GAMES_OBJECTIVES = [
  'ימתין לתורו במשחק משותף',
  'ישחק במשחקים הדורשים מיון והכללה.',
  'יצליח לבנות לפי דגם באופן עצמאי',
  'ישמור על חוקי המשחק',
  'יצעד במשחק מסלול בהתאם לכמות בקוביה.',
  'יתנסה במשחקים שונים המונחים על השולחן.',
  'יבחר משחק בעצמו.',
  'יארגן את המשחק על פי הנדרש.',
  'יזכור את שלבי המשחק וחוקיו.',
  'יפנה לחבר באופן מילולי ויזמין אותו למשחק משותף.',
  'ישים לב לתורות.',
  'התנהגותי-רגשי: יגיב בצורה מותאמת בניצחון והפסד'
];

const CIRCLE_TIME_OBJECTIVES_1 = [
  'תפתח יכולת הכללה קטגוריזציה',
  'תתאר פעולות שונות ותחשף למגוון פעלים',
  'תשמע סיפור חוזר מתחילתו ועד סופו תתיחס לתוכן ולתמונות',
  'תפיק מידע מהסיפור',
  'תספר סיפור שכבר מכירה בעזרת האיורים',
  'תלמד שמות של רגשות',
  'יעביר מסר מילולי מאורגן, יחזק את יכולת ההסבר של דמיון ושוני (יוצאי דופן)',
  'יענה לשאלה שנשאל במפגש',
  'יחזור על תנועות (למשל אם יש ריקוד שכולם רוקדים)'
];

const CIRCLE_TIME_OBJECTIVES_2 = [
  'בקבוצה קטנה ליווי שיחה לתכנים של הסיפור',
  'לשחזר חוויות ביחד לשאול שאלות מנחות - מי? איפה? מתי? מה היה?'
];

const GARDEN_SPACE_OBJECTIVES = [
  'יתנסה במשחק בסביבות השונות בגן באופן עצמאי',
  'יבחר סביבה בגן וישחק בה משחק משמעותי'
];

const WORKSHOP_OBJECTIVES = [
  'יתארגן עם ציוד לקראת פעילות יצירה',
  'יעדים בתחום הביצועי: יתארגן מול שולחן הסדנא.',
  'יעדים בתחום הביצועי: יגזור, ידביק, יצבע ויוצא לפועל את הרעיון לתוצר',
  'יעדים בתחום החברתי: יוציא לפועל את הרעיון בשיתוף עם חבר.',
  'יעדים בתחום החברתי: יזום עבודה עם חבר.',
  'יעדים בתחום החברתי: יוביל את התהליך.',
  'יעדים בתחום החברתי: ישמיע את דבריו בפני החבר',
  'בתחום השפתי: ישיים את הכלים הספציפיים (מספריים, דבק, טושים…) ואת הפעלים המתאימים: מצייר, גוזר, מדביק',
  'תחום התנהגותי רגשי: יחכה לתורו'
];

const YARD_OBJECTIVES = [
  'משחק חברתי בקבוצה קטנה (כגון ים יבשה, ארנבת שחורה, אבדה לי המטפחת, דג מלוח) בתיווך'
];

export const INITIAL_GOAL_BANK = [
  // === סביבת השתתפות: משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה ===
  {
    id: 'gb_table_1',
    title: 'ישחק במשחק משותף עם חבר בצורה מותאמת.',
    environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
    usageCount: 0,
    defaultActivity:
      'ניגש לשולחנות המשחק ומגלה עניין במשחקי בנייה וקופסא, אך זקוק לתיווך בשמירה על תור, חוקי המשחק ואינטראקציה הדדית עם חבר.',
    suggestedObjectives: TABLE_GAMES_OBJECTIVES,
    defaultOpportunities:
      '• תיווך של מבוגר במשחק זוגי או בקבוצה קטנה סביב השולחן.\n• הטרמת כללי המשחק והקפדה על תורות בעזרת עזר חזותי.\n• עידוד פנייה מילולית לחבר והזמנה למשחק משותף.',
    defaultPartners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'ישחק במשחק משותף עם חבר בצורה מותאמת תוך שמירה על תורות וחוקי המשחק.',
    facilitatingQuestions: [
      {
        q: '1. באילו משחקי שולחן/בנייה הילד/ה בוחר/ת לשחק כיום וכיצד מתנהלת האינטראקציה עם חבר?',
        suggestions: ['משחק ליד חבר אך מתקשה בשיתוף פעולה', 'מתקשה בהמתנה לתור ובשמירה על חוקי המשחק', 'מתקשה בתגובה להפסד במשחק']
      },
      {
        q: '2. אילו יעדים מתוך המאגר נרצה להציב עבורו/ה בסביבה זו?',
        suggestions: ['ימתין לתורו וישמור על חוקי המשחק', 'יפנה לחבר באופן מילולי ויזמין אותו למשחק משותף', 'יגיב בצורה מותאמת בניצחון והפסד']
      },
      {
        q: '3. איזה תיווך של הצוות יסייע להצלחה במשחק המשותף?',
        suggestions: ['משחק מתווך בזוג עם מודלינג של איש צוות', 'הטרמת שלבי המשחק וחוקיו לפני התחלה']
      }
    ]
  },
  {
    id: 'gb_table_2',
    title: 'יתנסה במשחקים שונים בגן תוך התמדה ומשחק משותף עם חבר',
    environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
    usageCount: 0,
    defaultActivity:
      'נוטה לבחור משחק קבוע ומוכר ומתקשה להתמיד או לגוון במשחקי שולחן, הרכבה ובנייה חדשים יחד עם חבר.',
    suggestedObjectives: TABLE_GAMES_OBJECTIVES,
    defaultOpportunities:
      '• חשיפה הדרגתית למגוון משחקי שולחן, מיון, הכללה ובנייה לפי דגם.\n• עידוד בחירת משחק עצמאית וארגון המשחק על פי הנדרש.\n• חיזוק ההתמדה והמשחק המשותף עם חבר.',
    defaultPartners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יתנסה במגוון משחקי שולחן והרכבה תוך התמדה ומשחק משותף עם חבר.',
    facilitatingQuestions: [
      {
        q: '1. מה משך ההתמדה הנוכחי במשחקי שולחן והאם הילד/ה מגוון/ת בבחירת המשחקים?',
        suggestions: ['בוחר משחק קבוע ועוזב לאחר זמן קצר', 'זקוק להכוונה בבחירת משחק וארגונו על השולחן']
      },
      {
        q: '2. אילו מיומנויות משחקיות נרצה לחזק?',
        suggestions: ['ישחק במשחקים הדורשים מיון והכללה', 'יצליח לבנות לפי דגם באופן עצמאי', 'יבחר משחק בעצמו ויארגן אותו על פי הנדרש']
      },
      {
        q: '3. כיצד נתווך את ההתנסות והמשחק המשותף עם חבר?',
        suggestions: ['הצעת בחירה בין 2 משחקים מונחים על השולחן ותיווך עם חבר']
      }
    ]
  },
  {
    id: 'gb_table_3',
    title: 'תשחק במשחקי קופסא חברתיים בעלי חוקים ותורות בתיווך מופחת.',
    environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
    usageCount: 0,
    defaultActivity:
      'מגלה עניין במשחקי קופסא חברתיים ומשחקי מסלול, אך זקוקה לתיווך רציף של מבוגר לזכירת חוקי המשחק, שמירה על תורות וצעידה בהתאם לכמות בקוביה.',
    suggestedObjectives: TABLE_GAMES_OBJECTIVES,
    defaultOpportunities:
      '• משחקי קופסא חברתיים ומשחקי מסלול בקבוצה קטנה עם הפחתה הדרגתית של תיווך המבוגר.\n• תרגול זכירת שלבי המשחק וחוקיו, המתנה לתור וצעידה בהתאם לכמות בקוביה.\n• תיווך רגשי-התנהגותי להתמודדות מותאמת עם ניצחון והפסד.',
    defaultPartners: 'צוות הגן, גננת שילוב, סייעת אישית',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'תשחק במשחקי קופסא חברתיים בעלי חוקים ותורות בתיווך מופחת מראשיתו ועד סופו.',
    facilitatingQuestions: [
      {
        q: '1. באיזה שלב במשחק הקופסא נדרש כיום עיקר התיווך של המבוגר?',
        suggestions: ['זכירת שלבי המשחק וחוקיו', 'המתנה לתור וצעידה במסלול בהתאם לכמות בקוביה', 'ויסות תגובה בניצחון והפסד']
      },
      {
        q: '2. כיצד נפחית בהדרגה את תיווך המבוגר במשחק?',
        suggestions: ['מעבר מתיווך צמוד להנחיה מקדימה וצפייה מהצד', 'מינוי "אחראי תור" בין הילדים']
      },
      {
        q: '3. מה יהווה סימן להצלחה במשחקי קופסא חברתיים?',
        suggestions: ['משחק עצמאי עם חברים תוך שמירה על חוקים ותורות']
      }
    ]
  },

  // === סביבת השתתפות: מפגש בגן ===
  {
    id: 'gb_circle_1',
    title: 'יביע סקרנות ועניין במפגש ויהיה שותף באופן פעיל.',
    environment: 'מפגש בגן',
    usageCount: 0,
    defaultActivity:
      'יושב במפגש הגן אך לעיתים פסיבי או מוסח, וממעט להשתתף באופן פעיל בשירים, תנועות, מענה לשאלות והתייחסות לסיפור.',
    suggestedObjectives: [...CIRCLE_TIME_OBJECTIVES_1, ...CIRCLE_TIME_OBJECTIVES_2],
    defaultOpportunities:
      '• הטרמה והכנה לקראת תכני המפגש והסיפור בקבוצה קטנה.\n• קריאת סיפור חוזר בליווי איורים ושאילת שאלות מנחות.\n• עידוד מענה לשאלות במפגש, שיום רגשות ופעלים וחזרה על תנועות וריקודים.',
    defaultPartners: 'גננת, צוות הגן, קלינאית תקשורת / גננת שילוב',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יביע סקרנות ועניין במפגש, יענה לשאלות וישתתף באופן פעיל בסיפור ובתנועה.',
    facilitatingQuestions: [
      {
        q: '1. כיצד הילד/ה מתפקד/ת כיום במפגש המליאה לעומת מפגש בקבוצה קטנה?',
        suggestions: ['מקשיב בשקט אך ממעט להשתתף מיוזמתו', 'מתקשה בשמירה על קשב לאורך סיפור', 'משתתף יותר בקבוצה קטנה או בתנועה/שירים']
      },
      {
        q: '2. אילו יעדים שפתיים וקוגניטיביים נקדם דרך המפגש והסיפור?',
        suggestions: ['תשמע סיפור חוזר ותפיק מידע מהסיפור', 'תפתח יכולת הכללה, קטגוריזציה והסבר דמיון ושוני', 'יענה לשאלה שנשאל במפגש ויחזור על תנועות']
      },
      {
        q: '3. אילו אמצעים יסייעו להשתתפות פעילה?',
        suggestions: ['בקבוצה קטנה ליווי שיחה לתכנים של הסיפור', 'שימוש באיורים והטרמה לפני המפגש']
      }
    ]
  },
  {
    id: 'gb_circle_2',
    title: 'ישתתף בשיח וישמור על נושא השיחה.',
    environment: 'מפגש בגן',
    usageCount: 0,
    defaultActivity:
      'משתתף בשיח במפגש או בקבוצה אך נוטה לקפוץ מנושא לנושא או מתקשה בארגון המסר המילולי ובשחזור חוויות ברצף.',
    suggestedObjectives: [...CIRCLE_TIME_OBJECTIVES_2, ...CIRCLE_TIME_OBJECTIVES_1],
    defaultOpportunities:
      '• בקבוצה קטנה ליווי שיחה לתכנים של הסיפור.\n• שחזור חוויות ביחד תוך שאילת שאלות מנחות: מי? איפה? מתי? מה היה?\n• חיזוק העברת מסר מילולי מאורגן ושמירה על נושא השיחה.',
    defaultPartners: 'גננת, צוות הגן, קלינאית תקשורת',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'ישתתף בשיח במפגש ובקבוצה קטנה, ישמור על נושא השיחה וישחזר חוויות באופן מאורגן.',
    facilitatingQuestions: [
      {
        q: '1. מה מאפיין את השתתפות הילד/ה בשיח במפגש כיום?',
        suggestions: ['מתקשה לשמור על נושא השיחה', 'מתקשה להעביר מסר מילולי מאורגן ולשחזר חוויות', 'זקוק לשאלות מנחות כדי להרחיב את דבריו']
      },
      {
        q: '2. באילו אמצעים נעזר כדי לבסס שיח ממוקד ומאורגן?',
        suggestions: ['בקבוצה קטנה ליווי שיחה לתכנים של הסיפור', 'לשחזר חוויות ביחד לשאול שאלות מנחות - מי? איפה? מתי? מה היה?']
      },
      {
        q: '3. מי השותפים לתהליך וכיצד נדע שהמטרה הושגה?',
        suggestions: ['גננת, קלינאית תקשורת וצוות הגן | שמירה על נושא השיחה ומענה ממוקד']
      }
    ]
  },

  // === סביבת השתתפות: משחק במרחב הגן ===
  {
    id: 'gb_space_1',
    title: 'יתנסה בפינות השונות בגן תוך התמדה ומשחק משותף עם חבר',
    environment: 'משחק במרחב הגן',
    usageCount: 0,
    defaultActivity:
      'נע בין מוקדי המשחק במרחב הגן או בוחר פינה קבועה, וזקוק לתיווך כדי לבחור סביבה באופן עצמאי, להתמיד במשחק משמעותי ולשחק במשחק משותף עם חבר.',
    suggestedObjectives: GARDEN_SPACE_OBJECTIVES,
    defaultOpportunities:
      '• עידוד ותיווך לבחירה עצמאית של פינת משחק במרחב הגן.\n• הזמנה למשחק משותף עם חבר בפינות הגן השונות תוך מודלינג של מבוגר.\n• העשרת המשחק בפינה ליצירת משחק משמעותי ומתמשך.',
    defaultPartners: 'צוות הגן, סייעת אישית, מטפלת רגשית',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יבחר סביבה במרחב הגן באופן עצמאי וישחק בה משחק משמעותי ומשותף עם חבר לאורך זמן.',
    facilitatingQuestions: [
      {
        q: '1. באילו פינות במרחב הגן הילד/ה משחק/ת כיום ומה אופי המשחק?',
        suggestions: ['עובר מפינה לפינה ללא התמדה במשחק משמעותי', 'משחק לבד או ליד ילדים בפינה קבועה']
      },
      {
        q: '2. אילו יעדים נרצה לקדם במשחק במרחב הגן?',
        suggestions: ['יתנסה במשחק בסביבות השונות בגן באופן עצמאי', 'יבחר סביבה בגן וישחק בה משחק משמעותי']
      },
      {
        q: '3. איזה תיווך של הצוות יסייע לו/לה להתמיד ולשחק עם חבר?',
        suggestions: ['ליווי בבחירת פינה והזמנת חבר למשחק משותף מתווך']
      }
    ]
  },

  // === סביבת השתתפות: סדנא / יצירה ===
  {
    id: 'gb_workshop_1',
    title: 'יתנסה בסדנאות השונות בגן באופן עצמאי',
    environment: 'סדנא / יצירה',
    usageCount: 0,
    defaultActivity:
      'נזקק להזמנה ולתיווך של מבוגר כדי לגשת לשולחנות הסדנא ולהתנסות בחומרי היצירה השונים בגן באופן עצמאי.',
    suggestedObjectives: WORKSHOP_OBJECTIVES,
    defaultOpportunities:
      '• הכנה והזמנה מותאמת לשולחן הסדנא והנגשת הציוד והחומרים.\n• עידוד התארגנות עצמאית מול שולחן הסדנא עם ציוד לקראת פעילות יצירה.\n• תיווך הדרגתי במיומנויות גזירה, הדבקה וצביעה והמתנה לתור.',
    defaultPartners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יתנסה בסדנאות השונות בגן באופן עצמאי תוך התארגנות מותאמת מול שולחן היצירה.',
    facilitatingQuestions: [
      {
        q: '1. כיצד הילד/ה ניגש/ת כיום לשולחן הסדנא ואילו חומרים מועדפים עליו/ה?',
        suggestions: ['לא ניגש מיוזמתו וזקוק להזמנה של מבוגר', 'מתקשה בהתארגנות עם ציוד מול שולחן הסדנא']
      },
      {
        q: '2. אילו יעדים נרצה לשלב בסדנא?',
        suggestions: ['יתארגן עם ציוד לקראת פעילות יצירה', 'יגזור, ידביק, יצבע ויוציא לפועל את הרעיון לתוצר', 'ישיים את הכלים הספציפיים ואת הפעלים המתאימים']
      },
      {
        q: '3. אילו התאמות ותיווך יקדמו עבודה עצמאית בסדנא?',
        suggestions: ['הכנה מראש, ארגון הציוד על השולחן ופירוק שלבי העבודה']
      }
    ]
  },
  {
    id: 'gb_workshop_2',
    title: 'יזום רעיון ויוציא אותו לפועל באמצעות חומרים בסדנא.',
    environment: 'סדנא / יצירה',
    usageCount: 0,
    defaultActivity:
      'מתנסה בחומרים בשולחן הסדנא אך מתקשה ליזום רעיון משלו, לתכנן את שלבי הביצוע ולהוציא את הרעיון לפועל עד להפקת תוצר.',
    suggestedObjectives: WORKSHOP_OBJECTIVES,
    defaultOpportunities:
      '• שיח מקדים לתכנון הרעיון ובחירת החומרים והכלים המתאימים בסדנא.\n• עידוד הוצאה לפועל של הרעיון באופן עצמאי או בשיתוף עם חבר.\n• חיזוק השפה סביב כלי היצירה והפעלים המתאימים.',
    defaultPartners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יזום רעיון יצירתי ויוציא אותו לפועל באמצעות חומרים בסדנא עד להפקת תוצר.',
    facilitatingQuestions: [
      {
        q: '1. במה מתבטא הקושי בין שלב העלאת הרעיון לשלב הביצוע וההוצאה לפועל בסדנא?',
        suggestions: ['מתקשה להעלות רעיון עצמאי ליצירה', 'מתחיל ליצור אך עוזב לפני השלמת התוצר', 'זקוק לתיווך בחיבור בין חומרים לכלים']
      },
      {
        q: '2. האם נרצה לשלב גם יעדים חברתיים בסדנא?',
        suggestions: ['יוציא לפועל את הרעיון בשיתוף עם חבר', 'יזום עבודה עם חבר וישמיע את דבריו בפני החבר']
      },
      {
        q: '3. כיצד נתווך את תכנון הרעיון והוצאתו לפועל?',
        suggestions: ['שיח תכנון קצר לפני תחילת העבודה וליווי בשלבי הביצוע']
      }
    ]
  },
  {
    id: 'gb_workshop_3',
    title: 'תרכוש ותשכלל מיומנויות בתחום הוויזו מוטורי (ציור, העתקה, גזירה וכיו"ב)',
    environment: 'סדנא / יצירה',
    usageCount: 0,
    defaultActivity:
      'מגלה קושי במיומנויות וויזו-מוטוריות ומוטוריקה עדינה בסדנא.',
    suggestedObjectives: WORKSHOP_OBJECTIVES,
    defaultOpportunities:
      '• תרגול מובנה וחווייתי של ציור, העתקה, גזירה, הדבקה וצביעה בשולחן הסדנא.\n• התאמת כלי היצירה והדרכת מרפאה בעיסוק.\n• שיום הכלים הספציפיים והפעלים המתאימים בזמן הפעילות.',
    defaultPartners: 'צוות הגן, מרפאה בעיסוק, סייעת אישית',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'תרכוש ותשכלל מיומנויות וויזו-מוטוריות ותיישם אותן בפעילות היצירה.',
    facilitatingQuestions: [
      {
        q: '1. באילו מיומנויות וויזו-מוטוריות ניכר הקושי המרכזי?',
        suggestions: ['קושי בגזירה מדויקת ובאחיזת מספריים/טושים', 'קושי בציור ובהעתקת צורות/דגמים']
      },
      {
        q: '2. אילו יעדים ביצועיים ושפתיים נשלב בתהליך?',
        suggestions: ['יגזור, ידביק, יצבע ויוציא לפועל את הרעיון לתוצר', 'ישיים את הכלים הספציפיים ואת הפעלים המתאימים']
      },
      {
        q: '3. האם מתקיימת הדרכה של מרפאה בעיסוק להתאמת הכלים והתיווך?',
        suggestions: ['כן, בשיתוף מרפאה בעיסוק וצוות הגן']
      }
    ]
  },
  {
    id: 'gb_workshop_4',
    title: 'יעבוד בשולחנות היצירה בצורה מתוכננת.',
    environment: 'סדנא / יצירה',
    usageCount: 0,
    defaultActivity:
      'ניגש לשולחנות היצירה אך פועל באימפולסיביות או בפיזור, ומתקשה בהתארגנות מוקדמת עם ציוד ובעבודה מתוכננת לפי שלבים.',
    suggestedObjectives: WORKSHOP_OBJECTIVES,
    defaultOpportunities:
      '• תיווך שלבי ההתארגנות מול שולחן הסדנא וארגון הציוד לקראת פעילות יצירה.\n• פירוק משימת היצירה לשלבים ברורים והמתנה לתור.\n• עידוד עבודה משותפת ומתוכננת עם חבר סביב השולחן.',
    defaultPartners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יתארגן מול שולחן הסדנא ויעבוד בשולחנות היצירה בצורה מתוכננת ועקבית.',
    facilitatingQuestions: [
      {
        q: '1. כיצד מתנהלת כיום ההתארגנות והעבודה של הילד/ה מול שולחן היצירה?',
        suggestions: ['מתקשה להתארגן עם ציוד לפני תחילת העבודה', 'פועל ללא תכנון מוקדם ומדלג בין שלבים']
      },
      {
        q: '2. אילו יעדים מתוך סדנא/יצירה יסייעו לביסוס עבודה מתוכננת?',
        suggestions: ['יתארגן עם ציוד לקראת פעילות יצירה', 'יתארגן מול שולחן הסדנא ויחכה לתורו']
      },
      {
        q: '3. אילו עזרים או תיווך של המבוגר יסייעו לתכנון העבודה?',
        suggestions: ['רצף חזותי של שלבי העבודה והכנת הציוד מראש']
      }
    ]
  },

  // === סביבת השתתפות: חצר ===
  {
    id: 'gb_yard_1',
    title: 'יתנסה בהדרגה במשחקים מוטוריים בחצר (במדרג קושי עולה)',
    environment: 'חצר',
    usageCount: 0,
    defaultActivity:
      'בזמן הפעילות בחצר נמנע ממשחקים מוטוריים מאתגרים או מתקנים חדשים, וזקוק לעידוד ותיווך להתנסות הדרגתית במדרג קושי עולה.',
    suggestedObjectives: YARD_OBJECTIVES,
    defaultOpportunities:
      '• חשיפה הדרגתית ומותאמת למשחקים מוטוריים ומתקנים בחצר במדרג קושי עולה.\n• הזמנה למשחק חברתי מוטורי בקבוצה קטנה בתיווך מבוגר.\n• מתן חיזוקים על התנסות והתמדה בפעילות בחצר.',
    defaultPartners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'יתנסה בביטחון ובהדרגה במשחקים מוטוריים בחצר במדרג קושי עולה.',
    facilitatingQuestions: [
      {
        q: '1. באילו פעילויות או מתקנים בחצר הילד/ה בוחר/ת כיום וממה הוא/היא נמנע/ת?',
        suggestions: ['נמנע ממשחקי תנועה ומתקנים מאתגרים', 'זקוק לתיווך וביטחון כדי להצטרף למשחק מוטורי']
      },
      {
        q: '2. אילו משחקי חצר בקבוצה קטנה נשלב כדי לעודד התנסות?',
        suggestions: ['משחק חברתי בקבוצה קטנה (כגון ים יבשה, ארנבת שחורה, אבדה לי המטפחת, דג מלוח) בתיווך']
      },
      {
        q: '3. כיצד נבנה את מדרג הקושי בחצר לאורך השנה?',
        suggestions: ['התנסות פרטנית מתווכת ולאחר מכן שילוב בקבוצה קטנה של ילדים']
      }
    ]
  },
  {
    id: 'gb_yard_2',
    title: 'ירחיב מעגל חברתי - יזמין או יצטרף לחברים נוספים',
    environment: 'חצר',
    usageCount: 0,
    defaultActivity:
      'במרחב החצר משחק לרוב לבדו או עם חבר קבוע אחד, ומתקשה ליזום הזמנה או להצטרף לחברים נוספים במשחק חברתי.',
    suggestedObjectives: YARD_OBJECTIVES,
    defaultOpportunities:
      '• ארגון משחק חברתי בקבוצה קטנה בחצר בתיווך איש צוות.\n• תיווך ומודלינג של משפטי הזמנה והצטרפות למשחק של חברים נוספים בחצר.\n• עידוד וחיזוק יוזמות חברתיות והרחבת מעגל החברים.',
    defaultPartners: 'צוות הגן, סייעת אישית, מטפלת רגשית',
    defaultDuration: 'עד סוף השנה',
    defaultEvaluation: 'ירחיב את המעגל החברתי בחצר, יזמין או יצטרף לחברים נוספים וישתתף במשחקים קבוצתיים.',
    facilitatingQuestions: [
      {
        q: '1. עם מי הילד/ה משחק/ת כיום בחצר ומה חוסם הצטרפות לחברים נוספים?',
        suggestions: ['משחק לבד או עם חבר אחד קבוע', 'מתקשה ליזום פנייה מילולית ולהצטרף למשחק קיים בחצר']
      },
      {
        q: '2. אילו משחקים חברתיים מתווכים בחצר יסייעו להרחבת המעגל החברתי?',
        suggestions: ['משחק חברתי בקבוצה קטנה (כגון ים יבשה, ארנבת שחורה, אבדה לי המטפחת, דג מלוח) בתיווך']
      },
      {
        q: '3. כיצד יתווך הצוות את ההזמנה או ההצטרפות לחברים בחצר?',
        suggestions: ['מודלינג של פנייה לחברים ותיווך משחק קבוצתי מובנה בחצר']
      }
    ]
  }
];

const GOAL_BANK_STORAGE_KEY = 'tala_ecological_goal_bank_v2';
export const GOAL_WEIGHTS_RESET_FLAG_KEY = 'tala_goal_weights_zeroed_v1';

export function loadGoalBank() {
  try {
    localStorage.removeItem('tala_ecological_goal_bank_v1');
    const saved = localStorage.getItem(GOAL_BANK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!localStorage.getItem(GOAL_WEIGHTS_RESET_FLAG_KEY)) {
          const zeroed = parsed.map((g) => ({ ...g, usageCount: 0 }));
          localStorage.setItem(GOAL_BANK_STORAGE_KEY, JSON.stringify(zeroed));
          localStorage.setItem(GOAL_WEIGHTS_RESET_FLAG_KEY, 'true');
          return zeroed;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load goal bank from localStorage', e);
  }
  localStorage.setItem(GOAL_WEIGHTS_RESET_FLAG_KEY, 'true');
  return INITIAL_GOAL_BANK;
}

export function saveGoalBank(bank) {
  localStorage.setItem(GOAL_BANK_STORAGE_KEY, JSON.stringify(bank));
}

export function getSortedGoalBank(bank) {
  const list = bank || loadGoalBank();
  return [...list].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
}

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
      usageCount: (Number(existing.usageCount) || 0) + 1,
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
      environment: goalData.environment || ENVIRONMENTS_LIST[0],
      usageCount: 1,
      defaultActivity: goalData.activityParticipation || '',
      suggestedObjectives: objLines.length > 0 ? objLines : ['יישום המטרה בהדרגה בסביבה הטבעית תוך תיווך מותאם.'],
      defaultOpportunities: goalData.opportunities || '',
      defaultPartners: goalData.partners || 'צוות הגן, הורים',
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
    environment: (goalInput.environment || ENVIRONMENTS_LIST[0]).trim(),
    usageCount: Number(goalInput.usageCount) >= 0 ? Number(goalInput.usageCount) : 0,
    defaultActivity: (goalInput.defaultActivity || '').trim(),
    suggestedObjectives:
      objectivesArray.length > 0
        ? objectivesArray
        : ['יישום המטרה בהדרגה בסביבה הטבעית תוך תיווך מותאם.'],
    defaultOpportunities: (goalInput.defaultOpportunities || '').trim(),
    defaultPartners: (goalInput.defaultPartners || 'צוות הגן, הורים').trim(),
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

// === עזר להתאמה סמנטית סובלנית לשגיאות כתיב והקלדה (Fuzzy & Contextual Normalization) ===
function normalizeHebrewTextForContext(raw) {
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

// === מנוע פירוש סמנטי ותקציר מנהלים (Executive Summary & Semantic Interpretation) ===
// לעולם אינו מעתיק משפטים גולמיים "As-Is", מתקן שגיאות מתוך ההקשר ומייצר תקציר מנהלים תמציתי לפי נושאים!
export function reverseEngineerRawTextLocally(rawText, currentFormData, goalBank) {
  const rawTrimmed = (rawText || '').trim();
  if (!rawTrimmed) return null;

  const text = normalizeHebrewTextForContext(rawTrimmed);
  const bank = getSortedGoalBank(goalBank);
  const dateInfo = resolveStudentAgeAndDateInfo(currentFormData, rawTrimmed);

  // 1. זיהוי מין הילד/ה (זכר/נקבה) לפי בחירת המורה בטופס או מתוך ההקשר בטקסט
  const femaleWords = [
    'ילדה', 'תלמידה', 'היא', 'שלה', 'לה', 'אותה', 'בעצמה',
    'אוהבת', 'יושבת', 'ניגשת', 'משחקת', 'בוחרת', 'יוצרת',
    'משתתפת', 'מדברת', 'נעימה', 'חברותית', 'סקרנית', 'חכמה',
    'נבונה', 'זקוקה', 'צריכה', 'מוסחת', 'מתעייפת', 'נמנעת',
    'מתנגדת', 'מבינה', 'מצליחה', 'רגישה', 'מתוקה', 'מקסימה', 'שקטה', 'פעילה', 'קשובה', 'מפנימה'
  ];
  const maleWords = [
    'ילד', 'תלמיד', 'הוא', 'שלו', 'לו', 'אותו', 'בעצמו',
    'אוהב', 'יושב', 'ניגש', 'משחק', 'בוחר', 'יוצר',
    'משתתף', 'מדבר', 'נעים', 'חברותי', 'סקרן', 'חכם',
    'נבון', 'זקוק', 'צריך', 'מוסח', 'מתעייף', 'נמנע',
    'מתנגד', 'מבין', 'מצליח', 'רגיש', 'מתוק', 'מקסים', 'שקט', 'פעיל', 'קשוב', 'מפנים'
  ];

  let femaleScore = 0;
  let maleScore = 0;
  femaleWords.forEach((w) => {
    const rx = new RegExp(`(^|[^א-ת])${w}(?=[^א-ת]|$)`);
    if (rx.test(rawTrimmed)) femaleScore += 1;
  });
  maleWords.forEach((w) => {
    const rx = new RegExp(`(^|[^א-ת])${w}(?=[^א-ת]|$)`);
    if (rx.test(rawTrimmed)) maleScore += 1;
  });

  let isFemale = false;
  if (currentFormData?.gender === 'girl') {
    isFemale = true;
  } else if (currentFormData?.gender === 'boy') {
    isFemale = femaleScore > maleScore + 2; // Override only if text strongly indicates a girl
  } else {
    isFemale = femaleScore > maleScore;
  }
  const resolvedGender = isFemale ? 'girl' : 'boy';

  const g = {
    childNoun: isFemale ? 'הילדה' : 'הילד',
    pronoun: isFemale ? 'היא' : 'הוא',
    needs: isFemale ? 'זקוקה' : 'זקוק',
    struggles: isFemale ? 'מתקשה' : 'מתקשה',
    interested: isFemale ? 'מגלה עניין' : 'מגלה עניין',
    functions: isFemale ? 'מתפקדת' : 'מתפקד'
  };

  // 2. חילוץ שם הילד/ה ומסגרת חינוכית אם צוינו
  let detectedName = currentFormData.name || '';
  const nonNameWords = new Set([
    'ילד', 'ילדה', 'תלמיד', 'תלמידה', 'נעים', 'נעימה', 'חמוד', 'חמודה', 'מתוק', 'מתוקה',
    'חברותי', 'חברותית', 'סקרן', 'סקרנית', 'הוא', 'היא', 'בעל', 'בעלת', 'לומד', 'לומדת',
    'נבון', 'נבונה', 'חכם', 'חכמה', 'שקט', 'שקטה', 'בגן', 'בכיתה', 'מגלה', 'מתקשה'
  ]);

  if (!detectedName || detectedName === 'תלמיד/ה חדש/ה') {
    const explicitMatch =
      rawTrimmed.match(/(?:שם הילד\/ה|שם התלמיד\/ה|שם הילד|שם הילדה|שם התלמיד|שם התלמידה|התלמיד|התלמידה|הילד|הילדה)\s*[:\-]?\s*([א-ת]{2,11})/) ||
      rawTrimmed.match(/^([א-ת]{2,11})\s+(?:הוא|היא|ילד|ילדה|תלמיד|תלמידה|בן|בת|לומד|לומדת)\b/);
    if (explicitMatch && explicitMatch[1] && !nonNameWords.has(explicitMatch[1])) {
      detectedName = explicitMatch[1].trim();
    }
  }

  const firstName =
    detectedName && detectedName !== 'תלמיד/ה חדש/ה'
      ? detectedName.trim().split(/\s+/)[0]
      : g.childNoun;

  let detectedFramework = currentFormData.educationalFramework || '';
  if (!detectedFramework) {
    const fwMatch = rawTrimmed.match(/(?:לומד|לומדת|נמצא|נמצאת)?\s*(?:ב|מסגרת:?)\s*((?:גן|כיתה|בית ספר|בי"ס)\s+[א-ת0-9"']+)/);
    if (fwMatch && fwMatch[1]) {
      detectedFramework = fwMatch[1].trim();
    }
  }

  // 3. פירוש סמנטי של מוקדי כוח (Executive Summary - עד 4 נקודות מתומצתות לפי נושאים, ללא העתקת טקסט גולמי!)
  const strengthTopicEvaluators = [
    {
      topic: 'מאפיינים אישיותיים ורגשיים',
      rx: /נעים|נעימה|מתוק|חמוד|שמח|חייכ|טוב לב|טובת לב|חום|רגיש|רגישה|הומור|אהוב|אהובה|אנרגי/,
      summary: isFemale
        ? '• תחום אישיותי-רגשי: ילדה נעימה, חיונית ובעלת מזג חם ונוכחות חיובית בגן'
        : '• תחום אישיותי-רגשי: ילד נעים, חיוני ובעל מזג חם ונוכחות חיובית בגן'
    },
    {
      topic: 'סקרנות, חשיבה ומוטיבציה',
      rx: /סקרן|סקרנית|חכם|חכמה|נבון|נבונה|ידע|זיכרון|לומד|לומדת|עניין|מתעניין|מתעניינת|קולט|קולטת|מבין|מבינה|חשיבה/,
      summary: isFemale
        ? '• תחום קוגניטיבי ולימודי: מגלה סקרנות טבעית, תפיסה טובה ומוטיבציה להתנסות ולמידה'
        : '• תחום קוגניטיבי ולימודי: מגלה סקרנות טבעית, תפיסה טובה ומוטיבציה להתנסות ולמידה'
    },
    {
      topic: 'תקשורת, שפה וקשר עם הצוות',
      rx: /וורבלי|ורבלי|מדבר|מדברת|שפה|אוצר מילים|קשר טוב|צוות|משתף פעולה|משתפת פעולה|קשוב|קשובה|כללים|גבולות|מפנים|מפנימה/,
      summary: isFemale
        ? '• תקשורת והסתגלות: מקיימת קשר בטוח עם צוות הגן, משתפת פעולה ומפנימה את שגרת הגן'
        : '• תקשורת והסתגלות: מקיים קשר בטוח עם צוות הגן, משתף פעולה ומפנים את שגרת הגן'
    },
    {
      topic: 'חברותיות ועניין במשחק',
      rx: /חברותי|חברותית|חברים|עוזר|עוזרת|אהבה למשחק|אוהב לשחק|אוהבת לשחק|בנייה|לגו|הרכבה|יצירה|מוזיקה|תנועה/,
      summary: isFemale
        ? '• תחום חברתי ומשחקי: מגלה עניין בחברת הילדים ובמוקדי הפעילות והמשחק בגן'
        : '• תחום חברתי ומשחקי: מגלה עניין בחברת הילדים ובמוקדי הפעילות והמשחק בגן'
    },
    {
      topic: 'קשב ועצמאות',
      rx: /ריכוז טובה|יכולת ריכוז|עצמאי|עצמאית|מתמיד|מתמידה/,
      summary: isFemale
        ? '• תפקוד וריכוז: בעלת יכולת מיקוד קשב וביצוע עצמאי בפעילויות מוכרות ואהובות'
        : '• תפקוד וריכוז: בעל יכולת מיקוד קשב וביצוע עצמאי בפעילויות מוכרות ואהובות'
    }
  ];

  const executiveStrengths = [];
  strengthTopicEvaluators.forEach((item) => {
    if (item.rx.test(text) && executiveStrengths.length < 4) {
      executiveStrengths.push(item.summary);
    }
  });

  if (executiveStrengths.length === 0) {
    executiveStrengths.push(
      isFemale
        ? '• תחום אישיותי: ילדה בעלת סקרנות טבעית ורצון להתקדם ולהצליח'
        : '• תחום אישיותי: ילד בעל סקרנות טבעית ורצון להתקדם ולהצליח',
      isFemale
        ? '• קשר ושיתוף פעולה: מגיבה היטב לחיזוקים חיוביים, לעידוד ולתיווך אישי של צוות הגן'
        : '• קשר ושיתוף פעולה: מגיב היטב לחיזוקים חיוביים, לעידוד ולתיווך אישי של צוות הגן'
    );
  }

  // 4. זיהוי משפטים או הקשרים המתארים אתגר/קושי בטקסט
  const rawClauses = text
    .replace(/\r\n/g, '\n')
    .split(/(?:[.\n;]+|\s+(?:אבל|אך|אולם|יחד עם זאת|עם זאת|לעומת זאת|מאידך|מצד שני|בנוסף)\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const challengeMarkerRx = /מתקשה|קושי|קשיים|קשה|זקוק|צריך|נדרש|לא\s+|אינ[וה]|נמנע|מתנגד|חזרתי|תבניתי|נוקשות|התפרצ|בכי|בוכה|תסכול|מוסח|מתעייף|איטי|דל|קטוע|גמילה|צואה|קקי|מכנסיים|ליד הילדים|לבד|חולמנ|קם|קמה|מסתובב|חסר|לשפר|לפתח|לחזק|חיזוק|מפסיד|הפסד|חוטף|תור/;

  const challengeContextText =
    rawClauses.filter((c) => challengeMarkerRx.test(c)).join(' . ') || text;

  // 5. פירוש סמנטי לפי סביבות ההשתתפות במאגר – מייצר תקציר מנהלים (Executive Summary) + מטרות ויעדים מותאמים ללא העתקת טקסט גולמי!
  const domainInterpreters = [
    {
      id: 'dom_table_games',
      environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
      triggerRx: /משחקי שולחן|קופסא|בנייה|הרכבה|דגם|קוביה|מסלול|תור|תורות|חוקי|ניצחון|הפסד|מפסיד|מיון|הכללה|דיגיטלי|אסטרטגיה|פאזל|לגו/,
      executiveEmpowerBullet:
        '• משחקי שולחן, בנייה וקופסא: פיתוח משחק משותף, הפנמת חוקים ותורות וויסות בניצחון והפסד',
      buildGoal: (ctx) => {
        const hasWinLoss = /ניצחון|הפסד|מפסיד|בוכה|תסכול|כועס/.test(ctx);
        const hasTurnsOrRules = /תור|תורות|חוק|קופסא|קוביה|מסלול/.test(ctx);
        const hasModelOrSort = /דגם|בנייה|הרכבה|לגו|מיון|הכללה|פאזל/.test(ctx);

        const title = hasTurnsOrRules
          ? (isFemale
              ? 'תשחק במשחקי קופסא חברתיים בעלי חוקים ותורות בתיווך מופחת.'
              : 'ישחק במשחק משותף עם חבר בצורה מותאמת.')
          : 'יתנסה במשחקים שונים בגן תוך התמדה ומשחק משותף עם חבר';

        const synthesizedActivityParts = [
          `${firstName} ${g.interested} במשחקי שולחן, בנייה והרכבה, אך ${g.needs} לתיווך מותאם לשם התמדה ומשחק הדדי עם חבר.`
        ];
        if (hasTurnsOrRules) {
          synthesizedActivityParts.push('ניכר קושי בהמתנה לתור, בשמירה על שלבי המשחק וחוקיו ובהתנהלות עצמאית בתיווך מופחת.');
        }
        if (hasWinLoss) {
          synthesizedActivityParts.push('במצבי תחרות ושינוי בתוצאת המשחק נדרש תיווך רגשי-התנהגותי לתגובה מווסתת בניצחון ובהפסד.');
        }
        if (hasModelOrSort) {
          synthesizedActivityParts.push('חיזוק מיומנויות הבנייה לפי דגם, המיון וההכללה יסייע להרחבת עצמאות המשחק.');
        }

        const selectedObjectives = [
          'ימתין לתורו במשחק משותף',
          'ישמור על חוקי המשחק',
          'יבחר משחק בעצמו.',
          'יארגן את המשחק על פי הנדרש.',
          'יפנה לחבר באופן מילולי ויזמין אותו למשחק משותף.',
          'ישים לב לתורות.',
          'התנהגותי-רגשי: יגיב בצורה מותאמת בניצחון והפסד'
        ];
        if (hasModelOrSort) {
          selectedObjectives.unshift('יצליח לבנות לפי דגם באופן עצמאי', 'ישחק במשחקים הדורשים מיון והכללה.');
        }
        if (/קוביה|מסלול/.test(ctx)) {
          selectedObjectives.push('יצעד במשחק מסלול בהתאם לכמות בקוביה.');
        }

        const tShirtSize = !hasWinLoss && !hasTurnsOrRules ? 'S' : 'M';

        return {
          environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
          activityParticipation: synthesizedActivityParts.join(' '),
          title,
          objectives: selectedObjectives.slice(0, 6).map((o) => `• ${o}`).join('\n'),
          opportunities: `• הזמנת ${firstName} למשחק משותף עם חבר סביב השולחן תוך הטרמת שלבי המשחק וחוקיו.\n• תיווך הדרגתי לבחירת משחק, ארגונו על השולחן ושמירה על תורות.\n• שיקוף רגשי וחיזוק חיובי על תגובה מותאמת בניצחון ובהפסד.`,
          partners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
          tShirtSize,
          duration: '',
          evaluationCriteria: `משחק משותף ומותאם של ${firstName} עם חבר תוך שמירה על חוקי המשחק והתורות בתיווך מופחת.`
        };
      }
    },
    {
      id: 'dom_circle_story_attention',
      environment: 'מפגש בגן',
      triggerRx: /מפגש|סיפור|סקרנות|קשב|ריכוז|מוסח|מוסחת|לשבת|קם|קמה|שאלה|ריקוד|תנועות|קטגוריזציה|יוצאי דופן|פעלים|רגשות/,
      executiveEmpowerBullet:
        '• מפגש בגן: הארכת טווח הקשב, השתתפות פעילה בסיפור ובתנועה והפקת מידע שפתי',
      buildGoal: (ctx) => {
        const hasStory = /סיפור|תמונות|איורים|מידע/.test(ctx);
        const activityDesc = hasStory
          ? `בזמן המפגש בגן ${firstName} ${g.needs} להטרמה ולתיווך כדי לשמור על מיקוד קשב לאורך הסיפור, להתייחס לתוכן ולאיורים ולהשתתף באופן פעיל.`
          : `במפגש המליאה ניכרת לעיתים מוסחות או פסיביות, ו${firstName} ${g.needs} לתיווך, מיקום מותאם וליווי בקבוצה קטנה כדי לקחת חלק פעיל במפגש.`;

        return {
          environment: 'מפגש בגן',
          activityParticipation: activityDesc,
          title: 'יביע סקרנות ועניין במפגש ויהיה שותף באופן פעיל.',
          objectives: [
            '• תשמע סיפור חוזר מתחילתו ועד סופו תתיחס לתוכן ולתמונות',
            '• תפיק מידע מהסיפור',
            '• תספר סיפור שכבר מכירה בעזרת האיורים',
            '• יענה לשאלה שנשאל במפגש',
            '• יעביר מסר מילולי מאורגן, יחזק את יכולת ההסבר של דמיון ושוני (יוצאי דופן)',
            '• יחזור על תנועות (למשל אם יש ריקוד שכולם רוקדים)'
          ].join('\n'),
          opportunities: `• בקבוצה קטנה ליווי שיחה לתכנים של הסיפור עבור ${firstName}.\n• הטרמת הסיפור בעזרת האיורים וחזרה על פעלים, שמות של רגשות וקטגוריזציה.\n• עידוד מענה לשאלות במפגש וחיזוק השתתפות בתנועה ובשירים.`,
          partners: 'גננת, צוות הגן, קלינאית תקשורת / גננת שילוב',
          tShirtSize: 'M',
          duration: '',
          evaluationCriteria: `${firstName} יביע/תביע סקרנות ועניין במפגש ויהיה/תהיה שותף/ה באופן פעיל.`
        };
      }
    },
    {
      id: 'dom_circle_conversation',
      environment: 'מפגש בגן',
      triggerRx: /שיח|שיחה|נושא השיחה|שחזור|לשחזר|שפה|דיבור|מסר מילולי|קלינאית|שליפה|משפטים|להתבטא/,
      executiveEmpowerBullet:
        '• שיח והבעה בעל-פה: שמירה על נושא השיחה, העברת מסר מילולי מאורגן ושחזור חוויות',
      buildGoal: () => ({
        environment: 'מפגש בגן',
        activityParticipation: `בתחום השיח במפגש ובקבוצה, ${firstName} ${g.needs} לתיווך שפתי ולשאלות מנחות לשם ארגון המסר המילולי, שמירה על נושא השיחה ושחזור חוויות ברצף הגיוני.`,
        title: 'ישתתף בשיח וישמור על נושא השיחה.',
        objectives: [
          '• בקבוצה קטנה ליווי שיחה לתכנים של הסיפור',
          '• לשחזר חוויות ביחד לשאול שאלות מנחות - מי? איפה? מתי? מה היה?',
          '• יעביר מסר מילולי מאורגן, יחזק את יכולת ההסבר של דמיון ושוני (יוצאי דופן)',
          '• תתאר פעולות שונות ותחשף למגוון פעלים',
          '• תלמד שמות של רגשות'
        ].join('\n'),
        opportunities: `• בקבוצה קטנה ליווי שיחה לתכנים של הסיפור עם ${firstName}.\n• לשחזר חוויות ביחד ולשאול שאלות מנחות - מי? איפה? מתי? מה היה?\n• מתן תיווך שפתי לשמירה על נושא השיחה והרחבת אוצר המילים והפעלים.`,
        partners: 'גננת, קלינאית תקשורת, צוות הגן, הורים',
        tShirtSize: 'M',
        duration: '',
        evaluationCriteria: 'השתתפות פעילה בשיח, שמירה על נושא השיחה ושחזור חוויות באופן מאורגן.'
      })
    },
    {
      id: 'dom_garden_space',
      environment: 'משחק במרחב הגן',
      triggerRx: /מרחב הגן|פינות הגן|פינות השונות|סוציודרמטי|משחק משמעותי|משחק חזרתי|תבניתי|ליד הילדים|לבחור פינה|משחק חופשי|משחק משותף/,
      executiveEmpowerBullet:
        '• משחק במרחב הגן: בחירה עצמאית של סביבת משחק, התמדה במשחק משמעותי ומשחק משותף עם חבר',
      buildGoal: (ctx) => ({
        environment: 'משחק במרחב הגן',
        activityParticipation: `בזמן פעילות חופשית במרחב הגן, ${firstName} ${g.needs} להכוונה ותיווך בבחירה עצמאית של סביבת משחק, בהתמדה במשחק משמעותי וביצירת משחק משותף והדדי עם חבר.`,
        title: 'יתנסה בפינות השונות בגן תוך התמדה ומשחק משותף עם חבר',
        objectives: [
          '• יתנסה במשחק בסביבות השונות בגן באופן עצמאי',
          '• יבחר סביבה בגן וישחק בה משחק משמעותי'
        ].join('\n'),
        opportunities: `• ליווי ${firstName} בבחירה עצמאית של סביבה במרחב הגן.\n• תיווך ומודלינג של משחק משמעותי ומשותף עם חבר בפינות הגן השונות.\n• עידוד התמדה והרחבת רפרטואר המשחק בסביבות הגן.`,
        partners: 'צוות הגן, סייעת אישית, מטפלת רגשית',
        tShirtSize: /לבחור פינה/.test(ctx) ? 'S' : 'M',
        duration: '',
        evaluationCriteria: `${firstName} יבחר/תבחר סביבה בגן באופן עצמאי וישחק/תשחק בה משחק משמעותי ומשותף עם חבר.`
      })
    },
    {
      id: 'dom_workshop_creation',
      environment: 'סדנא / יצירה',
      triggerRx: /סדנא|יצירה|ציור|העתקה|גזירה|הדבקה|צביעה|מספריים|דבק|טושים|מוטוריקה עדינה|וויזו מוטורי|תוצר|תכנון|התארגנות|ציוד/,
      executiveEmpowerBullet:
        '• סדנא ויצירה: התארגנות ותכנון שלבי העבודה, יוזמה אישית ושכלול מיומנויות וויזו-מוטוריות',
      buildGoal: (ctx) => {
        let title = 'יתנסה בסדנאות השונות בגן באופן עצמאי';
        let tShirtSize = 'S';
        if (/ציור|העתקה|גזירה|מספריים|מוטוריקה עדינה|וויזו/.test(ctx)) {
          title = 'תרכוש ותשכלל מיומנויות בתחום הוויזו מוטורי (ציור, העתקה, גזירה וכיו"ב)';
          tShirtSize = 'M';
        } else if (/רעיון|תוצר/.test(ctx)) {
          title = 'יזום רעיון ויוציא אותו לפועל באמצעות חומרים בסדנא.';
          tShirtSize = 'M';
        } else if (/תכנון|מתוכננ|התארגנות|ציוד/.test(ctx)) {
          title = 'יעבוד בשולחנות היצירה בצורה מתוכננת.';
          tShirtSize = 'S';
        }

        return {
          environment: 'סדנא / יצירה',
          activityParticipation: `בסביבת הסדנא והיצירה, ${firstName} ${g.needs} לעידוד ותיווך בגישה עצמאית לשולחן הפעילות, בהתארגנות מוקדמת עם ציוד, בתכנון שלבי העבודה ובשכלול מיומנויות הביצוע והמוטוריקה העדינה עד להפקת תוצר.`,
          title,
          objectives: [
            '• יתארגן עם ציוד לקראת פעילות יצירה',
            '• יעדים בתחום הביצועי: יתארגן מול שולחן הסדנא.',
            '• יעדים בתחום הביצועי: יגזור, ידביק, יצבע ויוצא לפועל את הרעיון לתוצר',
            '• יעדים בתחום החברתי: יוציא לפועל את הרעיון בשיתוף עם חבר.',
            '• בתחום השפתי: ישיים את הכלים הספציפיים (מספריים, דבק, טושים…) ואת הפעלים המתאימים: מצייר, גוזר, מדביק',
            '• תחום התנהגותי רגשי: יחכה לתורו'
          ].join('\n'),
          opportunities: `• הכנת ${firstName} לקראת פעילות בסדנא ותיווך ההתארגנות עם הציוד מול השולחן.\n• תרגול מיומנויות גזירה, הדבקה וצביעה והוצאה לפועל של רעיון לתוצר (בעצמו/ה או בשיתוף עם חבר).\n• שיום הכלים הספציפיים והפעלים המתאימים וחיזוק המתנה לתור.`,
          partners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
          tShirtSize,
          duration: '',
          evaluationCriteria: 'התנסות עצמאית ומתוכננת בסדנא, שימוש מותאם בכלי היצירה והוצאת רעיון לפועל עד לתוצר.'
        };
      }
    },
    {
      id: 'dom_yard',
      environment: 'חצר',
      triggerRx: /חצר|מוטורי|מתקנים|ריצה|קפיצה|כדור|מעגל חברתי|להצטרף לחברים|ים יבשה|דג מלוח|אינטראקציות חברתיות|חברים נוספים|חברתית/,
      executiveEmpowerBullet:
        '• מרחב החצר: הרחבת המעגל החברתי והתנסות מדורגת במשחקים מוטוריים וקבוצתיים',
      buildGoal: (ctx) => {
        const isMotorFocus = /מוטורי|מתקנים|ריצה|קפיצה|כדור|גסה/.test(ctx);
        const title = isMotorFocus
          ? 'יתנסה בהדרגה במשחקים מוטוריים בחצר (במדרג קושי עולה)'
          : 'ירחיב מעגל חברתי - יזמין או יצטרף לחברים נוספים';

        return {
          environment: 'חצר',
          activityParticipation: `בפעילות במרחב החצר, ${firstName} ${g.needs} לתיווך ולעידוד לשם התנסות הדרגתית במשחקים מוטוריים ולהרחבת המעגל החברתי דרך הצטרפות למשחקים משותפים בקבוצה קטנה.`,
          title,
          objectives: [
            '• משחק חברתי בקבוצה קטנה (כגון ים יבשה, ארנבת שחורה, אבדה לי המטפחת, דג מלוח) בתיווך'
          ].join('\n'),
          opportunities: `• הזמנת ${firstName} למשחק חברתי בקבוצה קטנה בחצר (כגון ים יבשה, ארנבת שחורה, אבדה לי המטפחת, דג מלוח) בתיווך מבוגר.\n• חשיפה הדרגתית למשחקים מוטוריים במדרג קושי עולה ועידוד הזמנה או הצטרפות לחברים נוספים.`,
          partners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק / מטפלת רגשית',
          tShirtSize: isMotorFocus ? 'M' : 'L',
          duration: '',
          evaluationCriteria: 'השתתפות פעילה במשחקים מוטוריים וחברתיים בחצר והרחבת מעגל החברים.'
        };
      }
    },
    {
      id: 'dom_toilet',
      environment: 'שירותים',
      triggerRx: /שירותים|גמילה|צואה|קקי|פיפי|להתפנות|מכנסיים|צרכים|היגיינה/,
      executiveEmpowerBullet:
        '• עצמאות בשירותים: ביסוס פנייה עצמאית, התפנות סדירה ושמירה על היגיינה אישית',
      buildGoal: () => ({
        environment: 'שירותים',
        activityParticipation: `בתחום העצמאות בשירותים, ${firstName} ${g.needs} להטרמה, תזכורות קבועות וליווי רגוע ומתואם בין צוות הגן להורים לביסוס התפנות עצמאית בשירותים.`,
        title: 'ייגש לשירותים באופן עצמאי ומותאם על פי צורך',
        objectives: [
          '• יביע באופן מילולי כאשר צריך להתפנות',
          '• ייגש לשירותים באופן עצמאי וישמור על היגיינה אישית'
        ].join('\n'),
        opportunities: `• הזמנה יזומה ותזכורת מותאמת ל${firstName} לגשת לשירותים בנקודות זמן קבועות בסדר היום.\n• שימוש בכרטיסיות סדר יום חזותיות ותיאום רציף עם ההורים בבית.`,
        partners: 'צוות הגן, סייעת אישית, הורים',
        tShirtSize: 'S',
        duration: '',
        evaluationCriteria: 'פנייה והליכה עצמאית וסדירה לשירותים.'
      })
    },
    {
      id: 'dom_food',
      environment: 'אוכל',
      triggerRx: /אוכל|ארוחה|אכילה|שולחן האוכל|מזון|בררנות|סכו"ם|כריך|בקבוק/,
      executiveEmpowerBullet:
        '• זמני ארוחה: התארגנות עצמאית והתנהלות מותאמת סביב שולחן האוכל',
      buildGoal: () => ({
        environment: 'אוכל',
        activityParticipation: `בזמן הארוחה בגן, ${firstName} ${g.needs} לתיווך בסדר פעולות ההתארגנות לקראת הארוחה ובסיומה ולחיזוק אכילה עצמאית ומותאמת לצד החברים.`,
        title: 'יתנהל באופן עצמאי ומותאם בזמן הארוחה בגן',
        objectives: [
          '• יתארגן באופן עצמאי לקראת הארוחה ובסיומה',
          '• ישב ליד שולחן האוכל ויאכל בצורה מותאמת ונעימה עם החברים'
        ].join('\n'),
        opportunities: `• הטרמה לקראת זמני הארוחה ותיווך שלבי ההתארגנות ל${firstName}.\n• עידוד עצמאות ושיח חברתי נעים סביב שולחן האוכל.`,
        partners: 'צוות הגן, סייעת אישית, הורים',
        tShirtSize: 'S',
        duration: '',
        evaluationCriteria: 'התארגנות ואכילה עצמאית ומותאמת בזמן הארוחה בגן.'
      })
    },
    {
      id: 'dom_non_routine',
      environment: 'פעילות שאינה בשגרה',
      triggerRx: /שאינה בשגרה|מעברים|שינויים|טקס|חג|טיול|הצגה|הפתעה|יציאה מהשגרה|ויסות|תסכול|התפרצ|בכי/,
      executiveEmpowerBullet:
        '• ויסות רגשי ומעברים: הסתגלות מווסתת לשינויים, מעברים ופעילויות שאינן בשגרה',
      buildGoal: () => ({
        environment: 'פעילות שאינה בשגרה',
        activityParticipation: `במעברים בין פעילויות ובאירועים שאינם בשגרה, ${firstName} ${g.needs} להטרמה מוקדמת ולתיווך רגשי מווסת לשמירה על תחושת ביטחון ורצף תפקודי.`,
        title: 'ישתתף באופן מווסת ומותאם בפעילויות שאינן בשגרה ובמעברים',
        objectives: [
          '• יקבל הטרמה חזותית ומילולית לקראת שינוי בסדר היום או פעילות מיוחדת',
          '• ייעזר במבוגר או באסטרטגיית הרגעה מוסכמת במצבי הצפה או קושי'
        ].join('\n'),
        opportunities: `• הכנה מראש של ${firstName} לפני מעברים ופעילויות שאינן בשגרה באמצעות לוח סדר יום חזותי.\n• ליווי רגשי מרגיע ומתן חלופה מותאמת במידת הצורך.`,
        partners: 'צוות הגן, סייעת אישית, מטפלת רגשית, הורים',
        tShirtSize: 'L',
        duration: '',
        evaluationCriteria: 'השתתפות רגועה ומווסתת של הילד/ה בפעילויות שאינן בשגרה ובמעברים.'
      })
    }
  ];

  const matchedGoals = [];
  const executiveEmpowerBullets = [];

  const challengeClausesList = rawClauses.filter((c) => challengeMarkerRx.test(c));
  const unmatchedClauses = [];

  domainInterpreters.forEach((dom) => {
    if (dom.triggerRx.test(challengeContextText)) {
      executiveEmpowerBullets.push(dom.executiveEmpowerBullet);
      if (matchedGoals.length < 4) {
        const built = dom.buildGoal(challengeContextText);
        const sizedDuration = normalizeAndSizeGoalDuration(built, rawTrimmed, currentFormData, dateInfo);
        matchedGoals.push({
          id: 'g_rev_' + Date.now() + '_' + matchedGoals.length,
          ...built,
          duration: sizedDuration
        });
      }
    }
  });

  // בדיקה האם יש משפט קושי בטקסט שלא קיבל מענה מאף תבנית קיימת במאגר
  challengeClausesList.forEach((clause) => {
    const coveredByDomain = domainInterpreters.some((dom) => dom.triggerRx.test(clause));
    if (!coveredByDomain) {
      unmatchedClauses.push(clause);
    }
  });

  // פונקציית סינתזה ליצירת מטרה חדשה ומותאמת אישית לתלמיד/ה כאשר אף מטרה במאגר אינה מתאימה
  const synthesizeCustomGoalFromClause = (clauseText, idx) => {
    const cleanedTopic = clauseText
      .replace(
        /^.*?(?:מתקשה ב|מתקשה ל|קושי ב|קשיים ב|זקוק לתיווך ב|זקוקה לתיווך ב|זקוק לעזרה ב|זקוקה לעזרה ב|זקוק לחיזוק ב|זקוקה לחיזוק ב|צריך חיזוק ב|צריכה חיזוק ב|נמנע מ|נמנעת מ|לא מצליח ל|לא מצליחה ל)/,
        ''
      )
      .replace(/[.,;!?]+$/g, '')
      .trim();

    const coreSubject =
      cleanedTopic && cleanedTopic.length >= 3 && cleanedTopic.length <= 55
        ? cleanedTopic
        : 'התנהלות עצמאית ומווסתת בפעילויות הגן';

    let inferredEnv = 'משחק במרחב הגן';
    if (/מפגש|מליאה|ריכוז|שיר|סיפור/.test(clauseText)) inferredEnv = 'מפגש בגן';
    else if (/חצר|בחוץ|מתקנים/.test(clauseText)) inferredEnv = 'חצר';
    else if (/אוכל|ארוחה|בוקר|צהריים/.test(clauseText)) inferredEnv = 'אוכל';
    else if (/שירותים|ניקיון|היגיינה|לבוש/.test(clauseText)) inferredEnv = 'שירותים';
    else if (/יצירה|סדנא|שולחן/.test(clauseText)) inferredEnv = 'סדנא / יצירה';
    else if (/מעבר|שינוי|טקס|בוקר|פרידה/.test(clauseText)) inferredEnv = 'פעילות שאינה בשגרה';

    const newGoalTitle = isFemale
      ? `תגלה עצמאות, יוזמה והתנהלות מותאמת בתחום: ${coreSubject}.`
      : `יגלה עצמאות, יוזמה והתנהלות מותאמת בתחום: ${coreSubject}.`;

    const draftGoal = {
      id: 'g_rev_custom_' + Date.now() + '_' + idx,
      environment: inferredEnv,
      activityParticipation: `בסביבת ${inferredEnv}, ${firstName} ${g.needs} לתיווך מותאם, הטרמה וליווי הדרגתי של הצוות לשם חיזוק התפקוד בתחום ${coreSubject}.`,
      title: newGoalTitle,
      objectives: [
        `• ${isFemale ? 'תשתתף' : 'ישתתף'} באופן פעיל ומווסת בפעילות הקשורה ל${coreSubject} בתיווך מבוגר`,
        `• ${isFemale ? 'תיישם' : 'יישם'} בהדרגה אסטרטגיות התמודדות ועצמאות בתחום ${coreSubject}`,
        `• ${isFemale ? 'תפנה' : 'יפנה'} למבוגר בבקשת עזרה או תיווך מילולי בעת קושי`
      ].join('\n'),
      opportunities: `• הטרמה מראש ופירוק הפעילות לשלבים ברורים ומדורגים עבור ${firstName}.\n• תיווך אישי, עידוד ומתן חיזוקים חיוביים על התקדמות בתחום ${coreSubject}.`,
      partners: 'צוות הגן, סייעת אישית, צוות פרא-רפואי והורים',
      tShirtSize: inferredEnv === 'אוכל' || inferredEnv === 'שירותים' ? 'S' : 'M',
      duration: '',
      evaluationCriteria: `תפקוד עצמאי, עקבי ומותאם של ${firstName} בתחום ${coreSubject} בתיווך מופחת.`
    };

    return {
      ...draftGoal,
      duration: normalizeAndSizeGoalDuration(draftGoal, rawTrimmed, currentFormData, dateInfo)
    };
  };

  if (unmatchedClauses.length > 0 && matchedGoals.length < 4) {
    unmatchedClauses.slice(0, 2).forEach((clause, idx) => {
      if (matchedGoals.length < 4) {
        const customGoal = synthesizeCustomGoalFromClause(clause, idx);
        matchedGoals.push(customGoal);
        executiveEmpowerBullets.push(
          `• יעד אישי מותאם (${customGoal.environment}): חיזוק עצמאות והסתגלות ב${customGoal.title.replace(/^.*?בתחום:\s*/, '').replace(/\.$/, '')}`
        );
      }
    });
  }

  if (matchedGoals.length === 0) {
    const customGoal = synthesizeCustomGoalFromClause(challengeContextText, 0);
    matchedGoals.push(customGoal);
    executiveEmpowerBullets.push(
      `• התאמה אישית (${customGoal.environment}): פיתוח עצמאות, השתתפות פעילה והסתגלות מותאמת במרחב הגן`
    );
  }

  // מיזוג חכם השומר ללא כל שינוי מטרות שהמורה ערכה/הוסיפה ומסנן מטרות שהמורה מחקה
  const finalMergedGoals = mergeReanalyzedGoals({
    existingGoals: currentFormData?.goals || [],
    candidateNewGoals: matchedGoals,
    removedGoals: currentFormData?.removedAiGoals || [],
    gender: resolvedGender
  });

  const formattedExisting = executiveStrengths.slice(0, 4).join('\n');
  const formattedEmpower = executiveEmpowerBullets.slice(0, 4).join('\n');

  const environmentsMentioned = [...new Set(finalMergedGoals.map((item) => item.environment))].join(', ');
  const formalRecommendations =
    `1. עבודה מערכתית ועקבית של צוות הגן בסביבות ההשתתפות שהוגדרו (${environmentsMentioned || 'מרחב הגן'}), תוך הישענות על מוקדי הכוח של ${firstName} ומתן חוויות הצלחה.\n` +
    `2. התאמת הסביבה החינוכית: שימוש בהטרמה, עזרים חזותיים, עבודה בקבוצה קטנה ותיווך מדורג המותאם לקצב של ${firstName}.\n` +
    `3. שמירה על קשר רציף, שיתוף ותיאום ציפיות עם ההורים לחיזוק העקביות בין הגן לבית.`;

  return {
    name: detectedName || currentFormData.name,
    gender: resolvedGender,
    educationalFramework: detectedFramework || currentFormData.educationalFramework,
    strengthsExisting: formattedExisting,
    strengthsToEmpower: formattedEmpower,
    goals: finalMergedGoals,
    recommendations: formalRecommendations
  };
}

export function generateDefaultQuestionsForCustomGoal(goalTitle, environment, formData = {}) {
  const envLabel = environment || 'סביבת הגן';
  const dateInfo = resolveStudentAgeAndDateInfo(formData, '');
  return [
    {
      q: `1. כיצד הילד/ה מתפקד/ת כיום בסביבת "${envLabel}" ביחס למטרה "${goalTitle}"?`,
      suggestions: [
        'זקוק/ה להזמנה ותיווך של מבוגר כדי להתחיל',
        'מגלה עניין אך מתקשה בהתארגנות, שמירה על תור או התמדה',
        'משתתף/ת באופן חלקי וזקוק/ה להטרמה ולעבודה בקבוצה קטנה'
      ]
    },
    {
      q: '2. אילו יעדים אופרטיביים ואמצעי תיווך יומיומיים יעזרו להשיג את המטרה?',
      suggestions: [
        'תיווך במשחק משותף עם חבר או בקבוצה קטנה',
        'התארגנות מוקדמת עם ציוד ופירוק הפעילות לשלבים ברורים',
        'שחזור חוויות ושימוש בשאלות מנחות ואיורים'
      ]
    },
    {
      q: '3. מי השותפים לתהליך (צוות הגן, מטפלים, הורים), מה משך הזמן המשוער (לפי גודל המטרה), וכיצד נמדוד הצלחה?',
      suggestions: [
        `צוות הגן, סייעת אישית והורים | חודש (עד ${dateInfo.plus1Month})`,
        `גננת, מרפאה בעיסוק וקלינאית תקשורת | 3 חודשים (עד ${dateInfo.plus3Months})`,
        `צוות הגן והורים | חצי שנה (עד ${dateInfo.plus6Months})`
      ]
    }
  ];
}

// === פונקציות עזר להסתרת פרטים מזהים בהדפסה (ראשי תיבות והשחרה) ===

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

export function maskSensitiveValue(val) {
  if (!val || !String(val).trim()) {
    return '████████';
  }
  const len = Math.max(5, Math.min(14, String(val).trim().length));
  return '█'.repeat(len);
}

export function redactStudentNameInText(text, studentFullName, hideDetails) {
  if (!text) return '';
  if (!hideDetails || !studentFullName || !studentFullName.trim()) return text;

  const acronym = toHebrewAcronym(studentFullName);
  const parts = studentFullName.trim().split(/\s+/).filter((p) => p.length >= 2);
  let result = text;

  const fullTrimmed = studentFullName.trim();
  if (fullTrimmed.length >= 2) {
    result = result.split(fullTrimmed).join(acronym);
  }

  parts.forEach((part) => {
    if (part.length >= 2) {
      result = result.split(part).join(acronym);
    }
  });

  return result;
}

// נתוני תלמיד ראשוניים לדוגמה המבוססים על מאגר המטרות החדש ותקציר מנהלים ממוקד
export const INITIAL_STUDENTS_DATA = [
  {
    id: 'st_demo_1',
    date: new Date().toLocaleDateString('he-IL'),
    schoolYear: 'תשפ"ו (2025-2026)',
    planType: 'תל"א (תוכנית לימודים אישית)',
    name: 'נועם ישראלי',
    gender: 'boy',
    idNumber: '345678912',
    birthDate: '14/05/2021',
    educationalFramework: 'גן שקד - חינוך מיוחד / שילוב',
    address: 'רחוב הרצל 24, רמת גן',
    phone: '052-8765432',
    teacherFreeText:
      'ילד נעים, חברותי וסקרן בעל יכולת ריכוז טובה. וורבלי, חכם ומלא אנרגיות, בעל חוש הומור, טוב לב וקשוב לסביבה. מפנים כללים וגבולות ויצר קשר טוב עם הצוות. זקוק לחיזוק במשחק משותף במשחקי שולחן וקופסא, השתתפות פעילה ושמירה על נושא השיחה במפגש בגן, התנסות בפינות השונות במרחב הגן, התארגנות ויצירה בסדנא והרחבת המעגל החברתי בחצר.',
    strengthsExisting:
      '• תחום אישיותי-רגשי: ילד נעים, חיוני, בעל חוש הומור ונוכחות חיובית בגן\n• תחום קוגניטיבי ושפתי: סקרן, נבון ובעל יכולת הבעה מילולית טובה\n• תקשורת והסתגלות: מקיים קשר בטוח עם הצוות ומפנים כללים וגבולות',
    strengthsToEmpower:
      '• משחקי שולחן וקופסא: פיתוח משחק משותף, הפנמת חוקים ותורות וויסות בניצחון והפסד\n• מפגש בגן: השתתפות פעילה בשיח, שמירה על נושא השיחה וארגון מסר מילולי\n• סדנא ויצירה: התארגנות עצמאית עם ציוד, תכנון עבודה ושכלול מיומנויות ביצוע',
    recommendations:
      'המשך עבודה מערכתית עקבית בשיתוף ההורים והצוות הפרא-רפואי, ליווי שיחה בקבוצה קטנה וחיזוק יוזמות למשחק משותף עם חברים בסביבות הגן השונות.',
    status: 'מוכן להדפסה',
    lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    goals: [
      {
        id: 'g_row_1',
        environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
        activityParticipation:
          'נועם מגלה עניין במשחקי שולחן, בנייה וקופסא, אך זקוק לתיווך מותאם בהמתנה לתור, בשמירה על חוקי המשחק ובתגובה מווסתת במצבי ניצחון והפסד.',
        title: 'ישחק במשחק משותף עם חבר בצורה מותאמת.',
        objectives:
          '• ימתין לתורו במשחק משותף\n• ישמור על חוקי המשחק\n• יבחר משחק בעצמו.\n• יארגן את המשחק על פי הנדרש.\n• יפנה לחבר באופן מילולי ויזמין אותו למשחק משותף.\n• התנהגותי-רגשי: יגיב בצורה מותאמת בניצחון והפסד',
        opportunities:
          '• תיווך של מבוגר במשחק זוגי סביב השולחן והטרמת שלבי המשחק וחוקיו.\n• עידוד פנייה מילולית לחבר והזמנה למשחק משותף.',
        partners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'ישחק במשחק משותף עם חבר בצורה מותאמת תוך שמירה על חוקי המשחק והתורות.'
      },
      {
        id: 'g_row_2',
        environment: 'מפגש בגן',
        activityParticipation:
          'בזמן המפגש בגן נועם מקשיב לסיפור, אך זקוק לתיווך ולשאלות מנחות כדי להשתתף באופן פעיל בשיח ולשמור על נושא השיחה.',
        title: 'יביע סקרנות ועניין במפגש ויהיה שותף באופן פעיל.',
        objectives:
          '• ישמע סיפור חוזר מתחילתו ועד סופו יתייחס לתוכן ולתמונות\n• יפיק מידע מהסיפור\n• יעביר מסר מילולי מאורגן, יחזק את יכולת ההסבר של דמיון ושוני (יוצאי דופן)\n• יענה לשאלה שנשאל במפגש\n• בקבוצה קטנה ליווי שיחה לתכנים של הסיפור\n• לשחזר חוויות ביחד לשאול שאלות מנחות - מי? איפה? מתי? מה היה?',
        opportunities:
          '• בקבוצה קטנה ליווי שיחה לתכנים של הסיפור.\n• שחזור חוויות ביחד תוך שאילת שאלות מנחות - מי? איפה? מתי? מה היה?',
        partners: 'גננת, צוות הגן, קלינאית תקשורת',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'יביע סקרנות ועניין במפגש, יענה לשאלות וישתתף בשיח תוך שמירה על נושא השיחה.'
      },
      {
        id: 'g_row_3',
        environment: 'סדנא / יצירה',
        activityParticipation:
          'בסביבת הסדנא והיצירה נועם זקוק להזמנה ולתיווך בהתארגנות מול השולחן, בתכנון שלבי העבודה ובהוצאה לפועל של רעיון עד לתוצר.',
        title: 'יתנסה בסדנאות השונות בגן באופן עצמאי',
        objectives:
          '• יתארגן עם ציוד לקראת פעילות יצירה\n• יעדים בתחום הביצועי: יתארגן מול שולחן הסדנא.\n• יעדים בתחום הביצועי: יגזור, ידביק, יצבע ויוציא לפועל את הרעיון לתוצר\n• יעדים בתחום החברתי: יוציא לפועל את הרעיון בשיתוף עם חבר.\n• בתחום השפתי: ישיים את הכלים הספציפיים (מספריים, דבק, טושים…) ואת הפעלים המתאימים: מצייר, גוזר, מדביק\n• תחום התנהגותי רגשי: יחכה לתורו',
        opportunities:
          '• הכנה מראש והנגשת הציוד מול שולחן הסדנא.\n• תיווך שלבי הגזירה, ההדבקה והצביעה ועידוד עבודה משותפת עם חבר.',
        partners: 'צוות הגן, סייעת אישית, מרפאה בעיסוק',
        duration: 'עד סוף השנה',
        evaluationCriteria: 'יתנסה בסדנאות השונות בגן באופן עצמאי ומתוכנן.'
      }
    ]
  }
];

export function getNextSchoolYear(currentYear) {
  const idx = SCHOOL_YEARS_LIST.indexOf(currentYear);
  if (idx !== -1 && idx + 1 < SCHOOL_YEARS_LIST.length) {
    return SCHOOL_YEARS_LIST[idx + 1];
  }
  return 'תשפ"ז (2026-2027)';
}

export function buildRolloverStudentForNextYear(studentObj, sourceYear, targetYearOverride = null) {
  if (!studentObj) return null;
  const fromYear = sourceYear || studentObj.schoolYear || 'תשפ"ו (2025-2026)';
  const nextYear = targetYearOverride || getNextSchoolYear(fromYear);
  const sourceReport = studentObj.reportsByYear?.[fromYear] || studentObj;
  const todayStr = new Date().toLocaleDateString('he-IL');
  const nowTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const rolledGoals = (sourceReport.goals || []).map((g, idx) => {
    const evalNotes = [
      g.achievementStatus ? `סטטוס שנה קודמת (${fromYear}): ${g.achievementStatus}` : '',
      g.endYearEvaluation ? `סיכום שנה קודמת: ${g.endYearEvaluation}` : g.midYearEvaluation ? `הערכת מחצית קודמת: ${g.midYearEvaluation}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    const baseActivity = (g.activityParticipation || '').trim();
    const nextActivity = evalNotes
      ? `${baseActivity ? baseActivity + '\n' : ''}[רצף מתכנית ${fromYear} – ${evalNotes}]`
      : baseActivity;

    const isFullyAchieved = g.achievementStatus === 'הושג במלואו';

    return {
      id: `g_roll_${Date.now()}_${idx}`,
      environment: g.environment || ENVIRONMENTS_LIST[0],
      activityParticipation: nextActivity,
      title: isFullyAchieved ? '' : g.title || '',
      objectives: isFullyAchieved ? '' : g.objectives || '',
      opportunities: g.opportunities || '',
      partners: g.partners || 'צוות הגן, הורים',
      duration: 'עד סוף השנה',
      evaluationCriteria: isFullyAchieved ? '' : g.evaluationCriteria || '',
      achievementStatus: '',
      midYearEvaluation: '',
      endYearEvaluation: ''
    };
  });

  const newYearReport = {
    date: todayStr,
    planType: sourceReport.planType || studentObj.planType || 'תל"א (תוכנית לימודים אישית)',
    teacherFreeText: sourceReport.teacherFreeText || studentObj.teacherFreeText || '',
    strengthsExisting: sourceReport.strengthsExisting || studentObj.strengthsExisting || '',
    strengthsToEmpower: sourceReport.strengthsToEmpower || studentObj.strengthsToEmpower || '',
    recommendations: sourceReport.recommendations || studentObj.recommendations || '',
    lastSavedAt: nowTime,
    goals:
      rolledGoals.length > 0
        ? rolledGoals
        : [
            {
              id: 'g_init_' + Date.now(),
              environment: ENVIRONMENTS_LIST[0],
              activityParticipation: '',
              title: '',
              objectives: '',
              opportunities: '',
              partners: 'צוות הגן, סייעת אישית',
              duration: 'עד סוף השנה',
              evaluationCriteria: '',
              achievementStatus: '',
              midYearEvaluation: '',
              endYearEvaluation: ''
            }
          ]
  };

  return {
    ...studentObj,
    archived: false,
    status: 'בטיוטה',
    schoolYear: nextYear,
    ...newYearReport,
    reportsByYear: {
      ...(studentObj.reportsByYear || {}),
      [fromYear]: {
        date: sourceReport.date || studentObj.date || todayStr,
        planType: sourceReport.planType || studentObj.planType || 'תל"א (תוכנית לימודים אישית)',
        teacherFreeText: sourceReport.teacherFreeText || '',
        strengthsExisting: sourceReport.strengthsExisting || '',
        strengthsToEmpower: sourceReport.strengthsToEmpower || '',
        recommendations: sourceReport.recommendations || '',
        lastSavedAt: sourceReport.lastSavedAt || '',
        goals: sourceReport.goals || []
      },
      [nextYear]: newYearReport
    }
  };
}

