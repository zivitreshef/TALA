import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/aiProxyClient', () => ({ callAiProxyEndpoint: vi.fn() }));
vi.mock('../services/dossierFileStorage', () => ({
  saveAudioRecordBlob: vi.fn().mockResolvedValue(undefined),
  uploadAudioRecordToCloud: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('../goalBankData', () => ({ maskPromptForAi: (p: string) => p }));
vi.mock('../domain/dailyPedagogicalTracking', () => ({
  buildAiGoalMatchPrompt: () => 'prompt',
  parseAiGoalMultiMatchResponse: (r: any) => r
}));

import { callAiProxyEndpoint } from '../services/aiProxyClient';
import {
  buildObservation,
  addObservationToDailyEntries,
  applyAiMatchesToStudent,
  captureObservation,
  getActiveGoals
} from '../domain/observationCapture';

const baseStudent = () => ({
  id: 'st1',
  name: 'רוני',
  goals: [
    { id: 'g1', title: 'יעד א', currentProgress: 95, observations: [] },
    { id: 'g2', title: 'יעד ב', currentProgress: 10, observations: [] },
    { id: 'g3', title: '', description: '' }
  ],
  dailyPedagogicalEntries: []
});

describe('observationCapture (v3.0.0)', () => {
  it('buildObservation fills id, date, author and source by surface', () => {
    const now = new Date('2026-11-12T10:00:00.000Z');
    const obs = buildObservation({ note: '  שיתפה פעולה ', author: 'מורה', surface: 'mobile_workspace', now });
    expect(obs.note).toBe('שיתפה פעולה');
    expect(obs.date).toBe('2026-11-12');
    expect(obs.source).toBe('mobile_workspace');
    expect(obs.id).toBe(`obs_${now.getTime()}`);
    expect(buildObservation({ note: 'x', surface: 'quick_capture', now }).source).toBe('quick_capture');
    expect(buildObservation({ note: 'x', surface: 'quick_capture', hasAudio: true, now }).hasAudio).toBe(true);
  });

  it('getActiveGoals ignores empty goals', () => {
    expect(getActiveGoals(baseStudent())).toHaveLength(2);
    expect(getActiveGoals(null)).toEqual([]);
  });

  it('addObservationToDailyEntries prepends without mutating', () => {
    const st = baseStudent();
    const obs = buildObservation({ note: 'n', surface: 'quick_capture' });
    const updated = addObservationToDailyEntries(st, obs);
    expect(updated.dailyPedagogicalEntries[0]).toBe(obs);
    expect(st.dailyPedagogicalEntries).toHaveLength(0);
  });

  describe('applyAiMatchesToStudent', () => {
    it('moves the entry onto matched goals, clamps progress at 100', () => {
      const obs = buildObservation({ note: 'n', surface: 'quick_capture' });
      const st = addObservationToDailyEntries(baseStudent(), obs);
      const { student, matchedCount } = applyAiMatchesToStudent(st, obs, [
        { matchedGoalId: 'g1', suggestedProgressDelta: 20, conciseObservationNote: 'קצר' },
        { matchedGoalId: 'g2', suggestedProgressDelta: 5, observedSupportLevel: 'עצמאי' }
      ]);
      expect(matchedCount).toBe(2);
      expect(student.goals[0].currentProgress).toBe(100);
      expect(student.goals[0].observations[0].note).toBe('קצר');
      expect(student.goals[1].observations[0].supportLevel).toBe('עצמאי');
      expect(student.dailyPedagogicalEntries).toHaveLength(0);
    });

    it('ignores matches for unknown goals and leaves the entry in place', () => {
      const obs = buildObservation({ note: 'n', surface: 'quick_capture' });
      const st = addObservationToDailyEntries(baseStudent(), obs);
      const res = applyAiMatchesToStudent(st, obs, [{ matchedGoalId: 'nope', suggestedProgressDelta: 5 }]);
      expect(res.matchedCount).toBe(0);
      expect(res.student).toBe(st);
    });
  });

  describe('captureObservation', () => {
    it('with no goals saves once and settles without AI', () => {
      const onUpdate = vi.fn();
      const onSettled = vi.fn();
      captureObservation({
        student: { id: 's', name: 'x', goals: [] },
        note: 'הערה',
        surface: 'quick_capture',
        onUpdateStudent: onUpdate,
        onMatchSettled: onSettled
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate.mock.calls[0][0].dailyPedagogicalEntries).toHaveLength(1);
      expect(onSettled).toHaveBeenCalledWith({ matchedCount: 0, failed: false });
      expect(callAiProxyEndpoint).not.toHaveBeenCalled();
    });

    it('saves immediately, then moves the note onto the matched goal in the background', async () => {
      (callAiProxyEndpoint as any).mockResolvedValueOnce([{ matchedGoalId: 'g2', suggestedProgressDelta: 10 }]);
      const onUpdate = vi.fn();
      const settled = new Promise<any>((resolve) => {
        const student = baseStudent();
        captureObservation({
          student,
          note: 'עצמאית היום',
          surface: 'mobile_workspace',
          onUpdateStudent: onUpdate,
          onMatchSettled: resolve
        });
        // The note is stored synchronously, before any AI result.
        expect(onUpdate).toHaveBeenCalledTimes(1);
      });
      const result = await settled;
      expect(result).toEqual({ matchedCount: 1, failed: false });
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate.mock.calls[1][0].goals[1].observations).toHaveLength(1);
    });

    it('keeps the note when the AI fails (no data loss)', async () => {
      (callAiProxyEndpoint as any).mockRejectedValueOnce(new Error('down'));
      const onUpdate = vi.fn();
      const result = await new Promise<any>((resolve) =>
        captureObservation({
          student: baseStudent(),
          note: 'חשוב',
          surface: 'quick_capture',
          onUpdateStudent: onUpdate,
          onMatchSettled: resolve
        })
      );
      expect(result).toEqual({ matchedCount: 0, failed: true });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate.mock.calls[0][0].dailyPedagogicalEntries[0].note).toBe('חשוב');
    });

    it('uses the freshest student record for the background update', async () => {
      (callAiProxyEndpoint as any).mockResolvedValueOnce([{ matchedGoalId: 'g1', suggestedProgressDelta: 1 }]);
      const onUpdate = vi.fn();
      const latestMarker = { ...baseStudent(), name: 'עדכני' };
      await new Promise<any>((resolve) =>
        captureObservation({
          student: baseStudent(),
          note: 'n',
          surface: 'quick_capture',
          onUpdateStudent: onUpdate,
          getLatestStudent: () => addObservationToDailyEntries(latestMarker, { id: 'will-not-match' }),
          onMatchSettled: resolve
        })
      );
      expect(onUpdate.mock.calls[1][0].name).toBe('עדכני');
    });
  });
});
