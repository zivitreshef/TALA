import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Domain and Storage imports
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
  DEMO_STUDENT_DATA,
  getStepById,
  getNextStep,
  getPreviousStep,
  isDemoStudent,
  createFreshDemoStudent
} from '../domain/onboardingJourney';

import {
  normalizeEmailKey,
  getOnboardingStateKey,
  getDemoStudentKey,
  createDefaultOnboardingState,
  getOnboardingState,
  saveOnboardingState,
  pauseOnboarding,
  resumeOnboarding,
  dismissOnboarding,
  resetOnboardingState,
  advanceOnboardingStep,
  goToOnboardingStep,
  setOnboardingDockCollapsed,
  getDemoStudent,
  saveDemoStudent,
  clearDemoStudent,
  __clearInMemoryStoreForTesting
} from '../services/onboardingStorage';

import { saveStudentToCloud, deleteStudentFromCloud } from '../firebaseBackend';
import { normalizeStudentForForm } from '../domain/yearReport';

// UI Component imports
import OnboardingNavigatorModal from '../components/onboarding/OnboardingNavigatorModal';
import OnboardingGuidedWorkspace from '../components/onboarding/OnboardingGuidedWorkspace';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';

describe('Onboarding Journey Engine & Help Modal Re-launch Suite', () => {
  const TEST_EMAIL = 'teacher.sarah@school.edu.il';
  const MOCK_CURRENT_USER = {
    email: TEST_EMAIL,
    name: 'שרה כהן',
    role: 'teacher',
    group: 'מתי״א תל אביב',
    isTrialUser: false
  };

  let mockStorageStore = {};
  let mockLocalStorage;

  beforeEach(() => {
    mockStorageStore = {};
    mockLocalStorage = {
      getItem: vi.fn((key) => (key in mockStorageStore ? mockStorageStore[key] : null)),
      setItem: vi.fn((key, val) => {
        mockStorageStore[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorageStore[key];
      }),
      clear: vi.fn(() => {
        mockStorageStore = {};
      })
    };

    vi.stubGlobal('window', { localStorage: mockLocalStorage });
    vi.stubGlobal('localStorage', mockLocalStorage);
    __clearInMemoryStoreForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mockStorageStore = {};
    __clearInMemoryStoreForTesting();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /* =========================================================================
     1. Domain & 10-Step Journey Definitions
     ========================================================================= */
  describe('1. Domain & 10-Step Journey Definitions', () => {
    it('defines exactly 10 sequential pedagogical stages', () => {
      expect(ONBOARDING_TOTAL_STEPS).toBe(10);
      expect(ONBOARDING_STEPS.length).toBe(10);
    });

    it('every stage contains valid id, titles, pedagogical rationale, and contextual guidance', () => {
      ONBOARDING_STEPS.forEach((step, index) => {
        expect(step.id).toBe(index + 1);
        expect(typeof step.key).toBe('string');
        expect(step.key.length).toBeGreaterThan(0);
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
        expect(typeof step.shortTitle).toBe('string');
        expect(step.shortTitle.length).toBeGreaterThan(0);
        expect(typeof step.pedagogicalRationale).toBe('string');
        expect(step.pedagogicalRationale.length).toBeGreaterThan(20);
        expect(typeof step.contextualGuidance).toBe('string');
        expect(step.isImplemented).toBe(true);
      });
    });

    it('navigates through getStepById, getNextStep, and getPreviousStep correctly', () => {
      const step1 = getStepById(1);
      expect(step1.key).toBe('getting_started');

      const nextFrom1 = getNextStep(1);
      expect(nextFrom1.id).toBe(2);
      expect(nextFrom1.key).toBe('create_student');

      const prevFrom2 = getPreviousStep(2);
      expect(prevFrom2.id).toBe(1);

      // Boundaries
      expect(getPreviousStep(1)).toBeNull();
      expect(getNextStep(10)).toBeNull();
    });

    it('step 10 covers teacher personal area and Matya collaboration', () => {
      const step10 = getStepById(10);
      expect(step10.key).toBe('matya_settings');
      expect(step10.title).toContain('מתי״א');
      expect(step10.pedagogicalRationale).toContain('מתי״א');
      expect(step10.contextualGuidance).toContain('שיתוף צוות');
    });
  });

  /* =========================================================================
     2. Realistic Israeli Demo Dataset ("יונתן לוי")
     ========================================================================= */
  describe('2. Realistic Israeli Demo Dataset ("יונתן לוי")', () => {
    it('defines a complete, authentic special education student profile', () => {
      expect(DEMO_STUDENT_DATA.id).toBe('demo_yonatan_levi');
      expect(DEMO_STUDENT_DATA.isDemo).toBe(true);
      expect(DEMO_STUDENT_DATA.name).toContain('יונתן לוי');
      expect(DEMO_STUDENT_DATA.gradeClass).toBe('כיתה ב׳2');
      expect(DEMO_STUDENT_DATA.educationalFramework).toContain('ארזים');
      expect(DEMO_STUDENT_DATA.matyaAffiliation).toContain('תל אביב');
      expect(DEMO_STUDENT_DATA.teacherFreeText).toContain('ADHD');
      expect(DEMO_STUDENT_DATA.strengthsExisting).toContain('לגו');
    });

    it('includes 3 ecological goals with criteria, timeline, partners, and tools', () => {
      expect(DEMO_STUDENT_DATA.goals.length).toBe(3);
      const [g1, g2, g3] = DEMO_STUDENT_DATA.goals;

      expect(g1.domain).toContain('התנהגותי');
      expect(g1.mainGoal).toContain('מליאת הבוקר');
      expect(g1.performanceStandard).toBeDefined();
      expect(g1.environment).toBeDefined();
      expect(g1.toolsAndMethods).toContain('כרית');

      expect(g2.domain).toContain('שפתי');
      expect(g2.title).toContain('קריא');
      expect(g2.mainGoal).toContain('יקרא');

      expect(g3.domain).toContain('חברתי');
      expect(g3.mainGoal).toContain('חצר');
    });

    it('includes 4 dated observations covering all 4 support levels', () => {
      expect(DEMO_STUDENT_DATA.observations.length).toBe(4);
      const levels = DEMO_STUDENT_DATA.observations.map((o) => o.supportLevel);

      expect(levels).toContain('independent');
      expect(levels).toContain('verbal_prompt');
      expect(levels).toContain('partial_mediation');
    });

    it('includes authentic parent voice responses received via WhatsApp', () => {
      const pv = DEMO_STUDENT_DATA.parentVoice;
      expect(pv.isSubmitted).toBe(true);
      expect(pv.parentNames).toContain('ענת ויואב');
      expect(pv.strengths).toContain('לגו');
      expect(pv.difficulties).toContain('רעש');
      expect(pv.priorities).toContain('ביטחון בקריאה');
    });

    it('includes completed mid-year evaluation and 15-section status report', () => {
      expect(DEMO_STUDENT_DATA.midYearEvaluation.goalEvals.length).toBe(3);
      expect(DEMO_STUDENT_DATA.statusReport.sectionsCount).toBe(15);
      expect(DEMO_STUDENT_DATA.statusReport.keySectionsSummary.frameworkRationale).toBeDefined();
    });

    it('includes Matya OT sharing and team messages', () => {
      expect(DEMO_STUDENT_DATA.sharedWith).toContain('yael.ot@matya-tlv.org.il');
      expect(DEMO_STUDENT_DATA.teamMessages.length).toBeGreaterThanOrEqual(2);
      expect(DEMO_STUDENT_DATA.teamMessages[1].senderName).toContain('יעל רז');
    });

    it('identifies demo students correctly via isDemoStudent', () => {
      expect(isDemoStudent(DEMO_STUDENT_DATA)).toBe(true);
      expect(isDemoStudent({ id: 'demo_yonatan_levi' })).toBe(true);
      expect(isDemoStudent({ isDemo: true })).toBe(true);
      expect(isDemoStudent({ id: 'st_real_123', name: 'תמר כהן' })).toBe(false);
      expect(isDemoStudent(null)).toBe(false);
    });

    it('createFreshDemoStudent returns an independent copy with updated timestamp', () => {
      const clone1 = createFreshDemoStudent();
      const clone2 = createFreshDemoStudent();
      expect(clone1.id).toBe('demo_yonatan_levi');
      expect(clone1).not.toBe(clone2);
      clone1.name = 'Changed';
      expect(clone2.name).not.toBe('Changed');
    });
  });

  /* =========================================================================
     3. State Machine & Step Transitions
     ========================================================================= */
  describe('3. State Machine & Step Transitions', () => {
    it('initializes default state with step 1 and null mode', () => {
      const state = getOnboardingState(TEST_EMAIL);
      expect(state.version).toBe(1);
      expect(state.currentStep).toBe(1);
      expect(state.mode).toBeNull();
      expect(state.completedSteps).toEqual([]);
      expect(state.isPaused).toBe(false);
      expect(state.isCompleted).toBe(false);
    });

    it('advances through steps 1 to 10 and accumulates completedSteps', () => {
      let state = getOnboardingState(TEST_EMAIL);

      // Advance from step 1 to 2
      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.currentStep).toBe(2);
      expect(state.completedSteps).toContain(1);

      // Advance from step 2 to 3
      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.currentStep).toBe(3);
      expect(state.completedSteps).toEqual([1, 2]);

      // Fast forward to step 10
      state = goToOnboardingStep(TEST_EMAIL, 10);
      expect(state.currentStep).toBe(10);

      // Completing step 10 marks journey as completed
      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.isCompleted).toBe(true);
      expect(state.completedAt).toBeDefined();
      expect(state.completedSteps).toContain(10);
    });

    it('navigates backwards without losing completed steps', () => {
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 5,
        completedSteps: [1, 2, 3, 4]
      });

      const state = goToOnboardingStep(TEST_EMAIL, 2);
      expect(state.currentStep).toBe(2);
      expect(state.completedSteps).toEqual([1, 2, 3, 4]);
    });

    it('clamps currentStep between 1 and 10', () => {
      const stateHigh = goToOnboardingStep(TEST_EMAIL, 999);
      expect(stateHigh.currentStep).toBe(10);

      const stateLow = goToOnboardingStep(TEST_EMAIL, -5);
      expect(stateLow.currentStep).toBe(1);
    });

    it('resets onboarding state cleanly with resetOnboardingState', () => {
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 8,
        completedSteps: [1, 2, 3, 4, 5, 6, 7],
        mode: 'demo',
        isCompleted: true
      });

      const resetState = resetOnboardingState(TEST_EMAIL, 'real');
      expect(resetState.currentStep).toBe(1);
      expect(resetState.completedSteps).toEqual([]);
      expect(resetState.isCompleted).toBe(false);
      expect(resetState.mode).toBe('real');
    });
  });

  /* =========================================================================
     4. Demo Sandbox Cloud Isolation (Zero-Trust Security)
     ========================================================================= */
  describe('4. Demo Sandbox Cloud Isolation (Zero-Trust Security)', () => {
    it('strictly blocks saveStudentToCloud for demo student records', async () => {
      const result = await saveStudentToCloud(DEMO_STUDENT_DATA);
      expect(result).toBe(false);
    });

    it('strictly blocks saveStudentToCloud for any student marked with isDemo: true', async () => {
      const customDemo = { id: 'st_test_demo', isDemo: true, name: 'תלמיד ניסיון' };
      const result = await saveStudentToCloud(customDemo);
      expect(result).toBe(false);
    });

    it('strictly blocks deleteStudentFromCloud for demo_yonatan_levi', async () => {
      const result = await deleteStudentFromCloud('demo_yonatan_levi');
      expect(result).toBe(false);
    });

    it('saves demo student updates only to local sandbox storage and never pollutes real students', () => {
      const demoKey = getDemoStudentKey(TEST_EMAIL);
      expect(localStorage.getItem(demoKey)).toBeNull();

      const updatedDemo = {
        ...DEMO_STUDENT_DATA,
        name: 'יונתן לוי (מעודכן בסנדבוקס)'
      };

      const saved = saveDemoStudent(TEST_EMAIL, updatedDemo);
      expect(saved.isDemo).toBe(true);
      expect(saved.name).toContain('מעודכן בסנדבוקס');

      // Local sandbox key was populated
      const localStored = JSON.parse(localStorage.getItem(demoKey));
      expect(localStored.name).toContain('מעודכן בסנדבוקס');

      // Real student key was NOT touched
      expect(localStorage.getItem('tala_students_plans_v3')).toBeNull();
    });

    it('clears demo student storage cleanly with clearDemoStudent', () => {
      saveDemoStudent(TEST_EMAIL, DEMO_STUDENT_DATA);
      const demoKey = getDemoStudentKey(TEST_EMAIL);
      expect(localStorage.getItem(demoKey)).not.toBeNull();

      clearDemoStudent(TEST_EMAIL);
      expect(localStorage.getItem(demoKey)).toBeNull();
    });
  });

  /* =========================================================================
     5. Persistence, Pause, Resume & Error Recovery
     ========================================================================= */
  describe('5. Persistence, Pause, Resume & Error Recovery', () => {
    it('persists state under normalized user email key', () => {
      saveOnboardingState('Teacher.Sarah+School@Domain.COM', { currentStep: 4 });
      const expectedKey = getOnboardingStateKey('Teacher.Sarah+School@Domain.COM');
      expect(expectedKey).toBe('tala_onboarding_state_v1_teacher.sarah_school_domain.com');
      const raw = localStorage.getItem(expectedKey);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw);
      expect(parsed.currentStep).toBe(4);
    });

    it('pauses and resumes onboarding state cleanly', () => {
      saveOnboardingState(TEST_EMAIL, { currentStep: 4 });

      const paused = pauseOnboarding(TEST_EMAIL);
      expect(paused.isPaused).toBe(true);
      expect(paused.currentStep).toBe(4);

      const resumed = resumeOnboarding(TEST_EMAIL);
      expect(resumed.isPaused).toBe(false);
      expect(resumed.currentStep).toBe(4);
    });

    it('recovers gracefully from corrupted JSON in localStorage', () => {
      const stateKey = getOnboardingStateKey(TEST_EMAIL);
      localStorage.setItem(stateKey, '{{corrupted_json:::');

      const recovered = getOnboardingState(TEST_EMAIL);
      expect(recovered).toBeDefined();
      expect(recovered.version).toBe(1);
      expect(recovered.currentStep).toBe(1);
    });

    it('falls back to in-memory store if localStorage throws QuotaExceededError', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const saved = saveOnboardingState(TEST_EMAIL, { currentStep: 7 });
      expect(saved.currentStep).toBe(7);

      // Subsequent read gets from in-memory fallback
      const reRead = getOnboardingState(TEST_EMAIL);
      expect(reRead.currentStep).toBe(7);
    });
  });

  /* =========================================================================
     6. UI Components & Help Modal Re-launch Integration
     ========================================================================= */
  describe('6. UI Components & Help Modal Re-launch Integration', () => {
    it('OnboardingNavigatorModal renders mode choices, 10 steps, and RTL alignment', () => {
      const state = {
        version: 1,
        currentStep: 3,
        completedSteps: [1, 2],
        mode: 'demo',
        isPaused: false
      };

      const html = renderToStaticMarkup(
        React.createElement(OnboardingNavigatorModal, {
          isOpen: true,
          onClose: vi.fn(),
          onboardingState: state,
          onSelectMode: vi.fn(),
          onSelectStep: vi.fn(),
          onRestartJourney: vi.fn(),
          onResumeJourney: vi.fn()
        })
      );

      // Verify modal header & RTL
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('מסע ההדרכה הפדגוגי ב-TALA');

      // Verify mode selection options
      expect(html).toContain('התנסות עם תלמיד לדוגמה');
      expect(html).toContain('יצירת תלמיד/ה ראשונ/ה מהשטח');

      // Verify all 10 steps rendered
      ONBOARDING_STEPS.forEach((step) => {
        expect(html).toContain(step.title);
      });

      // Verify step 3 is marked active and steps 1 & 2 marked completed
      expect(html).toContain('שלב פעיל');
      expect(html).toContain('הושלם ✓');
    });

    it('OnboardingNavigatorModal returns null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        React.createElement(OnboardingNavigatorModal, {
          isOpen: false,
          onClose: vi.fn(),
          onboardingState: createDefaultOnboardingState(TEST_EMAIL)
        })
      );
      expect(html).toBe('');
    });

    it('OnboardingGuidedWorkspace renders 10-step stepper, pedagogical rationale, and 32x32px buttons', () => {
      const state = {
        version: 1,
        currentStep: 4,
        completedSteps: [1, 2, 3],
        mode: 'demo',
        isPaused: false,
        isDockCollapsed: false
      };

      const html = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: state,
          onNextStep: vi.fn(),
          onPreviousStep: vi.fn(),
          onGoToStep: vi.fn(),
          onPauseJourney: vi.fn(),
          onResumeJourney: vi.fn(),
          onOpenNavigator: vi.fn(),
          onExecuteAction: vi.fn(),
          onToggleCollapse: vi.fn()
        })
      );

      expect(html).toContain('dir="rtl"');
      expect(html).toContain('הגדרת מטרות ויעדים אקולוגיים');
      expect(html).toContain('למה זה חשוב פדגוגית?');
      expect(html).toContain('ששת עמודי התווך');
      expect(html).toContain('דוגמה מהשטח:');
      expect(html).toContain('32px'); // Unified 32x32px button size standard
    });

    it('OnboardingGuidedWorkspace renders paused resume banner when isPaused is true', () => {
      const state = {
        version: 1,
        currentStep: 5,
        completedSteps: [1, 2, 3, 4],
        isPaused: true,
        mode: 'demo'
      };

      const html = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: state,
          onResumeJourney: vi.fn(),
          onOpenNavigator: vi.fn()
        })
      );

      expect(html).toContain('הסיור המודרך מושהה');
      expect(html).toContain('המשך סיור');
      expect(html).toContain('מפת המסע 🗺️');
    });

    it('OnboardingGuidedWorkspace renders collapsed minimal strip when isDockCollapsed is true', () => {
      const state = {
        version: 1,
        currentStep: 2,
        completedSteps: [1],
        isPaused: false,
        isDockCollapsed: true,
        mode: 'demo'
      };

      const html = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: state,
          onToggleCollapse: vi.fn(),
          onNextStep: vi.fn()
        })
      );

      expect(html).toContain('שלב 2 מתוך 10');
      expect(html).toContain('הבא 👈');
      expect(html).toContain('תלמיד דמו');
    });

    it('TrialUpgradeModal renders Onboarding button in top quick actions panel and guide tab', () => {
      const onStartOnboarding = vi.fn();
      const onRestartOnboarding = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: MOCK_CURRENT_USER,
          onClose: vi.fn(),
          onStartOnboarding,
          onRestartOnboarding,
          defaultTab: 'guide'
        })
      );

      // Pinned top action button
      expect(html).toContain('data-testid="btn-relaunch-onboarding"');
      expect(html).toContain('סיור מודרך במערכת (Onboarding)');

      // Tab 1 guide action card
      expect(html).toContain('data-testid="btn-guide-tab-restart-onboarding"');
      expect(html).toContain('data-testid="btn-guide-tab-resume-onboarding"');
      expect(html).toContain('רוצה ליווי מעשי צעד אחר צעד בכל 10 שלבי המערכת?');
    });
  });

  /* =========================================================================
     7. Real-World Application Scenarios (Tier 4)
     ========================================================================= */
  describe('7. Real-World Application Scenarios (Tier 4)', () => {
    it('Scenario 1: Teacher completes full 10-step demo journey from start to finish', () => {
      let state = resetOnboardingState(TEST_EMAIL, 'demo');
      expect(state.currentStep).toBe(1);
      expect(state.mode).toBe('demo');

      // Verify demo student exists and is isolated
      const demo = getDemoStudent(TEST_EMAIL);
      expect(demo.id).toBe('demo_yonatan_levi');

      // Teacher advances through all 10 steps
      for (let s = 1; s <= 9; s++) {
        state = advanceOnboardingStep(TEST_EMAIL);
        expect(state.currentStep).toBe(s + 1);
        expect(state.completedSteps).toContain(s);
      }

      // Step 10 completion
      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.isCompleted).toBe(true);
      expect(state.completedSteps.length).toBe(10);
    });

    it('Scenario 2: Teacher interruption at step 4, pause, page reload, and resume', () => {
      // Step 4 reached
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 4,
        completedSteps: [1, 2, 3],
        mode: 'real'
      });

      // Interrupted: paused
      let state = pauseOnboarding(TEST_EMAIL);
      expect(state.isPaused).toBe(true);

      // Simulated next-day reload: read from storage
      const reloadedState = getOnboardingState(TEST_EMAIL);
      expect(reloadedState.currentStep).toBe(4);
      expect(reloadedState.completedSteps).toEqual([1, 2, 3]);
      expect(reloadedState.isPaused).toBe(true);

      // Teacher clicks resume
      const resumedState = resumeOnboarding(TEST_EMAIL);
      expect(resumedState.isPaused).toBe(false);
      expect(resumedState.currentStep).toBe(4);
    });

    it('Scenario 3: Teacher switches from Demo to Real Student mode mid-flow', () => {
      // Started in demo mode
      resetOnboardingState(TEST_EMAIL, 'demo');
      saveDemoStudent(TEST_EMAIL, DEMO_STUDENT_DATA);

      expect(getOnboardingState(TEST_EMAIL).mode).toBe('demo');

      // Switches to real mode
      const updated = saveOnboardingState(TEST_EMAIL, { mode: 'real' });
      clearDemoStudent(TEST_EMAIL);

      expect(updated.mode).toBe('real');
      expect(localStorage.getItem(getDemoStudentKey(TEST_EMAIL))).toBeNull();
    });

    it('Scenario 4: Existing teacher re-launches onboarding journey from Help modal', () => {
      // Teacher already finished onboarding a month ago
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 10,
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        isCompleted: true
      });

      // Re-launches fresh journey from Help modal
      const freshState = resetOnboardingState(TEST_EMAIL, 'demo');
      expect(freshState.currentStep).toBe(1);
      expect(freshState.completedSteps).toEqual([]);
      expect(freshState.isCompleted).toBe(false);
      expect(freshState.mode).toBe('demo');
    });

    it('Scenario 5: Storage Quota Error / Incognito Mode handles state in memory without crashing', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const state1 = saveOnboardingState(TEST_EMAIL, { currentStep: 2, mode: 'demo' });
      expect(state1.currentStep).toBe(2);

      const state2 = advanceOnboardingStep(TEST_EMAIL);
      expect(state2.currentStep).toBe(3);

      const state3 = pauseOnboarding(TEST_EMAIL);
      expect(state3.isPaused).toBe(true);

      const state4 = resumeOnboarding(TEST_EMAIL);
      expect(state4.isPaused).toBe(false);
    });

    it('Scenario 6: Demo student normalizes cleanly into EcologicalWorkPlanForm with full profile, goals, observations, and reports', () => {
      const normalized = normalizeStudentForForm(DEMO_STUDENT_DATA);
      expect(normalized.name).toContain('יונתן לוי');
      expect(normalized.studentGeneralBackground).toContain('כיתה ב׳2');
      expect(normalized.studentSupportReceived).toContain('מתי״א');
      expect(normalized.talaFocusDomains.length).toBeGreaterThanOrEqual(3);
      expect(normalized.goals.length).toBe(3);
      expect(normalized.goals[0].objectives).toContain('כרית תחושתית');
      expect(normalized.goals[0].observations.length).toBeGreaterThanOrEqual(2);
      expect(normalized.goals[0].midYearEvaluation).toContain('75%');
      expect(normalized.evalReportSummary).toContain('יונתן');
      expect(normalized.statusReportSections.length).toBeGreaterThanOrEqual(6);
    });

    it('Scenario 7: Dismissing (closing) the lower panel hides it completely and re-opening from Help restores it', () => {
      const dismissed = dismissOnboarding(TEST_EMAIL);
      expect(dismissed.isDismissed).toBe(true);

      const htmlWhenDismissed = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: dismissed,
          onCloseJourney: vi.fn()
        })
      );
      expect(htmlWhenDismissed).toBe('');

      // Re-launching or resuming clears isDismissed
      const resumed = resumeOnboarding(TEST_EMAIL);
      expect(resumed.isDismissed).toBe(false);

      const htmlWhenResumed = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: resumed,
          onCloseJourney: vi.fn()
        })
      );
      expect(htmlWhenResumed).toContain('data-testid="onboarding-where-to-look-banner"');
      expect(htmlWhenResumed).toContain('data-testid="btn-close-onboarding-dock"');
      expect(htmlWhenResumed).toContain('סגירת הדרכה');
    });

    it('Scenario 8: Every step defines whereToLookHint and arrowIcon for animated visual guidance', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(typeof step.whereToLookHint).toBe('string');
        expect(step.whereToLookHint.length).toBeGreaterThan(10);
        expect(typeof step.arrowIcon).toBe('string');
      });
    });
  });
});
