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
});
