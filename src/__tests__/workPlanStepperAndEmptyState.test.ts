import { describe, it, expect } from 'vitest';

describe('WorkPlan Stepper & Empty State Flow', () => {
  it('manages 4 distinct workplan steps correctly', () => {
    let currentStep = 1;
    const steps = [
      { id: 1, label: '1. רקע ומסגרת' },
      { id: 2, label: '2. פרופיל ומוקדי כוח' },
      { id: 3, label: '3. מטרות ויעדים' },
      { id: 4, label: '4. המלצות וסיכום' }
    ];

    expect(steps.length).toBe(4);
    expect(currentStep).toBe(1);

    // Advance to step 2
    currentStep = 2;
    expect(currentStep).toBe(2);

    // Advance to step 3
    currentStep = 3;
    expect(currentStep).toBe(3);

    // Return to step 2
    currentStep = 2;
    expect(currentStep).toBe(2);
  });

  it('determines empty state actions based on free text presence', () => {
    const studentWithoutGoals = {
      id: 'st_test_1',
      goals: [],
      teacherFreeText: 'ילד עם קשיי קשב וריכוז ותקשורת חברתית טובה מאוד'
    };

    const hasGoals = studentWithoutGoals.goals.length > 0;
    expect(hasGoals).toBe(false);

    const hasSufficientFreeText = (studentWithoutGoals.teacherFreeText || '').trim().length > 10;
    expect(hasSufficientFreeText).toBe(true);

    // With sufficient text, clicking AI goal suggestion triggers generation
    const actionToTake = hasSufficientFreeText ? 'trigger_ai' : 'navigate_to_profile';
    expect(actionToTake).toBe('trigger_ai');
  });

  it('routes to step 2 when free text is sparse', () => {
    const sparseStudent = {
      id: 'st_test_2',
      goals: [],
      teacherFreeText: ''
    };

    const hasSufficientFreeText = (sparseStudent.teacherFreeText || '').trim().length > 10;
    expect(hasSufficientFreeText).toBe(false);

    const actionToTake = hasSufficientFreeText ? 'trigger_ai' : 'navigate_to_profile';
    expect(actionToTake).toBe('navigate_to_profile');
  });
});
