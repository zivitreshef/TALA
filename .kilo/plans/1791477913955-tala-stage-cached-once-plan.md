# TALA: Kindergarten vs School Stage Detection (Cached Once)

## Goal
Compute student stage once (deterministically) and persist it on the student record. Inject the cached stage into AI prompts that generate **goals, targets, or detailed analysis** only. The AI must not re-calculate stage on every prompt.

## Current State (Relevant)
- Student model: `student` object in `App.jsx` and `EcologicalWorkPlanForm.jsx` (has fields like `educationalFramework`, `teacherFreeText`, `birthDate`, `gender`, etc.)
- AI entry points in `EcologicalWorkPlanForm.jsx`: inline `fetch` to `generativelanguage.googleapis.com` for facilitating/applying answers (Gemini) and imports like `reverseEngineerRawTextLocally`, `generateStatusReportLocally` (local helpers) used for analysis/goals.
- Cloud sync: students saved via `saveStudentToCloud` and subscribed via backend; persisting new fields is compatible.

## 1) Detection Logic

### Inputs (check in order)
1. `educationalFramework` / `מסגרת חינוכית` (highest priority)
2. `teacherFreeText` (raw teacher text entered)
3. `birthDate` (fallback only if 1–2 give no unambiguous signal)
4. Else `unknown`

### Keywords
**Kindergarten (גן):** `גן, גני, גני-, בגן, גננת, לגן, מהגן, הגן, הגננות`

**School (בית-ספר):** `בית-הספר, כתה, כיתה, כיתת, בכיתה, לכיתה, מהכיתה, בית ספר, בית הספר, ביה"ס, בית ספרי, בית-ספר, בי"ס, למורה, המורות, מורי`

### Normalization
- Trim, collapse spaces, handle NBSP
- Normalize dashes/maqaf: treat `-` and `־` same
- Normalize quotes/abbreviations: `ביה"ס`, `בי"ס`, `ביה'ס` -> canonical forms
- Handle definite article `ה` (e.g. `הגן`, `הגננות`, `המורות`, `המורה`)
- Strip trailing `-` in `גני-`
- Strip punctuation around tokens `, . : ; ( ) [ ]`
- Prefer explicit Hebrew forms (prepositional) and be conservative on short ambiguous tokens.

### Rules
- Evaluate **per checked field** at current priority level. If that field contains **both** kindergarten and school keywords -> return `unknown` (do **not** fall back to lower priority to break tie).
- Must have >=1 match from exactly one group and 0 from other to choose that group.
- Role/setting tokens (`גננת`, `הגננות`, `הגן`, `למורה`, `מורי`, `המורות`) are treated as strong indicators of the educational setting when present.
- Bare `מורה`, `המורה` alone (with no other school/kindergarten indicators) should **not** force school; treat as insufficient/ambiguous signal -> do not contribute to a match (result remains unknown unless other indicators exist).
- Age fallback only when textual checks (1–2) yield no match.
- Age cutoff: `age < 6.0` -> `kindergarten`, `age >= 6.0` -> `school` (Israeli context).
- Reference date: use evaluation/report date if present (`date`, `evalReport*` context) else `today`. If birthDate unparseable -> treat as no birth date.

### Result
- `stage`: `"kindergarten" | "school" | "unknown"`
- `stageSource`: `"educational_framework" | "teacher_text" | "birth_date" | "conflict" | "no_data"`
- `stageReason`: short human-readable reason (e.g. `"matched 'בכיתה ב'"`, `"age 5.8 < 6.0 -> kindergarten"`, `"both groups in educational_framework -> unknown"`, `"no signal -> unknown"`)
- `stageUpdatedAt`: ISO timestamp

## 2) Where to Compute (When to Persist)

Compute/update on changes to inputs:
- In `App.jsx`: `handleAddNewStudent` (initialize stage on new student)
- In `EcologicalWorkPlanForm.jsx`:
  - On field change for `educationalFramework`, `teacherFreeText`, `birthDate` (via `handleFieldChange` or wherever those fields change). Also gender/name don’t affect stage; only those three.
  - On student load/switch: `useEffect` when `student?.id` changes (or in `buildNormalizedStudentData`) — if `stage` missing but inputs exist, compute and persist (backfill). Also recompute if inputs changed relative to last reason? But easier: if any input affecting stage changed, recompute.

Also persist to cloud when computed/updated (use existing `saveStudentToCloud`).

## 3) Hidden Variable Injection (Cached, Not Re-Calculated)

Do **not** ask LLM to infer stage. Pass structured context to AI builders/calls.

Inject a minimal context block into prompts:
```text
[STUDENT_CONTEXT]
stage: kindergarten | school | unknown
stage_source: educational_framework|teacher_text|birth_date|conflict|no_data
stage_reason: short reason
```

