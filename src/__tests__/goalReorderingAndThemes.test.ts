import { describe, it, expect } from 'vitest';
import { reorderGoals, moveGoalByStep } from '../domain/workPlanEdits';
import { getGoalEnvironmentTheme } from '../domain/goalThemes';

describe('Goal Reordering & Themes (KISS & Soft Color Coding)', () => {
  const sampleGoals = [
    { id: 'g1', title: 'מטרה 1', environment: 'מפגש בגן' },
    { id: 'g2', title: 'מטרה 2', environment: 'חצר' },
    { id: 'g3', title: 'מטרה 3', environment: 'מפגש בגן' },
    { id: 'g4', title: 'מטרה 4', environment: 'משחק במרחב הגן' }
  ];

  describe('reorderGoals', () => {
    it('moves goal from index 2 to index 1 so similar goals are grouped together', () => {
      const state = { goals: [...sampleGoals] };
      const updated = reorderGoals(state, 2, 1);
      const titles = updated.goals.map((g) => g.title);
      expect(titles).toEqual(['מטרה 1', 'מטרה 3', 'מטרה 2', 'מטרה 4']);
    });

    it('returns unmodified goals when fromIndex is out of range', () => {
      const state = { goals: [...sampleGoals] };
      const updated = reorderGoals(state, -1, 2);
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });

    it('returns unmodified goals when toIndex is out of range', () => {
      const state = { goals: [...sampleGoals] };
      const updated = reorderGoals(state, 1, 99);
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });

    it('returns unmodified goals when fromIndex equals toIndex', () => {
      const state = { goals: [...sampleGoals] };
      const updated = reorderGoals(state, 2, 2);
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });

    it('handles empty or missing goals gracefully', () => {
      const state = { goals: [] };
      const updated = reorderGoals(state, 0, 1);
      expect(updated.goals).toEqual([]);
    });
  });

  describe('moveGoalByStep', () => {
    it('moves a goal up one position', () => {
      const state = { goals: [...sampleGoals] };
      const updated = moveGoalByStep(state, 'g3', 'up');
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g3', 'g2', 'g4']);
    });

    it('moves a goal down one position', () => {
      const state = { goals: [...sampleGoals] };
      const updated = moveGoalByStep(state, 'g1', 'down');
      expect(updated.goals.map((g) => g.id)).toEqual(['g2', 'g1', 'g3', 'g4']);
    });

    it('does nothing when moving top goal up', () => {
      const state = { goals: [...sampleGoals] };
      const updated = moveGoalByStep(state, 'g1', 'up');
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });

    it('does nothing when moving bottom goal down', () => {
      const state = { goals: [...sampleGoals] };
      const updated = moveGoalByStep(state, 'g4', 'down');
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });

    it('returns state unmodified for unknown goal id', () => {
      const state = { goals: [...sampleGoals] };
      const updated = moveGoalByStep(state, 'unknown-id', 'up');
      expect(updated.goals.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });
  });

  describe('getGoalEnvironmentTheme', () => {
    it('returns canonical theme for known kindergarten environment', () => {
      const theme = getGoalEnvironmentTheme('מפגש בגן');
      expect(theme.bg).toBeDefined();
      expect(theme.accent).toBeDefined();
      expect(theme.badgeBg).toBeDefined();
      expect(theme.badgeText).toBeDefined();
      expect(theme.border).toBeDefined();
    });

    it('returns matching themes for two goals sharing the same environment', () => {
      const theme1 = getGoalEnvironmentTheme('מפגש בגן');
      const theme3 = getGoalEnvironmentTheme('מפגש בגן');
      expect(theme1).toEqual(theme3);
    });

    it('returns distinct themes for different environments', () => {
      const mifgashTheme = getGoalEnvironmentTheme('מפגש בגן');
      const hatzerTheme = getGoalEnvironmentTheme('חצר');
      expect(mifgashTheme.accent).not.toEqual(hatzerTheme.accent);
    });

    it('deterministically hashes custom environment entries', () => {
      const custom1 = getGoalEnvironmentTheme('קבוצה קטנה ברגשות');
      const custom2 = getGoalEnvironmentTheme('קבוצה קטנה ברגשות');
      expect(custom1).toEqual(custom2);
      expect(custom1.bg.startsWith('#')).toBe(true);
    });

    it('returns fallback theme for empty or null environment', () => {
      const emptyTheme = getGoalEnvironmentTheme('');
      const nullTheme = getGoalEnvironmentTheme(null);
      expect(emptyTheme).toEqual(nullTheme);
      expect(emptyTheme.bg).toBe('#f8fafc');
    });
  });
});
