/**
 * Single source of truth for saving a quick teacher observation.
 * Used by the mobile workspace and by the quick-capture modal (desktop / tablet).
 *
 * Flow: the note is saved immediately to the student's daily entries (never lost),
 * then AI goal matching runs in the background and moves it onto matching goals.
 */
import { buildAiGoalMatchPrompt, parseAiGoalMultiMatchResponse } from './dailyPedagogicalTracking';
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import { maskPromptForAi } from '../goalBankData';
import { saveAudioRecordBlob, uploadAudioRecordToCloud } from '../services/dossierFileStorage';
import { usageTelemetryService } from '../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from './telemetryTaxonomy';

export type CaptureSurface = 'desktop_tracker' | 'mobile_workspace' | 'quick_capture';

export interface BuildObservationInput {
  note: string;
  author?: string;
  surface: CaptureSurface;
  hasAudio?: boolean;
  now?: Date;
}

export function buildObservation({ note, author, surface, hasAudio, now = new Date() }: BuildObservationInput) {
  const obs: any = {
    id: `obs_${now.getTime()}`,
    timestamp: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    authorName: author || 'מורה משלבת',
    supportLevel: 'תיווך חלקי',
    note: String(note || '').trim(),
    source: surface === 'mobile_workspace' ? 'mobile_workspace' : 'quick_capture'
  };
  if (hasAudio) obs.hasAudio = true;
  return obs;
}

export function getActiveGoals(student: any): any[] {
  return (Array.isArray(student?.goals) ? student.goals : []).filter((g: any) => g?.title || g?.description);
}

/** Saves the observation to the student's daily entries (always succeeds, no AI needed). */
export function addObservationToDailyEntries(student: any, obs: any) {
  const existing = Array.isArray(student?.dailyPedagogicalEntries) ? student.dailyPedagogicalEntries : [];
  return { ...student, dailyPedagogicalEntries: [obs, ...existing] };
}

/**
 * Moves an already-saved daily entry onto the goals AI matched it with.
 * Returns the updated student and the number of goals that received the observation.
 * If nothing matches, the student is returned unchanged (the entry stays in daily entries).
 */
export function applyAiMatchesToStudent(student: any, obs: any, matches: any[]) {
  const activeGoals = getActiveGoals(student);
  const valid = (matches || []).filter(
    (m) => m?.matchedGoalId && activeGoals.some((g: any) => g.id === m.matchedGoalId)
  );
  if (valid.length === 0) return { student, matchedCount: 0 };

  const byGoal = new Map<string, any>();
  valid.forEach((m) => byGoal.set(m.matchedGoalId, m));

  const goals = (student.goals || []).map((g: any) => {
    const m = byGoal.get(g.id);
    if (!m) return g;
    const progress = Math.min(100, (Number(g.currentProgress) || 0) + (Number(m.suggestedProgressDelta) || 0));
    const goalObs = {
      ...obs,
      supportLevel: m.observedSupportLevel || obs.supportLevel,
      note: m.conciseObservationNote || obs.note
    };
    const existing = Array.isArray(g.observations) ? g.observations : [];
    return { ...g, currentProgress: progress, observations: [goalObs, ...existing] };
  });

  const entries = (Array.isArray(student.dailyPedagogicalEntries) ? student.dailyPedagogicalEntries : []).filter(
    (e: any) => e.id !== obs.id
  );
  return { student: { ...student, goals, dailyPedagogicalEntries: entries }, matchedCount: valid.length };
}

/** Asks the AI which goals an observation belongs to. Throws on network/AI failure. */
export async function matchObservationWithAi(student: any, note: string): Promise<any[]> {
  const prompt = buildAiGoalMatchPrompt({ note, student });
  const response = await callAiProxyEndpoint({
    operation: 'goalMatch',
    payload: { prompt: maskPromptForAi(prompt, student) },
    hints: { gender: student?.gender || 'boy', name: student?.name, model: 'gemini-2.5-flash' }
  });
  return parseAiGoalMultiMatchResponse(response) as any[];
}

export interface CaptureParams {
  student: any;
  note: string;
  author?: string;
  surface: CaptureSurface;
  audioBlob?: Blob | null;
  onUpdateStudent: (student: any) => void;
  /** Returns the freshest student record (state may change while AI runs). */
  getLatestStudent?: (id: string) => any;
  onMatchSettled?: (result: { matchedCount: number; failed: boolean }) => void;
}

/**
 * Saves the note right away; AI matching continues in the background.
 * Resolves as soon as the note is safely stored.
 */
export function captureObservation({
  student,
  note,
  author,
  surface,
  audioBlob,
  onUpdateStudent,
  getLatestStudent,
  onMatchSettled
}: CaptureParams) {
  const obs = buildObservation({ note, author, surface, hasAudio: Boolean(audioBlob) });

  if (audioBlob) {
    saveAudioRecordBlob(obs.id, audioBlob).catch(() => {});
    if (student?.id) uploadAudioRecordToCloud(obs.id, audioBlob, student.id).catch(() => {});
  }

  onUpdateStudent(addObservationToDailyEntries(student, obs));

  if (getActiveGoals(student).length === 0) {
    onMatchSettled?.({ matchedCount: 0, failed: false });
    return obs;
  }

  matchObservationWithAi(student, obs.note)
    .then((matches) => {
      const latest = (getLatestStudent && getLatestStudent(student.id)) || addObservationToDailyEntries(student, obs);
      const { student: updated, matchedCount } = applyAiMatchesToStudent(latest, obs, matches);
      if (matchedCount > 0) onUpdateStudent(updated);
      onMatchSettled?.({ matchedCount, failed: false });
    })
    .catch(() => onMatchSettled?.({ matchedCount: 0, failed: true }));

  return obs;
}

export function trackCaptureEvent(
  kind: 'started' | 'completed' | 'abandoned' | 'streak',
  props: Record<string, unknown>,
  email?: string
) {
  const eventName =
    kind === 'started'
      ? TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED
      : kind === 'completed'
      ? TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED
      : kind === 'streak'
      ? TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED
      : TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED;
  try {
    usageTelemetryService.track(eventName, props, email ? { userContext: { email } } : {});
  } catch {
    /* telemetry must never break the UI */
  }
}
