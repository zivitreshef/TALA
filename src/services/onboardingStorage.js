/**
 * Persistent Storage & State Engine for TALA's Guided Onboarding Journey.
 *
 * Implements:
 * - Scoped LocalStorage storage per teacher email
 * - In-memory fallback for private mode / quota restrictions
 * - Zero-trust isolation for demo student data (never written to cloud)
 * - Complete pause / resume / dismiss / step advance / restart state transitions
 * - Automatic default visibility: expanded for new teachers (0 students), collapsed for teachers with existing students
 */

import { safeGetStorageJson, safeSetStorageJson, safeRemoveStorageItem } from './storage';
import { ONBOARDING_TOTAL_STEPS, createFreshDemoStudent, getStepById } from '../domain/onboardingJourney';
import { usageTelemetryService } from './usageTelemetryService';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';

const ONBOARDING_STATE_PREFIX = 'tala_onboarding_state_v1_';
const ONBOARDING_DEMO_PREFIX = 'tala_onboarding_demo_v1_';

// In-memory memory map for fallback environments (e.g. tests or Safari private mode)
const inMemoryStore = new Map();

/**
 * Normalizes user email to create a safe storage key.
 */
export function normalizeEmailKey(email) {
  if (!email || typeof email !== 'string') return 'anonymous';
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

/**
 * Generates the storage key for a user's onboarding state.
 */
export function getOnboardingStateKey(email) {
  return `${ONBOARDING_STATE_PREFIX}${normalizeEmailKey(email)}`;
}

/**
 * Generates the storage key for a user's isolated demo student record.
 */
export function getDemoStudentKey(email) {
  return `${ONBOARDING_DEMO_PREFIX}${normalizeEmailKey(email)}`;
}

/**
 * Returns the default initial onboarding state for a user.
 */
export function createDefaultOnboardingState(email = '') {
  const now = new Date().toISOString();
  return {
    version: 1,
    userEmail: (email || '').trim().toLowerCase(),
    mode: null, // 'demo' | 'real' | null (until chosen)
    currentStep: 1,
    completedSteps: [],
    isPaused: false,
    isCompleted: false,
    isDismissed: false,
    startedAt: now,
    lastUpdatedAt: now,
    completedAt: null,
    firstStudentAt: null,
    timeToFirstStudentSec: null,
    firstReportAt: null,
    timeToFirstReportSec: null,
    hasDispatchedStarted: false,
    demoStudentId: 'demo_yonatan_levi',
    activeStudentId: null,
    isDockCollapsed: false,
    userToggledDock: false
  };
}

/**
 * Resolves the effective onboarding state based on whether the teacher is new (0 students)
 * or already has existing students (>0 students), unless the user has explicitly toggled
 * or interacted with the dock.
 *
 * - New teacher (0 students): visible / expanded by default (isDockCollapsed = false)
 * - Existing teacher (>0 students): collapsed by default (isDockCollapsed = true)
 */
export function resolveOnboardingDockStateForUser(onboardingState, userStudentsCount = 0) {
  if (!onboardingState || typeof onboardingState !== 'object') return null;

  if (onboardingState.userToggledDock === true) {
    return onboardingState;
  }

  const shouldCollapseByDefault = Number(userStudentsCount) > 0;
  return {
    ...onboardingState,
    isDockCollapsed: shouldCollapseByDefault
  };
}

/**
 * Retrieves the current onboarding state for a given user email.
 * Falls back to in-memory store if localStorage is unavailable or corrupted.
 */
export function getOnboardingState(email) {
  const key = getOnboardingStateKey(email);
  const stored = safeGetStorageJson(key, null);

  if (stored && typeof stored === 'object' && stored.version === 1) {
    inMemoryStore.set(key, stored);
    return stored;
  }

  // Check in-memory fallback
  if (inMemoryStore.has(key)) {
    return inMemoryStore.get(key);
  }

  const defaultState = createDefaultOnboardingState(email);
  return defaultState;
}

/**
 * Updates and persists the onboarding state for a user.
 */
export function saveOnboardingState(email, updates = {}) {
  const key = getOnboardingStateKey(email);
  const current = getOnboardingState(email);

  const nextState = {
    ...current,
    ...updates,
    lastUpdatedAt: new Date().toISOString()
  };

  // Ensure currentStep stays bounded between 1 and ONBOARDING_TOTAL_STEPS
  if (typeof nextState.currentStep === 'number') {
    nextState.currentStep = Math.max(1, Math.min(ONBOARDING_TOTAL_STEPS, nextState.currentStep));
  }

  inMemoryStore.set(key, nextState);
  safeSetStorageJson(key, nextState);
  return nextState;
}

/**
 * Pauses the onboarding journey without losing progress.
 */
export function pauseOnboarding(email) {
  const current = getOnboardingState(email);
  const stepDef = getStepById(current.currentStep);
  const stepId = stepDef?.key || `step_${current.currentStep}`;

  try {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.ONBOARDING_PAUSED,
      {
        stepId,
        stepIndex: current.currentStep
      },
      email ? { userContext: { email } } : {}
    );
  } catch (_) {}

  return saveOnboardingState(email, { isPaused: true });
}

