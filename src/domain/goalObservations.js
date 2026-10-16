export const SUPPORT_LEVEL_OPTIONS = [
  'עצמאי/ת',
  'תיווך מילולי',
  'תיווך חלקי',
  'תיווך מלא'
];

export function formatShortDateHe(dateIso) {
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
} = {}) {
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

export function formatObservationLine(entry = {}) {
  const dateLabel = formatShortDateHe(entry.dateIso);
  const prefix = dateLabel ? `[${dateLabel}] ` : '';
  const authorPart = entry.authorName ? ` · ${entry.authorName}` : '';
  const levelPart = `(${entry.supportLevel || 'תצפית'}${authorPart})`;
  const notePart = entry.note ? `: ${entry.note}` : '';
  return `• ${prefix}${levelPart}${notePart}`.trim();
}

export function appendObservationToEvalText(existingText = '', entry) {
  const cur = String(existingText || '').trim();
  const line = formatObservationLine(entry);
  if (!line) return cur;
  if (cur.includes(line)) return cur;
  return cur ? `${cur}\n${line}` : line;
}

export function addObservationToGoal(
  goalRow = {},
  {
    supportLevel,
    note,
    authorName,
    dateIso,
    targetEvalField = 'midYearEvaluation'
  } = {}
) {
  const entry = createObservationEntry({ supportLevel, note, authorName, dateIso });
  const prevList = Array.isArray(goalRow.observations) ? goalRow.observations : [];
  const nextGoal = {
    ...goalRow,
    isTeacherModified: true,
    observations: [...prevList, entry]
  };

  if (targetEvalField === 'midYearEvaluation' || targetEvalField === 'endYearEvaluation') {
    nextGoal[targetEvalField] = appendObservationToEvalText(goalRow[targetEvalField], entry);
  }

  return { updatedGoal: nextGoal, entry };
}
