export const SUPPORT_LEVEL_OPTIONS: readonly string[] = [
  'עצמאי/ת',
  'תיווך מילולי',
  'תיווך חלקי',
  'תיווך מלא'
];

export interface ObservationEntry {
  id: string;
  dateIso: string;
  supportLevel: string;
  note: string;
  authorName: string;
}

export interface CreateObservationParams {
  supportLevel?: string;
  note?: string;
  authorName?: string;
  dateIso?: string;
}

export interface GoalWithObservations {
  observations?: ObservationEntry[];
  isTeacherModified?: boolean;
  midYearEvaluation?: string;
  endYearEvaluation?: string;
  [key: string]: unknown;
}

export interface AddObservationResult<T extends GoalWithObservations> {
  updatedGoal: T;
  entry: ObservationEntry;
}

export function formatShortDateHe(dateIso?: string | null): string {
  try {
    const d = dateIso ? new Date(dateIso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return '';
  }
}

export function createObservationEntry({
  supportLevel = 'תיווך חלקי',
  note = '',
  authorName = '',
  dateIso = new Date().toISOString()
}: CreateObservationParams = {}): ObservationEntry {
  const cleanLevel = SUPPORT_LEVEL_OPTIONS.includes(supportLevel)
    ? supportLevel
    : SUPPORT_LEVEL_OPTIONS[2];
  return {
    id: `obs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dateIso,
    supportLevel: cleanLevel,
    note: String(note || '').trim().slice(0, 400),
    authorName: String(authorName || '').trim().slice(0, 80)
  };
}

export function formatObservationLine(entry?: Partial<ObservationEntry> | null): string {
  if (!entry) return '';
  const dateLabel = formatShortDateHe(entry.dateIso);
  const prefix = dateLabel ? `[${dateLabel}] ` : '';
  const authorPart = entry.authorName ? ` · ${entry.authorName}` : '';
  const levelPart = `(${entry.supportLevel || 'תצפית'}${authorPart})`;
  const notePart = entry.note ? `: ${entry.note}` : '';
  return `• ${prefix}${levelPart}${notePart}`.trim();
}

export function appendObservationToEvalText(existingText: string = '', entry?: Partial<ObservationEntry> | null): string {
  const cur = String(existingText || '').trim();
  const line = formatObservationLine(entry);
  if (!line) return cur;
  if (cur.includes(line)) return cur;
  return cur ? `${cur}\n${line}` : line;
}

export function addObservationToGoal<T extends GoalWithObservations>(
  goalRow: T,
  {
    supportLevel,
    note,
    authorName,
    dateIso,
    targetEvalField = 'midYearEvaluation'
  }: CreateObservationParams & { targetEvalField?: 'midYearEvaluation' | 'endYearEvaluation' | string } = {}
): AddObservationResult<T> {
  const entry = createObservationEntry({ supportLevel, note, authorName, dateIso });
  const prevList = Array.isArray(goalRow.observations) ? goalRow.observations : [];
  const nextGoal: T = {
    ...goalRow,
    isTeacherModified: true,
    observations: [...prevList, entry]
  };

  if (targetEvalField === 'midYearEvaluation' || targetEvalField === 'endYearEvaluation') {
    (nextGoal as Record<string, unknown>)[targetEvalField] = appendObservationToEvalText(
      String((goalRow as Record<string, unknown>)[targetEvalField] || ''),
      entry
    );
  }

  return { updatedGoal: nextGoal, entry };
}