Pass as structured object where possible (e.g. `studentContext: {...}`) to helpers (`reverseEngineerRawTextLocally`, `generateStatusReportLocally`) and to inline Gemini `generateContent` calls; have those functions include the block in the prompt they build.

Scope: **only** AI calls that produce goals/targets/detailed analysis. Do not inject into unrelated UI text/email.

## 4) Implementation Steps

1. **Add detection helper** (pure function): `src/utils/studentStage.js` (or `.ts` if preferred) exporting `normalizeText`, `hasKindergarten`, `hasSchool`, `detectStudentStage(studentOrFields, referenceDate?)`. Include JSDoc with assumptions (cutoff >=6.0 -> school, conflict blocks fallback).
2. **Compute on create**: in `App.jsx` `handleAddNewStudent`, compute stage from initial fields and include in new student object.
3. **Compute on change/load in form**: in `EcologicalWorkPlanForm.jsx`, when `educationalFramework`, `teacherFreeText`, `birthDate` change, recompute and call `onSaveStudentPlan` (or propagate). Also backfill in `buildNormalizedStudentData` if missing.
4. **Pass context to AI**: 
- Find Gemini calls in `EcologicalWorkPlanForm.jsx` (facilitate/applyAnswers, reverse engineer, summary/eval/status). Add `studentContext` from current `formData` (with stage fields). 
- Update helpers `reverseEngineerRawTextLocally`, `generateStatusReportLocally` signatures to accept optional `studentContext` and append `[STUDENT_CONTEXT]` block to prompts.
5. **Persist fields**: ensure all student save paths include `stage`, `stageSource`, `stageReason`, `stageUpdatedAt`. Cloud sync already persists whole student doc.

## 5) Test Cases (Concrete)

| Input | Expected stage | source | Notes |
|---|---|---|---|
| educationalFramework: "גן חובה" | kindergarten | educational_framework | |
| educationalFramework: "כיתה א'" | school | educational_framework | |
| teacherFreeText: "בכיתה ב'" | school | teacher_text | |
| teacherFreeText: "ביה\"ס יסודי" | school | teacher_text | normalized quote |
| teacherFreeText: "בי\"ס" | school | teacher_text | abbreviation |
| teacherFreeText: "גננת" | kindergarten | teacher_text | role |
| teacherFreeText: "לגננת" | kindergarten | teacher_text | role with preposition |
| teacherFreeText: "הגן" | kindergarten | teacher_text | setting |
| teacherFreeText: "הגננות" | kindergarten | teacher_text | plural role |
| teacherFreeText: "למורה" | school | teacher_text | role with preposition |
| teacherFreeText: "המורות" | school | teacher_text | plural role |
| teacherFreeText: "מורי" | school | teacher_text | plural role |
| teacherFreeText: "מורה" | unknown | no_data | alone, no other indicators |
| teacherFreeText: "המורה" | unknown | no_data | alone, no other indicators |
| teacherFreeText: "גן" and "כיתה ה'" in same field | unknown | conflict | don’t guess; both groups |
| teacherFreeText: "הולך לגן" | kindergarten | teacher_text | prepositional |
| birthDate only, age 5.5 | kindergarten | birth_date | |
| birthDate only, age 6.0 | school | birth_date | >=6.0 |
| birthDate only, age 6.5 | school | birth_date | |
| birthDate conflicts with text? e.g. text gives "גן" but birthDate age 12 | kindergarten | teacher_text | text wins over age (priority) |
| educationalFramework has both -> unknown even if age says school | unknown | conflict | don’t fall back |
| empty all | unknown | no_data | |

## 6) Risks & Mitigations

- **False inference**: Conflict rule + strict precedence prevents guessing.
- **Hebrew variants**: normalize maqaf/quotes/abbreviations; cover common forms.
- **Backward compatibility**: existing students get backfilled on load/first AI call.
- **Scope creep**: only inject into goals/targets/detailed analysis AI calls.
- **Stale stage**: recompute on input changes; also include `stageUpdatedAt`.

## 7) Validation Plan

- **Unit tests**: pure helper tests for all cases above (especially `מורה`/`המורה` alone).
- **Integration**: new student gets stage; field change updates stage and persists.
- **AI context**: verify prompts include `[STUDENT_CONTEXT]` only for analysis flows.
- **Cloud sync**: stage fields roundtrip.
- **Manual spot check**: goals/targets/detailed analysis reflect stage without re-inference.

**DONE WHEN:** helper exists, stage persisted on student, computed on create/change/load, injected into analysis AI calls only, tests cover listed cases including `מורה`/`המורה`.