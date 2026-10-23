/**
 * Domain logic for TALA Daily Pedagogical Cockpit, Calendar Integrations, and AI Note Matching.
 */

/**
 * Israeli Jewish and National Holidays & Vacations Registry.
 * Covers multi-day vacations and national memorial/celebration days for 2024-2027.
 * Annual Summer Vacation (החופש הגדול) is active every year from July 1 to August 31.
 */
export function getIsraeliHolidayOrVacation(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;

  // 1. Summer Vacation (החופש הגדול) - July 1 to August 31 across all years
  if (month === 7 || month === 8) {
    return 'החופש הגדול';
  }

  // 2. Israeli Jewish and National Holidays & Vacations (2024 - 2027)
  const holidayRanges = [
    // 2024
    { start: '2024-01-25', end: '2024-01-25', name: 'ט"ו בשבט' },
    { start: '2024-03-23', end: '2024-03-25', name: 'חופשת פורים' },
    { start: '2024-04-14', end: '2024-04-30', name: 'חופשת פסח' },
    { start: '2024-05-06', end: '2024-05-06', name: 'יום הזיכרון לשואה ולגבורה' },
    { start: '2024-05-13', end: '2024-05-13', name: 'יום הזיכרון לחללי צה"ל' },
    { start: '2024-05-14', end: '2024-05-14', name: 'יום העצמאות' },
    { start: '2024-05-26', end: '2024-05-26', name: 'ל"ג בעומר' },
    { start: '2024-06-05', end: '2024-06-05', name: 'יום ירושלים' },
    { start: '2024-06-11', end: '2024-06-13', name: 'חופשת שבועות' },
    { start: '2024-10-02', end: '2024-10-04', name: 'ראש השנה' },
    { start: '2024-10-11', end: '2024-10-12', name: 'יום כיפור' },
    { start: '2024-10-16', end: '2024-10-25', name: 'חופשת סוכות' },
    { start: '2024-12-26', end: '2025-01-02', name: 'חופשת חנוכה' },

    // 2025
    { start: '2025-02-13', end: '2025-02-13', name: 'ט"ו בשבט' },
    { start: '2025-03-13', end: '2025-03-16', name: 'חופשת פורים' },
    { start: '2025-04-05', end: '2025-04-20', name: 'חופשת פסח' },
    { start: '2025-04-24', end: '2025-04-24', name: 'יום הזיכרון לשואה ולגבורה' },
    { start: '2025-04-30', end: '2025-04-30', name: 'יום הזיכרון לחללי צה"ל' },
    { start: '2025-05-01', end: '2025-05-01', name: 'יום העצמאות' },
    { start: '2025-05-16', end: '2025-05-16', name: 'ל"ג בעומר' },
    { start: '2025-05-26', end: '2025-05-26', name: 'יום ירושלים' },
    { start: '2025-06-01', end: '2025-06-03', name: 'חופשת שבועות' },
    { start: '2025-09-22', end: '2025-09-24', name: 'ראש השנה' },
    { start: '2025-10-01', end: '2025-10-02', name: 'יום כיפור' },
    { start: '2025-10-06', end: '2025-10-15', name: 'חופשת סוכות' },
    { start: '2025-12-15', end: '2025-12-22', name: 'חופשת חנוכה' },

    // 2026
    { start: '2026-02-02', end: '2026-02-02', name: 'ט"ו בשבט' },
    { start: '2026-03-02', end: '2026-03-05', name: 'חופשת פורים' },
    { start: '2026-03-24', end: '2026-04-09', name: 'חופשת פסח' },
    { start: '2026-04-14', end: '2026-04-14', name: 'יום הזיכרון לשואה ולגבורה' },
    { start: '2026-04-21', end: '2026-04-21', name: 'יום הזיכרון לחללי צה"ל' },
    { start: '2026-04-22', end: '2026-04-22', name: 'יום העצמאות' },
    { start: '2026-05-05', end: '2026-05-05', name: 'ל"ג בעומר' },
    { start: '2026-05-15', end: '2026-05-15', name: 'יום ירושלים' },
    { start: '2026-05-21', end: '2026-05-23', name: 'חופשת שבועות' },
    { start: '2026-09-11', end: '2026-09-13', name: 'ראש השנה' },
    { start: '2026-09-20', end: '2026-09-21', name: 'יום כיפור' },
    { start: '2026-09-25', end: '2026-10-05', name: 'חופשת סוכות' },
    { start: '2026-12-04', end: '2026-12-12', name: 'חופשת חנוכה' },

    // 2027
    { start: '2027-01-23', end: '2027-01-23', name: 'ט"ו בשבט' },
    { start: '2027-03-22', end: '2027-03-25', name: 'חופשת פורים' },
    { start: '2027-04-13', end: '2027-04-29', name: 'חופשת פסח' },
    { start: '2027-05-04', end: '2027-05-04', name: 'יום הזיכרון לשואה ולגבורה' },
    { start: '2027-05-11', end: '2027-05-11', name: 'יום הזיכרון לחללי צה"ל' },
    { start: '2027-05-12', end: '2027-05-12', name: 'יום העצמאות' },
    { start: '2027-05-25', end: '2027-05-25', name: 'ל"ג בעומר' },
    { start: '2027-06-03', end: '2027-06-03', name: 'יום ירושלים' },
    { start: '2027-06-10', end: '2027-06-12', name: 'חופשת שבועות' },
    { start: '2027-10-01', end: '2027-10-03', name: 'ראש השנה' },
    { start: '2027-10-10', end: '2027-10-11', name: 'יום כיפור' },
    { start: '2027-10-15', end: '2027-10-24', name: 'חופשת סוכות' },
    { start: '2027-12-24', end: '2027-12-31', name: 'חופשת חנוכה' }
  ];

  for (const item of holidayRanges) {
    if (dateStr >= item.start && dateStr <= item.end) {
      return item.name;
    }
  }

  return null;
}

