import { describe, it, expect } from 'vitest';
import { buildPedagogicalOpportunitiesGuidance } from '../domain/stageGuard';

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
});
