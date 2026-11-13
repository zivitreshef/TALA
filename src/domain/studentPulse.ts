/**
 * Class pulse: last-observation info, weekly coverage and streak across students.
 * Reads observations from goals AND from unmatched daily entries
 * (`dailyPedagogicalEntries`), which would otherwise be invisible.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_STALE_DAYS = 10;

export interface LastObservationInfo {
  lastMs: number | null;
  daysSince: number | null;
}

export interface WaitingStudent {
  id: string;
  name: string;
  daysSince: number | null;
}

export interface ClassPulse {
  total: number;
  documentedThisWeek: number;
  streakDays: number;
  waiting: WaitingStudent[];
}

function toMs(obs: any): number | null {
  const raw = obs?.timestamp || obs?.date;
  if (!raw) return null;
  const ms = new Date(String(raw)).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** All observation timestamps of a student (goal observations + unmatched daily entries). */
export function collectObservationTimestamps(student: any): number[] {
  const out: number[] = [];
  const goals = Array.isArray(student?.goals) ? student.goals : [];
  for (const g of goals) {
    const list = Array.isArray(g?.observations) ? g.observations : [];
    for (const obs of list) {
      const ms = toMs(obs);
      if (ms !== null) out.push(ms);
    }
  }
  const entries = Array.isArray(student?.dailyPedagogicalEntries) ? student.dailyPedagogicalEntries : [];
  for (const obs of entries) {
    const ms = toMs(obs);
    if (ms !== null) out.push(ms);
  }
  return out;
}

export function getLastObservationInfo(student: any, now: Date = new Date()): LastObservationInfo {
  const stamps = collectObservationTimestamps(student);
  if (stamps.length === 0) return { lastMs: null, daysSince: null };
  const lastMs = Math.max(...stamps);
  return { lastMs, daysSince: Math.max(0, Math.floor((now.getTime() - lastMs) / DAY_MS)) };
}

/** Start of the Israeli work week (Sunday 00:00 local time). */
export function startOfWeekSunday(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Hebrew label for the "last observation" chip on a student row. */
export function formatLastObservationLabel(info: LastObservationInfo): string {
  if (info.daysSince === null) return 'טרם תועד';
  if (info.daysSince === 0) return 'תצפית אחרונה: היום';
  if (info.daysSince === 1) return 'תצפית אחרונה: אתמול';
  return `תצפית אחרונה: לפני ${info.daysSince} ימים`;
}

/** Compact Hebrew label for student card badges (omits redundant prefix to prevent layout overflow). */
export function formatCompactLastObservationLabel(info: LastObservationInfo): string {
  if (info.daysSince === null) return 'טרם תועד';
  if (info.daysSince === 0) return 'היום';
  if (info.daysSince === 1) return 'אתמול';
  return `לפני ${info.daysSince} ימים`;
}

export function isStale(info: LastObservationInfo, staleDays: number = DEFAULT_STALE_DAYS): boolean {
  return info.daysSince === null || info.daysSince >= staleDays;
}

/**
 * Consecutive tracking days (ending today, or yesterday if nothing logged today).
 */
export function calculateCurrentStreak(
  students: any[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): number {
  const dates = new Set<string>();
  for (const st of students || []) {
    const goals = Array.isArray(st?.goals) ? st.goals : [];
    const lists: any[][] = goals.map((g: any) => (Array.isArray(g?.observations) ? g.observations : []));
    if (Array.isArray(st?.dailyPedagogicalEntries)) lists.push(st.dailyPedagogicalEntries);
    for (const list of lists) {
      for (const obs of list) {
        if (obs?.date) dates.add(String(obs.date).slice(0, 10));
        else if (obs?.timestamp) dates.add(String(obs.timestamp).slice(0, 10));
      }
    }
  }
  if (dates.size === 0) return 0;

  let streak = 0;
  const check = new Date(todayStr);
  if (!dates.has(todayStr)) check.setDate(check.getDate() - 1);
  while (dates.has(check.toISOString().slice(0, 10))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export function computeClassPulse(
  students: any[],
  now: Date = new Date(),
  staleDays: number = DEFAULT_STALE_DAYS
): ClassPulse {
  const list = Array.isArray(students) ? students : [];
  const weekStartMs = startOfWeekSunday(now).getTime();
  let documentedThisWeek = 0;
  const waiting: WaitingStudent[] = [];

  for (const st of list) {
    const info = getLastObservationInfo(st, now);
    if (info.lastMs !== null && info.lastMs >= weekStartMs) documentedThisWeek++;
    if (isStale(info, staleDays)) {
      waiting.push({ id: String(st?.id || ''), name: String(st?.name || 'ללא שם'), daysSince: info.daysSince });
    }
  }

  // Longest wait first; never-documented students come first of all.
  waiting.sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  return {
    total: list.length,
    documentedThisWeek,
    streakDays: calculateCurrentStreak(list, now.toISOString().slice(0, 10)),
    waiting
  };
}
