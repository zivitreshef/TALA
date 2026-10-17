import { describe, it, expect } from 'vitest';
import {
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS,
  canonicalizeEnvironment,
  getCanonicalEnvironmentsForStage,
  deduplicateAndNormalizeGoalBank,
  INITIAL_GOAL_BANK
} from '../goalBankData';

describe('Goal Bank Environment Canonicalization & Stage Filtering', () => {
  it('canonicalizeEnvironment maps raw and composite strings to canonical environments', () => {
    // 'סדנא / יצירה' appears first in the string
    expect(canonicalizeEnvironment('סדנא / יצירה, משחקי שולחן, פעילויות קדם כתיבה')).toBe('סדנא / יצירה');
    // 'מפגש בגן' appears first in the string
    expect(canonicalizeEnvironment('מפגש בגן, סדנא / יצירה, משחקי שולחן')).toBe('מפגש בגן');
    expect(canonicalizeEnvironment('סדנא / יצירה')).toBe('סדנא / יצירה');
    expect(canonicalizeEnvironment('חצר')).toBe('חצר');
    expect(canonicalizeEnvironment('שירותים')).toBe('שירותים');
    expect(canonicalizeEnvironment('האזנה ודיבור – כשירות תקשורתית')).toBe('האזנה ודיבור – כשירות תקשורתית');
    expect(canonicalizeEnvironment('כתיבה')).toBe('כתיבה');
  });

  it('getCanonicalEnvironmentsForStage returns stage-restricted pills', () => {
    const kdgPills = getCanonicalEnvironmentsForStage('kindergarten');
    expect(kdgPills[0]).toBe('הכל');
    expect(kdgPills).toContain('סדנא / יצירה');
    expect(kdgPills).toContain('חצר');
    expect(kdgPills).not.toContain('כתיבה');
    expect(kdgPills).not.toContain('האזנה ודיבור – כשירות תקשורתית');

    const schoolPills = getCanonicalEnvironmentsForStage('school');
    expect(schoolPills[0]).toBe('הכל');
    expect(schoolPills).toContain('האזנה ודיבור – כשירות תקשורתית');
    expect(schoolPills).toContain('כתיבה');
    expect(schoolPills).not.toContain('חצר');
    expect(schoolPills).not.toContain('סדנא / יצירה');

    const allPills = getCanonicalEnvironmentsForStage('all');
    expect(allPills).toContain('סדנא / יצירה');
    expect(allPills).toContain('כתיבה');
  });

  it('deduplicateAndNormalizeGoalBank merges male/female duplicates into canonical masculine title', () => {
    const mockRaw = [
      {
        id: '1',
        title: 'ישחק במשחק משותף עם חבר בצורה מותאמת.',
        environment: 'סדנא / יצירה, משחקי שולחן',
        usageCount: 3,
        stages: ['kindergarten']
      },
      {
        id: '2',
        title: 'תשחק במשחק משותף עם חבר בצורה מותאמת.',
        environment: 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה',
        usageCount: 2,
        stages: ['kindergarten']
      }
    ];

    const deduplicated = deduplicateAndNormalizeGoalBank(mockRaw);
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].title).toBe('ישחק במשחק משותף עם חבר בצורה מותאמת.');
    expect(deduplicated[0].usageCount).toBe(3);
    expect(deduplicated[0].environment).toBe('משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה');
  });

  it('INITIAL_GOAL_BANK contains no male/female duplicates', () => {
    const normalizedTitles = INITIAL_GOAL_BANK.map((g) => g.title.trim());
    const uniqueTitles = new Set(normalizedTitles);
    expect(normalizedTitles.length).toBe(uniqueTitles.size);
  });

  it('deduplicateAndNormalizeGoalBank preserves locally added custom goals when merging with cloud snapshot', () => {
    const cloudSnapshot = [
      {
        id: '1',
        title: 'ישחק במשחק משותף עם חבר בצורה מותאמת.',
        environment: 'חצר',
        usageCount: 1,
        stages: ['kindergarten']
      }
    ];

    const localWithNewCustomGoal = [
      ...cloudSnapshot,
      {
        id: 'gb_admin_123',
        title: 'יוזם ומנהל שיח ספונטני עם קבוצת השווים.',
        environment: 'מפגש בגן',
        usageCount: 0,
        stages: ['kindergarten']
      }
    ];

    const merged = deduplicateAndNormalizeGoalBank([...cloudSnapshot, ...localWithNewCustomGoal]);
    expect(merged.length).toBe(2);
    expect(merged.some((g) => g.title.includes('יוזם ומנהל שיח ספונטני'))).toBe(true);
  });
});
