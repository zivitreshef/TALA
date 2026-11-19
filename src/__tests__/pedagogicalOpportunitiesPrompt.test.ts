import { describe, it, expect } from 'vitest';
import { buildPedagogicalOpportunitiesGuidance } from '../domain/stageGuard';
import { INITIAL_GOAL_BANK } from '../goalBankData';

describe('buildPedagogicalOpportunitiesGuidance', () => {
  it('generates rich, actionable guidance for school stage with concrete examples', () => {
    const guidance = buildPedagogicalOpportunitiesGuidance('school');

    // Pedagogical pillars
    expect(guidance).toContain('מה איש החינוך עושה בפועל?');
    expect(guidance).toContain('איסור מוחלט על ניסוחים כלליים');
    expect(guidance).toContain('המורה תציב גבולות');
    expect(guidance).toContain('המורה תחזק התנהגות חיובית');

    // Concrete contrastive examples
    expect(guidance).toContain('לוח הצלחות חזותי');
    expect(guidance).toContain('שניים-שלושה כללים ברורים וקצרים');

    // Scaffolding, scripts & duration pillars
    expect(guidance).toContain('עקרון דרכי תמיכה מדורגות');
    expect(guidance).toContain('הקניית שפה ותסריטי שיח');
    expect(guidance).toContain('כל הכבוד למנצח');
    expect(guidance).toContain('מינון ומשך זמן');
    expect(guidance).toContain('תוכנית מדורגת');

    // School role mapping
    expect(guidance).toContain('המורה / המחנכת');
    expect(guidance).toContain('מורת השילוב');
    expect(guidance).toContain('הכיתה');

    // Grounding & anti-hallucination guard
    expect(guidance).toContain('הימנעות מהמצאת פרטים');
    expect(guidance).toContain('רמת פירוט נדרשת');
  });

  it('generates kindergarten-adapted roles and environments for kindergarten stage', () => {
    const guidance = buildPedagogicalOpportunitiesGuidance('kindergarten');

    // Kindergarten role mapping
    expect(guidance).toContain('הגננת');
    expect(guidance).toContain('גננת השילוב');
    expect(guidance).toContain('הגן');

    // Does not use school role labels in the role mapping
    expect(guidance).not.toContain('מורת השילוב');
    expect(guidance).not.toContain('שגרות הכיתה');
  });

  it('handles null and undefined stages gracefully by falling back to default school setting', () => {
    const nullStageGuidance = buildPedagogicalOpportunitiesGuidance(null);
    expect(nullStageGuidance).toBeTruthy();
    expect(nullStageGuidance).toContain('מה איש החינוך עושה בפועל?');

    const undefinedStageGuidance = buildPedagogicalOpportunitiesGuidance(undefined);
    expect(undefinedStageGuidance).toBeTruthy();
    expect(undefinedStageGuidance).toContain('מה איש החינוך עושה בפועל?');
  });

  it('stays strictly within a lean prompt budget to avoid pushing prompt over 14000 char budget', () => {
    const schoolGuidance = buildPedagogicalOpportunitiesGuidance('school');
    const kdgGuidance = buildPedagogicalOpportunitiesGuidance('kindergarten');

    expect(schoolGuidance.length).toBeLessThan(2500);
    expect(schoolGuidance.length).toBeGreaterThan(500);
    expect(kdgGuidance.length).toBeLessThan(2500);
    expect(kdgGuidance.length).toBeGreaterThan(500);
  });

  it('includes enriched, graded opportunities in INITIAL_GOAL_BANK for core domains', () => {
    const drawingGoal = INITIAL_GOAL_BANK.find((g) => g.id === 'gb_workshop_3');
    expect(drawingGoal).toBeDefined();
    expect(drawingGoal?.defaultOpportunities).toContain('תוכנית מדורגת לפיתוח מיומנויות ציור');
    expect(drawingGoal?.defaultOpportunities).toContain('5–7 דקות');
    expect(drawingGoal?.defaultOpportunities).toContain('פיתוח יכולת סגירה');

    const gameLossGoal = INITIAL_GOAL_BANK.find((g) => g.id === 'gb_table_3');
    expect(gameLossGoal).toBeDefined();
    expect(gameLossGoal?.defaultOpportunities).toContain('דרכי תמיכה מדורגות להתמודדות עם הפסד במשחק');
    expect(gameLossGoal?.defaultOpportunities).toContain('כל הכבוד למנצח');
    expect(gameLossGoal?.defaultOpportunities).toContain('אני מאוכזב');

    const socioDramaticGoal = INITIAL_GOAL_BANK.find((g) => g.id === 'gb_space_1');
    expect(socioDramaticGoal).toBeDefined();
    expect(socioDramaticGoal?.defaultOpportunities).toContain('דרכי תמיכה מדורגות בפיתוח משחק סוציו־דרמטי');
    expect(socioDramaticGoal?.defaultOpportunities).toContain('אפשר להצטרף?');
    expect(socioDramaticGoal?.defaultOpportunities).toContain('בוא נעשה כאילו...');
  });
});
