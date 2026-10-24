# God-Component Domain Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move pure business logic out of `src/EcologicalWorkPlanForm.jsx` (6,747 lines, 48 `useState`) and `src/App.jsx` (4,294 lines, 46 `useState`) into tested modules under `src/domain/` and `src/services/`. The components keep state, effects, `window.confirm`/`alert`, timers and JSX only.

**Architecture:** Each slice adds one module of pure functions `(state, input) => nextState` plus a test file, then swaps the component's inline code for calls to it. No JSX is restructured and no hooks are introduced. Slices are ordered from lowest risk (pure helpers at module scope) to highest (handlers shared between App and Form).

**Tech Stack:** React 19, Vite 8, Vitest 5, plain JS (ESM). No new dependencies.

**Spec:** The architecture finding "Massive God Components (Deep Modules Violation)": extract business logic into pure domain services in `src/domain/` with narrow interfaces, leaving React components as thin view layers.

## Global Constraints

- Behavior-preserving refactor. The only intended behavior changes are the two marked **⚠ DECISION** (Task 5).
- No new npm dependencies.
- Hebrew string literals are moved **verbatim** (byte-for-byte). Never retype them; cut and paste.
- Pure functions must not call `window`, `document`, `localStorage`, `setTimeout` or React. Time-dependent functions take `now = new Date()` as their last parameter so tests can pin it.
- Shared constants (define once, in `src/domain/yearReport.js`, Task 1):
  - `DEFAULT_SCHOOL_YEAR = 'תשפ"ו (2025-2026)'`
  - `DEFAULT_PLAN_TYPE = 'תל"א (תוכנית לימודים אישית)'`
  - `TACHI_PLAN_TYPE = 'תח"י (תוכנית חינוכית יחידנית)'`
- Test files go in `src/__tests__/<module>.test.js` and use `import { describe, it, expect, vi } from 'vitest'`.
- After **every** task: `npx vitest run` shows all tests passing (baseline is 222) and `npm run build` succeeds.
- Work on one branch, `refactor/god-component-domain-extraction`, with one commit per task. Ship once at the end (Task 9) using the TALA 6-step protocol in `GEMINI.md`.
- Line numbers below are from commit `9b5ad0f` and will drift as slices land. Find code by the quoted identifier, not by line number.

## Review Focus

1. **Legacy student with no `reportsByPlanType` and only תח"י strengths, opened as תל"א.** It must migrate the strengths into the תח"י slot and show an empty תל"א form. Pinned in Task 1 (`normalizeStudentForForm` legacy test).
2. **Switching plan type or school year and back.** The original text must come back intact, with nothing dropped. Pinned in Task 2 (round-trip tests).
3. **A locked report still accepts evaluation and status-report edits.** Pinned in Task 3 (`LOCKED_EDITABLE_FIELDS` test).
4. **Mixed-case or padded colleague emails** (`' A@B.com '`). Sharing and user patching must match case-insensitively and store the email lowercased. Pinned in Task 4 and Task 8.
5. **AI proxy returns prose or fenced JSON instead of an object.** The response must be parsed or passed through, never thrown. Pinned in Task 6 (`parseAiJsonResult` tests).

---

### Task 1: Year-report snapshot model (`src/domain/yearReport.js`)

Today the "snapshot the active report into `reportsByYear` + `reportsByPlanType`" block is copy-pasted 9 times in the Form. The module-scope helpers above the component are already pure but can't be imported or tested.

**Files:**
- Create: `src/domain/yearReport.js`
- Modify: `src/EcologicalWorkPlanForm.jsx`
  - delete the module-scope helpers at lines 129–271: `DURATION_TSHIRT_OPTIONS` stays in the Form; move everything else
  - delete `buildNormalizedStudentData` (lines 318–442), which is pure and only lives inside the component by accident
- Modify: `src/__tests__/coreDomain.test.js:46`, changing the import path of `buildFreshReportForPlanType` to `'../domain/yearReport'`
- Test: `src/__tests__/yearReport.test.js`

**Interfaces:**
- Produces:
  - `DEFAULT_SCHOOL_YEAR`, `DEFAULT_PLAN_TYPE`, `TACHI_PLAN_TYPE` (strings above)
  - `getPlanTypeStorageKey(schoolYear?: string, planType?: string) => string` (`"<year>__tala" | "<year>__tachi"`)
  - `buildFreshReportForPlanType(planType?: string, stage?: 'kindergarten'|'school') => Report`
  - `extractYearReportFromFormData(data) => Report`
  - `isRawFreeTextAlreadyAnalyzed(data) => boolean`
  - `hasContentInYearReport(report) => boolean`
  - `normalizeStudentForForm(student) => FormData` (the renamed `buildNormalizedStudentData`, body unchanged)
  - `syncActiveReportSnapshot(data) => FormData`: returns `{ ...data, reportsByYear: {...data.reportsByYear, [yr]: snap}, reportsByPlanType: {...data.reportsByPlanType, [getPlanTypeStorageKey(yr, data.planType)]: snap} }` where `yr = data.schoolYear || DEFAULT_SCHOOL_YEAR` and `snap = extractYearReportFromFormData(data)`

- [x] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCHOOL_YEAR, DEFAULT_PLAN_TYPE, TACHI_PLAN_TYPE,
  getPlanTypeStorageKey, extractYearReportFromFormData, syncActiveReportSnapshot,
  hasContentInYearReport, isRawFreeTextAlreadyAnalyzed, normalizeStudentForForm
} from '../domain/yearReport';

