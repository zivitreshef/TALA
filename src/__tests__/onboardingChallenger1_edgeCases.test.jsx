import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Domain imports
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

// Storage & Service imports
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

import * as firebaseBackend from '../firebaseBackend';
import { saveStudentToCloud, deleteStudentFromCloud } from '../firebaseBackend';

// UI Components
import OnboardingNavigatorModal from '../components/onboarding/OnboardingNavigatorModal';
import OnboardingGuidedWorkspace from '../components/onboarding/OnboardingGuidedWorkspace';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';

describe('Challenger 1 Stress-Test Suite: Milestone 1 Robustness & Isolation', () => {
  const TEST_EMAIL = 'teacher.challenger1@school.gov.il';
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
     1. Demo Sandbox Cloud Isolation (Zero Firestore Writes)
     ========================================================================= */
  describe('1. Demo Sandbox Cloud Isolation Stress-Testing', () => {
    it('saveStudentToCloud returns false immediately for fresh demo student without accessing firestore db', async () => {
      const getDbSpy = vi.spyOn(firebaseBackend, 'getFirestoreDb');
      const freshDemo = createFreshDemoStudent();

      const result = await saveStudentToCloud(freshDemo);

      expect(result).toBe(false);
      expect(getDbSpy).not.toHaveBeenCalled();
    });

    it('saveStudentToCloud rejects any object flagged with isDemo: true regardless of id', async () => {
      const getDbSpy = vi.spyOn(firebaseBackend, 'getFirestoreDb');
      const sneakyDemoStudent = {
        id: 'real_student_id_123',
        name: 'תלמיד רגיל לכאורה',
        isDemo: true
      };

      const result = await saveStudentToCloud(sneakyDemoStudent);

      expect(result).toBe(false);
      expect(getDbSpy).not.toHaveBeenCalled();
    });

    it('saveStudentToCloud rejects any object with id === "demo_yonatan_levi" even if isDemo is false or missing', async () => {
      const getDbSpy = vi.spyOn(firebaseBackend, 'getFirestoreDb');
      const maliciousPayload = {
        id: 'demo_yonatan_levi',
        isDemo: false,
        name: 'ניסיון עקיפה'
      };

      const result = await saveStudentToCloud(maliciousPayload);

      expect(result).toBe(false);
      expect(getDbSpy).not.toHaveBeenCalled();
    });

    it('deleteStudentFromCloud returns false and never accesses firestore for "demo_yonatan_levi"', async () => {
      const getDbSpy = vi.spyOn(firebaseBackend, 'getFirestoreDb');

      const result = await deleteStudentFromCloud('demo_yonatan_levi');

      expect(result).toBe(false);
      expect(getDbSpy).not.toHaveBeenCalled();
    });

    it('saveDemoStudent forcibly locks id to "demo_yonatan_levi" and isDemo to true even if caller passes conflicting properties', () => {
      const hackedStudent = {
        id: 'tampered_id',
        isDemo: false,
        name: 'יונתן שונה'
      };

      const saved = saveDemoStudent(TEST_EMAIL, hackedStudent);

      expect(saved.id).toBe('demo_yonatan_levi');
      expect(saved.isDemo).toBe(true);
      expect(saved.name).toBe('יונתן שונה');

      const retrieved = getDemoStudent(TEST_EMAIL);
      expect(retrieved.id).toBe('demo_yonatan_levi');
      expect(retrieved.isDemo).toBe(true);
    });

    it('saveDemoStudent writes only to scoped demo key and never pollutes global keys', () => {
      saveDemoStudent(TEST_EMAIL, { customField: 'testValue' });

      const demoKey = getDemoStudentKey(TEST_EMAIL);
      const keys = Object.keys(mockStorageStore);

      expect(keys).toContain(demoKey);
      keys.forEach((k) => {
        expect(k).toMatch(/^tala_onboarding_demo_v1_/);
      });
    });

    it('clearDemoStudent removes the scoped key without affecting other keys', () => {
      saveDemoStudent(TEST_EMAIL, { test: 1 });
      saveOnboardingState(TEST_EMAIL, { mode: 'demo' });

      clearDemoStudent(TEST_EMAIL);

      const demoKey = getDemoStudentKey(TEST_EMAIL);
      const stateKey = getOnboardingStateKey(TEST_EMAIL);

      expect(mockStorageStore[demoKey]).toBeUndefined();
      expect(mockStorageStore[stateKey]).toBeDefined();
    });

    it('isDemoStudent oracle correctly classifies various permutations', () => {
      expect(isDemoStudent(null)).toBe(false);
      expect(isDemoStudent(undefined)).toBe(false);
      expect(isDemoStudent({})).toBe(false);
      expect(isDemoStudent({ id: 'student_999' })).toBe(false);
      expect(isDemoStudent({ isDemo: true })).toBe(true);
      expect(isDemoStudent({ id: 'demo_yonatan_levi' })).toBe(true);
      expect(isDemoStudent({ ownerEmail: 'demo@tala.internal' })).toBe(true);
      expect(isDemoStudent(createFreshDemoStudent())).toBe(true);
    });
  });

  /* =========================================================================
     2. Storage & Recovery Under Pressure (Quota, Corruption, Email Edge Cases)
     ========================================================================= */
  describe('2. Storage & Recovery Under Pressure Stress-Testing', () => {
    it('handles simulated QuotaExceededError during saveOnboardingState using in-memory fallback without crashing', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('The quota has been exceeded.');
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      });

      expect(() => {
        saveOnboardingState(TEST_EMAIL, { currentStep: 4, mode: 'demo' });
      }).not.toThrow();

      const state = getOnboardingState(TEST_EMAIL);
      expect(state.currentStep).toBe(4);
      expect(state.mode).toBe('demo');
    });

    it('handles simulated QuotaExceededError during saveDemoStudent using in-memory fallback', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => {
        saveDemoStudent(TEST_EMAIL, { specialNote: 'in-memory-preserved' });
      }).not.toThrow();

      const demo = getDemoStudent(TEST_EMAIL);
      expect(demo.specialNote).toBe('in-memory-preserved');
      expect(demo.id).toBe('demo_yonatan_levi');
    });

    it('recovers gracefully from corrupted JSON in onboarding state key', () => {
      const stateKey = getOnboardingStateKey(TEST_EMAIL);
      mockStorageStore[stateKey] = '{ invalid json : true ...';

      const state = getOnboardingState(TEST_EMAIL);
      expect(state).toBeDefined();
      expect(state.version).toBe(1);
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([]);
    });

    it('recovers gracefully from non-object JSON values in onboarding state key', () => {
      const stateKey = getOnboardingStateKey(TEST_EMAIL);

      mockStorageStore[stateKey] = JSON.stringify('just a string');
      let state = getOnboardingState(TEST_EMAIL);
      expect(state.version).toBe(1);

      mockStorageStore[stateKey] = JSON.stringify(12345);
      state = getOnboardingState(TEST_EMAIL);
      expect(state.version).toBe(1);

      mockStorageStore[stateKey] = JSON.stringify([1, 2, 3]);
      state = getOnboardingState(TEST_EMAIL);
      expect(state.version).toBe(1);

      mockStorageStore[stateKey] = JSON.stringify({ version: 999 });
      state = getOnboardingState(TEST_EMAIL);
      expect(state.version).toBe(1);
    });

    it('recovers gracefully from corrupted JSON in demo student key', () => {
      const demoKey = getDemoStudentKey(TEST_EMAIL);
      mockStorageStore[demoKey] = '<<<CORRUPTED_BLOB>>>';

      const demo = getDemoStudent(TEST_EMAIL);
      expect(demo).toBeDefined();
      expect(demo.id).toBe('demo_yonatan_levi');
      expect(demo.name).toContain('יונתן לוי');
    });

    it('normalizes null, undefined, empty, whitespace, and dirty email strings without throwing', () => {
      expect(normalizeEmailKey(null)).toBe('anonymous');
      expect(normalizeEmailKey(undefined)).toBe('anonymous');
      expect(normalizeEmailKey('')).toBe('anonymous');
      // Whitespace trims to empty string
      expect(normalizeEmailKey('   ')).toBe('');
      expect(normalizeEmailKey(123)).toBe('anonymous');
      expect(normalizeEmailKey({})).toBe('anonymous');

      // Dirty email normalization
      const dirty = '  Mora.Sarah+Special-Ed#1@School.Gov.IL  ';
      const normalized = normalizeEmailKey(dirty);
      expect(normalized).toBe('mora.sarah_special-ed_1_school.gov.il');
      expect(getOnboardingStateKey(dirty)).toBe('tala_onboarding_state_v1_mora.sarah_special-ed_1_school.gov.il');
      expect(getDemoStudentKey(dirty)).toBe('tala_onboarding_demo_v1_mora.sarah_special-ed_1_school.gov.il');
    });

    it('supports saving and retrieving state for anonymous/null user', () => {
      saveOnboardingState(null, { currentStep: 3, mode: 'demo' });
      const state = getOnboardingState(null);
      expect(state.currentStep).toBe(3);
      expect(state.mode).toBe('demo');
    });

    it('operates safely when localStorage is completely disabled (Safari private mode or security block)', () => {
      vi.stubGlobal('localStorage', null);
      vi.stubGlobal('window', {});

      expect(() => {
        saveOnboardingState(TEST_EMAIL, { currentStep: 2 });
      }).not.toThrow();

      const state = getOnboardingState(TEST_EMAIL);
      expect(state.currentStep).toBe(2);

      expect(() => {
        saveDemoStudent(TEST_EMAIL, { notes: 'private browsing' });
      }).not.toThrow();

      const demo = getDemoStudent(TEST_EMAIL);
      expect(demo.notes).toBe('private browsing');
    });
  });

  /* =========================================================================
     3. State Transitions & Boundary Conditions Stress-Testing
     ========================================================================= */
  describe('3. State Transitions & Boundary Conditions Stress-Testing', () => {
    it('clamps negative, zero, and out-of-bound steps strictly between 1 and 10', () => {
      let state = goToOnboardingStep(TEST_EMAIL, -100);
      expect(state.currentStep).toBe(1);

      state = goToOnboardingStep(TEST_EMAIL, 0);
      expect(state.currentStep).toBe(1);

      state = goToOnboardingStep(TEST_EMAIL, 11);
      expect(state.currentStep).toBe(10);

      state = goToOnboardingStep(TEST_EMAIL, 9999);
      expect(state.currentStep).toBe(10);

      state = goToOnboardingStep(TEST_EMAIL, NaN);
      expect(state.currentStep).toBe(1);

      state = goToOnboardingStep(TEST_EMAIL, 'invalid_step');
      expect(state.currentStep).toBe(1);

      state = goToOnboardingStep(TEST_EMAIL, null);
      expect(state.currentStep).toBe(1);
    });

    it('saveOnboardingState strictly clamps currentStep if passed directly in updates object', () => {
      let state = saveOnboardingState(TEST_EMAIL, { currentStep: 99 });
      expect(state.currentStep).toBe(10);

      state = saveOnboardingState(TEST_EMAIL, { currentStep: -42 });
      expect(state.currentStep).toBe(1);
    });

    it('advanceOnboardingStep terminates gracefully at step 10 and marks journey completed', () => {
      goToOnboardingStep(TEST_EMAIL, 9);
      let state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.currentStep).toBe(10);
      expect(state.isCompleted).toBe(false);

      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.currentStep).toBe(10);
      expect(state.isCompleted).toBe(true);
      expect(state.completedAt).toBeDefined();
      expect(state.completedSteps).toContain(10);

      state = advanceOnboardingStep(TEST_EMAIL);
      expect(state.currentStep).toBe(10);
      expect(state.isCompleted).toBe(true);
    });

    it('domain step boundary helpers getNextStep and getPreviousStep return null at boundaries', () => {
      expect(getPreviousStep(1)).toBeNull();
      expect(getNextStep(10)).toBeNull();
      expect(getStepById(0)).toBeNull();
      expect(getStepById(11)).toBeNull();
      expect(getStepById(null)).toBeNull();
      expect(getStepById(undefined)).toBeNull();
    });

    it('supports jumping steps, pausing, resuming, and docking state changes without state corruption', () => {
      let state = goToOnboardingStep(TEST_EMAIL, 7);
      expect(state.currentStep).toBe(7);

      state = pauseOnboarding(TEST_EMAIL);
      expect(state.isPaused).toBe(true);
      expect(state.currentStep).toBe(7);

      state = resumeOnboarding(TEST_EMAIL);
      expect(state.isPaused).toBe(false);
      expect(state.currentStep).toBe(7);

      state = setOnboardingDockCollapsed(TEST_EMAIL, true);
      expect(state.isDockCollapsed).toBe(true);

      state = setOnboardingDockCollapsed(TEST_EMAIL, false);
      expect(state.isDockCollapsed).toBe(false);

      state = resetOnboardingState(TEST_EMAIL, 'real');
      expect(state.currentStep).toBe(1);
      expect(state.mode).toBe('real');
      expect(state.completedSteps).toEqual([]);
      expect(state.isCompleted).toBe(false);
      expect(state.isPaused).toBe(false);
    });
  });

  /* =========================================================================
     4. UI Component Robustness Under Extreme / Incomplete Props
     ========================================================================= */
  describe('4. UI Component Robustness Under Extreme Props', () => {
    it('OnboardingGuidedWorkspace renders nothing if onboardingState is null without crashing', () => {
      const html = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: null
        })
      );
      expect(html).toBe('');
    });

    it('OnboardingGuidedWorkspace gracefully falls back on corrupted or missing step properties', () => {
      const html = renderToStaticMarkup(
        React.createElement(OnboardingGuidedWorkspace, {
          onboardingState: {
            currentStep: 999,
            completedSteps: null,
            isPaused: false,
            isDockCollapsed: false
          }
        })
      );
      expect(html).toContain('onboarding-guided-dock');
      expect(html).toContain('מבוא למערכת ומרחב העבודה');
    });

    it('OnboardingNavigatorModal safely renders closed when isOpen is false', () => {
      const html = renderToStaticMarkup(
        React.createElement(OnboardingNavigatorModal, {
          isOpen: false
        })
      );
      expect(html).toBe('');
    });

    it('OnboardingNavigatorModal safely renders open even if onboardingState is completely null', () => {
      const html = renderToStaticMarkup(
        React.createElement(OnboardingNavigatorModal, {
          isOpen: true,
          onboardingState: null
        })
      );
      expect(html).toContain('מסע ההדרכה הפדגוגי ב-TALA');
      expect(html).toContain('1. מבוא למערכת ומרחב העבודה');
      expect(html).toContain('10. אזור אישי ושיתוף מסמכים במתי״א');
    });

    it('TrialUpgradeModal renders relaunch onboarding button when onStartOnboarding is provided', () => {
      const mockStart = vi.fn();
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: { email: TEST_EMAIL, name: 'מורה' },
          onStartOnboarding: mockStart
        })
      );
      expect(html).toContain('data-testid="btn-relaunch-onboarding"');
      expect(html).toContain('סיור מודרך במערכת (Onboarding)');
    });
  });

  /* =========================================================================
     5. Multi-User Isolation, Rapid Sequences & Serialization Stress
     ========================================================================= */
  describe('5. Multi-User Isolation, Rapid Sequences & Serialization Stress', () => {
    it('enforces strict multi-user isolation on shared browser: Teacher A edits never leak to Teacher B', () => {
      const emailA = 'teacher.a@school.gov.il';
      const emailB = 'teacher.b@school.gov.il';

      saveOnboardingState(emailA, { mode: 'demo' });
      goToOnboardingStep(emailA, 6);
      saveDemoStudent(emailA, { customNote: 'Teacher A unique note' });

      saveOnboardingState(emailB, { mode: 'real' });
      const stateB = getOnboardingState(emailB);
      const demoB = getDemoStudent(emailB);

      expect(stateB.mode).toBe('real');
      expect(stateB.currentStep).toBe(1);
      expect(demoB.customNote).toBeUndefined();

      const stateA = getOnboardingState(emailA);
      const demoA = getDemoStudent(emailA);
      expect(stateA.mode).toBe('demo');
      expect(stateA.currentStep).toBe(6);
      expect(demoA.customNote).toBe('Teacher A unique note');
    });

    it('survives rapid successive step advances without dropping completedSteps or corrupting currentStep', () => {
      resetOnboardingState(TEST_EMAIL, 'demo');

      for (let i = 0; i < 15; i++) {
        advanceOnboardingStep(TEST_EMAIL);
      }

      const finalState = getOnboardingState(TEST_EMAIL);
      expect(finalState.currentStep).toBe(10);
      expect(finalState.isCompleted).toBe(true);
      expect(finalState.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('survives attempted saving of circular object references without throwing uncaught exceptions', () => {
      const circularObj = { name: 'circular' };
      circularObj.self = circularObj;

      expect(() => {
        saveOnboardingState(TEST_EMAIL, { metadata: circularObj });
      }).not.toThrow();

      expect(() => {
        saveDemoStudent(TEST_EMAIL, { circular: circularObj });
      }).not.toThrow();
    });

    it('cloud storage functions gracefully reject null/undefined/empty input without throwing or accessing firestore', async () => {
      const getDbSpy = vi.spyOn(firebaseBackend, 'getFirestoreDb');

      expect(await saveStudentToCloud(null)).toBe(false);
      expect(await saveStudentToCloud(undefined)).toBe(false);
      expect(await saveStudentToCloud({})).toBe(false);
      expect(await saveStudentToCloud({ id: '' })).toBe(false);

      expect(await deleteStudentFromCloud(null)).toBe(false);
      expect(await deleteStudentFromCloud(undefined)).toBe(false);
      expect(await deleteStudentFromCloud('')).toBe(false);

      expect(getDbSpy).not.toHaveBeenCalled();
    });
  });
});
