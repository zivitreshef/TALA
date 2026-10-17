import { describe, it, expect } from 'vitest';
import {
  addObservationToGoal,
  formatObservationLine
} from '../domain/goalObservations';
import { isGoalProtectedFromAiOverwrite } from '../domain/goalSizingAndMerge';

describe('goalObservations', () => {
  it('appends a dated observation entry to the goal log and midYearEvaluation', () => {
    const goal = {
      id: 'g1',
      environment: 'משחק חופשי',
      title: 'יוזמה חברתית',
      midYearEvaluation: ''
    };
    const { updatedGoal, entry } = addObservationToGoal(goal, {
      supportLevel: 'תיווך מילולי',
      note: 'הצטרף לקבוצת הבנייה בלגו',
      authorName: 'זיוית',
      dateIso: '2026-10-16T10:00:00.000Z',
      targetEvalField: 'midYearEvaluation'
    });

    expect(updatedGoal.observations).toHaveLength(1);
    expect(formatObservationLine(entry)).toBe(
      '• [16/10] (תיווך מילולי · זיוית): הצטרף לקבוצת הבנייה בלגו'
    );
    expect(updatedGoal.midYearEvaluation).toContain('הצטרף לקבוצת הבנייה בלגו');
    expect(isGoalProtectedFromAiOverwrite(updatedGoal)).toBe(true);
  });

  it('ensures that updating or recording an observation on a locked report model unlocks the report', () => {
    const lockedStudent = {
      id: 'st_locked_1',
      name: 'דניאל',
      isLocked: true,
      lockedAt: '17/10/2026 10:00',
      lockedBy: 'teacher@school.gov.il',
      goals: [
        {
          id: 'g1',
          title: 'שיפור מיומנויות תקשורת',
          observations: []
        }
      ]
    };

    const targetGoal = lockedStudent.goals[0];
    const { updatedGoal } = addObservationToGoal(targetGoal, {
      supportLevel: 'עצמאי',
      note: 'פנה מיוזמתו לחבר',
      authorName: 'מורה'
    });

    const unlockedStudent = {
      ...lockedStudent,
      isLocked: false,
      lockedAt: '',
      lockedBy: '',
      goals: lockedStudent.goals.map((g) => (g.id === targetGoal.id ? updatedGoal : g))
    };

    expect(unlockedStudent.isLocked).toBe(false);
    expect(unlockedStudent.lockedAt).toBe('');
    expect(unlockedStudent.lockedBy).toBe('');
    expect(unlockedStudent.goals[0].observations).toHaveLength(1);
    expect(unlockedStudent.goals[0].observations[0].note).toBe('פנה מיוזמתו לחבר');
  });
});
