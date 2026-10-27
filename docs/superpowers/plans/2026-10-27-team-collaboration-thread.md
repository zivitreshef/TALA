# Team Share Collaboration Thread & Handoff Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide teachers with the ability to attach an optional handoff message when sharing a student with colleagues, alongside a persistent slide-over collaboration thread (`שיח צוות`) on the student's plan with author-only retraction and conflict-free realtime sync.

**Architecture:**
- Extend the student data model with a normalized `teamMessages` array.
- Update `studentSyncMerge.js` so concurrent edits by colleagues merge `teamMessages` cleanly by unique ID and chronological timestamp.
- Enhance `ShareTeamModal.jsx` to allow optional initial handoff notes with 1-click quick-chips upon sharing.
- Build a responsive, RTL slide-over drawer `TeamChatDrawer.jsx` triggered from the student plan toolbar.
- Surface the handoff message inside the recipient's notification bell modal in `AllowlistAuthGate.jsx`.

**Tech Stack:** React 19, Lucide React, Tailwind / CSS variables, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-10-27-team-collaboration-thread-design.md`

## Global Constraints

- **Audit & Deletion Integrity**: Prohibit full-history wiping; allow teachers to retract/delete only their own messages.
- **RTL & Hebrew**: All text, buttons, tags, chips, and drawer animations must adhere strictly to RTL alignment and natural pedagogical Hebrew phrasing.
- **Security & Zero-Trust**: Max 800 chars per message, HTML tag stripping, and author email authorization against `formData.sharedWith` / `ownerEmail`.
- **Zero Uncovered Code**: Every helper, component, and edge case must be covered with Vitest tests before closing tasks.

## Review Focus

- Sharing with an empty note: verify sharing succeeds normally without creating blank message entries.
- Concurrent sync: verify `mergeStudentSnapshots` merges two different teachers' messages without dropping either.
- Author-only retraction: verify a teacher cannot delete another colleague's message.
- Mobile responsiveness: verify the drawer renders comfortably on narrow screens without horizontal page overflow.
- Notification card: verify the recipient sees the owner's handoff note clearly inside the shared report notification modal.

---

### Task 1: Domain Helpers, Normalization & Safe Sync Merge

**Files:**
- Modify: `src/domain/workPlanEdits.js`
- Modify: `src/domain/studentSyncMerge.js`
- Modify: `src/domain/yearReport.js`
- Test: `src/__tests__/workPlanEdits.test.js`
- Test: `src/__tests__/studentSyncMerge.test.js`

**Interfaces:**
- Produces:
  - `createTeamMessage({ authorEmail, authorName, authorRole, text, type, recipientEmail, recipientName, schoolYear })`
  - `appendTeamMessage(formData, messageObj)`
  - `retractTeamMessage(formData, messageId, userEmail)`
  - `mergeTeamMessages(localMsgs, serverMsgs)` integrated into `mergeStudentSnapshots`
  - Normalization of `teamMessages: Array.isArray(st?.teamMessages) ? st.teamMessages : []` in `yearReport.js`

- [ ] **Step 1: Write failing unit tests in `workPlanEdits.test.js` and `studentSyncMerge.test.js`**
  Cover message creation, validation/sanitization (800 char cap, tag strip), appending, author-only retraction, and concurrent merge by ID.
- [ ] **Step 2: Run tests to verify failure**
  Run `npx vitest run src/__tests__/workPlanEdits.test.js src/__tests__/studentSyncMerge.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement domain helpers in `src/domain/workPlanEdits.js`**
  Add `createTeamMessage`, `appendTeamMessage`, and `retractTeamMessage`.
- [ ] **Step 4: Implement message reconciliation in `src/domain/studentSyncMerge.js`**
  Add `mergeTeamMessages` and include it inside `mergeStudentSnapshots`.
- [ ] **Step 5: Add normalization in `src/domain/yearReport.js`**
  Ensure `teamMessages` is preserved in `normalizeStudentForForm` and `switchSchoolYear`.
- [ ] **Step 6: Run tests and verify they pass**
  Run `npx vitest run src/__tests__/workPlanEdits.test.js src/__tests__/studentSyncMerge.test.js`. Expected: PASS.
- [ ] **Step 7: Commit**
  `git add src/domain/workPlanEdits.js src/domain/studentSyncMerge.js src/domain/yearReport.js src/__tests__/workPlanEdits.test.js src/__tests__/studentSyncMerge.test.js && git commit -m "feat(domain): add team collaboration messages and safe sync merge"`

---

### Task 2: Enhance `ShareTeamModal` with Note Input & Quick Chips

**Files:**
- Modify: `src/components/form/ShareTeamModal.jsx`
- Test: `src/__tests__/shareTeamModal.test.jsx`

**Interfaces:**
- Passing `(colleagueEmail, optionalNote)` to `onToggleShareColleague`.
- Visual note input when a colleague is newly selected with quick chips (*"נא להוסיף מטרות"*, *"לעיונך והערות"*, *"בדיקת סטטוס והתייעצות"*).

