import { describe, it, expect } from 'vitest';
import { mergeStudentSnapshots } from '../domain/studentSyncMerge';
import { removeGoalRow } from '../domain/workPlanEdits';
import { normalizeStudentForForm, extractYearReportFromFormData } from '../domain/yearReport';

describe('Deleted Goal Resurrection Prevention', () => {
  it('removeGoalRow removes goal and tracks its id in removedGoalIds and removedAiGoals', () => {
    const student = {
      id: 'st_1',
      goals: [
        { id: 'g1', title: 'מטרה 1', environment: 'כיתה' },
        { id: 'g2', title: 'מטרה למחיקה', environment: 'חצר' },
        { id: 'g3', title: 'מטרה 3', environment: 'פרטני' }
      ]
    };

    const updated = removeGoalRow(student, 'g2');
    expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g3']);
    expect(updated.removedGoalIds).toContain('g2');
    expect(updated.removedAiGoals.some((r) => r.id === 'g2')).toBe(true);
  });

  it('does not resurrect deleted goal during cloud sync even if baseSnapshot is empty', () => {
    const serverStudent = {
      id: 'st_1',
      updatedAt: '2026-11-18T10:00:00.000Z',
      goals: [
        { id: 'g1', title: 'מטרה 1' },
        { id: 'g2', title: 'מטרה שנמחקה על ידי המורה' },
        { id: 'g3', title: 'מטרה 3' }
      ]
    };

    // Teacher deleted g2 locally, tracked in removedGoalIds
    const localStudent = {
      id: 'st_1',
      goals: [
        { id: 'g1', title: 'מטרה 1' },
        { id: 'g3', title: 'מטרה 3' }
      ],
      removedGoalIds: ['g2']
    };

    const merged = mergeStudentSnapshots<any>({
      localStudent,
      serverStudent,
      baseSnapshot: {}
    });

    const goalIds = merged.goals?.map((g: any) => g.id);
    expect(goalIds).not.toContain('g2');
    expect(goalIds).toEqual(['g1', 'g3']);
  });

  it('does not resurrect deleted goal when tracked via removedAiGoals snapshot', () => {
    const serverStudent = {
      id: 'st_1',
      updatedAt: '2026-11-18T10:00:00.000Z',
      goals: [
        { id: 'g1', title: 'מטרה 1' },
        { id: 'g2', title: 'מטרה שנמחקה' }
      ]
    };

    const localStudent = {
      id: 'st_1',
      goals: [{ id: 'g1', title: 'מטרה 1' }],
      removedAiGoals: [{ id: 'g2', title: 'מטרה שנמחקה', environment: 'כיתה' }]
    };

    const merged = mergeStudentSnapshots<any>({
      localStudent,
      serverStudent,
      baseSnapshot: {}
    });

    expect(merged.goals?.map((g: any) => g.id)).toEqual(['g1']);
  });

  it('preserves concurrent colleague additions while respecting local deletions', () => {
    const serverStudent = {
      id: 'st_1',
      updatedAt: '2026-11-18T10:30:00.000Z',
      goals: [
        { id: 'g1', title: 'מטרה 1' },
        { id: 'g2', title: 'מטרה שנמחקה על ידי המורה' },
        { id: 'g3', title: 'מטרה 3' },
        { id: 'g_colleague', title: 'מטרה חדשה שהוסיפה מורת שילוב' }
      ]
    };

    const localStudent = {
      id: 'st_1',
      goals: [
        { id: 'g1', title: 'מטרה 1 מעודכנת' },
        { id: 'g3', title: 'מטרה 3' }
      ],
      removedGoalIds: ['g2']
    };

    const merged = mergeStudentSnapshots<any>({
      localStudent,
      serverStudent,
      baseSnapshot: {
        id: 'st_1',
        goals: [{ id: 'g1', title: 'מטרה 1' }, { id: 'g2', title: 'מטרה 2' }, { id: 'g3', title: 'מטרה 3' }]
      }
    });

    const goalIds = merged.goals?.map((g: any) => g.id);
    expect(goalIds).not.toContain('g2');
    expect(goalIds).toContain('g_colleague');
    expect(goalIds).toEqual(['g1', 'g3', 'g_colleague']);
  });

  it('guarantees behavioral analyst target behaviors deletion is never resurrected', () => {
    const serverStudent = {
      id: 'st_behavior',
      behaviorPlan: {
        targetBehaviors: [
          { id: 'tb1', behaviorName: 'התנהגות 1' },
          { id: 'tb2', behaviorName: 'התנהגות שנמחקה' }
        ]
      }
    };

    const localStudent = {
      id: 'st_behavior',
      behaviorPlan: {
        targetBehaviors: [
          { id: 'tb1', behaviorName: 'התנהגות 1' }
        ]
      }
    };

    const merged = mergeStudentSnapshots<any>({
      localStudent,
      serverStudent,
      baseSnapshot: {}
    });

    expect(merged.behaviorPlan?.targetBehaviors?.map((t: any) => t.id)).toEqual(['tb1']);
  });

  it('extractYearReportFromFormData and normalizeStudentForForm preserve tracking metadata', () => {
    const raw = {
      id: 'st_test',
      goals: [{ id: 'g1', title: 'מטרה' }],
      removedGoalIds: ['g_deleted'],
      updatedAt: '2026-11-18T12:00:00.000Z'
    };

    const normalized = normalizeStudentForForm(raw);
    expect(normalized.removedGoalIds).toEqual(['g_deleted']);
    expect(normalized.lastLoadedAt).toBe('2026-11-18T12:00:00.000Z');
    expect(normalized._baseSnapshot?.goals).toHaveLength(1);

    const snapshot = extractYearReportFromFormData(normalized as any);
    expect(snapshot.removedGoalIds).toEqual(['g_deleted']);
  });
});
