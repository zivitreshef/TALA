export const buildSummaryTablePrompt = ({ freeText = '', goals = [], isKindergarten = false }) => {
  const goalsSummary = goals
    .map(
      (g, idx) =>
        `${idx + 1}. סביבה: ${g.environment} | מטרה: ${g.title} | תפקוד: ${g.activityParticipation || ''} | יעדים: ${g.objectives || ''}`
    )
    .join('\n');

  return `אתה מומחה פדגוגי לכתיבת "תוכנית עבודה שנתית" (תל"א / תח"י).
בהתבסס על הטקסט החופשי שכתבה המורה על הילד/ה ועל המטרות שהוגדרו, הפק תקציר מנהלים תמציתי ומזוקק:
- עבור תח"י: "strengthsExisting" (מוקדי כוח: כוחות קיימים) ו-"strengthsToEmpower" (כוחות להעצמה וחיזוק) — 3-4 נקודות קצרות בכל עמודה.
- עבור תל"א: 
  1. "studentGeneralBackground": רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי) — 2-3 פסקאות קצרות ותמציתיות.
  2. "studentSupportReceived": התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי).
  3. "studentMainGoal": מטרות של התלמיד (לאחר שיח אישי) — 1-2 משפטים.
  4. "talaFocusDomains": מערך של תחומים נבחרים מתוך: ["לימודי", "התנהגותי", "רגשי", "חברתי", "חושי- מוטורי", "תקשורתי", "כישורי חיים"].

טקסט חופשי של המורה:
"${freeText}"

המטרות שהוגדרו לתלמיד/ה:
${goalsSummary}

החזר JSON בלבד:
{
  "strengthsExisting": "• תחום אישיותי-רגשי: תמצית קצרה\\n• תחום קוגניטיבי ושפתי: תמצית קצרה",
  "strengthsToEmpower": "• ${isKindergarten ? 'משחקי שולחן וקופסא' : 'קריאה והפקת משמעות'}: תמצית קצרה\\n• ${isKindergarten ? 'מפגש ושיח' : 'ניהול עצמי'}: תמצית קצרה",
  "studentGeneralBackground": "רקע על התלמיד...",
  "studentSupportReceived": "התמיכה שמקבל התלמיד...",
  "studentMainGoal": "מטרות התלמיד...",
  "talaFocusDomains": ["לימודי", "חברתי"]
}`;
};

export const applyAiSummary = (data, parsed, nowTime = '') => {
  const nextExisting = parsed?.strengthsExisting || data.strengthsExisting;
  const nextEmpower = parsed?.strengthsToEmpower || data.strengthsToEmpower;
  return {
    ...data,
    freeTextAnalyzed: true,
    strengthsExisting: nextExisting,
    strengthsToEmpower: nextEmpower,
    studentGeneralBackground:
      parsed?.studentGeneralBackground || data.studentGeneralBackground,
    studentSupportReceived:
      parsed?.studentSupportReceived || data.studentSupportReceived,
    studentMainGoal:
      parsed?.studentMainGoal || data.studentMainGoal,
    talaFocusDomains:
      Array.isArray(parsed?.talaFocusDomains) && parsed.talaFocusDomains.length > 0
        ? parsed.talaFocusDomains
        : data.talaFocusDomains,
    status: 'מוכן להדפסה',
    lastSavedAt: nowTime
  };
};

export const applyLocalSummary = (data, engineered, nowTime = '') => {
  return {
    ...data,
    freeTextAnalyzed: true,
    name: engineered?.name || data.name,
    gender: engineered?.gender || data.gender || 'boy',
    educationalFramework: engineered?.educationalFramework || data.educationalFramework,
    strengthsExisting: engineered?.strengthsExisting || data.strengthsExisting,
    strengthsToEmpower: engineered?.strengthsToEmpower || data.strengthsToEmpower,
    studentGeneralBackground:
      engineered?.studentGeneralBackground || data.studentGeneralBackground,
    studentSupportReceived:
      engineered?.studentSupportReceived || data.studentSupportReceived,
    studentMainGoal: engineered?.studentMainGoal || data.studentMainGoal,
    talaProfileRows: engineered?.talaProfileRows || data.talaProfileRows,
    talaFocusDomains: engineered?.talaFocusDomains || data.talaFocusDomains,
    status: 'מוכן להדפסה',
    lastSavedAt: nowTime
  };
};
