import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFreshDemoStudent,
  ONBOARDING_STEPS,
  getStepById
} from '../domain/onboardingJourney';
import {
  getDemoStudent,
  saveDemoStudent,
  resetOnboardingState,
  getOnboardingState,
  saveOnboardingState
} from '../services/onboardingStorage';

describe('Onboarding User Journey Experience & Minimal Demo Student Fix', () => {
  let mockStore = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key) => (key in mockStore ? mockStore[key] : null)),
      setItem: vi.fn((key, val) => {
        mockStore[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      })
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('1. Minimal Demo Student Specification', () => {
    it('initializes demo student with minimal personal & educational details only', () => {
      const demo = createFreshDemoStudent();

      // Basic identity must be present
      expect(demo.id).toBe('demo_yonatan_levi');
      expect(demo.name).toBe('יונתן לוי (תלמיד לדוגמה)');
      expect(demo.gender).toBe('boy');
      expect(demo.birthDate).toBe('15/04/2018');
      expect(demo.idNumber).toBe('039874512');
      expect(demo.educationalFramework).toContain('בית ספר');
      expect(demo.gradeClass).toBe('כיתה ב׳2');

      // Raw example text MUST be present so the teacher has data to process
      expect(demo.teacherFreeText).toBeDefined();
      expect(demo.teacherFreeText.length).toBeGreaterThan(100);
      expect(demo.teacherFreeText).toContain('יונתן לומד בכיתה רגילה');

      // Crucial requirement: ZERO pre-processed AI flags or pre-filled AI outputs
      expect(demo.freeTextAnalyzed).toBe(false);
      expect(demo.isReverseEngineered).toBe(false);
      expect(demo.goals).toEqual([]);
      expect(demo.talaProfileRows).toEqual([]);
      expect(demo.talaFocusDomains).toEqual([]);
      expect(demo.observations).toEqual([]);
      expect(demo.studentGeneralBackground).toBe('');
      expect(demo.studentSupportReceived).toBe('');
      expect(demo.studentMainGoal).toBe('');
      expect(demo.recommendations).toBe('');
      expect(demo.evalReportFreeText).toBe('');
      expect(demo.summaryReports).toEqual([]);
    });

    it('initializes kindergarten demo student with minimal details and zero pre-filled AI outputs', () => {
      const demoKg = createFreshDemoStudent({ stage: 'kindergarten' });

      expect(demoKg.name).toBe('נועם כהן (ילד גן לדוגמה)');
      expect(demoKg.stage).toBe('kindergarten');
      expect(demoKg.educationalFramework).toBe('גן אלון');
      expect(demoKg.teacherFreeText).toContain('נועם ילד מתוק');

      expect(demoKg.freeTextAnalyzed).toBe(false);
      expect(demoKg.isReverseEngineered).toBe(false);
      expect(demoKg.goals).toEqual([]);
      expect(demoKg.talaProfileRows).toEqual([]);
      expect(demoKg.observations).toEqual([]);
    });
  });

  describe('2. Step 3 AI Processing Definition', () => {
    it('defines Step 3 focusing on live AI generation in Section 2', () => {
      const step3 = getStepById(3);
      expect(step3).toBeDefined();
      expect(step3.key).toBe('student_profile');
      expect(step3.title).toContain('עיבוד AI');
      expect(step3.targetView).toBe('student_form');
      expect(step3.targetSection).toBe('section_2_profile');
      expect(step3.arrowIcon).toBe('👈');
      expect(step3.whereToLookHint).toContain('עיבוד המידע');
      expect(step3.actionLabel).toContain('עיבוד מידע ב-AI');
    });
  });

  describe('3. Demo Student Storage & Fresh State Transitions', () => {
    it('forceFresh option replaces any previously saved demo data with a clean minimal record', () => {
      const email = 'teacher.forcefresh@school.gov.il';
      // Simulate previously analyzed demo student
      const staleDemo = createFreshDemoStudent();
      staleDemo.freeTextAnalyzed = true;
      staleDemo.goals = [{ title: 'מטרה שנוצרה קודם' }];
      saveDemoStudent(email, staleDemo);

      // Verify stale data is saved
      const loadedStale = getDemoStudent(email);
      expect(loadedStale.freeTextAnalyzed).toBe(true);
      expect(loadedStale.goals.length).toBe(1);

      // Request fresh demo student with forceFresh: true
      const fresh = getDemoStudent(email, { forceFresh: true });
      expect(fresh.freeTextAnalyzed).toBe(false);
      expect(fresh.goals).toEqual([]);
    });

    it('resetOnboardingState clears stored demo student so restarting tour gives a fresh student', () => {
      const email = 'teacher.reset@school.gov.il';
      const modifiedDemo = createFreshDemoStudent();
      modifiedDemo.freeTextAnalyzed = true;
      modifiedDemo.studentGeneralBackground = 'רקע שנשמר בעבר';
      saveDemoStudent(email, modifiedDemo);

      resetOnboardingState(email, 'demo');

      const reloaded = getDemoStudent(email);
      expect(reloaded.freeTextAnalyzed).toBe(false);
      expect(reloaded.studentGeneralBackground).toBe('');
    });
  });

  describe('4. Mode Selection to Step 2 Transition', () => {
    it('progresses currentStep to 2 and marks step 1 completed when entering demo mode', () => {
      const email = 'teacher.mode.demo@school.gov.il';
      const state = saveOnboardingState(email, {
        mode: 'demo',
        currentStep: 2,
        completedSteps: [1],
        activeStudentId: 'demo_yonatan_levi'
      });

      expect(state.currentStep).toBe(2);
      expect(state.completedSteps).toContain(1);
      expect(state.activeStudentId).toBe('demo_yonatan_levi');
      expect(state.mode).toBe('demo');
    });

    it('progresses currentStep to 2 and marks step 1 completed when entering real student mode', () => {
      const email = 'teacher.mode.real@school.gov.il';
      const state = saveOnboardingState(email, {
        mode: 'real',
        currentStep: 2,
        completedSteps: [1],
        activeStudentId: 'st_real_9999'
      });

      expect(state.currentStep).toBe(2);
      expect(state.completedSteps).toContain(1);
      expect(state.activeStudentId).toBe('st_real_9999');
      expect(state.mode).toBe('real');
    });
  });

  describe('5. Complete 10-Step Journey Integrity', () => {
    it('maintains exactly 10 sequential pedagogical steps without gaps', () => {
      expect(ONBOARDING_STEPS.length).toBe(10);
      ONBOARDING_STEPS.forEach((step, idx) => {
        expect(step.id).toBe(idx + 1);
        expect(typeof step.title).toBe('string');
        expect(typeof step.whereToLookHint).toBe('string');
        expect(typeof step.targetView).toBe('string');
      });
    });
  });
});
