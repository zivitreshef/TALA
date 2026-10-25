# Diagnostic Documents Dossier & Enhanced Intake UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Section 2 into a prominent "Diagnostic & Assessment Dossier" (תיק מסמכי אבחון ורקע) that persistently stores uploaded evaluation files (Word, PDF, TXT) within each student card, displays them with view/re-analyze actions, and surfaces a header indicator badge.

**Architecture:**
- Extend `formData` with `diagnosticDocuments` array normalized across reports and years.
- Enhance `diagnosticIntake.js` with document record creation, attach, and remove domain helpers.
- Enhance `DiagnosticIntakeModal.jsx` to save document records into `formData.diagnosticDocuments` upon analysis or upload.
- Redesign Section 2 top area in `EcologicalWorkPlanForm.jsx` into a prominent Hero Dossier with document cards and text reader drawer/modal.
- Add clickable indicator badge `📎 X מסמכי אבחון` in student header toolbar.

**Tech Stack:** React 19, Lucide React, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-10-25-diagnostic-documents-dossier-design.md`

## Global Constraints

- **Non-Destructive Data Merge**: Never overwrite existing manual goals or free-text when attaching or removing diagnostic documents.
- **RTL & Hebrew**: All text, cards, buttons, badges, and modals must follow strict RTL alignment and Hebrew phrasing without English parenthetical clutter.
- **Lightweight Storage**: Store extracted clean text and metadata (not multi-megabyte binary blobs) to keep Firestore and IndexedDB storage fast, responsive, and offline-compatible.
- **Safety**: Confirm before document deletion.

## Review Focus

- Empty state vs populated state in Section 2 dossier: verify both render cleanly without layout shift.
- Switching school years or plan types (תל"א / תח"י): verify `diagnosticDocuments` persist and remain associated with the student profile.
- Uploading multiple documents (e.g. Word doc + PDF): verify each document is added without replacing prior documents.
- Deleting an assessment document: verify only the targeted document is removed and other documents remain intact.
- Header indicator badge: verify count updates reactively when documents are added or removed.

---

### Task 1: Domain Normalization & Document Management Helpers

**Files:**
- Modify: `src/domain/yearReport.js`
- Modify: `src/domain/diagnosticIntake.js`
- Test: `src/__tests__/diagnosticIntake.test.js`

**Interfaces:**
- Produces:
  - `createDiagnosticDocumentRecord({ fileName, fileType, fullText, fileSizeFormatted })`
  - `addDiagnosticDocumentToStudent(formData, docRecord)`
  - `removeDiagnosticDocumentFromStudent(formData, docId)`
  - Normalization of `diagnosticDocuments` in `normalizeStudentForForm`.

- [ ] **Step 1: Write unit tests for diagnostic document helpers**
  In `src/__tests__/diagnosticIntake.test.js`, test `createDiagnosticDocumentRecord`, `addDiagnosticDocumentToStudent`, and `removeDiagnosticDocumentFromStudent`.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run src/__tests__/diagnosticIntake.test.js`. Expected: FAIL (helpers not defined).
- [ ] **Step 3: Implement helpers in `src/domain/diagnosticIntake.js`**
  Implement `createDiagnosticDocumentRecord`, `addDiagnosticDocumentToStudent`, and `removeDiagnosticDocumentFromStudent`.
- [ ] **Step 4: Update `src/domain/yearReport.js`**
  In `normalizeStudentForForm`, ensure `diagnosticDocuments: Array.isArray(st?.diagnosticDocuments) ? st.diagnosticDocuments : []` is included in `baseSnapshot` and returned student object.
- [ ] **Step 5: Run tests and verify they pass**
  Run `npx vitest run src/__tests__/diagnosticIntake.test.js`. Expected: PASS.
- [ ] **Step 6: Commit**
  `git add src/domain/diagnosticIntake.js src/domain/yearReport.js src/__tests__/diagnosticIntake.test.js && git commit -m "feat(domain): add diagnostic document record helpers and normalization"`

---

### Task 2: Connect `DiagnosticIntakeModal` to Persist Attached Documents

**Files:**
- Modify: `src/components/form/DiagnosticIntakeModal.jsx`
- Modify: `src/domain/diagnosticIntake.js`

**Interfaces:**
- Consumes: `createDiagnosticDocumentRecord` and `addDiagnosticDocumentToStudent` from Task 1.
- Produces: Auto-persistence of uploaded evaluation files into `formData.diagnosticDocuments` upon applying intake or directly on file upload.

