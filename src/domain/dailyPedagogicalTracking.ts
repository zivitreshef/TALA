import type {
  IsraeliHolidayInfo,
  ObservationGap,
  PedagogicalAccomplishmentsSummary,
  RecentObservationSummary,
  CompletedTaskSummary,
  PendingTaskSummary,
  AdvancedGoalSummary,
  CalendarEventUrlOptions,
  CalendarEvent,
  AiGoalMatchResult,
} from './types';

/**
 * Detailed Israeli Holiday and Vacation Descriptor.
 * Distinguishes between:
 * - isVacation: true -> Students do NOT arrive to school (אין לימודים - סוכות, פסח, חנוכה, פורים, שבועות, יום העצמאות, החופש הגדול, ראש השנה, יום כיפור)
 * - isVacation: false -> Students DO arrive to school (יש לימודים - יום הזיכרון לשואה, יום הזיכרון לחללי צה"ל, ט"ו בשבט, ל"ג בעומר, יום ירושלים)
 */
export function getIsraeliHolidayInfo(dateStr?: string | null): IsraeliHolidayInfo | null {
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
export function getIsraeliHolidayOrVacation(dateStr?: string | null): string | null {
  const info = getIsraeliHolidayInfo(dateStr);
  return info ? info.name : null;
}

/**
 * Calculates observation gaps for students' active goals.
 * Returns goals that have not had an observation within the threshold days.
 */
export function getObservationGaps(
  students: Record<string, unknown>[] = [],
  thresholdDays: number = 21,
  referenceDate: Date = new Date()
): ObservationGap[] {
  const gaps: ObservationGap[] = [];
  const nowMs = referenceDate.getTime();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  for (const student of students) {
    const goals = Array.isArray(student.goals) ? (student.goals as Record<string, unknown>[]) : [];
    for (const goal of goals) {
      if (!goal.title || !String(goal.title).trim()) continue;

      const observations = Array.isArray(goal.observations) ? (goal.observations as Record<string, unknown>[]) : [];
      let latestObservationMs: number | null = null;

      for (const obs of observations) {
        if (obs.timestamp) {
          const obsMs = new Date(String(obs.timestamp)).getTime();
          if (!Number.isNaN(obsMs) && (latestObservationMs === null || obsMs > latestObservationMs)) {
            latestObservationMs = obsMs;
          }
        }
      }

      // Completed pedagogical tasks also reflect meaningful active contact and continuity
      const studentTasks = Array.isArray(student.pedagogicalTasks)
        ? (student.pedagogicalTasks as Record<string, unknown>[])
        : Array.isArray(student.dailyTasks)
        ? (student.dailyTasks as Record<string, unknown>[])
        : [];
      for (const t of studentTasks) {
        if (t.completed && (t.completedAt || t.date)) {
          const tMs = new Date(String(t.completedAt || t.date)).getTime();
          if (!Number.isNaN(tMs) && (latestObservationMs === null || tMs > latestObservationMs)) {
            if (!t.goalId || t.goalId === goal.id) {
              latestObservationMs = tMs;
            }
          }
        }
      }

      // If no observations yet, or latest observation is older than threshold
      const daysSince = latestObservationMs
        ? Math.floor((nowMs - latestObservationMs) / (24 * 60 * 60 * 1000))
        : null;

      if (latestObservationMs === null || (nowMs - latestObservationMs) > thresholdMs) {
        gaps.push({
          studentId: typeof student.id === 'string' ? student.id : undefined,
          studentName: String(student.name || 'תלמיד/ה'),
          framework: String(student.educationalFramework || ''),
          goalId: typeof goal.id === 'string' ? goal.id : undefined,
          goalTitle: String(goal.title || ''),
          environment: String(goal.environment || 'כללי'),
          currentProgress: Number(goal.currentProgress ?? 0),
          targetProgress: Number(goal.targetProgress ?? 80),
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
export function getPedagogicalAccomplishmentsSummary(
  students: Record<string, unknown>[] = [],
  windowDays: number = 30,
  referenceDate: Date = new Date()
): PedagogicalAccomplishmentsSummary {
  const nowMs = referenceDate.getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  const recentObservations: RecentObservationSummary[] = [];
  const advancedGoals: AdvancedGoalSummary[] = [];
  const completedTasks: CompletedTaskSummary[] = [];
  const pendingTasks: PendingTaskSummary[] = [];
  let totalGoals = 0;
  let onTrackGoalsCount = 0;

  for (const student of students) {
    const studentTasks = Array.isArray(student.pedagogicalTasks)
      ? (student.pedagogicalTasks as Record<string, unknown>[])
      : Array.isArray(student.dailyTasks)
      ? (student.dailyTasks as Record<string, unknown>[])
      : [];

    for (const task of studentTasks) {
      if (!task.text || !String(task.text).trim()) continue;
      const isCompleted = Boolean(task.completed);
      const taskDate = String(task.date || '');
      const completedAt = task.completedAt ? String(task.completedAt) : undefined;
      const dateToCompare = completedAt || taskDate;
      const taskMs = dateToCompare ? new Date(dateToCompare).getTime() : NaN;

      const taskItem: CompletedTaskSummary = {
        id: typeof task.id === 'string' ? task.id : undefined,
        studentId: typeof student.id === 'string' ? student.id : undefined,
        studentName: String(student.name || 'תלמיד/ה'),
        framework: String(student.educationalFramework || ''),
        text: String(task.text).trim(),
        date: taskDate,
        time: task.time ? String(task.time) : undefined,
        completedAt,
        isAiGenerated: Boolean(task.isAiGenerated)
      };

      if (isCompleted) {
        if (!Number.isNaN(taskMs)) {
          if (nowMs - taskMs <= windowMs) {
            completedTasks.push(taskItem);
          }
        } else {
          completedTasks.push(taskItem);
        }
      } else {
        pendingTasks.push(taskItem);
      }
    }

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
          studentId: typeof student.id === 'string' ? student.id : undefined,
          studentName: String(student.name || 'תלמיד/ה'),
          framework: String(student.educationalFramework || ''),
          goalTitle: String(goal.title || ''),
          environment: String(goal.environment || 'כללי'),
          currentProgress: currentProg,
          targetProgress: targetProg
        });
      }

      const observations = Array.isArray(goal.observations) ? goal.observations : [];
      for (const obs of observations) {
        const stamp = obs.timestamp || obs.date;
        if (!stamp) continue;
        const obsMs = new Date(stamp).getTime();
        if (Number.isNaN(obsMs)) continue;

        if (nowMs - obsMs <= windowMs) {
          recentObservations.push({
            studentId: typeof student.id === 'string' ? student.id : undefined,
            studentName: String(student.name || 'תלמיד/ה'),
            framework: String(student.educationalFramework || ''),
            goalTitle: String(goal.title || ''),
            environment: String(goal.environment || 'כללי'),
            timestamp: new Date(obsMs).toISOString(),
            progress: Number(obs.progress ?? currentProg),
            note: String(obs.note || obs.text || '').trim(),
            supportLevel: String(obs.supportLevel || '')
          });
        }
      }
    }

    // Unmatched quick observations (no goal) still count as documented activity
    const dailyEntries = Array.isArray(student.dailyPedagogicalEntries)
      ? (student.dailyPedagogicalEntries as Record<string, unknown>[])
      : [];
    for (const entry of dailyEntries) {
      const stamp = entry.timestamp || entry.date;
      if (!stamp) continue;
      const entryMs = new Date(String(stamp)).getTime();
      if (Number.isNaN(entryMs) || nowMs - entryMs > windowMs) continue;
      recentObservations.push({
        studentId: typeof student.id === 'string' ? student.id : undefined,
        studentName: String(student.name || 'תלמיד/ה'),
        framework: String(student.educationalFramework || ''),
        goalTitle: 'תיעוד שוטף',
        environment: 'כללי',
        timestamp: new Date(entryMs).toISOString(),
        progress: 0,
        note: String(entry.note || '').trim(),
        supportLevel: String(entry.supportLevel || '')
      });
    }
  }

  // Sort recent observations and completed tasks by newest first
  recentObservations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  completedTasks.sort((a, b) => {
    const timeA = new Date(a.completedAt || a.date).getTime() || 0;
    const timeB = new Date(b.completedAt || b.date).getTime() || 0;
    return timeB - timeA;
  });

  return {
    totalStudents: students.length,
    totalGoals,
    onTrackGoalsCount,
    recentObservations,
    advancedGoals,
    completedTasks,
    pendingTasks
  };
}

export function createOutlook365CalendarUrl({
  title = '',
  startIso = '',
  endIso = '',
  details = '',
  location = ''
}: CalendarEventUrlOptions = {}): string {
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
}: CalendarEventUrlOptions = {}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const formatGoogleDate = (iso: string): string => {
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
export function generateIcsFileContent(events: CalendarEvent[] = []): string {
  const formatIcsDate = (iso: string): string => {
    if (!iso) return '';
    return iso.replace(/[-:]/g, '').slice(0, 15);
  };

  const lines: string[] = [
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
 * Formats AI Prompt to match a teacher's free-text observation or lesson feedback note against a student's active goals.
 * Instructs the AI model to evaluate all active goals independently and distribute feedback across ALL addressed goals.
 */
export function buildAiGoalMatchPrompt({
  note = '',
  student = {}
}: {
  note?: string;
  student?: Record<string, unknown>;
} = {}): string {
  const boundedNote = String(note || '').trim().slice(0, 5000);
  const goals = Array.isArray(student.goals) ? (student.goals as Record<string, unknown>[]) : [];
  const goalsSummary = goals
    .filter((g) => g.title && String(g.title).trim())
    .slice(0, 25)
    .map((g, idx) => `[יעד ${idx + 1}] מזהה: ${g.id} | סביבה: ${g.environment || 'כללי'} | כותרת: ${g.title} | התקדמות נוכחית: ${g.currentProgress ?? 0}% מתוך ${g.targetProgress ?? 80}%`)
    .join('\n');

  return `אתה מומחה לפדגוגיה ולחינוך מיוחד עבור מערכת תל"א (תוכנית לימודים אישית / תוכנית עבודה אקולוגית).
גננת או מורת שילוב כתבה או הקליטה את הערת התצפית ומשוב השיעור הבא על התלמיד/ה ${student.name || 'התלמיד/ה'}:
"""
${boundedNote}
"""

להלן רשימת כל היעדים הפעילים של התלמיד/ה בתוכנית העבודה:
${goalsSummary || 'אין עדיין יעדים מוגדרים'}

הנחיות ניתוח פדגוגיות (חובה לפעול בדיוק לפיהן):
1. קרא בעיון את כל משוב השיעור ובחן אותו באופן בלתי תלוי כנגד כל אחד מהיעדים הפעילים ברשימה.
2. משוב שיעור כולל פעמים רבות התייחסות למספר יעדים שונים (למשל: הבנת הנקרא, תפקוד עצמאי, מיומנויות חברתיות, ויסות רגשי).
3. אם המשוב נוגע ליותר מיעד אחד - חובה לפצל ולשייך את המידע לכל היעדים הרלוונטיים שנצפו! אל תגביל את הניתוח ליעד יחיד.
4. עבור כל יעד שנצפה, חלץ באופן ממוקד אך ורק את התצפית הספציפית הרלוונטית אליו (במשפט תמציתי ומקצועי המנוסח לדוח מחצית). אין להעתיק את כל המשוב בשלמותו לכל יעד.
5. קבע את רמת התיווך שנצפתה באופן ספציפי עבור יעד זה מתוך האפשרויות: עצמאי לחלוטין | תזכורת מילולית | תיווך חלקי | ליווי והדגמה מלאה.
6. המלץ על תוספת התקדמות באחוזים (מספר שלם בין 0 ל-10) בהתאם לרמת השליטה שהופגנה ביעד הספציפי.
7. אל תמציא, אל תנחש ואל תייחס תצפיות ליעדים שלא הוזכרו כלל במשוב.
8. אם המשוב כללי לחלוטין או אינו מתייחס לאף אחד מהיעדים - החזר מערך ריק של matches והסבר קצר ב-noMatchReason.

החזר אך ורק אובייקט JSON תקני במבנה הבא (ללא טקסט מקדים או מסכם):
{
  "matches": [
    {
      "matchedGoalId": "מזהה היעד המדויק מתוך הרשימה למעלה",
      "matchedGoalTitle": "כותרת היעד שהותאם",
      "environment": "סביבת התפקוד (חצר, כיתה, מפגש, טיפולים וכו')",
      "observedSupportLevel": "עצמאי לחלוטין | תזכורת מילולית | תיווך חלקי | ליווי והדגמה מלאה",
      "conciseObservationNote": "משפט תמציתי, מדויק ומקצועי המכיל אך ורק את המידע הרלוונטי ליעד זה לדוח מחצית",
      "suggestedProgressDelta": 5,
      "confidenceScore": 0.95,
      "explanation": "הסבר פדגוגי קצר כיצד התצפית מעידה על יעד זה"
    }
  ],
  "noMatchReason": null
}`;
}

/**
 * Parses and validates the AI response for multi-goal matching.
 * Returns an array of valid goal match results.
 */
export function parseAiGoalMultiMatchResponse(aiResult?: unknown): AiGoalMatchResult[] {
  if (!aiResult) return [];

  let parsed: unknown = aiResult;
  if (typeof parsed === 'string') {
    const rawStr = parsed.trim();
    try {
      parsed = JSON.parse(rawStr);
    } catch (_) {
      try {
        const cleaned = rawStr.replace(/```json/gi, '').replace(/```/g, '').trim();
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        const arrMatch = cleaned.match(/\[[\s\S]*\]/);
        if (objMatch && (!arrMatch || (objMatch.index ?? 0) <= (arrMatch.index ?? 0))) {
          parsed = JSON.parse(objMatch[0]);
        } else if (arrMatch) {
          parsed = JSON.parse(arrMatch[0]);
        }
      } catch (_) {}
    }
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const rawContent = typeof obj.raw === 'string'
      ? obj.raw
      : typeof obj.text === 'string'
      ? obj.text
      : typeof obj.response === 'string'
      ? obj.response
      : null;

    if (rawContent) {
      try {
        const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        const arrMatch = cleaned.match(/\[[\s\S]*\]/);
        if (objMatch && (!arrMatch || (objMatch.index ?? 0) <= (arrMatch.index ?? 0))) {
          parsed = JSON.parse(objMatch[0]);
        } else if (arrMatch) {
          parsed = JSON.parse(arrMatch[0]);
        }
      } catch (_) {}
    }
  }

  // Extract candidate items array
  let rawItems: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const dict = parsed as Record<string, unknown>;
    if (Array.isArray(dict.matches)) {
      rawItems = dict.matches;
    } else if (Array.isArray(dict.goals)) {
      rawItems = dict.goals;
    } else if (dict.matchedGoalId !== undefined && dict.matchedGoalId !== null && String(dict.matchedGoalId).trim() !== '' && String(dict.matchedGoalId).trim() !== 'null') {
      // Legacy single object response format
      rawItems = [dict];
    }
  }

  const validSupportLevels = new Set([
    'עצמאי לחלוטין',
    'תזכורת מילולית',
    'תיווך חלקי',
    'ליווי והדגמה מלאה'
  ]);

  const uniqueMatchesMap = new Map<string, AiGoalMatchResult>();

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;

    const goalId = typeof raw.matchedGoalId === 'string' && raw.matchedGoalId.trim() !== '' && raw.matchedGoalId !== 'null'
      ? raw.matchedGoalId.trim()
      : typeof raw.goalId === 'string' && raw.goalId.trim() !== ''
      ? raw.goalId.trim()
      : typeof raw.id === 'string' && raw.id.trim() !== ''
      ? raw.id.trim()
      : null;

    if (!goalId) continue;
    if (uniqueMatchesMap.has(goalId)) continue; // avoid duplicates

    const rawSupport = String(raw.observedSupportLevel || '').trim();
    const supportLevel = validSupportLevels.has(rawSupport) ? rawSupport : 'תיווך חלקי';

    const rawDelta = Number(raw.suggestedProgressDelta ?? raw.progressDelta);
    const suggestedProgressDelta = !Number.isNaN(rawDelta)
      ? Math.max(0, Math.min(15, Math.round(rawDelta)))
      : 5;

    const rawConfidence = Number(raw.confidenceScore);
    const confidenceScore = !Number.isNaN(rawConfidence)
      ? Math.max(0, Math.min(1, rawConfidence))
      : 0.85;

    uniqueMatchesMap.set(goalId, {
      matchedGoalId: goalId,
      matchedGoalTitle: String(raw.matchedGoalTitle || raw.goalTitle || '').trim(),
      environment: String(raw.environment || 'כללי').trim(),
      observedSupportLevel: supportLevel,
      conciseObservationNote: String(raw.conciseObservationNote || raw.observation || raw.note || '').trim(),
      suggestedProgressDelta,
      confidenceScore,
      explanation: String(raw.explanation || '').trim()
    });
  }

  return Array.from(uniqueMatchesMap.values());
}

/**
 * Parses and validates the AI response for goal matching (single match backwards compatibility).
 */
export function parseAiGoalMatchResponse(aiResult?: unknown): AiGoalMatchResult | null {
  if (!aiResult) return null;
  const multi = parseAiGoalMultiMatchResponse(aiResult);
  if (multi.length > 0) {
    return multi[0];
  }
  // Backwards compatibility for null / empty object tests
  let parsed: unknown = aiResult;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      try {
        const cleaned = (parsed as string).replace(/```json/gi, '').replace(/```/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch (_) {}
    }
  } else if (parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).raw === 'string') {
    try {
      const cleaned = String((parsed as Record<string, unknown>).raw).replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}
  }
  const raw = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  return {
    matchedGoalId: typeof raw.matchedGoalId === 'string' ? raw.matchedGoalId : null,
    matchedGoalTitle: String(raw.matchedGoalTitle || ''),
    environment: String(raw.environment || 'כללי'),
    observedSupportLevel: String(raw.observedSupportLevel || 'תיווך חלקי'),
    conciseObservationNote: String(raw.conciseObservationNote || ''),
    suggestedProgressDelta: Number(raw.suggestedProgressDelta) || 0,
    confidenceScore: Number(raw.confidenceScore) || 0.8,
    explanation: String(raw.explanation || '')
  };
}

/**
 * Calculates meeting/event duration in minutes from HH:mm start and end strings.
 */
export function calculateDurationMinutes(startTime: string = '', endTime: string = ''): number {
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
export function getEventBarThickness(startTime: string = '', endTime: string = ''): number {
  const duration = calculateDurationMinutes(startTime, endTime);
  if (duration <= 30) return 3;
  if (duration <= 60) return 4.5;
  return 6;
}


/**
 * Determines whether an automated pedagogical digest email is due based on teacher preferences.
 * @param {object} userPreferences 
 * @param {string|null} lastSentIso 
 * @param {Date} now 
 * @returns {boolean}
 */
export function shouldSendPedagogicalDigest(userPreferences?: Record<string, unknown> | null, lastSentIso?: string | null, now: Date = new Date()): boolean {
  if (!userPreferences) return false;
  const isEnabled = Boolean(
    userPreferences.pedagogicalReminderEnabled || userPreferences.monthlyPedagogicalReminder
  );
  if (!isEnabled) return false;

  const freq = userPreferences.pedagogicalReminderFrequency || 'monthly';
  const time = String(userPreferences.pedagogicalReminderTime || '09:00');
  const [targetH = 9, targetM = 0] = time.split(':').map((n: string) => parseInt(n, 10));

  const currentH = now.getHours();
  const currentM = now.getMinutes();

  // Must be at or after the scheduled time
  if (currentH * 60 + currentM < targetH * 60 + targetM) {
    return false;
  }

  // Check if already sent in this cycle (today in local time)
  if (lastSentIso) {
    const lastDate = new Date(lastSentIso);
    if (!Number.isNaN(lastDate.getTime())) {
      const sameDay =
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate();
      if (sameDay) return false;
    }
  }

  if (freq === 'weekly') {
    const daysMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const targetDay = daysMap[String(userPreferences.pedagogicalReminderWeeklyDay)] ?? 0;
    if (now.getDay() !== targetDay) return false;
  } else {
    // monthly
    const targetMonthDay = Number(userPreferences.pedagogicalReminderMonthlyDay) || 1;
    if (now.getDate() !== targetMonthDay) return false;
  }

  return true;
}
