import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  resolveAiGoalTitle,
  isGoalEmpty,
  mergeReanalyzedGoals
} from '../domain/goalSizingAndMerge';

describe('resolveAiGoalTitle', () => {
  it('preserves a valid trimmed title directly', () => {
    expect(
      resolveAiGoalTitle(
        {
          title: '  שיפור דיוק ושטף הקריאה  ',
          objectives: '• יעד ראשון'
        },
        'קריאה והפקת משמעות'
      )
    ).toBe('שיפור דיוק ושטף הקריאה');
  });

  it('ignores empty whitespace and placeholder strings like "..." when falling back', () => {
    const placeholders = ['', '   ', '...', '…', '-', '—', 'N/A', 'null', 'לא צוין', 'אין', 'ללא'];

    placeholders.forEach((placeholder) => {
      const resolved = resolveAiGoalTitle(
        {
          title: placeholder,
          objectives: '• התלמיד יקרא מילים בנות שתי הברות בדיוק של 90%'
        },
        'קריאה והפקת משמעות'
      );
      expect(resolved).toBe('התלמיד יקרא מילים בנות שתי הברות בדיוק של 90%');
    });
  });

  it('resolves common AI synonym keys before falling back to objectives', () => {
    expect(resolveAiGoalTitle({ goalTitle: 'חיזוק מיומנויות כפל וחילוק' })).toBe(
      'חיזוק מיומנויות כפל וחילוק'
    );
    expect(resolveAiGoalTitle({ goal: 'פיתוח ויסות רגשי במעברים' })).toBe(
      'פיתוח ויסות רגשי במעברים'
    );
    expect(resolveAiGoalTitle({ mainGoal: 'שיפור התארגנות עצמית בשיעור' })).toBe(
      'שיפור התארגנות עצמית בשיעור'
    );
    expect(resolveAiGoalTitle({ goalName: 'הרחבת אוצר מילים פעיל' })).toBe(
      'הרחבת אוצר מילים פעיל'
    );
    expect(resolveAiGoalTitle({ subject: 'התמדה במשחק שולחן משותף' })).toBe(
      'התמדה במשחק שולחן משותף'
    );
    expect(resolveAiGoalTitle({ target: 'קידום השתתפות בשיח קבוצתי' })).toBe(
      'קידום השתתפות בשיח קבוצתי'
    );
  });

  it('synthesizes concise distinct titles from objectives so same-environment goals do not collide in mergeReanalyzedGoals', () => {
    const rawGoalA = {
      id: 'g_a',
      environment: 'קריאה והפקת משמעות',
      title: '',
      objectives:
        '• יקרא בקול קטע קצר בן 50 מילים בדיוק של 90%.\n• ישתמש במרקר לסימון מילות מפתח בטקסט.'
    };
    const rawGoalB = {
      id: 'g_b',
      environment: 'קריאה והפקת משמעות',
      title: '...',
      objectives:
        '1. יענה בכתב על 3 שאלות הבנה גלויה וסמויה מתוך סיפור.\n2. יסכם בעל פה את הרעיון המרכזי.'
    };

    const titleA = resolveAiGoalTitle(rawGoalA, rawGoalA.environment);
    const titleB = resolveAiGoalTitle(rawGoalB, rawGoalB.environment);

    expect(titleA).toBe('יקרא בקול קטע קצר בן 50 מילים בדיוק של 90%.');
    expect(titleB).toBe('יענה בכתב על 3 שאלות הבנה גלויה וסמויה מתוך סיפור.');
    expect(titleA).not.toBe(titleB);

    const merged = mergeReanalyzedGoals({
      existingGoals: [],
      candidateNewGoals: [
        { ...rawGoalA, title: titleA },
        { ...rawGoalB, title: titleB }
      ]
    });
    expect(merged).toHaveLength(2);
    expect(merged.map((g) => g.title)).toEqual([titleA, titleB]);
  });

  it('truncates overly long objective lines cleanly at a word boundary without clipping mid-word', () => {
    const longObjective =
      '• יתאמן בעקביות על פירוק והרכבת מילים מורכבות תוך שימוש באסטרטגיות בקרה עצמית והשוואה למודל כיתתי מסודר לאורך כל השיעור';
    const resolved = resolveAiGoalTitle({ objectives: longObjective });

    expect(resolved.length).toBeLessThanOrEqual(73);
    expect(resolved.endsWith('…')).toBe(true);
    expect(resolved.startsWith('יתאמן בעקביות על')).toBe(true);
  });

  it('falls back to activityParticipation when objectives and title keys are missing', () => {
    expect(
      resolveAiGoalTitle(
        {
          title: '',
          objectives: '',
          activityParticipation: '  השתתפות במפגש בוקר בקבוצה קטנה  '
        },
        'מפגש'
      )
    ).toBe('השתתפות במפגש בוקר בקבוצה קטנה');
  });

  it('falls back to a meaningful environment-based Hebrew title when other content fields exist', () => {
    expect(
      resolveAiGoalTitle(
        {
          environment: 'מתמטיקה',
          title: '',
          objectives: '',
          activityParticipation: '',
          opportunities: 'שימוש באמצעי המחשה וכרטיסיות תרגול בקבוצה קטנה'
        },
        'מתמטיקה'
      )
    ).toBe('קידום תפקוד בתחום מתמטיקה');
  });

  it('returns empty string for completely empty stub objects so isGoalEmpty drops empty rows', () => {
    const stubGoal = {
      environment: 'קריאה והפקת משמעות',
      title: resolveAiGoalTitle({ environment: 'קריאה והפקת משמעות', title: '...' }),
      activityParticipation: '',
      objectives: '',
      opportunities: '',
      evaluationCriteria: ''
    };

    expect(stubGoal.title).toBe('');
    expect(isGoalEmpty(stubGoal)).toBe(true);
  });
});

describe('EcologicalWorkPlanForm AI goal title contract', () => {
  it('instructs non-empty title in the prompt template and maps parsed goals through resolveAiGoalTitle', () => {
    const formPath = path.resolve(process.cwd(), 'src/EcologicalWorkPlanForm.tsx');
    const source = fs.readFileSync(formPath, 'utf8');

    expect(source).not.toContain('"title": "...",');
    expect(source).toContain('resolveAiGoalTitle(');
  });
});
