import { describe, it, expect } from 'vitest';
import { buildFocusDomainsCoverageGuidance } from '../domain/stageGuard';
import { reverseEngineerRawTextLocally, INITIAL_GOAL_BANK } from '../goalBankData';

describe('buildFocusDomainsCoverageGuidance', () => {
  it('generates rich, mandatory focus domains coverage guidance for school stage', () => {
    const guidance = buildFocusDomainsCoverageGuidance('school');

    // Mandatory coverage directive
    expect(guidance).toContain('הנחיה מחייבת – כיסוי מקיף של כל תחומי המוקד והיעדים שהוזנו בטקסט');
    expect(guidance).toContain('חובת סריקה שיטתית');
    expect(guidance).toContain('חל איסור מוחלט להשמיט תחום שהוזכר');

    // Core pedagogical domains for school
    expect(guidance).toContain('תחום שפתי ואורייני');
    expect(guidance).toContain('קריאה והפקת משמעות');
    expect(guidance).toContain('תחום חשבוני / מתמטי');
    expect(guidance).toContain('פעולות חשבון');
    expect(guidance).toContain('תחום התנהגותי וויסות');
    expect(guidance).toContain('תחום רגשי');
    expect(guidance).toContain('תחום חברתי');

    // Mandatory non-empty title requirement
    expect(guidance).toContain('חובת ניסוח כותרת מטרה (title)');
    expect(guidance).toContain('אסור שיישאר ריק');

    // Concrete measurable objectives requirement
    expect(guidance).toContain('חובת פירוט יעדים אופרטיביים (objectives)');
    expect(guidance).toContain('2-4 יעדים קונקרטיים, מדידים ומדורגים');
  });

  it('generates kindergarten-tailored focus domains coverage guidance for kindergarten stage', () => {
    const guidance = buildFocusDomainsCoverageGuidance('kindergarten');

    expect(guidance).toContain('הנחיה מחייבת – כיסוי מקיף של כל תחומי המוקד והיעדים שהוזנו בטקסט');
    expect(guidance).toContain('תחום שפתי ותקשורתי');
    expect(guidance).toContain('תחום קוגניטיבי, חשבוני וחשיבה כמותית');
    expect(guidance).toContain('משחקי שולחן וקופסא');
    expect(guidance).toContain('סביבת גן מתאימה');
    expect(guidance).toContain('חובת ניסוח כותרת מטרה (title)');
    expect(guidance).toContain('2-4 יעדים קונקרטיים, מדידים ומדורגים');
  });

  it('handles null and undefined stages gracefully by falling back to school guidance', () => {
    const nullGuidance = buildFocusDomainsCoverageGuidance(null);
    expect(nullGuidance).toContain('תחום חשבוני / מתמטי');

    const undefGuidance = buildFocusDomainsCoverageGuidance(undefined);
    expect(undefGuidance).toContain('תחום חשבוני / מתמטי');
  });

  it('stays strictly within a lean prompt budget (< 2500 chars)', () => {
    const schoolGuidance = buildFocusDomainsCoverageGuidance('school');
    const kdgGuidance = buildFocusDomainsCoverageGuidance('kindergarten');

    expect(schoolGuidance.length).toBeLessThan(2500);
    expect(schoolGuidance.length).toBeGreaterThan(600);
    expect(kdgGuidance.length).toBeLessThan(2500);
    expect(kdgGuidance.length).toBeGreaterThan(600);
  });
});

describe('reverseEngineerRawTextLocally focus domain coverage for school', () => {
  it('extracts mathematics and literacy goals when both are described in raw text', () => {
    const rawText =
      'יונתן תלמיד כיתה ד. מתקשה בחשבון, מתבלבל בלוח הכפל ובפעולות חיבור וחיסור. בנוסף מתקשה בקריאה ודיוק בפענוח מילים. בהפסקות מתקשה בוויסות ומתפרץ.';

    const result = reverseEngineerRawTextLocally(
      rawText,
      { name: 'יונתן', gender: 'boy', stage: 'school', goals: [] },
      INITIAL_GOAL_BANK
    );

    expect(result).toBeTruthy();
    expect(Array.isArray(result.goals)).toBe(true);
    expect(result.goals.length).toBeGreaterThanOrEqual(3);

    const environments = result.goals.map((g: any) => g.environment);
    // Verified coverage of both math and language domains
    expect(environments).toContain('מתמטיקה');
    expect(environments).toContain('קריאה והפקת משמעות');

    // Verify all generated goals contain concrete bulleted objectives
    result.goals.forEach((goal: any) => {
      expect(goal.objectives).toBeTruthy();
      expect(goal.objectives).toContain('•');
    });
  });
});
