import { describe, it, expect, beforeEach } from 'vitest';
import {
  textHasKindergartenMarker,
  adaptTextToSchoolStage,
  isEnvironmentAllowedForStage,
  remapEnvironmentForStage,
  enforceGoalStage,
  getCuratedTitlesExclusiveToStage,
  resolveGoalStageForBank,
  inferStagesFromEnvironment,
  filterBankForStage,
  buildBankReferenceForPrompt,
  buildStageRulesBlock,
  getDefaultEnvironmentForStage,
  getDefaultPartnersForStage,
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ALLOWED_ENVIRONMENTS
} from '../domain/stageGuard.js';
import {
  INITIAL_GOAL_BANK,
  reverseEngineerRawTextLocally,
  recordGoalUsageOrAdd,
  generateDefaultQuestionsForCustomGoal
} from '../goalBankData.js';
import { formatPromptWithStudentContext } from '../studentStage.js';

// Node test env has no localStorage – the goal bank persists through it.
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
});

const KDG_CURATED = getCuratedTitlesExclusiveToStage(INITIAL_GOAL_BANK, 'kindergarten');

describe('stageGuard – kindergarten marker detection', () => {
  it('detects explicit kindergarten words', () => {
    expect(textHasKindergartenMarker('יביע עניין במפגש בגן')).toBe(true);
    expect(textHasKindergartenMarker('צוות הגן, הורים')).toBe(true);
    expect(textHasKindergartenMarker('בשיתוף הגננת')).toBe(true);
    expect(textHasKindergartenMarker('יתנסה בפינות השונות בגן')).toBe(true);
  });

  it('ignores ambiguous / unrelated uses of "גן"', () => {
    expect(textHasKindergartenMarker('גר ברמת גן')).toBe(false);
    expect(textHasKindergartenMarker('הגן על חברו בהפסקה')).toBe(false);
    expect(textHasKindergartenMarker('שיפור דיוק ושטף הקריאה')).toBe(false);
    expect(textHasKindergartenMarker('יצמצם את הבלגן בתיק')).toBe(false);
    expect(textHasKindergartenMarker('נוקט עמדה מגננת')).toBe(false);
    expect(textHasKindergartenMarker('')).toBe(false);
  });

  it('handles attached Hebrew prefixes', () => {
    expect(textHasKindergartenMarker('בתיאום שהגננת תלווה')).toBe(true);
    expect(textHasKindergartenMarker('ישתתף במפגש בגן')).toBe(true);
  });

  it('never treats public gardens or gardening as kindergarten', () => {
    expect(textHasKindergartenMarker('ישחק עם חברים בגן השעשועים')).toBe(false);
    expect(textHasKindergartenMarker('טיול לגן החיות')).toBe(false);
    expect(textHasKindergartenMarker('ביקור בהגן הלאומי')).toBe(false);
    expect(textHasKindergartenMarker('ישתתף בחוג גננות')).toBe(false);
    expect(adaptTextToSchoolStage('ישחק בגן השעשועים')).toBe('ישחק בגן השעשועים');
  });
});

describe('stageGuard – kindergarten → school wording', () => {
  it('converts staff / setting phrases', () => {
    expect(adaptTextToSchoolStage('צוות הגן, הורים')).toBe('צוות בית הספר, הורים');
    expect(adaptTextToSchoolStage('בתיווך הגננת')).toBe('בתיווך המחנכת');
    expect(adaptTextToSchoolStage('במפגש בגן')).toBe('במפגש כיתתי');
  });

  it('converts bare place words only when allowed', () => {
    expect(adaptTextToSchoolStage('ישתתף בפעילות בגן')).toBe('ישתתף בפעילות בבית הספר');
    expect(adaptTextToSchoolStage('עבר מהגן בשנה שעברה', { includeBarePlaceWords: false })).toBe(
      'עבר מהגן בשנה שעברה'
    );
  });
});

