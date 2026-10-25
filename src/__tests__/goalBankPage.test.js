import { describe, it, expect, vi } from 'vitest';
import {
  isGoalRelevantForStage,
  getEffectiveStudentStage
} from '../studentStage';
import {
  canonicalizeEnvironment,
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS
} from '../goalBankData';
import { buildAdminBankGoalPayload } from '../domain/goalBankAdmin';
import { adaptTextToGender } from '../domain/goalSizingAndMerge';

describe('GoalBankPage Full-Page Workspace & Navigation Routing', () => {
  it('manages top navigation segment active state consistently across all 3 main pages', () => {
    const getActiveNavTab = ({ selectedStudentId, showDailyTracker, showGoalBankOverview }) => {
      if (showGoalBankOverview && selectedStudentId === null) return 'goalBank';
      if (showDailyTracker && selectedStudentId === null && !showGoalBankOverview) return 'dailyTracker';
      if (selectedStudentId === null && !showDailyTracker && !showGoalBankOverview) return 'home';
      return 'studentPlan';
    };

    // 1. Home
    expect(
      getActiveNavTab({ selectedStudentId: null, showDailyTracker: false, showGoalBankOverview: false })
    ).toBe('home');

    // 2. Daily Tracker
    expect(
      getActiveNavTab({ selectedStudentId: null, showDailyTracker: true, showGoalBankOverview: false })
    ).toBe('dailyTracker');

    // 3. Goal Bank Full Page
    expect(
      getActiveNavTab({ selectedStudentId: null, showDailyTracker: false, showGoalBankOverview: true })
    ).toBe('goalBank');

    // 4. Student Plan
    expect(
      getActiveNavTab({ selectedStudentId: 'st_1', showDailyTracker: false, showGoalBankOverview: false })
    ).toBe('studentPlan');
  });

  it('correctly transitions between workspaces when switching tabs', () => {
    let state = {
      selectedStudentId: 'st_123',
      showDailyTracker: false,
      showGoalBankOverview: false,
      targetBankStudentId: ''
    };

    const navigateToGoalBank = (userStudents) => {
      state = {
        targetBankStudentId: state.selectedStudentId || userStudents[0]?.id || '',
        selectedStudentId: null,
        showDailyTracker: false,
        showGoalBankOverview: true
      };
    };

    const navigateToHome = () => {
      state = {
        ...state,
        selectedStudentId: null,
        showDailyTracker: false,
        showGoalBankOverview: false
      };
    };

    const navigateToDailyTracker = () => {
      state = {
        ...state,
        selectedStudentId: null,
        showDailyTracker: true,
        showGoalBankOverview: false
      };
    };

    // Transition from student plan to Goal Bank page
    navigateToGoalBank([{ id: 'st_123', name: 'אורי' }]);
    expect(state.showGoalBankOverview).toBe(true);
    expect(state.showDailyTracker).toBe(false);
    expect(state.selectedStudentId).toBeNull();
    expect(state.targetBankStudentId).toBe('st_123');

    // Transition to Home
    navigateToHome();
    expect(state.showGoalBankOverview).toBe(false);
    expect(state.selectedStudentId).toBeNull();

    // Transition to Daily Tracker
    navigateToDailyTracker();
    expect(state.showDailyTracker).toBe(true);
    expect(state.showGoalBankOverview).toBe(false);
  });

  it('filters goals by stage (kindergarten, school, all)', () => {
    const goals = [
      { id: '1', title: 'משחק בחצר', stages: ['kindergarten'], environment: 'חצר' },
      { id: '2', title: 'הבנת הנקרא', stages: ['school'], environment: 'קריאה והפקת משמעות' },
      { id: '3', title: 'מיומנויות תקשורת', stages: ['kindergarten', 'school'], environment: 'מפגש בגן' }
    ];

    const filterGoalsByStage = (list, stage) => {
      return list.filter((g) => isGoalRelevantForStage(g, stage));
    };

    const kdgGoals = filterGoalsByStage(goals, 'kindergarten');
    expect(kdgGoals.map((g) => g.id)).toEqual(['1', '3']);

    const schoolGoals = filterGoalsByStage(goals, 'school');
    expect(schoolGoals.map((g) => g.id)).toEqual(['2', '3']);

    const allGoals = filterGoalsByStage(goals, 'all');
    expect(allGoals.map((g) => g.id)).toEqual(['1', '2', '3']);
  });

  it('searches goals flexibly across title, environment, and objectives', () => {
    const goals = [
      {
        id: '1',
        title: 'ישתתף במשחק חברתי סוציודרמטי',
        environment: 'משחק במרחב הגן',
        suggestedObjectives: ['יציע רעיונות למשחק', 'ימתין לתורו']
      },
      {
        id: '2',
        title: 'כתיבת טקסט טיעוני',
        environment: 'כתיבה',
        suggestedObjectives: ['ישתמש במילות קישור']
      }
    ];

    const searchGoals = (list, query) => {
      const q = query.trim().toLowerCase();
      if (!q) return list;
      return list.filter((g) => {
        const titleMatch = (g.title || '').toLowerCase().includes(q);
        const envMatch = (g.environment || '').toLowerCase().includes(q);
        const objMatch = (g.suggestedObjectives || []).some((o) =>
          o.toLowerCase().includes(q)
        );
        return titleMatch || envMatch || objMatch;
      });
    };

    expect(searchGoals(goals, 'סוציודרמטי')).toHaveLength(1);
    expect(searchGoals(goals, 'כתיבה')).toHaveLength(1);
    expect(searchGoals(goals, 'ימתין לתורו')).toHaveLength(1);
    expect(searchGoals(goals, 'לא קיים')).toHaveLength(0);
  });

  it('detects if goal already exists in target student considering gender inflection', () => {
    const student = {
      id: 'st_girl',
      name: 'מאיה לוי',
      gender: 'girl',
      goals: [
        { id: 'g_1', title: 'תשתתף במשחק חברתי בחצר' }
      ]
    };

    const bankGoal = {
      id: 'bg_1',
      title: 'ישתתף במשחק חברתי בחצר'
    };

    const targetGender = student.gender || 'boy';
    const adaptedTitle = adaptTextToGender(bankGoal.title, targetGender);

    const isAlreadyInPlan = (student.goals || []).some(
      (g) => (g.title || '').trim() === adaptedTitle.trim() || (g.title || '').trim() === bankGoal.title.trim()
    );

    expect(adaptedTitle).toBe('תשתתף במשחק חברתי בחצר');
    expect(isAlreadyInPlan).toBe(true);
  });

  it('builds valid payload for adding or updating goal in bank', () => {
    const editingGoal = {
      mode: 'add',
      title: '  ישתף פעולה בפעילות שולחן  ',
      stages: ['kindergarten'],
      environment: KINDERGARTEN_ENVIRONMENTS[0],
      usageCount: 0,
      defaultActivity: 'פעילות יצירה משותפת',
      suggestedObjectivesText: 'יקשיב להוראות\nישתף ציוד',
      defaultOpportunities: 'בזמן מוקדי פעילות',
      defaultPartners: 'גננת וסייעת',
      defaultDuration: 'חצי שנה',
      defaultEvaluation: 'על פי תצפיות שבועיות'
    };

    const payload = buildAdminBankGoalPayload(editingGoal);

    expect(payload.title).toBe('ישתף פעולה בפעילות שולחן');
    expect(payload.stages).toEqual(['kindergarten']);
    expect(payload.environment).toBe(KINDERGARTEN_ENVIRONMENTS[0]);
    expect(payload.defaultActivity).toBe('פעילות יצירה משותפת');
    expect(payload.suggestedObjectives).toBe('יקשיב להוראות\nישתף ציוד');
  });
});
