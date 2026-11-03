# Telemetry Remediation & User Behavior Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the un-wired phantom telemetry events, instrument missing core workflows (sessions, navigation, friction, goals), eliminate redundant error calls, and provide actionable feedback on user behavior.

**Architecture:** Extend existing `usageTelemetryService.track()` calls across UI boundaries; leverage the existing 5-tier Zero-Trust `telemetryPrivacy.ts` pipeline; ensure event contracts strictly validate against `telemetryTaxonomy.ts`; and populate the pre-built aggregations in `telemetryAggregator.ts` and `AdminAnalyticsDashboard.tsx`.

**Tech Stack:** React, TypeScript, Vitest, Firestore, existing TALA Telemetry domain services.

**Spec:** `C:\Users\mreshef\.gemini\antigravity\brain\6f0f8c38-bb74-4c2d-91f2-c507fcf08272\telemetry-review.md`

## Global Constraints

- Never log or pass student names, IDs, phone numbers, free-form diagnoses, or unscrubbed PII.
- Keep UI operations responsive (<100ms); all telemetry writes must remain non-blocking via `usageTelemetryService`.
- Maintain 100% Vitest test pass rate with zero uncovered telemetry paths.
- Mandatory version bump across `package.json`, `telemetryTaxonomy.ts`, and version verification test suites.

## Review Focus

1. Session lifecycle: ensure `session_end` does not block tab close or throw on unload.
2. Form dirty abandonment: ensure navigation without unsaved changes does not trigger false abandonment events.
3. Rapid repeated clicks: ensure debounce window prevents duplicate event floods.
4. Privacy scrubber: verify new event properties (e.g. screen names, goal domains) are strictly categorized without PII leaks.
5. Network offline: verify events buffer safely into ring buffer/IndexedDB when offline.

---

### Task 1: Wire Session Lifecycle & Navigation Tracking

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/domain/telemetryTaxonomy.ts`
- Test: `src/__tests__/telemetrySessionAndNav.test.ts`

**Interfaces:**
- Consumes: `usageTelemetryService.track(eventName, properties)`
- Produces: Emitted `session_start`, `session_end`, and `navigate_screen` events

- [ ] **Step 1: Write the failing tests for session and screen tracking**
Add tests asserting that mounting the app records `session_start`, screen transitions trigger `navigate_screen` with sanitized screen IDs, and window unload signals `session_end`.

- [ ] **Step 2: Run tests to verify they fail**
Run: `npx vitest run src/__tests__/telemetrySessionAndNav.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement session lifecycle & screen navigation hooks in `App.tsx`**
Initialize `session_start` in the root `useEffect`. Listen to route/screen state changes to dispatch `navigate_screen`. Attach `visibilitychange` and `beforeunload` to flush `session_end`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/telemetrySessionAndNav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
Run: `git add src/App.tsx src/domain/telemetryTaxonomy.ts src/__tests__/telemetrySessionAndNav.test.ts && git commit -m "feat(telemetry): wire session lifecycle and navigation events"`

---

### Task 2: Wire Core Workflow Events (`goal_created`, `goal_updated`, `parent_voice_link_created`)

**Files:**
- Modify: `src/components/EcologicalWorkPlanForm.tsx`
- Modify: `src/components/ParentVoiceControl.tsx`
- Test: `src/__tests__/telemetryWorkflowEvents.test.ts`

**Interfaces:**
- Consumes: Goal save/update callbacks, Parent Voice token generation handlers
- Produces: Emitted `goal_created`, `goal_updated`, `parent_voice_link_created`