const Y2 = 'תשפ"ז (2026-2027)';

describe('yearReport', () => {
  it('builds storage keys per plan type with a default year', () => {
    expect(getPlanTypeStorageKey(Y2, TACHI_PLAN_TYPE)).toBe(`${Y2}__tachi`);
    expect(getPlanTypeStorageKey(undefined, DEFAULT_PLAN_TYPE)).toBe(`${DEFAULT_SCHOOL_YEAR}__tala`);
  });

  it('syncActiveReportSnapshot writes the same snapshot to both maps and keeps other years', () => {
    const data = { schoolYear: Y2, planType: DEFAULT_PLAN_TYPE, teacherFreeText: 'טקסט',
      reportsByYear: { old: { teacherFreeText: 'ישן' } }, reportsByPlanType: {} };
    const out = syncActiveReportSnapshot(data);
    const snap = extractYearReportFromFormData(data);
    expect(out.reportsByYear[Y2]).toEqual(snap);
    expect(out.reportsByPlanType[`${Y2}__tala`]).toEqual(snap);
    expect(out.reportsByYear.old.teacherFreeText).toBe('ישן');
    expect(data.reportsByYear[Y2]).toBeUndefined(); // input not mutated
  });

  it('hasContentInYearReport ignores whitespace-only goals', () => {
    expect(hasContentInYearReport(null)).toBe(false);
    expect(hasContentInYearReport({ goals: [{ title: '  ' }] })).toBe(false);
    expect(hasContentInYearReport({ statusReportSections: [{}] })).toBe(true);
  });

  it('isRawFreeTextAlreadyAnalyzed needs free text plus some derived content', () => {
    expect(isRawFreeTextAlreadyAnalyzed({ teacherFreeText: 'x' })).toBe(false);
    expect(isRawFreeTextAlreadyAnalyzed({ teacherFreeText: 'x', strengthsExisting: 'y' })).toBe(true);
  });

  it('normalizeStudentForForm migrates legacy תח"י-only strengths out of a תל"א report', () => {
    const out = normalizeStudentForForm({ id: 's1', schoolYear: Y2, planType: DEFAULT_PLAN_TYPE, strengthsExisting: 'כוח' });
    expect(out.strengthsExisting).toBe('');
    expect(out.reportsByPlanType[`${Y2}__tachi`].strengthsExisting).toBe('כוח');
    expect(out.reportsByPlanType[`${Y2}__tachi`].planType).toBe(TACHI_PLAN_TYPE);
  });
});
```

- [x] **Step 2: Run, expect FAIL** (`Failed to resolve import "../domain/yearReport"`)

Run: `npx vitest run src/__tests__/yearReport.test.js`

- [x] **Step 3: Create `src/domain/yearReport.js`.** Move the helpers verbatim, importing `buildDefaultTalaProfileRows`, `isTalaPlanType`, `adaptGoalToGender`, `ENVIRONMENTS_LIST` from `../goalBankData`, `hasPopulatedTalaProfile` from `../export/wordAndPrintBuilders`, `detectStudentStage` from `../studentStage.js`, and `getDefaultEnvironmentForStage` and `getDefaultPartnersForStage` from `./stageGuard.js`. Replace the inline year and plan-type literals inside the moved code with the three constants. Add `syncActiveReportSnapshot`.

- [x] **Step 4: Rewire the Form.** Import the module. Replace `buildNormalizedStudentData(` with `normalizeStudentForForm(` at its 3 call sites. Replace every block of the shape `{ ...X, reportsByYear: { ...X.reportsByYear, [yr]: extractYearReportFromFormData(X) }, reportsByPlanType: { ...X.reportsByPlanType, [getPlanTypeStorageKey(yr, X.planType)]: <same snapshot> } }` with `syncActiveReportSnapshot(X)`. Expected sites are inside the auto-save effect (×2), `handleToggleReportLock`, `handleAutoUnlockReport`, `handleRolloverToNextYear`, `handleToggleShareColleague`, the two reverse-engineer saves (~1934, ~2012) and `handleSaveProgress`. Leave `handlePlanTypeChange` and `handleSchoolYearChange` alone (Task 2), and leave the read at ~3009. If a site adds extra keys next to the maps, keep them: `{ ...syncActiveReportSnapshot(X), extra }`.

- [x] **Step 5: Verify.** Run `npx vitest run`, expect all passing (222 + 5). Then run `npm run build`, expect `✓ built`.

- [x] **Step 6: Commit** with `refactor(domain): extract year-report snapshot model from EcologicalWorkPlanForm`

---

### Task 2: Plan-type and school-year switching (`src/domain/reportSwitching.js`)

`handlePlanTypeChange` and `handleSchoolYearChange` (lines 875–1033) call `setShowFullDocPreview`/`setIsFreeTextCollapsed` *inside* a `setFormData` updater, which is a React purity violation (StrictMode double-invokes updaters). Make the transition pure and derive the UI flags from its result.

**Files:**
- Create: `src/domain/reportSwitching.js`
- Modify: `src/EcologicalWorkPlanForm.jsx` (`handlePlanTypeChange`, `handleSchoolYearChange`)
- Test: `src/__tests__/reportSwitching.test.js`

**Interfaces:**
- Consumes: Task 1's `getPlanTypeStorageKey`, `extractYearReportFromFormData`, `hasContentInYearReport`, `buildFreshReportForPlanType`, constants.
- Produces:
  - `switchPlanType(prev, newPlanType) => FormData`: returns `prev` (same reference) when the plan type is unchanged
  - `switchSchoolYear(prev, newYear) => FormData`: returns `prev` (same reference) when the year is unchanged

- [x] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { switchPlanType, switchSchoolYear } from '../domain/reportSwitching';
import { DEFAULT_PLAN_TYPE, TACHI_PLAN_TYPE, DEFAULT_SCHOOL_YEAR } from '../domain/yearReport';

const Y2 = 'תשפ"ז (2026-2027)';
const base = { id: 's1', schoolYear: DEFAULT_SCHOOL_YEAR, planType: DEFAULT_PLAN_TYPE, gender: 'girl',
  stage: 'school', teacherFreeText: 'מקור', schoolName: 'בית ספר א', goals: [{ id: 'g1', title: 'מטרה' }],
  reportsByYear: {}, reportsByPlanType: {} };

describe('switchPlanType', () => {
  it('is a no-op (same reference) for the same plan type', () => {
    expect(switchPlanType(base, DEFAULT_PLAN_TYPE)).toBe(base);
  });
  it('opens an empty תח"י report and stores the תל"א one', () => {
    const next = switchPlanType(base, TACHI_PLAN_TYPE);
    expect(next.planType).toBe(TACHI_PLAN_TYPE);
    expect(next.teacherFreeText).toBe('');
    expect(next.goals).toEqual([]);
    expect(next.reportsByPlanType[`${DEFAULT_SCHOOL_YEAR}__tala`].teacherFreeText).toBe('מקור');
  });
  it('round-trips back without losing data', () => {
    const back = switchPlanType(switchPlanType(base, TACHI_PLAN_TYPE), DEFAULT_PLAN_TYPE);
    expect(back.teacherFreeText).toBe('מקור');
    expect(back.goals.map((g) => g.title)).toEqual(['מטרה']);
  });
});

describe('switchSchoolYear', () => {
  it('is a no-op for the same year', () => {
    expect(switchSchoolYear(base, DEFAULT_SCHOOL_YEAR)).toBe(base);
  });
  it('creates a fresh report for an unseen year and stores the current one', () => {
    const next = switchSchoolYear(base, Y2);
    expect(next.schoolYear).toBe(Y2);
    expect(next.teacherFreeText).toBe('');
    expect(next.reportsByYear[DEFAULT_SCHOOL_YEAR].teacherFreeText).toBe('מקור');
  });
  it('round-trips back', () => {
    expect(switchSchoolYear(switchSchoolYear(base, Y2), DEFAULT_SCHOOL_YEAR).teacherFreeText).toBe('מקור');
  });
  it('keeps team fields from prev when the stored target report lacks them', () => {
    const withY2 = { ...base, reportsByYear: { [Y2]: { teacherFreeText: 'ב' } } };
    const next = switchSchoolYear(withY2, Y2);
    expect(next.teacherFreeText).toBe('ב');
    expect(next.schoolName).toBe('בית ספר א');
  });
});
```

- [x] **Step 2: Run, expect FAIL** (module not found)

Run: `npx vitest run src/__tests__/reportSwitching.test.js`

- [x] **Step 3: Implement both functions in `src/domain/reportSwitching.js`.** Their bodies are the current `setFormData((prev) => {...})` updater bodies, minus the `setShow…`/`setIsFreeText…` calls.

- [x] **Step 4: Rewire the Form.** Each handler becomes: guard → `const next = switchX(formData, value); if (next === formData) return; setFormData(next); setShowFullDocPreview(Boolean(next.isLocked)); setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(next));`, followed by the existing resets (`setOpenPickerGoalId(null)` etc.). Keep the `if (formData.isLocked) return;` guard in `handlePlanTypeChange`. (For a fresh year, `next.isLocked` is false and `isRawFreeTextAlreadyAnalyzed(next)` is false, so this matches the old hard-coded `false/false`.)

- [x] **Step 5: Verify** with `npx vitest run` (all passing) and `npm run build`.

- [x] **Step 6: Commit** with `refactor(domain): extract pure plan-type and school-year switching`

---

### Task 3: Field and goal edit rules (`src/domain/workPlanEdits.js`)

**Files:**
- Create: `src/domain/workPlanEdits.js`
- Modify: `src/EcologicalWorkPlanForm.jsx`: `handleFieldChange`, `handleTalaProfileRowChange`, `handleToggleTalaFocusDomain`, `handleGoalChange`, `handleToggleGoalLock`, `handleDeleteGoalRow`, `handleAddGoalRow` (lines 1036–1223)
- Test: `src/__tests__/workPlanEdits.test.js`

**Interfaces:**
- Produces:
  - `LOCKED_EDITABLE_FIELDS: Set<string>`, containing `'evalReportFreeText','evalReportSummary','statusReportSections','statusReportUpdatedAt'`
  - `EVAL_GOAL_FIELDS: Set<string>`, containing `'achievementStatus','midYearEvaluation','endYearEvaluation'`
  - `applyFieldChange(prev, field, value, now = new Date()) => FormData`, which includes the stage auto-detect branch
  - `updateTalaProfileRow(prev, rowIdOrDomain, field, value) => FormData`
  - `toggleFocusDomain(prev, domain) => FormData`
  - `applyGoalChange(prev, goalId, field, value) => FormData`: non-eval fields also set `isTeacherModified: true`
  - `toggleGoalAiLock(prev, goalId) => FormData`
  - `removeGoalRow(prev, goalId) => FormData`: appends a non-empty removed goal to `removedAiGoals` as `{ id, environment, title, activityParticipation, aiSnapshot }` (trimmed)
  - `buildNewGoalRow({ id, stage, isTalaMode, isKindergarten, plus3Months }) => Goal`

- [x] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { LOCKED_EDITABLE_FIELDS, applyFieldChange, applyGoalChange, removeGoalRow, toggleFocusDomain } from '../domain/workPlanEdits';

const now = new Date('2026-10-24T10:00:00Z');

describe('workPlanEdits', () => {
  it('locked reports still allow evaluation/status fields only', () => {
    expect(LOCKED_EDITABLE_FIELDS.has('evalReportSummary')).toBe(true);
    expect(LOCKED_EDITABLE_FIELDS.has('statusReportSections')).toBe(true);
    expect(LOCKED_EDITABLE_FIELDS.has('teacherFreeText')).toBe(false);
  });
  it('explicit stage choice is stamped as user_explicit', () => {
    const next = applyFieldChange({ stage: 'school' }, 'stage', 'kindergarten', now);
    expect(next).toMatchObject({ stage: 'kindergarten', stageSource: 'user_explicit',
      stageReason: 'בחירת משתמש: גן ילדים', stageUpdatedAt: now.toISOString() });
  });
  it('does not auto-detect stage over an explicit user choice', () => {
    const prev = { stage: 'school', stageSource: 'user_explicit' };
    expect(applyFieldChange(prev, 'educationalFramework', 'גן חובה', now).stage).toBe('school');
  });
  it('eval edits do not mark a goal as teacher-modified; content edits do', () => {
    const prev = { goals: [{ id: 'g1' }] };
    expect(applyGoalChange(prev, 'g1', 'midYearEvaluation', 'x').goals[0].isTeacherModified).toBeUndefined();
    expect(applyGoalChange(prev, 'g1', 'title', 'x').goals[0].isTeacherModified).toBe(true);
  });
  it('removing a non-empty goal records it; an empty goal is not recorded', () => {
    const prev = { removedAiGoals: [], goals: [{ id: 'g1', title: ' מטרה ', environment: 'כיתה' }, { id: 'g2' }] };
    const a = removeGoalRow(prev, 'g1');
    expect(a.goals.map((g) => g.id)).toEqual(['g2']);
    expect(a.removedAiGoals[0]).toMatchObject({ id: 'g1', title: 'מטרה', environment: 'כיתה' });
    expect(removeGoalRow(prev, 'g2').removedAiGoals).toEqual([]);
  });
  it('toggles focus domains', () => {
    expect(toggleFocusDomain({ talaFocusDomains: ['רגשי'] }, 'רגשי').talaFocusDomains).toEqual([]);
    expect(toggleFocusDomain({}, 'חברתי').talaFocusDomains).toEqual(['חברתי']);
  });
});
```

- [x] **Step 2: Run, expect FAIL**

Run: `npx vitest run src/__tests__/workPlanEdits.test.js`

- [x] **Step 3: Implement in `src/domain/workPlanEdits.js`.** Bodies are the current `setFormData` updater bodies. `buildNewGoalRow` reproduces the object in `handleAddGoalRow`, with `duration: \`3 חודשים (עד ${plus3Months})\``.

- [x] **Step 4: Rewire the handlers.** Keep the lock guards, `handleAutoUnlockReport('evalEdit')`, `window.confirm` and picker state calls in the component. Each `setFormData((prev) => …)` becomes `setFormData((prev) => fn(prev, …))`.

- [x] **Step 5: Verify** with `npx vitest run` and `npm run build`.

- [x] **Step 6: Commit** with `refactor(domain): extract work-plan field and goal edit rules`

---

### Task 4: Team sharing and status-report sections

**Files:**
- Modify: `src/domain/workPlanEdits.js` (add functions)
- Modify: `src/EcologicalWorkPlanForm.jsx`: `handleToggleShareColleague`, `handleUpdateStatusSectionContent`, `handleRemoveStatusSection`, `handleAddManualStatusSection`
- Test: `src/__tests__/workPlanEdits.test.js` (append)

**Interfaces:**
- Consumes: Task 1's `syncActiveReportSnapshot`.
- Produces:
  - `applyShareToggle(data, colleagueEmail, actor: {name?, email?}, nowStamp: string) => { next: FormData, cleanEmail: string, isNewlyShared: boolean } | null`: `null` when the email is blank; `next` is already passed through `syncActiveReportSnapshot`
  - `updateStatusSection(prev, sectionNumber, content) => FormData`
  - `removeStatusSection(prev, sectionNumber) => FormData`
  - `addManualStatusSection(prev, sectionNumber) => FormData`: returns `prev` for unknown, zero or duplicate numbers; result sorted by `sectionNumber`; new item `{ id: \`status_sec_${n}\`, sectionNumber: n, title: schema.title, content: '' }`

- [ ] **Step 1: Write the failing tests**

```js
import { applyShareToggle, addManualStatusSection } from '../domain/workPlanEdits';
import { STATUS_REPORT_SECTIONS_SCHEMA } from '../goalBankData';

describe('sharing & status sections', () => {
  it('normalizes and toggles colleague emails', () => {
    const r1 = applyShareToggle({ sharedWith: [], sharedReadBy: ['a@b.com'] }, ' A@B.com ', { name: 'זיוית' }, '24.10.26');
    expect(r1).toMatchObject({ cleanEmail: 'a@b.com', isNewlyShared: true });
    expect(r1.next.sharedWith).toEqual(['a@b.com']);
    expect(r1.next.sharedAtByEmail['a@b.com']).toBe('24.10.26');
    expect(r1.next.sharedReadBy).toEqual([]);
    const r2 = applyShareToggle(r1.next, 'a@b.com', {}, 'x');
    expect(r2.isNewlyShared).toBe(false);
    expect(r2.next.sharedWith).toEqual([]);
    expect(applyShareToggle({}, '   ', {}, 'x')).toBeNull();
  });
  it('adds a manual status section once, sorted; ignores unknown numbers', () => {
    const [first, second] = STATUS_REPORT_SECTIONS_SCHEMA;
    const a = addManualStatusSection({ statusReportSections: [] }, String(second.sectionNumber));
    const b = addManualStatusSection(a, first.sectionNumber);
    expect(b.statusReportSections.map((s) => s.sectionNumber)).toEqual([first.sectionNumber, second.sectionNumber]);
    expect(addManualStatusSection(b, first.sectionNumber)).toBe(b);
    expect(addManualStatusSection(b, 9999)).toBe(b);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Bodies are moved from the four handlers. The component computes `nowStamp` with the existing `toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })` call and keeps the `savedSnapshotRef`, `onSaveStudentPlan` and `onNotifySharedColleague(formData.id, cleanEmail, isNewlyShared)` calls.
- [ ] **Step 4: Verify** with `npx vitest run` and `npm run build`.
- [ ] **Step 5: Commit** with `refactor(domain): extract team sharing and status-section operations`

---

### Task 5: Bank goal → student goal, de-duplicated (`src/domain/bankGoalApplication.js`)

Form `handleSelectGoalFromBank` (lines 1226–1305) and App `handleAddBankGoalToStudent` (lines 1453–1579) both personalize a bank item for a student, and they have drifted apart.

> **⚠ DECISION 1:** App passes `defaultOpportunities` through `adaptTextToGender`; Form does not. This plan unifies on **App's behavior**, so a girl's opportunities text gets feminine inflection in the Form too. This is a bug fix and a user-visible change.
>
> **⚠ DECISION 2:** App writes a partial hand-built `reportsByYear[year]` snapshot. This plan uses `syncActiveReportSnapshot`, which writes the full snapshot to both maps. That's strictly more complete, and the Form re-normalizes on `externalRevision` anyway.

**Files:**
- Create: `src/domain/bankGoalApplication.js`
- Modify: `src/EcologicalWorkPlanForm.jsx` (`handleSelectGoalFromBank`), `src/App.jsx` (`handleAddBankGoalToStudent`)
- Test: `src/__tests__/bankGoalApplication.test.js`

**Interfaces:**
- Consumes: Task 1's `syncActiveReportSnapshot`.
- Produces:
  - `personalizeBankItem(bankItem, student) => { title, activity, objectives, opportunities, evaluation }`. Gender is `student.gender || 'boy'`. First name is the first word of `student.name`, or `'הילדה'`/`'הילד'` when there's no name. Objectives are formatted as `• <adapted>` lines joined with `\n`.
  - `fillGoalRowFromBank(goal, bankItem, student, { fillTemplate = true, isTalaMode = false } = {}) => Goal`. This is Form's per-row mapping. It computes `dateInfo` internally via `resolveStudentAgeAndDateInfo(student, student.teacherFreeText || '')`. Partner fallback is `isTalaMode ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'צוות חינוכי, הורים'`.
  - `appendBankGoalToStudent(student, bankItem, now = new Date()) => { student, added: boolean, goalTitle: string }`. This is App's logic. It returns `{ student /* same ref */, added: false }` when the gendered or raw title already exists. A lone empty goal is replaced. Environment falls back to `ENVIRONMENTS_LIST[0]` and partners to `'צוות הגן, סייעת אישית'`. `lastSavedAt` is HH:MM `he-IL`. The result goes through `syncActiveReportSnapshot`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { personalizeBankItem, fillGoalRowFromBank, appendBankGoalToStudent } from '../domain/bankGoalApplication';
import { adaptTextToGender } from '../goalBankData';

const girl = { id: 's1', name: 'נועה כהן', gender: 'girl', goals: [], schoolYear: 'תשפ"ו (2025-2026)' };
const item = { title: 'ישתתף בשיח', environment: 'כיתה', defaultOpportunities: 'הילד ישחק', suggestedObjectives: ['ימתין לתורו'] };

describe('bankGoalApplication', () => {
  it('personalizes name and gender (including opportunities — DECISION 1)', () => {
    const p = personalizeBankItem(item, girl);
    expect(p.title).toBe(adaptTextToGender(item.title, 'girl'));
    expect(p.opportunities.startsWith('נועה')).toBe(true);
    expect(p.opportunities).toBe(adaptTextToGender('נועה ישחק', 'girl'));
    expect(p.objectives).toBe(`• ${adaptTextToGender('ימתין לתורו', 'girl')}`);
  });
  it('fillTemplate=false only sets title + environment', () => {
    const g = fillGoalRowFromBank({ id: 'g1', objectives: 'קיים' }, item, girl, { fillTemplate: false });
    expect(g).toMatchObject({ environment: 'כיתה', isTeacherModified: true, objectives: 'קיים' });
    expect(g.opportunities).toBeUndefined();
  });
  it('fillTemplate=true keeps teacher text already in the row', () => {
    expect(fillGoalRowFromBank({ id: 'g1', objectives: 'קיים' }, item, girl).objectives).toBe('קיים');
  });
  it('appends once, replaces a lone empty goal, and refuses duplicates', () => {
    const r1 = appendBankGoalToStudent({ ...girl, goals: [{ id: 'empty' }] }, item);
    expect(r1.added).toBe(true);
    expect(r1.student.goals).toHaveLength(1);
    expect(r1.student.reportsByYear['תשפ"ו (2025-2026)'].goals).toHaveLength(1);
    const r2 = appendBankGoalToStudent(r1.student, item);
    expect(r2.added).toBe(false);
    expect(r2.student).toBe(r1.student);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** in `src/domain/bankGoalApplication.js`.
- [ ] **Step 4: Rewire both callers.**
  - **Form:** `setFormData((prev) => ({ ...prev, goals: prev.goals.map((g) => g.id === goalRowId ? fillGoalRowFromBank(g, bankItem, prev, { fillTemplate, isTalaMode }) : g) }))`. Keep `recordGoalInBank` and the facilitating-questions code; use `personalizeBankItem(bankItem, formData).title` for `genderTitle`.
  - **App:** keep the `baseStudent` (unsaved-draft) selection and the locked toast. Call `appendBankGoalToStudent(baseStudent, bankItem)`, `return` if `!added`, then keep the existing `setStudents`/`saveStudentToCloud`/toast/onboarding code.
- [ ] **Step 5: Verify.** Run `npx vitest run` and `npm run build`. Then smoke-test with `npm run dev`: open a girl student, add a bank goal from the Form picker and from the App goal-bank modal, and check that both show feminine text.
- [ ] **Step 6: Commit** with `refactor(domain): unify bank-goal personalization used by App and Form`

---

### Task 6: AI JSON client + summary-table merge

`callGeminiJson` (lines 1545–1581) holds a JSON-salvage parser that can't be tested. The summary-table handler (lines 1584–1689) mixes a prompt template, two merge rules and UI.

**Files:**
- Create: `src/services/aiJsonClient.js`, `src/domain/summaryTable.js`
- Modify: `src/EcologicalWorkPlanForm.jsx` (`callGeminiJson`, `handleSubmitGenerateSummaryTable`)
- Test: `src/__tests__/aiJsonClient.test.js`, `src/__tests__/summaryTable.test.js`

**Interfaces:**
- Produces:
  - `parseAiJsonResult(result) => object | null` (pure). If `result` has no `goals` and `result.raw` is a string, try `JSON.parse(raw)`, then the first `/[\{\[][\s\S]*[\}\]]/` match. Otherwise return `result` unchanged.
  - `callAiJson(promptText, student) => Promise<object|null>`. Masks with `maskPromptForAi(promptText, student)`, sends hints `{ gender, name, idNumber, birthDate, address, phone, educationalFramework }` to `callAiProxyEndpoint({ operation: 'rawPrompt', … })`, then calls `parseAiJsonResult`. Returns `null` on throw.
  - `buildSummaryTablePrompt({ freeText, goals, isKindergarten }) => string`, with the template moved verbatim
  - `applyAiSummary(data, parsed, nowTime) => FormData`
  - `applyLocalSummary(data, engineered, nowTime) => FormData`

- [ ] **Step 1: Write the failing tests**

```js
// aiJsonClient.test.js
import { describe, it, expect, vi } from 'vitest';
vi.mock('../services/aiProxyClient', () => ({ callAiProxyEndpoint: vi.fn() }));
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import { parseAiJsonResult, callAiJson } from '../services/aiJsonClient';