describe('stageGuard – environments', () => {
  it('school accepts only school environments', () => {
    SCHOOL_ALLOWED_ENVIRONMENTS.forEach((env) => expect(isEnvironmentAllowedForStage(env, 'school')).toBe(true));
    KINDERGARTEN_ENVIRONMENTS.forEach((env) => expect(isEnvironmentAllowedForStage(env, 'school')).toBe(false));
    expect(isEnvironmentAllowedForStage('', 'school')).toBe(false);
  });

  it('kindergarten rejects school environments but tolerates custom ones', () => {
    expect(isEnvironmentAllowedForStage('כתיבה', 'kindergarten')).toBe(false);
    expect(isEnvironmentAllowedForStage('מתמטיקה', 'kindergarten')).toBe(false);
    expect(isEnvironmentAllowedForStage('מפגש בגן', 'kindergarten')).toBe(true);
    expect(isEnvironmentAllowedForStage('מוזיקה ותנועה', 'kindergarten')).toBe(true);
  });

  it('remaps kindergarten environments to school domains for a school student', () => {
    expect(remapEnvironmentForStage('מפגש בגן', 'school')).toBe('האזנה ודיבור – כשירות תקשורתית');
    expect(remapEnvironmentForStage('שירותים', 'school')).toBe('ניידות וטיפול עצמי');
    expect(remapEnvironmentForStage('חצר', 'school')).toBe('תקשורת ויחסים בינאישיים');
    expect(remapEnvironmentForStage('פעילות שאינה בשגרה', 'school')).toBe('ניהול עצמי');
    expect(remapEnvironmentForStage('', 'school', { title: 'שיפור דיוק ושטף הקריאה' })).toBe(
      'קריאה והפקת משמעות'
    );
    expect(remapEnvironmentForStage('כתיבה', 'school')).toBe('כתיבה');
  });

  it('remaps school environments for a kindergarten child', () => {
    expect(remapEnvironmentForStage('כתיבה', 'kindergarten')).toBe('סדנא / יצירה');
    expect(remapEnvironmentForStage('קריאה והפקת משמעות', 'kindergarten')).toBe('מפגש בגן');
    expect(remapEnvironmentForStage('מפגש בגן', 'kindergarten')).toBe('מפגש בגן');
  });

  it('stage defaults never fall back to kindergarten for school', () => {
    expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(getDefaultEnvironmentForStage('school'));
    expect(getDefaultEnvironmentForStage('kindergarten')).toBe(KINDERGARTEN_ENVIRONMENTS[0]);
    expect(getDefaultPartnersForStage('school')).not.toMatch(/גן/);
  });
});

describe('stageGuard – goal enforcement (the reported bug)', () => {
  const opts = { curatedOtherStageTitles: KDG_CURATED };

  it('drops goals whose title is explicitly a kindergarten goal', () => {
    const r = enforceGoalStage(
      { title: 'יתנסה בפינות השונות בגן תוך התמדה', environment: 'משחק במרחב הגן' },
      'school',
      opts
    );
    expect(r.dropped).toBe(true);
    expect(r.goal).toBeNull();
  });

  it('drops curated kindergarten-only bank goals even without the word "גן"', () => {
    expect(KDG_CURATED.length).toBeGreaterThan(0);
    const r = enforceGoalStage({ title: KDG_CURATED[0], environment: 'חצר' }, 'school', opts);
    expect(r.dropped).toBe(true);
  });

  it('keeps a transition goal that also names a school setting', () => {
    const r = enforceGoalStage(
      { title: "יסתגל למעבר מהגן לכיתה א'", environment: 'פעילות שאינה בשגרה' },
      'school',
      opts
    );
    expect(r.dropped).toBe(false);
    expect(r.goal.title).toBe("יסתגל למעבר מהגן לכיתה א'");
    expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(r.goal.environment);
  });

  it('corrects environment and kindergarten wording of an otherwise valid school goal', () => {
    const r = enforceGoalStage(
      {
        title: 'ישפר את שטף הקריאה',
        environment: 'מפגש בגן',
        partners: 'צוות הגן, הורים',
        opportunities: 'תרגול בקבוצה קטנה עם הגננת'
      },
      'school',
      opts
    );
    expect(r.dropped).toBe(false);
    expect(r.corrected).toBe(true);
    expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(r.goal.environment);
    expect(r.goal.partners).toBe('צוות בית הספר, הורים');
    expect(r.goal.opportunities).toBe('תרגול בקבוצה קטנה עם המחנכת');
  });

  it('leaves a valid school goal untouched', () => {
    const goal = { title: 'שיפור דיוק ושטף הקריאה', environment: 'קריאה והפקת משמעות', partners: 'מחנכת' };
    const r = enforceGoalStage(goal, 'school', opts);
    expect(r.corrected).toBe(false);
    expect(r.goal).toEqual(goal);
  });

  it('simulated AI response with kindergarten goals yields only school goals', () => {
    const aiGoals = [
      { title: 'יביע סקרנות ועניין במפגש ויהיה שותף באופן פעיל.', environment: 'מפגש בגן' },
      { title: 'יתנהל באופן עצמאי ומותאם בזמן הארוחה בגן', environment: 'אוכל' },
      { title: 'פיתוח הבנת שפה דבורה', environment: 'האזנה ודיבור – כשירות תקשורתית' },
      { title: 'יווסת את תגובותיו בעת תסכול', environment: 'פעילות שאינה בשגרה' }
    ];
    const kept = aiGoals
      .map((g) => enforceGoalStage(g, 'school', opts))
      .filter((r) => !r.dropped)
      .map((r) => r.goal);
    expect(kept.length).toBeGreaterThan(0);
    kept.forEach((g) => {
      expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(g.environment);
      expect(textHasKindergartenMarker(g.title)).toBe(false);
    });
  });

  it('kindergarten: only corrects the environment', () => {
    const r = enforceGoalStage({ title: 'יכיר אותיות', environment: 'כתיבה' }, 'kindergarten');
    expect(r.goal.environment).toBe('סדנא / יצירה');
    expect(r.goal.title).toBe('יכיר אותיות');
  });
});

