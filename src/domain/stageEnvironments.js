// Canonical participation environments per educational stage.
// Kept in a dependency-free module so both goalBankData.js and stageGuard.js can import it without cycles.

export const KINDERGARTEN_ENVIRONMENTS = [
  'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
  'מפגש בגן',
  'משחק במרחב הגן',
  'סדנא / יצירה',
  'חצר',
  'שירותים',
  'אוכל',
  'פעילות שאינה בשגרה'
];

export const SCHOOL_ENVIRONMENTS = [
  'האזנה ודיבור – כשירות תקשורתית',
  'כתיבה',
  'קריאה והפקת משמעות',
  'כשירות לשונית – ידע לשוני'
];

// Additional school domains (taken from the TALA profile domains) for behavioural, social,
// self-care and math goals that do not fit the 4 literacy environments above.
export const SCHOOL_EXTRA_DOMAINS = [
  'ניהול עצמי',
  'תקשורת ויחסים בינאישיים',
  'ניידות וטיפול עצמי',
  'מתמטיקה'
];

export const SCHOOL_ALLOWED_ENVIRONMENTS = [...SCHOOL_ENVIRONMENTS, ...SCHOOL_EXTRA_DOMAINS];