describe('parseAiJsonResult', () => {
  it('parses direct JSON', () => expect(parseAiJsonResult({ raw: '{"a":1}' })).toEqual({ a: 1 }));
  it('salvages fenced JSON from prose', () =>
    expect(parseAiJsonResult({ raw: 'הנה:\n```json\n{"a":1}\n```' })).toEqual({ a: 1 }));
  it('passes through unparseable prose', () => {
    const r = { raw: 'אין כאן JSON' };
    expect(parseAiJsonResult(r)).toBe(r);
  });
  it('passes through structured goal results', () => {
    const r = { goals: [], raw: '{"x":1}' };
    expect(parseAiJsonResult(r)).toBe(r);
  });
});

describe('callAiJson', () => {
  it('masks the student name and returns null on proxy failure', async () => {
    callAiProxyEndpoint.mockRejectedValueOnce(new Error('down'));
    expect(await callAiJson('ספר על נועה כהן', { name: 'נועה כהן', gender: 'girl' })).toBeNull();
    expect(callAiProxyEndpoint.mock.calls[0][0].payload.prompt).not.toContain('נועה כהן');
  });
});
```

```js
// summaryTable.test.js
import { describe, it, expect } from 'vitest';
import { buildSummaryTablePrompt, applyAiSummary } from '../domain/summaryTable';