describe('stageGuard – shared goal bank tagging', () => {
  it('infers stages from environment', () => {
    expect(inferStagesFromEnvironment('כתיבה')).toEqual(['school']);
    expect(inferStagesFromEnvironment('ניהול עצמי')).toEqual(['school']);
    expect(inferStagesFromEnvironment('מפגש בגן')).toEqual(['kindergarten']);
    expect(inferStagesFromEnvironment('משהו חופשי')).toEqual(['kindergarten']);
  });

  it('resolves the stage a goal belongs to', () => {
    expect(resolveGoalStageForBank({ title: 'x', environment: 'כתיבה' }, 'school')).toBe('school');
    expect(resolveGoalStageForBank({ title: 'x', environment: 'שיעור ספורט' }, 'school')).toBe('school');
    // Legacy kindergarten goal on a school student keeps kindergarten
    expect(resolveGoalStageForBank({ title: 'x', environment: 'מפגש בגן' }, 'school')).toBe('kindergarten');
    expect(resolveGoalStageForBank({ title: 'x', environment: 'חצר' }, 'kindergarten')).toBe('kindergarten');
    expect(resolveGoalStageForBank({ title: 'x', environment: 'כתיבה' }, 'kindergarten')).toBe('school');
  });

  it('recordGoalUsageOrAdd tags a new school goal as school with school partners', () => {
    const bank = recordGoalUsageOrAdd(
      { title: 'יכתוב חיבור קצר ומאורגן', environment: 'כתיבה', stage: 'school' },
      [...INITIAL_GOAL_BANK]
    );
    const item = bank.find((b) => b.title === 'יכתוב חיבור קצר ומאורגן');
    expect(item.stages).toEqual(['school']);
    expect(item.defaultPartners).not.toMatch(/גן/);
  });

  it('a bare usage increment never re-tags or moves an existing school goal', () => {
    const schoolItem = INITIAL_GOAL_BANK.find((g) => g.stages.includes('school'));
    const bank = recordGoalUsageOrAdd({ title: schoolItem.title }, [...INITIAL_GOAL_BANK]);
    const item = bank.find((b) => b.title === schoolItem.title);
    expect(item.stages).toEqual(['school']);
    expect(item.environment).toBe(schoolItem.environment);
  });

  it('a new school goal without environment does not land in a kindergarten environment', () => {
    const bank = recordGoalUsageOrAdd({ title: 'מטרה בית ספרית חדשה', stage: 'school' }, []);
    expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(bank[0].environment);
  });

  it('a school student re-using a kindergarten bank goal does not move its environment', () => {
    const kdgItem = INITIAL_GOAL_BANK.find((g) => g.stages.length === 1 && g.stages[0] === 'kindergarten');
    const bank = recordGoalUsageOrAdd(
      { title: kdgItem.title, environment: 'תקשורת ויחסים בינאישיים', stage: 'school' },
      [...INITIAL_GOAL_BANK]
    );
    const item = bank.find((b) => b.title === kdgItem.title);
    expect(item.stages).toEqual(['kindergarten', 'school']);
    expect(item.environment).toBe(kdgItem.environment);
  });
});