/**
 * Calculates observation gaps for students' active goals.
 * Returns goals that have not had an observation within the threshold days.
 */
export function getObservationGaps(students = [], thresholdDays = 21, referenceDate = new Date()) {
  const gaps = [];
  const nowMs = referenceDate.getTime();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  for (const student of students) {
    const goals = Array.isArray(student.goals) ? student.goals : [];
    for (const goal of goals) {
      if (!goal.title || !goal.title.trim()) continue;

      const observations = Array.isArray(goal.observations) ? goal.observations : [];
      let latestObservationMs = null;

      for (const obs of observations) {
        if (obs.timestamp) {
          const obsMs = new Date(obs.timestamp).getTime();
          if (!Number.isNaN(obsMs) && (latestObservationMs === null || obsMs > latestObservationMs)) {
            latestObservationMs = obsMs;
          }
        }
      }

      // If no observations yet, or latest observation is older than threshold
      const daysSince = latestObservationMs
        ? Math.floor((nowMs - latestObservationMs) / (24 * 60 * 60 * 1000))
        : null;

      if (latestObservationMs === null || (nowMs - latestObservationMs) > thresholdMs) {
        gaps.push({
          studentId: student.id,
          studentName: student.name || 'תלמיד/ה',
          framework: student.educationalFramework || '',
          goalId: goal.id,
          goalTitle: goal.title,
          environment: goal.environment || 'כללי',
          currentProgress: goal.currentProgress ?? 0,
          targetProgress: goal.targetProgress ?? 80,
          daysSinceObservation: daysSince,
          neverObserved: latestObservationMs === null
        });
      }
    }
  }

  return gaps;
}

/**
 * Creates deep link URL for Outlook 365 Calendar web interface.
 */