/**
 * Resumes the onboarding journey from the paused or dismissed state.
 */
export function resumeOnboarding(email) {
  return saveOnboardingState(email, {
    isPaused: false,
    isDismissed: false,
    isDockCollapsed: false,
    userToggledDock: true
  });
}

/**
 * Closes/dismisses the onboarding dock completely until re-launched.
 */
export function dismissOnboarding(email) {
  const current = getOnboardingState(email);
  const stepDef = getStepById(current.currentStep);
  const stepId = stepDef?.key || `step_${current.currentStep}`;

  try {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.ONBOARDING_DISMISSED,
      {
        stepId,
        stepIndex: current.currentStep
      },
      email ? { userContext: { email } } : {}
    );
  } catch (_) {}

  return saveOnboardingState(email, { isDismissed: true });
}

/**
 * Resets the onboarding state for a user, allowing a fresh start.
 */
export function resetOnboardingState(email, mode = null) {
  const fresh = createDefaultOnboardingState(email);
  if (mode === 'demo' || mode === 'real') {
    fresh.mode = mode;
    fresh.userToggledDock = true;
  }
  try {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.ONBOARDING_STARTED,
      { mode: fresh.mode || 'default' },
      email ? { userContext: { email } } : {}
    );
  } catch (_) {}
  fresh.hasDispatchedStarted = true;
  return saveOnboardingState(email, fresh);
}

/**
 * Advances the onboarding journey to the next step.
 * Marks the previous step as completed.
 * If at step 10, marks the journey as completed.
 */
export function advanceOnboardingStep(email) {
  const current = getOnboardingState(email);
  const stepToComplete = current.currentStep;

  // Dispatch onboarding_started on first step if not yet recorded
  if (!current.hasDispatchedStarted || stepToComplete === 1) {
    try {
      usageTelemetryService.track(
        TELEMETRY_EVENTS.ONBOARDING_STARTED,
        { mode: current.mode || 'default' },
        email ? { userContext: { email } } : {}
      );
    } catch (_) {}
  }

  const nextCompleted = Array.from(new Set([...(current.completedSteps || []), stepToComplete]));
  const stepDef = getStepById(stepToComplete);
  const stepId = stepDef?.key || `step_${stepToComplete}`;

  // Dispatch onboarding_step_completed ({ stepId, stepIndex, totalSteps: 10 })
  try {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED,
      {
        stepId,
        stepIndex: stepToComplete,
        stepNumber: stepToComplete,
        step: stepToComplete,
        totalSteps: ONBOARDING_TOTAL_STEPS
      },
      email ? { userContext: { email } } : {}
    );
  } catch (_) {}

  if (stepToComplete >= ONBOARDING_TOTAL_STEPS) {
    const startedAtMs = current.startedAt ? new Date(current.startedAt).getTime() : Date.now();
    const durationSec = Math.max(1, Math.round((Date.now() - startedAtMs) / 1000));

    try {
      usageTelemetryService.track(
        TELEMETRY_EVENTS.ONBOARDING_COMPLETED,
        {
          totalSteps: ONBOARDING_TOTAL_STEPS,
          durationSec
        },
        email ? { userContext: { email } } : {}
      );
    } catch (_) {}

    return saveOnboardingState(email, {
      completedSteps: nextCompleted,
      isCompleted: true,
      completedAt: new Date().toISOString(),
      isPaused: false,
      isDismissed: false,
      isDockCollapsed: false,
      userToggledDock: true,
      hasDispatchedStarted: true
    });
  }

  return saveOnboardingState(email, {
    currentStep: stepToComplete + 1,
    completedSteps: nextCompleted,
    isPaused: false,
    isDismissed: false,
    isDockCollapsed: false,
    userToggledDock: true,
    hasDispatchedStarted: true
  });
}