describe('stageGuard – AI prompt construction', () => {
  it('filters bank examples to the student stage', () => {
    const schoolItems = filterBankForStage(INITIAL_GOAL_BANK, 'school');
    expect(schoolItems.length).toBeGreaterThan(0);
    schoolItems.forEach((item) => {
      expect(item.stages).toContain('school');
      expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(item.environment);
    });
    const kdgItems = filterBankForStage(INITIAL_GOAL_BANK, 'kindergarten');
    kdgItems.forEach((item) => expect(SCHOOL_ALLOWED_ENVIRONMENTS).not.toContain(item.environment));
  });

  it('excludes polluted custom items (kindergarten-tagged or kindergarten environment) for school', () => {
    const polluted = [
      { title: 'מטרה א', environment: 'מפגש בגן', stages: ['school'], usageCount: 99 },
      { title: 'מטרה ב', environment: 'כתיבה', stages: ['kindergarten'], usageCount: 99 }
    ];
    expect(filterBankForStage(polluted, 'school')).toHaveLength(0);
  });

  it('bank reference never mentions kindergarten environments for a school student and respects size', () => {
    const bigBank = [...INITIAL_GOAL_BANK].sort((a, b) => (a.stages[0] === 'kindergarten' ? -1 : 1));
    const ref = buildBankReferenceForPrompt(bigBank, 'school', 'boy', { maxChars: 1500 });
    expect(ref.length).toBeLessThanOrEqual(1500);
    KINDERGARTEN_ENVIRONMENTS.forEach((env) => expect(ref).not.toContain(`"${env}"`));
    expect(buildBankReferenceForPrompt(bigBank, 'school', 'boy', { maxChars: 0 })).toBe('');
  });

  it('stage rules list every allowed school environment, in Hebrew and English', () => {
    const block = buildStageRulesBlock('school');
    expect(block).toContain('SCHOOL');
    SCHOOL_ALLOWED_ENVIRONMENTS.forEach((env) => expect(block).toContain(env));
    expect(buildStageRulesBlock('kindergarten')).toContain('KINDERGARTEN');
    expect(buildStageRulesBlock(undefined)).toBe('');
  });

  it('student context block carries a stage rule and caps long stage reasons', () => {
    const out = formatPromptWithStudentContext('TASK', {
      stage: 'school',
      stageSource: 'teacher_text',
      stageReason: 'x'.repeat(5000)
    });
    expect(out).toContain('stage_rule: SCHOOL');
    expect(out.length).toBeLessThan(1000);
  });
});

describe('local fallback engine respects the student stage', () => {
  const schoolText =
    'בני תלמיד בכיתה ג. מתקשה בקריאה, הקריאה איטית ויש שגיאות פענוח. מתקשה בכתיבה ובהעתקה מהלוח. מתקשה בהבנת הוראות בשיעור. לפעמים מתפרץ כשהוא מתוסכל.';

  it('school student: no kindergarten environments, titles or partners', () => {
    const res = reverseEngineerRawTextLocally(
      schoolText,
      { name: 'בני רשף', gender: 'boy', stage: 'school', goals: [] },
      INITIAL_GOAL_BANK
    );
    expect(res.goals.length).toBeGreaterThan(0);
    res.goals.forEach((g) => {
      expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(g.environment);
      expect(textHasKindergartenMarker(g.title)).toBe(false);
      expect(textHasKindergartenMarker(g.partners)).toBe(false);
    });
    expect(textHasKindergartenMarker(res.recommendations)).toBe(false);
    expect(textHasKindergartenMarker(res.strengthsExisting)).toBe(false);
    const envs = res.goals.map((g) => g.environment);
    expect(envs).toContain('קריאה והפקת משמעות');
    expect(envs).toContain('כתיבה');
  });

  it('school student with text that matches nothing still gets a school goal', () => {
    const res = reverseEngineerRawTextLocally(
      'תלמיד נחמד. צריך חיזוק.',
      { name: 'בני', gender: 'boy', stage: 'school', goals: [] },
      INITIAL_GOAL_BANK
    );
    expect(res.goals.length).toBeGreaterThan(0);
    res.goals.forEach((g) => expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(g.environment));
  });

  it('kindergarten child: behaviour unchanged (kindergarten environments)', () => {
    const res = reverseEngineerRawTextLocally(
      'ילד נעים. זקוק לחיזוק במשחק משותף במשחקי שולחן וקופסא ובהשתתפות במפגש בגן.',
      { name: 'נועם', gender: 'boy', stage: 'kindergarten', goals: [] },
      INITIAL_GOAL_BANK
    );
    expect(res.goals.length).toBeGreaterThan(0);
    res.goals.forEach((g) => expect(KINDERGARTEN_ENVIRONMENTS).toContain(g.environment));
  });

  it('default facilitating questions use school wording for school students', () => {
    const qs = generateDefaultQuestionsForCustomGoal('מטרה', 'כתיבה', { stage: 'school' });
    qs.forEach((q) => {
      expect(textHasKindergartenMarker(q.q)).toBe(false);
      q.suggestions.forEach((s) => expect(textHasKindergartenMarker(s)).toBe(false));
    });
  });
});