export function createOutlook365CalendarUrl({
  title = '',
  startIso = '',
  endIso = '',
  details = '',
  location = ''
}) {
  const baseUrl = 'https://outlook.office.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams({
    subject: title,
    startdt: startIso,
    enddt: endIso,
    body: details,
    location
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Creates deep link URL for Google Calendar.
 */
export function createGoogleCalendarUrl({
  title = '',
  startIso = '',
  endIso = '',
  details = '',
  location = ''
}) {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  // Google requires format YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss
  const formatGoogleDate = (iso) => {
    if (!iso) return '';
    return iso.replace(/[-:]/g, '').slice(0, 15);
  };

  const dates = `${formatGoogleDate(startIso)}/${formatGoogleDate(endIso)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates an iCalendar (.ics) string for calendar event export.
 */
export function generateIcsFileContent(events = []) {
  const formatIcsDate = (iso) => {
    if (!iso) return '';
    return iso.replace(/[-:]/g, '').slice(0, 15);
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TALA//Ecological Work Plan Calendar//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:tala_${Date.now()}_${Math.random().toString(36).slice(2)}@tala.edu`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}Z`);
    lines.push(`DTSTART:${formatIcsDate(ev.startIso)}`);
    lines.push(`DTEND:${formatIcsDate(ev.endIso || ev.startIso)}`);
    lines.push(`SUMMARY:${ev.title || 'אירוע תל"א'}`);
    if (ev.details) lines.push(`DESCRIPTION:${ev.details.replace(/\n/g, '\\n')}`);
    if (ev.location) lines.push(`LOCATION:${ev.location}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Formats AI Prompt to match a teacher's free-text observation note against a student's active goals.
 */
export function buildAiGoalMatchPrompt({ note = '', student = {} }) {
  const goals = Array.isArray(student.goals) ? student.goals : [];
  const goalsSummary = goals
    .filter((g) => g.title && g.title.trim())
    .map((g, idx) => `[יעד ${idx + 1}] מזהה: ${g.id} | סביבה: ${g.environment || 'כללי'} | כותרת: ${g.title} | התקדמות נוכחית: ${g.currentProgress ?? 0}% מתוך ${g.targetProgress ?? 80}%`)
    .join('\n');

  return `אתה מומחה לפדגוגיה ולחינוך מיוחד עבור מערכת תל"א (תוכנית לימודים אישית / תוכנית עבודה אקולוגית).
גננת או מורת שילוב כתבה את הערת התצפית החופשית הבאה על התלמיד/ה ${student.name || 'התלמיד/ה'}:
"""
${note.trim()}
"""

להלן רשימת היעדים הפעילים של התלמיד/ה בתוכנית העבודה:
${goalsSummary || 'אין עדיין יעדים מוגדרים'}

עליך לנתח את הערת המורה ולהחזיר אך ורק אובייקט JSON חוקי במבנה הבא:
{
  "matchedGoalId": "המזהה של היעד הרלוונטי ביותר, או null אם ההערה כללית ואינה שייכת ליעד ספציפי",
  "matchedGoalTitle": "כותרת היעד שהותאם",
  "environment": "סביבת התפקוד הרלוונטית (חצר, כיתה, מפגש, טיפולים וכו')",
  "observedSupportLevel": "רמת התיווך שנצפתה: עצמאי לחלוטין | תזכורת מילולית | תיווך חלקי | ליווי והדגמה מלאה",
  "conciseObservationNote": "סיכום תמציתי ומקצועי של התצפית (משפט אחד המנוסח פדגוגית עבור דוח מחצית)",
  "suggestedProgressDelta": 5, // מספר בין 0 ל-10 המייצג תוספת התקדמות מומלצת באחוזים, או 0 אם אין שינוי
  "confidenceScore": 0.95, // ציון ביטחון בין 0.0 ל-1.0
  "explanation": "הסבר קצר בעברית מדוע ההערה הותאמה ליעד זה"
}`;
}

/**
 * Parses and validates the AI response for goal matching.
 */
export function parseAiGoalMatchResponse(aiResult) {
  if (!aiResult) return null;
  const raw = typeof aiResult === 'string' ? JSON.parse(aiResult) : aiResult;
  return {
    matchedGoalId: raw.matchedGoalId || null,
    matchedGoalTitle: raw.matchedGoalTitle || '',
    environment: raw.environment || 'כללי',
    observedSupportLevel: raw.observedSupportLevel || 'תיווך חלקי',
    conciseObservationNote: raw.conciseObservationNote || '',
    suggestedProgressDelta: Number(raw.suggestedProgressDelta) || 0,
    confidenceScore: Number(raw.confidenceScore) || 0.8,
    explanation: raw.explanation || ''
  };
}
