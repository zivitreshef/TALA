/**
 * Domain logic for TALA Daily Pedagogical Cockpit, Calendar Integrations, and AI Note Matching.
 */

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