- [ ] **Step 1: Write unit tests in `shareTeamModal.test.jsx`**
  Test that checking a colleague exposes the note box, typing or clicking quick chips updates the note, and confirming passes the note to `onToggleShareColleague`.
- [ ] **Step 2: Run test to verify failure**
  Run `npx vitest run src/__tests__/shareTeamModal.test.jsx`. Expected: FAIL.
- [ ] **Step 3: Update `ShareTeamModal.jsx`**
  Add inline expandable note section per newly-checked colleague, quick chips, and pass note to `onToggleShareColleague`.
- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run src/__tests__/shareTeamModal.test.jsx`. Expected: PASS.
- [ ] **Step 5: Commit**
  `git add src/components/form/ShareTeamModal.jsx src/__tests__/shareTeamModal.test.jsx && git commit -m "feat(ui): add optional handoff note with quick chips to share modal"`

---

### Task 3: Build Slide-Over `TeamChatDrawer` Component

**Files:**
- Create: `src/components/form/TeamChatDrawer.jsx`
- Create: `src/__tests__/teamChatDrawer.test.jsx`

**Interfaces:**
- Props:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `studentName: string`
  - `teamMessages: TeamMessage[]`
  - `currentUser: object`
  - `sharedWith: string[]`
  - `onSendMessage: (text: string) => void`
  - `onRetractMessage: (messageId: string) => void`

- [ ] **Step 1: Write unit tests for `TeamChatDrawer`**
  Test drawer open/close, message rendering, role badges, author delete button visibility (only for author), send action with text and chips.
- [ ] **Step 2: Run test to verify failure**
  Run `npx vitest run src/__tests__/teamChatDrawer.test.jsx`. Expected: FAIL (file does not exist).
- [ ] **Step 3: Implement `TeamChatDrawer.jsx`**
  Build clean RTL slide-over drawer with Lucide icons (`MessageSquare`, `Send`, `Trash2`, `X`, `Clock`, `Sparkles`), 32x32px buttons, and quick chips.
- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run src/__tests__/teamChatDrawer.test.jsx`. Expected: PASS.
- [ ] **Step 5: Commit**
  `git add src/components/form/TeamChatDrawer.jsx src/__tests__/teamChatDrawer.test.jsx && git commit -m "feat(ui): implement TeamChatDrawer component"`

---

### Task 4: Connect Drawer & Toolbar Trigger in `EcologicalWorkPlanForm`

**Files:**
- Modify: `src/EcologicalWorkPlanForm.jsx`
- Test: `src/__tests__/teamChatDrawer.test.jsx` / `src/__tests__/workPlanEdits.test.js`

- [ ] **Step 1: Add toolbar button `💬 שיח צוות`**
  Place button next to `👥 שיתוף צוות` in the top toolbar with message count badge.
- [ ] **Step 2: Mount `TeamChatDrawer`**
  Integrate `showTeamChatDrawer` state, render `TeamChatDrawer` with `formData.teamMessages`, wire up `handleSendTeamMessage` and `handleRetractTeamMessage` using domain helpers and `onSaveStudentPlan`.
- [ ] **Step 3: Update `handleToggleShareColleague`**
  Accept optional `messageText`, append a `share_handoff` message to `formData.teamMessages` when sharing.
- [ ] **Step 4: Run tests and verify**
  Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit**
  `git add src/EcologicalWorkPlanForm.jsx && git commit -m "feat(form): wire up team chat drawer and share handoff notes in student plan"`

---

### Task 5: Display Handoff Note in Colleague Notification Modal

**Files:**
- Modify: `src/AllowlistAuthGate.jsx`
- Test: `src/__tests__/modalStateAndValidation.test.js`

- [ ] **Step 1: Update unread shared report card in `AllowlistAuthGate.jsx`**
  Extract latest `share_handoff` or team message directed to or shared with user, render clean quote bubble: `✉️ הודעה מ[שם המשתף]: "[טקסט]"`.
- [ ] **Step 2: Run tests and verify**
  Run `npx vitest run src/__tests__/modalStateAndValidation.test.js`. Expected: PASS.
- [ ] **Step 3: Commit**
  `git add src/AllowlistAuthGate.jsx src/__tests__/modalStateAndValidation.test.js && git commit -m "feat(notifications): display handoff note in unread shared report cards"`

---

### Task 6: Full Verification, Production Build & Delivery Protocol

- [ ] **Step 1: Run complete test suite**
  Run `npx vitest run`. All tests must pass with 100% success.
- [ ] **Step 2: Run production build**
  Run `npm run build`. Verify zero errors and clean bundle output.
- [ ] **Step 3: Follow TALA Upgrade Protocol**
  Trigger upgrade banner, push feature branch, open PR with clear test evidence, squash/merge into `main`, confirm GitHub Pages deploy, and end banner.