- [ ] **Step 1: Write the failing test for workflow events**
Test that adding a goal, updating an existing goal, and creating a parent link trigger the respective telemetry events with non-PII metadata (domain, goal index, timeframe).

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/telemetryWorkflowEvents.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement event dispatches in goal and parent voice handlers**
Call `usageTelemetryService.track('goal_created', { domain, isAIAssisted })` and `track('goal_updated', { domain })` inside `EcologicalWorkPlanForm.tsx`. Call `track('parent_voice_link_created', {})` inside `ParentVoiceControl.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/__tests__/telemetryWorkflowEvents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
Run: `git add src/components/EcologicalWorkPlanForm.tsx src/components/ParentVoiceControl.tsx src/__tests__/telemetryWorkflowEvents.test.ts && git commit -m "feat(telemetry): wire goal and parent voice workflow events"`

---

### Task 3: Instrument UX Friction Tracking (`form_dirty_abandoned`, `search_zero_results`, `action_failed_repeatedly`)

**Files:**
- Modify: `src/components/EcologicalWorkPlanForm.tsx`
- Modify: `src/components/GoalBankPage.tsx`
- Modify: `src/services/usageTelemetryService.ts`
- Test: `src/__tests__/telemetryFriction.test.ts`

**Interfaces:**
- Consumes: Dirty form state, search result counts, action failure threshold
- Produces: Emitted `form_dirty_abandoned`, `search_zero_results`, `action_failed_repeatedly`

- [ ] **Step 1: Write the failing test for friction detection**
Test that closing a dirty form without saving logs `form_dirty_abandoned`, an empty search query result logs `search_zero_results`, and 3 consecutive failed saves log `action_failed_repeatedly`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/telemetryFriction.test.ts`
Expected: FAIL

- [ ] **Step 3: Wire friction emission in dirty unmount and search handlers**
Add dirty check on component unmount in `EcologicalWorkPlanForm.tsx`. In `GoalBankPage.tsx`, dispatch `search_zero_results` when query returns 0 matches. In service/component level, count consecutive action failures.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/__tests__/telemetryFriction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
Run: `git add src/components/EcologicalWorkPlanForm.tsx src/components/GoalBankPage.tsx src/services/usageTelemetryService.ts src/__tests__/telemetryFriction.test.ts && git commit -m "feat(telemetry): wire UX friction and dead-end search events"`

---

### Task 4: Deduplicate Redundancies & Enforce Telemetry Boundary

**Files:**
- Modify: `src/components/EcologicalWorkPlanForm.tsx`
- Modify: `src/App.tsx`
- Test: `src/__tests__/telemetryDeduplication.test.ts`

**Interfaces:**
- Consumes: Error handling hooks, chat session trigger
- Produces: Single operational health error in `reportHealthEvent` and cleaned single chat session trigger

- [ ] **Step 1: Write test verifying no double-event dispatch on errors or chat start**
Assert that AI client errors log to health telemetry without generating a redundant duplicate `client_js_error` in usage telemetry, and chat session start fires exactly once.

- [ ] **Step 2: Run test to verify it fails or exposes duplicate calls**
Run: `npx vitest run src/__tests__/telemetryDeduplication.test.ts`
Expected: FAIL (detects dual emission)

- [ ] **Step 3: Refactor error handlers and clean dead helper**
Remove duplicate `client_js_error` in `EcologicalWorkPlanForm.tsx` where `reportHealthEvent(AI_CLIENT_PROCESSING_ERROR)` is already active. Consolidate chat session start calls in `App.tsx`.

- [ ] **Step 4: Run test to verify single emission**
Run: `npx vitest run src/__tests__/telemetryDeduplication.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
Run: `git add src/components/EcologicalWorkPlanForm.tsx src/App.tsx src/__tests__/telemetryDeduplication.test.ts && git commit -m "refactor(telemetry): eliminate duplicate error tracking and dead helpers"`

---

### Task 5: Version Bump & Verification

**Files:**
- Modify: `package.json`
- Modify: `src/domain/telemetryTaxonomy.ts`
- Modify: `src/__tests__/appVersionSynchronization.test.js`

- [ ] **Step 1: Bump patch version across taxonomy and package**
Update version in `package.json` and `CURRENT_APP_VERSION` in `telemetryTaxonomy.ts`. Update synchronization test suites.

- [ ] **Step 2: Run all test suites and production build**
Run: `npx vitest run`
Run: `npm run build`
Expected: 100% tests pass, zero build errors.

- [ ] **Step 3: Commit version bump**
Run: `git add package.json src/domain/telemetryTaxonomy.ts src/__tests__/appVersionSynchronization.test.js && git commit -m "chore(release): bump version for telemetry remediation"`
