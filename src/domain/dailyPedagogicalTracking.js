/**
 * Detailed Israeli Holiday and Vacation Descriptor.
 * Distinguishes between:
 * - isVacation: true -> Students do NOT arrive to school (אין לימודים - סוכות, פסח, חנוכה, פורים, שבועות, יום העצמאות, החופש הגדול, ראש השנה, יום כיפור)
 * - isVacation: false -> Students DO arrive to school (יש לימודים - יום הזיכרון לשואה, יום הזיכרון לחללי צה"ל, ט"ו בשבט, ל"ג בעומר, יום ירושלים)
 */
export function getIsraeliHolidayInfo(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;

  // 1. Summer Vacation (החופש הגדול) - July 1 to August 31 across all years (אין לימודים)
  if (month === 7 || month === 8) {
    return {
      name: 'החופש הגדול',
      shortName: 'חופש גדול',
      isVacation: true,
      category: 'vacation',
      statusText: 'אין לימודים'
    };
  }

  // 2. Israeli Jewish and National Holidays & Vacations (2024 - 2027)
  const holidayRanges = [
    // 2024
    { start: '2024-01-25', end: '2024-01-25', name: 'ט"ו בשבט', shortName: 'ט״ו בשבט', isVacation: false },
    { start: '2024-03-23', end: '2024-03-25', name: 'חופשת פורים', shortName: 'פורים', isVacation: true },
    { start: '2024-04-14', end: '2024-04-30', name: 'חופשת פסח', shortName: 'פסח', isVacation: true },
    { start: '2024-05-06', end: '2024-05-06', name: 'יום הזיכרון לשואה ולגבורה', shortName: 'יום השואה', isVacation: false },
    { start: '2024-05-13', end: '2024-05-13', name: 'יום הזיכרון לחללי צה"ל', shortName: 'יום הזיכרון', isVacation: false },
    { start: '2024-05-14', end: '2024-05-14', name: 'יום העצמאות', shortName: 'עצמאות', isVacation: true },
    { start: '2024-05-26', end: '2024-05-26', name: 'ל"ג בעומר', shortName: 'ל״ג בעומר', isVacation: false },
    { start: '2024-06-05', end: '2024-06-05', name: 'יום ירושלים', shortName: 'יום ירושלים', isVacation: false },
    { start: '2024-06-11', end: '2024-06-13', name: 'חופשת שבועות', shortName: 'שבועות', isVacation: true },
    { start: '2024-10-02', end: '2024-10-04', name: 'ראש השנה', shortName: 'ראש השנה', isVacation: true },
    { start: '2024-10-11', end: '2024-10-12', name: 'יום כיפור', shortName: 'יום כיפור', isVacation: true },
    { start: '2024-10-16', end: '2024-10-25', name: 'חופשת סוכות', shortName: 'סוכות', isVacation: true },
    { start: '2024-12-26', end: '2025-01-02', name: 'חופשת חנוכה', shortName: 'חנוכה', isVacation: true },

    // 2025
    { start: '2025-02-13', end: '2025-02-13', name: 'ט"ו בשבט', shortName: 'ט״ו בשבט', isVacation: false },
    { start: '2025-03-13', end: '2025-03-16', name: 'חופשת פורים', shortName: 'פורים', isVacation: true },
    { start: '2025-04-05', end: '2025-04-20', name: 'חופשת פסח', shortName: 'פסח', isVacation: true },
    { start: '2025-04-24', end: '2025-04-24', name: 'יום הזיכרון לשואה ולגבורה', shortName: 'יום השואה', isVacation: false },
    { start: '2025-04-30', end: '2025-04-30', name: 'יום הזיכרון לחללי צה"ל', shortName: 'יום הזיכרון', isVacation: false },
    { start: '2025-05-01', end: '2025-05-01', name: 'יום העצמאות', shortName: 'עצמאות', isVacation: true },
    { start: '2025-05-16', end: '2025-05-16', name: 'ל"ג בעומר', shortName: 'ל״ג בעומר', isVacation: false },
    { start: '2025-05-26', end: '2025-05-26', name: 'יום ירושלים', shortName: 'יום ירושלים', isVacation: false },
    { start: '2025-06-01', end: '2025-06-03', name: 'חופשת שבועות', shortName: 'שבועות', isVacation: true },
    { start: '2025-09-22', end: '2025-09-24', name: 'ראש השנה', shortName: 'ראש השנה', isVacation: true },
    { start: '2025-10-01', end: '2025-10-02', name: 'יום כיפור', shortName: 'יום כיפור', isVacation: true },
    { start: '2025-10-06', end: '2025-10-15', name: 'חופשת סוכות', shortName: 'סוכות', isVacation: true },
    { start: '2025-12-15', end: '2025-12-22', name: 'חופשת חנוכה', shortName: 'חנוכה', isVacation: true },

    // 2026
    { start: '2026-02-02', end: '2026-02-02', name: 'ט"ו בשבט', shortName: 'ט״ו בשבט', isVacation: false },
    { start: '2026-03-02', end: '2026-03-05', name: 'חופשת פורים', shortName: 'פורים', isVacation: true },
    { start: '2026-03-24', end: '2026-04-09', name: 'חופשת פסח', shortName: 'פסח', isVacation: true },
    { start: '2026-04-14', end: '2026-04-14', name: 'יום הזיכרון לשואה ולגבורה', shortName: 'יום השואה', isVacation: false },
    { start: '2026-04-21', end: '2026-04-21', name: 'יום הזיכרון לחללי צה"ל', shortName: 'יום הזיכרון', isVacation: false },
    { start: '2026-04-22', end: '2026-04-22', name: 'יום העצמאות', shortName: 'עצמאות', isVacation: true },
    { start: '2026-05-05', end: '2026-05-05', name: 'ל"ג בעומר', shortName: 'ל״ג בעומר', isVacation: false },
    { start: '2026-05-15', end: '2026-05-15', name: 'יום ירושלים', shortName: 'יום ירושלים', isVacation: false },
    { start: '2026-05-21', end: '2026-05-23', name: 'חופשת שבועות', shortName: 'שבועות', isVacation: true },
    { start: '2026-09-11', end: '2026-09-13', name: 'ראש השנה', shortName: 'ראש השנה', isVacation: true },
    { start: '2026-09-20', end: '2026-09-21', name: 'יום כיפור', shortName: 'יום כיפור', isVacation: true },
    { start: '2026-09-25', end: '2026-10-05', name: 'חופשת סוכות', shortName: 'סוכות', isVacation: true },
    { start: '2026-12-04', end: '2026-12-12', name: 'חופשת חנוכה', shortName: 'חנוכה', isVacation: true },

    // 2027
    { start: '2027-01-23', end: '2027-01-23', name: 'ט"ו בשבט', shortName: 'ט״ו בשבט', isVacation: false },
    { start: '2027-03-22', end: '2027-03-25', name: 'חופשת פורים', shortName: 'פורים', isVacation: true },
    { start: '2027-04-13', end: '2027-04-29', name: 'חופשת פסח', shortName: 'פסח', isVacation: true },
    { start: '2027-05-04', end: '2027-05-04', name: 'יום הזיכרון לשואה ולגבורה', shortName: 'יום השואה', isVacation: false },
    { start: '2027-05-11', end: '2027-05-11', name: 'יום הזיכרון לחללי צה"ל', shortName: 'יום הזיכרון', isVacation: false },
    { start: '2027-05-12', end: '2027-05-12', name: 'יום העצמאות', shortName: 'עצמאות', isVacation: true },
    { start: '2027-05-25', end: '2027-05-25', name: 'ל"ג בעומר', shortName: 'ל״ג בעומר', isVacation: false },
    { start: '2027-06-03', end: '2027-06-03', name: 'יום ירושלים', shortName: 'יום ירושלים', isVacation: false },
    { start: '2027-06-10', end: '2027-06-12', name: 'חופשת שבועות', shortName: 'שבועות', isVacation: true },
    { start: '2027-10-01', end: '2027-10-03', name: 'ראש השנה', shortName: 'ראש השנה', isVacation: true },
    { start: '2027-10-10', end: '2027-10-11', name: 'יום כיפור', shortName: 'יום כיפור', isVacation: true },
    { start: '2027-10-15', end: '2027-10-24', name: 'חופשת סוכות', shortName: 'סוכות', isVacation: true },
    { start: '2027-12-24', end: '2027-12-31', name: 'חופשת חנוכה', shortName: 'חנוכה', isVacation: true }
  ];

  for (const item of holidayRanges) {
    if (dateStr >= item.start && dateStr <= item.end) {
      return {
        name: item.name,
        shortName: item.shortName,
        isVacation: item.isVacation,
        category: item.isVacation ? 'vacation' : 'observance',
        statusText: item.isVacation ? 'אין לימודים' : 'יש לימודים'
      };
    }
  }

  return null;
}