/**
 * Navigates directly to a specific step in the journey.
 */
export function goToOnboardingStep(email, stepNumber) {
  const current = getOnboardingState(email);
  const validStep = Math.max(1, Math.min(ONBOARDING_TOTAL_STEPS, Number(stepNumber) || 1));
  let hasDispatched = current.hasDispatchedStarted;

  if (validStep === 1 && !current.hasDispatchedStarted) {
    try {
      usageTelemetryService.track(
        TELEMETRY_EVENTS.ONBOARDING_STARTED,
        { mode: current.mode || 'default' },
        email ? { userContext: { email } } : {}
      );
    } catch (_) {}
    hasDispatched = true;
  }

  return saveOnboardingState(email, {
    currentStep: validStep,
    isPaused: false,
    isDismissed: false,
    isDockCollapsed: false,
    userToggledDock: true,
    hasDispatchedStarted: hasDispatched
  });
}

/**
 * Records milestone achievements during onboarding (time-to-first-student, time-to-first-report).
 */
export function recordOnboardingMilestone(email, milestoneName) {
  const current = getOnboardingState(email);
  const now = new Date();
  const startedAt = current.startedAt ? new Date(current.startedAt) : now;
  const elapsedSec = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

  const updates = {};
  if (milestoneName === 'first_student' && !current.firstStudentAt) {
    updates.firstStudentAt = now.toISOString();
    updates.timeToFirstStudentSec = elapsedSec;
  } else if (milestoneName === 'first_report' && !current.firstReportAt) {
    updates.firstReportAt = now.toISOString();
    updates.timeToFirstReportSec = elapsedSec;
  }

  if (Object.keys(updates).length > 0) {
    return saveOnboardingState(email, updates);
  }
  return current;
}

export function trackFirstStudentMilestone(email) {
  return recordOnboardingMilestone(email, 'first_student');
}

export function trackFirstReportMilestone(email) {
  return recordOnboardingMilestone(email, 'first_report');
}

/**
 * Sets the collapse/expand state of the guided workspace dock.
 */
export function setOnboardingDockCollapsed(email, isCollapsed) {
  return saveOnboardingState(email, {
    isDockCollapsed: Boolean(isCollapsed),
    userToggledDock: true
  });
}

/* =========================================================================
   Demo Sandbox Data Isolation Storage (Zero-Trust)
   Demo students are NEVER sent to Firestore or saved in general student plans.
   ========================================================================= */

/**
 * Retrieves the local demo student record for the user, or creates a fresh one.
 */
export function getDemoStudent(email) {
  const key = getDemoStudentKey(email);
  const stored = safeGetStorageJson(key, null);

  if (stored && stored.id === 'demo_yonatan_levi') {
    inMemoryStore.set(key, stored);
    return stored;
  }

  if (inMemoryStore.has(key)) {
    return inMemoryStore.get(key);
  }

  const fresh = createFreshDemoStudent();
  saveDemoStudent(email, fresh);
  return fresh;
}

/**
 * Saves updates to the demo student in local sandbox storage.
 * NEVER writes to Firestore cloud.
 */
export function saveDemoStudent(email, studentData) {
  const key = getDemoStudentKey(email);
  const safeData = {
    ...studentData,
    id: 'demo_yonatan_levi',
    isDemo: true,
    lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  };

  inMemoryStore.set(key, safeData);
  safeSetStorageJson(key, safeData);
  return safeData;
}

/**
 * Clears the local demo student record.
 */
export function clearDemoStudent(email) {
  const key = getDemoStudentKey(email);
  inMemoryStore.delete(key);
  safeRemoveStorageItem(key);
}

/**
 * Resets the in-memory fallback store (useful in test teardown).
 */
export function __clearInMemoryStoreForTesting() {
  inMemoryStore.clear();
}
