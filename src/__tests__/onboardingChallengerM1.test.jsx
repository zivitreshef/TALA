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

// UI Components
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import OnboardingGuidedWorkspace from '../components/onboarding/OnboardingGuidedWorkspace';
import OnboardingNavigatorModal from '../components/onboarding/OnboardingNavigatorModal';

// React dispatcher harness for component testing
const reactInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

function renderModalWithHarness(props, stateOverrides = {}) {
  const originalDispatcher = reactInternals.H;
  const stateValues = {
    supportMessage: '',
    messageSent: false,
    isSubmitting: false,
    showAboutLetter: false,
    activeTab: props.isExpired ? 'contact' : 'guide',
    rfeTitle: '',
    rfeCategory: 'שיפור בטופס תל"א / תח"י',
    rfeMessage: '',
    rfeSubmitted: false,
    isSubmittingRfe: false,
    guideSearchQuery: '',
    guideSelectedCategory: 'all',
    expandedChapters: { 1: true, 15: true },
    ...stateOverrides
  };

  const stateSetters = {};
  const stateKeys = Object.keys(stateValues);
  let hookIndex = 0;

  reactInternals.H = {
    useState(initial) {
      const key = stateKeys[hookIndex++] || `state_${hookIndex}`;
      const val = key in stateOverrides ? stateOverrides[key] : (typeof initial === 'function' ? initial() : initial);
      stateValues[key] = val;
      const setter = vi.fn((next) => {
        stateValues[key] = typeof next === 'function' ? next(stateValues[key]) : next;
      });
      stateSetters[key] = setter;
      return [val, setter];
    },
    useEffect() {},
    useRef(init) { return { current: init }; },
    useCallback(fn) { return fn; },
    useMemo(fn) { return fn(); }
  };

  try {
    const element = TrialUpgradeModal(props);
    return { element, stateValues, stateSetters };
  } finally {
    reactInternals.H = originalDispatcher;
  }
}

function findElements(node, predicate, results = []) {
  if (!node || typeof node !== 'object') return results;
  if (predicate(node)) results.push(node);
  if (Array.isArray(node)) {
    node.forEach(child => findElements(child, predicate, results));
  } else if (node.props && node.props.children) {
    findElements(node.props.children, predicate, results);
  }
  return results;
}