/**
 * Returns the name of the Israeli Holiday or Vacation, or null.
 * Maintained for backward compatibility.
 */
export function getIsraeliHolidayOrVacation(dateStr) {
  const info = getIsraeliHolidayInfo(dateStr);
  return info ? info.name : null;
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

/**
 * Summarizes pedagogical accomplishments, recent observations, adhoc notes,
 * and progress milestones across students for weekly/monthly digests and team meetings.
 */
export function getPedagogicalAccomplishmentsSummary(students = [], windowDays = 30, referenceDate = new Date()) {
  const nowMs = referenceDate.getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  const recentObservations = [];
  const advancedGoals = [];
  let totalGoals = 0;
  let onTrackGoalsCount = 0;

  for (const student of students) {
    const goals = Array.isArray(student.goals) ? student.goals : [];
    for (const goal of goals) {
      if (!goal.title || !goal.title.trim()) continue;
      totalGoals++;

      const currentProg = Number(goal.currentProgress ?? 0);
      const targetProg = Number(goal.targetProgress ?? 80);
      if (currentProg >= 60) {
        onTrackGoalsCount++;
      }
      if (currentProg >= 70) {
        advancedGoals.push({
          studentId: student.id,
          studentName: student.name || 'תלמיד/ה',
          framework: student.educationalFramework || '',
          goalTitle: goal.title,
          environment: goal.environment || 'כללי',
          currentProgress: currentProg,
          targetProgress: targetProg
        });
      }

      const observations = Array.isArray(goal.observations) ? goal.observations : [];
      for (const obs of observations) {
        if (!obs.timestamp) continue;
        const obsMs = new Date(obs.timestamp).getTime();
        if (Number.isNaN(obsMs)) continue;

        if (nowMs - obsMs <= windowMs) {
          recentObservations.push({
            studentId: student.id,
            studentName: student.name || 'תלמיד/ה',
            framework: student.educationalFramework || '',
            goalTitle: goal.title,
            environment: goal.environment || 'כללי',
            timestamp: obs.timestamp,
            progress: obs.progress ?? currentProg,
            note: String(obs.note || '').trim(),
            supportLevel: obs.supportLevel || ''
          });
        }
      }
    }
  }

  // Sort recent observations by newest first
  recentObservations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalStudents: students.length,
    totalGoals,
    onTrackGoalsCount,
    recentObservations,
    advancedGoals
  };
}

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
  let parsed = aiResult;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      try {
        const cleaned = parsed.replace(/```json/gi, '').replace(/```/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch (_) {}
    }
  } else if (parsed && typeof parsed === 'object' && typeof parsed.raw === 'string') {
    try {
      const cleaned = parsed.raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}
  }
  const raw = parsed && typeof parsed === 'object' ? parsed : {};
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


/**
 * Calculates meeting/event duration in minutes from HH:mm start and end strings.
 */
export function calculateDurationMinutes(startTime = '', endTime = '') {
  if (!startTime || !endTime) return 45;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 45;
  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  const diff = endTotal - startTotal;
  return diff > 0 ? diff : 45;
}

/**
 * Returns thickness in pixels (3 to 6px) for an event bar on the calendar day cell
 * proportionally based on the meeting timeframe.
 */
export function getEventBarThickness(startTime = '', endTime = '') {
  const duration = calculateDurationMinutes(startTime, endTime);
  if (duration <= 30) return 3;
  if (duration <= 60) return 4.5;
  return 6;
}