- [ ] **Step 1: Update `applyDiagnosticIntakeToStudent` in `src/domain/diagnosticIntake.js`**
  When an intake result includes an uploaded file record, ensure it is appended to `formData.diagnosticDocuments` (avoiding duplicates by file name and text hash).
- [ ] **Step 2: Update `DiagnosticIntakeModal.jsx`**
  Track the active file object or record (`uploadedDocRecord`), and pass it to `applyDiagnosticIntakeToStudent` on confirmation.
- [ ] **Step 3: Add unit test in `src/__tests__/diagnosticIntake.test.js`**
  Test that `applyDiagnosticIntakeToStudent` attaches the document record to `applied.diagnosticDocuments`.
- [ ] **Step 4: Run test to verify pass**
  Run `npx vitest run src/__tests__/diagnosticIntake.test.js`. Expected: PASS.
- [ ] **Step 5: Commit**
  `git add src/domain/diagnosticIntake.js src/components/form/DiagnosticIntakeModal.jsx src/__tests__/diagnosticIntake.test.js && git commit -m "feat(intake): persist uploaded assessment documents into student record"`

---

### Task 3: Implement Section 2 "תיק מסמכי אבחון ורקע" UI & Document Cards

**Files:**
- Modify: `src/EcologicalWorkPlanForm.jsx`

**Interfaces:**
- Consumes: `formData.diagnosticDocuments`, `removeDiagnosticDocumentFromStudent`.
- Produces: Hero dossier container at the top of Section 2, interactive document cards, text reader modal, and delete handler.

- [ ] **Step 1: Build the Hero Dossier container in Section 2**
  Replace the small top button with a prominent, styled block:
  - Header: `📁 תיק מסמכי אבחון וסיכומי ועדות` with subtitle.
  - Big primary action button: `✨ העלאת אבחון וניתוח ב-AI` (opens `DiagnosticIntakeModal`).
  - Empty state card when `(formData.diagnosticDocuments || []).length === 0`.
- [ ] **Step 2: Build the Attached Documents List**
  Render cards for each document in `formData.diagnosticDocuments`:
  - Name, upload date, file type badge (DOCX / PDF / TXT).
  - Actions: `👁️ צפייה בטקסט` (opens reader modal), `✨ ניתוח חוזר ב-AI` (opens modal with prefilled text), and `🗑️ הסרה` (calls `removeDiagnosticDocumentFromStudent`).
- [ ] **Step 3: Implement simple text reader modal (`DocumentTextViewModal`)**
  A clean modal showing the full extracted text with a copy button and close button.
- [ ] **Step 4: Verify rendering and interactions**
  Verify build with `npm run build`.
- [ ] **Step 5: Commit**
  `git add src/EcologicalWorkPlanForm.jsx && git commit -m "feat(ui): add diagnostic documents dossier cards and reader modal in section 2"`

---

### Task 4: Add Student Header Indicator Badge

**Files:**
- Modify: `src/EcologicalWorkPlanForm.jsx`

**Interfaces:**
- Consumes: `(formData.diagnosticDocuments || []).length`.
- Produces: Header badge in the top bar / student summary indicating attached documents count with smooth scroll to Section 2.

- [ ] **Step 1: Add clickable badge in student header toolbar**
  Render badge `📎 {count} מסמכי אבחון בתיק` (or `📎 צרפי אבחון` if 0) in the header action row next to student details.
- [ ] **Step 2: Add smooth scroll to Section 2 on badge click**
  Clicking the badge scrolls to the dossier in Section 2 and briefly highlights it.
- [ ] **Step 3: Verify build and test suite**
  Run `npx vitest run` and `npm run build`.
- [ ] **Step 4: Commit**
  `git add src/EcologicalWorkPlanForm.jsx && git commit -m "feat(ui): add clickable diagnostic documents badge in student header"`

---

### Task 5: End-to-End Verification & Documentation

**Files:**
- Test & Verify: All modified files

- [ ] **Step 1: Run full unit test suite**
  Run `npx vitest run`. All tests must pass.
- [ ] **Step 2: Run production build**
  Run `npm run build`. Build must complete without errors.
- [ ] **Step 3: Commit**
  `git commit --allow-empty -m "chore: complete diagnostic dossier verification"`