describe('summaryTable', () => {
  it('embeds free text and numbered goals', () => {
    const p = buildSummaryTablePrompt({ freeText: 'טקסט', goals: [{ environment: 'כיתה', title: 'מטרה' }], isKindergarten: false });
    expect(p).toContain('"טקסט"');
    expect(p).toContain('1. סביבה: כיתה | מטרה: מטרה');
  });
  it('keeps existing focus domains when AI returns an empty list', () => {
    const out = applyAiSummary({ talaFocusDomains: ['רגשי'] }, { talaFocusDomains: [] }, '10:00');
    expect(out).toMatchObject({ talaFocusDomains: ['רגשי'], freeTextAnalyzed: true, status: 'מוכן להדפסה', lastSavedAt: '10:00' });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement both modules.** In the Form, `callGeminiJson` becomes `const callGeminiJson = (promptText) => callAiJson(promptText, formData);`. It's kept as a one-line alias so the other 16 AI call sites stay untouched.
- [ ] **Step 4: Rewire `handleSubmitGenerateSummaryTable`** to `buildSummaryTablePrompt` → `callGeminiJson(formatPromptWithStudentContext(prompt, formData))` → `applyAiSummary`. On a `null` result, fall back to `reverseEngineerRawTextLocally` → `applyLocalSummary`. The UI calls stay in the component.
- [ ] **Step 5: Verify** with `npx vitest run` and `npm run build`.
- [ ] **Step 6: Commit** with `refactor(ai): extract AI JSON client and summary-table merge rules`

---

### Task 7: App student-list view model (`src/domain/studentListView.js`)

**Files:**
- Create: `src/domain/studentListView.js`
- Modify: `src/App.jsx`: derived values at lines 1798–1838 and the framework key at ~786 in `handleOpenSharedReportNotification`
- Test: `src/__tests__/studentListView.test.js`

**Interfaces:**
- Produces:
  - `NO_FRAMEWORK_LABEL = 'ללא מסגרת חינוכית מוגדרת'`
  - `getFrameworkKey(student) => string`: the trimmed framework, or `NO_FRAMEWORK_LABEL`
  - `filterStudentsBySearch(students, query) => Student[]`: substring match on `name` or `educationalFramework`
  - `sortStudentsByName(students) => Student[]` (`localeCompare(…, 'he')`, returns a new array)
  - `sortStudentsByFramework(students) => Student[]` (framework, then name)
  - `groupStudentsByFramework(students) => Array<[frameworkKey, Student[]]>`
  - `resolveBankTargetStudent(userStudents, targetId, selectedId) => Student | null`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { NO_FRAMEWORK_LABEL, filterStudentsBySearch, sortStudentsByFramework, groupStudentsByFramework, resolveBankTargetStudent } from '../domain/studentListView';

const s = [
  { id: '1', name: 'תמר', educationalFramework: 'גן חצב' },
  { id: '2', name: 'אורי', educationalFramework: '' },
  { id: '3', name: 'בן', educationalFramework: 'גן חצב' }
];

describe('studentListView', () => {
  it('filters by name or framework', () => {
    expect(filterStudentsBySearch(s, 'חצב').map((x) => x.id)).toEqual(['1', '3']);
    expect(filterStudentsBySearch(s, '').length).toBe(3);
  });
  it('sorts by framework then name, unassigned under the placeholder label', () => {
    const ids = sortStudentsByFramework(s).map((x) => x.id);
    expect(ids.indexOf('3')).toBeLessThan(ids.indexOf('1'));
    expect(s.map((x) => x.id)).toEqual(['1', '2', '3']); // not mutated
  });
  it('groups unassigned students under NO_FRAMEWORK_LABEL', () => {
    const groups = Object.fromEntries(groupStudentsByFramework(s));
    expect(groups[NO_FRAMEWORK_LABEL].map((x) => x.id)).toEqual(['2']);
  });
  it('resolves bank target: explicit → selected → first → null', () => {
    expect(resolveBankTargetStudent(s, '3', '1').id).toBe('3');
    expect(resolveBankTargetStudent(s, null, '2').id).toBe('2');
    expect(resolveBankTargetStudent(s, 'zz', null).id).toBe('1');
    expect(resolveBankTargetStudent([], null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** in `src/domain/studentListView.js`. Reproduce App's current fallback chain exactly: `find(id === (targetId || selectedId)) || find(id === selectedId) || list[0] || null`.
- [ ] **Step 4: Swap App's inline derivations** for these calls. `frameworkClusters = groupStudentsByFramework(filteredStudents)`. Apply the same filter to the archive search (`filteredArchivedStudents`).
- [ ] **Step 5: Verify** with `npx vitest run` and `npm run build`.
- [ ] **Step 6: Commit** with `refactor(domain): extract student list filtering, sorting and grouping`

---

### Task 8: App survey/usage rules + admin bank-goal payload

**Files:**
- Create: `src/domain/userEngagement.js`, `src/domain/goalBankAdmin.js`
- Modify: `src/App.jsx`: `handleSubmitUserSurvey`, `handleDismissUserSurveyPermanently`, the usage-tracker `useEffect` (lines 1012–1051), `handleSaveAdminBankGoal` (lines 1628–1697)
- Test: `src/__tests__/userEngagement.test.js`, `src/__tests__/goalBankAdmin.test.js`

**Interfaces:**
- Produces (`userEngagement.js`):
  - `SURVEY_TICK_SECONDS = 30`, `SURVEY_THRESHOLD_SECONDS = 480`, `SURVEY_THRESHOLD_WITH_STUDENT_SECONDS = 180`
  - `isSurveyEligible(user, snoozedInSession) => boolean`, which captures the early-return conditions of the effect (admin, `mustChangePassword`, unsigned trial NDA, completed, dismissed, snoozed)
  - `advanceUsageEntry(entry | undefined, nowMs) => { firstSeenAt, activeSeconds }` (+30)
  - `shouldPromptSurvey(activeSeconds, ownedStudentCount) => boolean`
  - `patchUserByEmail(users, email, patch) => User[]` (case-insensitive)
  - `buildSurveySummaryNotes(payload) => string`, with labels moved verbatim and joined by `' | '`
- Produces (`goalBankAdmin.js`):
  - `buildAdminBankGoalPayload(editingBankGoal) => { title, stages, environment, usageCount, defaultActivity, suggestedObjectives, defaultOpportunities, defaultPartners, defaultDuration, defaultEvaluation }`. `stages` defaults to `['kindergarten']`. `environment = canonicalizeEnvironment(raw) || KINDERGARTEN_ENVIRONMENTS[0]`. `suggestedObjectives` comes from `suggestedObjectivesText`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { isSurveyEligible, advanceUsageEntry, shouldPromptSurvey, patchUserByEmail, buildSurveySummaryNotes } from '../domain/userEngagement';

describe('userEngagement', () => {
  it('eligibility gates', () => {
    expect(isSurveyEligible({ role: 'admin' }, false)).toBe(false);
    expect(isSurveyEligible({ role: 'user', isTrialUser: true, ndaSigned: false }, false)).toBe(false);
    expect(isSurveyEligible({ role: 'user', surveyDismissed: true }, false)).toBe(false);
    expect(isSurveyEligible({ role: 'user' }, true)).toBe(false);
    expect(isSurveyEligible({ role: 'user', email: 'a@b.com' }, false)).toBe(true);
  });
  it('advances usage by 30s and seeds firstSeenAt', () => {
    expect(advanceUsageEntry(undefined, 1000)).toEqual({ firstSeenAt: 1000, activeSeconds: 30 });
    expect(advanceUsageEntry({ firstSeenAt: 5, activeSeconds: 60 }, 1000)).toEqual({ firstSeenAt: 5, activeSeconds: 90 });
  });
  it('survey thresholds: 480s, or 180s with ≥1 owned student', () => {
    expect(shouldPromptSurvey(479, 0)).toBe(false);
    expect(shouldPromptSurvey(480, 0)).toBe(true);
    expect(shouldPromptSurvey(180, 1)).toBe(true);
    expect(shouldPromptSurvey(179, 1)).toBe(false);
  });
  it('patches users case-insensitively', () => {
    const out = patchUserByEmail([{ email: 'A@b.com' }, { email: 'c@d.com' }], 'a@B.com', { surveyDismissed: true });
    expect(out[0].surveyDismissed).toBe(true);
    expect(out[1].surveyDismissed).toBeUndefined();
  });
  it('summary notes default missing ratings to 5 and skip empty free text', () => {
    const notes = buildSurveySummaryNotes({ ratings: {}, recommendToColleaguesAndManager: 'כן' });
    expect(notes).toContain('קלות שימוש: 5/5');
    expect(notes).not.toContain('משוב:');
  });
});
```

```js
import { describe, it, expect } from 'vitest';
import { buildAdminBankGoalPayload } from '../domain/goalBankAdmin';
import { KINDERGARTEN_ENVIRONMENTS } from '../goalBankData';

describe('buildAdminBankGoalPayload', () => {
  it('trims title, defaults stages and environment', () => {
    const p = buildAdminBankGoalPayload({ title: '  מטרה ', environment: '', suggestedObjectivesText: 'א' });
    expect(p).toMatchObject({ title: 'מטרה', stages: ['kindergarten'], environment: KINDERGARTEN_ENVIRONMENTS[0], suggestedObjectives: 'א' });
  });
});
```

(Before writing, confirm `KINDERGARTEN_ENVIRONMENTS` and `canonicalizeEnvironment` are exported from `src/goalBankData.js`. If not, import them from wherever `App.jsx` imports them today.)

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement both modules.**
- [ ] **Step 4: Rewire App.** The effect keeps `setInterval`, `document.visibilityState` and `safeGet/SetStorageJson`, and delegates the rules to the new functions. Both survey handlers use `patchUserByEmail`. `handleSaveAdminBankGoal` keeps the `alert`, toast and filter navigation, and passes `buildAdminBankGoalPayload(editingBankGoal)` to `addGoalByAdmin`/`updateGoalByAdmin`.
- [ ] **Step 5: Verify** with `npx vitest run` and `npm run build`.
- [ ] **Step 6: Commit** with `refactor(domain): extract survey/usage rules and admin bank-goal payload from App`

---

### Task 9: Verify and ship (TALA protocol)

- [ ] **Step 1: Measure.** Run `(Get-Content src\EcologicalWorkPlanForm.jsx).Count; (Get-Content src\App.jsx).Count`. Expect roughly 6,000 lines or fewer for the Form (from 6,747) and roughly 4,000 or fewer for App (from 4,294). Record the numbers in the PR body.
- [ ] **Step 2: Full gate.** `npx vitest run` must show every test passing (222 + about 40 new). `npm run build` must succeed.
- [ ] **Step 3: Manual smoke** (`npm run dev`, about 10 minutes): open a student, switch תל"א⇄תח"י, switch year and back, add a bank goal from both entry points, share with a colleague, lock the report and edit a mid-year evaluation, then generate the summary table.
- [ ] **Step 4: Ship per `GEMINI.md`.** Run `npm run upgrade:start` and wait 2 minutes. Push the branch and open a PR (use the `pr` skill; list ⚠ DECISION 1 and 2 under "Behavior changes"). Merge to `main`, confirm the GitHub Pages workflow succeeds, then run `npm run upgrade:end`.

---

## Out of scope (candidate phase 2)

- Prompt builders and merge logic for `handleReverseEngineerFullReport` (about 350 lines), `handleProcessFullEvalReportAi` and `handleGenerateStatusReport`, using the Task 6 pattern.
- Custom hooks (`useAutoSave`, `useAiBusySteps`) and splitting the Form's JSX into section components.
- App session/presence effects, which are already delegated to `services/sessionSecurity.js`.