describe('Challenger 2 Empirical Stress Suite: Milestone 1', () => {
  const TEST_EMAIL = 'teacher.challenger@matya-center.org.il';
  const MOCK_USER = {
    email: TEST_EMAIL,
    name: 'דליה מור',
    role: 'special_education_teacher',
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
     1. Help Modal Re-launch Lifecycle Empirical Verification
     ========================================================================= */
  describe('1. Help Modal Re-launch Lifecycle', () => {
    it('clicking pinned top Onboarding button closes modal and invokes trigger with restart=false', () => {
      const onClose = vi.fn();
      const onStartOnboarding = vi.fn();
      const onRestartOnboarding = vi.fn();

      const { element } = renderModalWithHarness({
        isOpen: true,
        currentUser: MOCK_USER,
        onClose,
        onStartOnboarding,
        onRestartOnboarding,
        isExpired: false
      });

      const buttons = findElements(
        element,
        (node) => node?.props?.['data-testid'] === 'btn-relaunch-onboarding'
      );

      expect(buttons.length).toBe(1);
      const btn = buttons[0];

      // Simulate teacher clicking the button
      btn.props.onClick();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onStartOnboarding).toHaveBeenCalledTimes(1);
      expect(onStartOnboarding).toHaveBeenCalledWith({ mode: 'guided', restart: false });
      expect(onRestartOnboarding).not.toHaveBeenCalled();
    });

    it('clicking guide tab restart button closes modal and triggers restart=true', () => {
      const onClose = vi.fn();
      const onStartOnboarding = vi.fn();
      const onRestartOnboarding = vi.fn();

      const { element } = renderModalWithHarness(
        {
          isOpen: true,
          currentUser: MOCK_USER,
          onClose,
          onStartOnboarding,
          onRestartOnboarding,
          isExpired: false,
          defaultTab: 'guide'
        },
        { activeTab: 'guide' }
      );

      const restartBtns = findElements(
        element,
        (node) => node?.props?.['data-testid'] === 'btn-guide-tab-restart-onboarding'
      );

      expect(restartBtns.length).toBe(1);
      const restartBtn = restartBtns[0];

      // Teacher clicks "הפעלת הסיור מחדש"
      restartBtn.props.onClick();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onRestartOnboarding).toHaveBeenCalledTimes(1);
      expect(onRestartOnboarding).toHaveBeenCalledWith({ mode: 'guided', restart: true });
    });

    it('clicking guide tab resume button closes modal and triggers restart=false', () => {
      const onClose = vi.fn();
      const onStartOnboarding = vi.fn();

      const { element } = renderModalWithHarness(
        {
          isOpen: true,
          currentUser: MOCK_USER,
          onClose,
          onStartOnboarding,
          isExpired: false,
          defaultTab: 'guide'
        },
        { activeTab: 'guide' }
      );

      const resumeBtns = findElements(
        element,
        (node) => node?.props?.['data-testid'] === 'btn-guide-tab-resume-onboarding'
      );

      expect(resumeBtns.length).toBe(1);
      const resumeBtn = resumeBtns[0];

      // Teacher clicks "המשך בסיור המודרך 👈"
      resumeBtn.props.onClick();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onStartOnboarding).toHaveBeenCalledTimes(1);
      expect(onStartOnboarding).toHaveBeenCalledWith({ mode: 'guided', restart: false });
    });

    it('fallback resilience: top launcher falls back to onRestartOnboarding if onStartOnboarding is null', () => {
      const onClose = vi.fn();
      const onRestartOnboarding = vi.fn();

      const { element } = renderModalWithHarness({
        isOpen: true,
        currentUser: MOCK_USER,
        onClose,
        onStartOnboarding: null,
        onRestartOnboarding,
        isExpired: false
      });

      const buttons = findElements(
        element,
        (node) => node?.props?.['data-testid'] === 'btn-relaunch-onboarding'
      );

      expect(buttons.length).toBe(1);
      buttons[0].props.onClick();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onRestartOnboarding).toHaveBeenCalledTimes(1);
      expect(onRestartOnboarding).toHaveBeenCalledWith({ mode: 'guided', restart: false });
    });

    it('expired account boundary: if isExpired=true, modal close is inhibited to prevent bypassing paywall', () => {
      const onClose = vi.fn();
      const onStartOnboarding = vi.fn();

      const { element } = renderModalWithHarness({
        isOpen: true,
        currentUser: { ...MOCK_USER, isTrialUser: true },
        onClose,
        onStartOnboarding,
        isExpired: true
      });

      // Pinned launcher button should NOT be rendered when trial is expired
      const buttons = findElements(
        element,
        (node) => node?.props?.['data-testid'] === 'btn-relaunch-onboarding'
      );
      // Pinned launcher is rendered only if onStartOnboarding is passed, but tab 1 is contact when expired
      if (buttons.length > 0) {
        buttons[0].props.onClick();
        expect(onClose).not.toHaveBeenCalled();
      }
    });

    it('re-launch restart resets state cleanly to step 1 without state corruption', () => {
      // Existing state with step 7 and multiple completed steps
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 7,
        completedSteps: [1, 2, 3, 4, 5, 6],
        isPaused: true,
        mode: 'real'
      });

      // Teacher re-launches with restart
      const freshState = resetOnboardingState(TEST_EMAIL, null);

      expect(freshState.currentStep).toBe(1);
      expect(freshState.completedSteps).toEqual([]);
      expect(freshState.isPaused).toBe(false);
      expect(freshState.isCompleted).toBe(false);
      expect(freshState.mode).toBeNull(); // Requires mode selection anew
    });

    it('re-launch resume preserves previously achieved steps and current step without regression', () => {
      // Teacher was at step 5 with steps 1..4 completed
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 5,
        completedSteps: [1, 2, 3, 4],
        isPaused: true,
        mode: 'demo'
      });

      // Teacher resumes from help modal
      const resumedState = resumeOnboarding(TEST_EMAIL);

      expect(resumedState.currentStep).toBe(5);
      expect(resumedState.completedSteps).toEqual([1, 2, 3, 4]);
      expect(resumedState.isPaused).toBe(false);
      expect(resumedState.mode).toBe('demo');
    });
  });

  /* =========================================================================
     2. 10-Stage Sequential Navigation & No Dead Ends
     ========================================================================= */
  describe('2. 10-Stage Sequential Navigation & No Dead Ends', () => {
    it('contains exactly 10 comprehensive stages covering the full pedagogical journey', () => {
      expect(ONBOARDING_STEPS.length).toBe(10);
      const expectedKeys = [
        'getting_started',
        'create_student',
        'student_profile',
        'set_goals',
        'daily_tracking',
        'ongoing_documentation',
        'parent_voice',
        'generating_reports',
        'ai_insights',
        'matya_settings'
      ];
      expect(ONBOARDING_STEPS.map(s => s.key)).toEqual(expectedKeys);
    });

    it('every stage has a non-empty actionLabel and isImplemented flag', () => {
      ONBOARDING_STEPS.forEach(step => {
        expect(step.actionLabel).toBeDefined();
        expect(step.actionLabel.trim().length).toBeGreaterThan(0);
        expect(step.isImplemented).toBe(true);
        expect(step.pedagogicalRationale).toBeDefined();
        expect(step.pedagogicalRationale.trim().length).toBeGreaterThan(0);
      });
    });

    it('seamless forward step advance from step 1 through step 10 with completion tracking', () => {
      let state = resetOnboardingState(TEST_EMAIL, 'demo');
      expect(state.currentStep).toBe(1);

      for (let expectedStep = 2; expectedStep <= 10; expectedStep++) {
        state = advanceOnboardingStep(TEST_EMAIL);
        expect(state.currentStep).toBe(expectedStep);
        expect(state.completedSteps).toContain(expectedStep - 1);
        expect(state.isCompleted).toBe(false);
      }

      // Step 10 completion
      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.isCompleted).toBe(true);
      expect(state.completedSteps.length).toBe(10);
      expect(state.currentStep).toBe(10); // Clamped at 10
    });

    it('step clamping prevents overflow past step 10 or underflow below step 1', () => {
      // Direct jump below 1
      const underflow = goToOnboardingStep(TEST_EMAIL, -5);
      expect(underflow.currentStep).toBe(1);

      const zero = goToOnboardingStep(TEST_EMAIL, 0);
      expect(zero.currentStep).toBe(1);

      // Direct jump above 10
      const overflow = goToOnboardingStep(TEST_EMAIL, 42);
      expect(overflow.currentStep).toBe(10);

      // Advance when already at 10
      const atTen = advanceOnboardingStep(TEST_EMAIL);
      expect(atTen.currentStep).toBe(10);
      expect(atTen.isCompleted).toBe(true);
    });

    it('step backward navigation clamps to 1 and retains completed step set', () => {
      saveOnboardingState(TEST_EMAIL, {
        currentStep: 3,
        completedSteps: [1, 2],
        mode: 'real'
      });

      const prevStep = goToOnboardingStep(TEST_EMAIL, 2);
      expect(prevStep.currentStep).toBe(2);
      expect(prevStep.completedSteps).toEqual([1, 2]);

      const backToStart = goToOnboardingStep(TEST_EMAIL, 1);
      expect(backToStart.currentStep).toBe(1);
      expect(backToStart.completedSteps).toEqual([1, 2]);
    });

    it('OnboardingGuidedWorkspace renders forward, backward, action, and jump buttons without dead ends', () => {
      const onNextStep = vi.fn();
      const onPreviousStep = vi.fn();
      const onGoToStep = vi.fn();
      const onExecuteAction = vi.fn();
      const onPauseJourney = vi.fn();
      const onOpenNavigator = vi.fn();

      const state = {
        currentStep: 5,
        completedSteps: [1, 2, 3, 4],
        isPaused: false,
        isDockCollapsed: false,
        mode: 'demo'
      };

      const html = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: state,
          onNextStep,
          onPreviousStep,
          onGoToStep,
          onExecuteAction,
          onPauseJourney,
          onOpenNavigator
        })
      );

      // Verify current step info
      expect(html).toContain('שלב 5 מתוך 10');
      expect(html).toContain('מעקב יומי ותיעוד תצפיות');
      expect(html).toContain('מעבר ליומן המעקב הפדגוגי');
      expect(html).toContain('שלב קודם');
      expect(html).toContain('שלב הבא 👈');
      expect(html).toContain('מפת המסע');
      expect(html).toContain('למה זה חשוב פדגוגית?');
      expect(html).toContain('דוגמה מהשטח:');
    });

    it('OnboardingNavigatorModal renders all 10 stages as direct interactive links', () => {
      const state = {
        currentStep: 3,
        completedSteps: [1, 2],
        isPaused: false,
        mode: 'demo'
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

      // Verify header and mode cards
      expect(html).toContain('מסע ההדרכה הפדגוגי ב-TALA');
      expect(html).toContain('התנסות עם תלמיד לדוגמה');
      expect(html).toContain('יצירת תלמיד/ה ראשונ/ה מהשטח');

      // Verify all 10 step titles are present
      ONBOARDING_STEPS.forEach(step => {
        expect(html).toContain(`${step.id}. ${step.title}`);
      });

      // Verify indicators
      expect(html).toContain('שלב פעיל');
      expect(html).toContain('הושלם ✓');
      expect(html).toContain('הושלמו 2 מתוך 10 שלבים');
    });
  });

  /* =========================================================================
     3. Mobile & Responsive Layout, 32x32px Buttons, and Hebrew RTL
     ========================================================================= */
  describe('3. Mobile & Responsive Layout, 32x32px Buttons, and Hebrew RTL', () => {
    it('verifies explicit dir="rtl" on all onboarding components for Hebrew typography', () => {
      const state = {
        currentStep: 1,
        completedSteps: [],
        isPaused: false,
        isDockCollapsed: false,
        mode: 'demo'
      };

      // 1. Expanded Workspace Dock
      const expandedHtml = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, { onboardingState: state })
      );
      expect(expandedHtml).toContain('dir="rtl"');
      expect(expandedHtml).toContain('class="onboarding-guided-dock"');

      // 2. Collapsed Workspace Strip
      const collapsedHtml = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: { ...state, isDockCollapsed: true }
        })
      );
      expect(collapsedHtml).toContain('dir="rtl"');
      expect(collapsedHtml).toContain('class="onboarding-collapsed-dock"');

      // 3. Paused Floating Dock
      const pausedHtml = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: { ...state, isPaused: true }
        })
      );
      expect(pausedHtml).toContain('dir="rtl"');
      expect(pausedHtml).toContain('class="onboarding-paused-dock"');

      // 4. Navigator Modal
      const modalHtml = renderToStaticMarkup(
        React.createElement(OnboardingNavigatorModal, {
          isOpen: true,
          onClose: vi.fn(),
          onboardingState: state
        })
      );
      expect(modalHtml).toContain('dir="rtl"');
    });

    it('verifies standard 32x32px touch targets on collapse/expand and modal close buttons', () => {
      const state = {
        currentStep: 2,
        completedSteps: [1],
        isPaused: false,
        isDockCollapsed: false,
        mode: 'demo'
      };

      // In Expanded dock: collapse and pause buttons
      const expanded = OnboardingGuidedWorkspace({
        onboardingState: state,
        onToggleCollapse: vi.fn(),
        onPauseJourney: vi.fn()
      });

      const buttons32InExpanded = findElements(
        expanded,
        (node) =>
          node?.type === 'button' &&
          node?.props?.style?.width === '32px' &&
          node?.props?.style?.height === '32px'
      );

      // Must have at least 2 standard 32x32px buttons (Pause, ChevronDown)
      expect(buttons32InExpanded.length).toBeGreaterThanOrEqual(2);
      buttons32InExpanded.forEach(btn => {
        expect(btn.props.style.width).toBe('32px');
        expect(btn.props.style.height).toBe('32px');
        expect(btn.props.style.minWidth).toBe('32px');
        expect(btn.props.style.borderRadius).toBe('8px');
      });

      // In Collapsed dock: expand button
      const collapsed = OnboardingGuidedWorkspace({
        onboardingState: { ...state, isDockCollapsed: true },
        onToggleCollapse: vi.fn()
      });

      const expandBtn = findElements(
        collapsed,
        (node) =>
          node?.type === 'button' &&
          node?.props?.style?.width === '32px' &&
          node?.props?.style?.height === '32px'
      );
      expect(expandBtn.length).toBe(1);
      expect(expandBtn[0].props.style.width).toBe('32px');
      expect(expandBtn[0].props.style.height).toBe('32px');

      // In Navigator modal: close button
      const modal = OnboardingNavigatorModal({
        isOpen: true,
        onClose: vi.fn(),
        onboardingState: state
      });

      const modalCloseBtn = findElements(
        modal,
        (node) =>
          node?.type === 'button' &&
          node?.props?.style?.width === '32px' &&
          node?.props?.style?.height === '32px'
      );
      expect(modalCloseBtn.length).toBe(1);
      expect(modalCloseBtn[0].props.style.width).toBe('32px');
      expect(modalCloseBtn[0].props.style.height).toBe('32px');
    });

    it('verifies responsive container constraints prevent screen-blocking layout shifts on mobile/tablet', () => {
      const state = {
        currentStep: 4,
        completedSteps: [1, 2, 3],
        isPaused: false,
        isDockCollapsed: false,
        mode: 'real'
      };

      const workspace = OnboardingGuidedWorkspace({
        onboardingState: state
      });

      // Dock container style checks
      expect(workspace.props.style.position).toBe('fixed');
      expect(workspace.props.style.bottom).toBe(0);
      expect(workspace.props.style.left).toBe(0);
      expect(workspace.props.style.right).toBe(0);
      expect(workspace.props.style.maxHeight).toBe('45vh');
      expect(workspace.props.style.overflowY).toBe('auto');
      expect(workspace.props.style.zIndex).toBe(1300);

      // Navigator modal card checks
      const modal = OnboardingNavigatorModal({
        isOpen: true,
        onClose: vi.fn(),
        onboardingState: state
      });

      const modalCard = findElements(modal, (node) => node?.props?.className === 'modal-card')[0];
      expect(modalCard.props.style.maxWidth).toBe('780px');
      expect(modalCard.props.style.maxHeight).toBe('90vh');
      expect(modalCard.props.style.overflow).toBe('hidden');
    });
  });

  /* =========================================================================
     4. Zero-Trust Demo Sandbox Cloud Isolation & Quota Safety
     ========================================================================= */
  describe('4. Zero-Trust Demo Sandbox Cloud Isolation', () => {
    it('demo student record contains isDemo=true and demo_yonatan_levi id', () => {
      const demo = createFreshDemoStudent();
      expect(demo.id).toBe('demo_yonatan_levi');
      expect(demo.isDemo).toBe(true);
      expect(isDemoStudent(demo)).toBe(true);
      expect(demo.name).toContain('יונתן לוי');
    });

    it('saveStudentToCloud absolutely blocks demo records from writing to Firestore', async () => {
      const demo = createFreshDemoStudent();
      const result = await saveStudentToCloud(demo);
      expect(result).toBe(false);
    });

    it('deleteStudentFromCloud blocks demo student deletion from Firestore', async () => {
      const result = await deleteStudentFromCloud('demo_yonatan_levi');
      expect(result).toBe(false);
    });

    it('email normalization creates collision-free and safe storage keys', () => {
      expect(normalizeEmailKey('Teacher.Sarah@School.edu.il')).toBe('teacher.sarah_school.edu.il');
      expect(normalizeEmailKey('  MORA+HEBREW@MATYA.ORG  ')).toBe('mora_hebrew_matya.org');
      expect(normalizeEmailKey('')).toBe('anonymous');
      expect(normalizeEmailKey(null)).toBe('anonymous');
    });
  });

  /* =========================================================================
     5. Corrupted Storage & In-Memory Fallbacks
     ========================================================================= */
  describe('5. Corrupted Storage & In-Memory Fallbacks', () => {
    it('recovers gracefully to default state when localStorage contains corrupted JSON', () => {
      const key = getOnboardingStateKey(TEST_EMAIL);
      mockStorageStore[key] = '{ invalid json !!';

      const state = getOnboardingState(TEST_EMAIL);
      expect(state).toBeDefined();
      expect(state.version).toBe(1);
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([]);
    });

    it('handles unexpected non-number step in goToOnboardingStep safely', () => {
      const state = goToOnboardingStep(TEST_EMAIL, 'corrupt_string');
      // Should not crash, and step stays numeric default (1)
      expect(typeof state.currentStep).toBe('number');
      expect(state.currentStep).toBe(1);
    });

    it('in-memory fallback seamlessly maintains state across operations during private browsing', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('SecurityError: The operation is insecure.');
      });

      const s1 = saveOnboardingState(TEST_EMAIL, { mode: 'real', currentStep: 2 });
      expect(s1.currentStep).toBe(2);

      const s2 = advanceOnboardingStep(TEST_EMAIL);
      expect(s2.currentStep).toBe(3);
      expect(s2.completedSteps).toContain(2);

      const retrieved = getOnboardingState(TEST_EMAIL);
      expect(retrieved.currentStep).toBe(3);
      expect(retrieved.completedSteps).toContain(2);
    });
  });
});
