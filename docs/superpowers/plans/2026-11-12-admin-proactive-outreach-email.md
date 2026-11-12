# Proactive Outreach Email Mechanism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a proactive HTML outreach email feature in the Admin Control Center supporting multi-selection checkboxes, pre-built and custom templates, rich branded HTML with the TALA logo, and sequential batch dispatch with live progress.

**Architecture:** Extend `emailService.ts` with outreach email generator and sender functions; create `AdminOutreachEmailModal.tsx` for template selection, variable interpolation, preview, and batch sending; integrate selection checkboxes and trigger buttons into `AdminAllowlistModal.tsx`; verify via dedicated unit tests and application version bump.

**Tech Stack:** React, TypeScript, HTML/CSS (inline email styles), Vitest.

**Spec:** [docs/superpowers/specs/2026-11-12-admin-proactive-outreach-email-design.md](file:///c:/Users/mreshef/Projects/TALA/docs/superpowers/specs/2026-11-12-admin-proactive-outreach-email-design.md)

## Global Constraints

- All headings, tabs, labels, and modal titles must be strictly in clean Hebrew with zero English in parentheses.
- Zero-trust input validation: recipient email address sanitation, CRLF header injection prevention, subject length limit.
- Responsive, clean Hebrew RTL layout with standard 32x32px buttons and harmonious styling.
- Batch dispatch must be sequential (non-blocking, 250-300ms pause between sends) with live progress indicator.
- Every new feature must be tested with unit tests before completion; application version must be bumped from `2.6.54` to `2.6.55`.

## Review Focus

- Malformed or empty recipient email addresses: rejected cleanly without crashing batch dispatch.
- CRLF or newline characters in email subject: blocked by `validateEmailDispatchParams`.
- Template variable interpolation handles missing values (`teacherName` fallback, null `remainingDays`, missing `group`).
- Select All state correctly respects current filter tab and search queries (does not select hidden/filtered-out rows).
- Empty selection or single recipient works seamlessly in both individual row button and multi-select modes.

---

### Task 1: Outreach Email Service and HTML Builder

**Files:**
- Modify: `src/emailService.ts`
- Create: `src/__tests__/adminOutreachEmail.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface AdminOutreachEmailParams {
    teacherName: string;
    teacherEmail: string;
    remainingDays?: number | null;
    group?: string;
    subject: string;
    messageContent: string;
    siteUrl?: string;
  }
  export function buildAdminOutreachEmailHtml(params: AdminOutreachEmailParams): string;
  export function sendAdminOutreachEmailInBackground(params: AdminOutreachEmailParams & { config?: EmailEngineConfig }): Promise<{ ok: boolean; provider: string }>;
  ```

- [ ] **Step 1: Write failing unit test for `buildAdminOutreachEmailHtml` and `sendAdminOutreachEmailInBackground`**

```typescript
// src/__tests__/adminOutreachEmail.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildAdminOutreachEmailHtml, sendAdminOutreachEmailInBackground } from '../emailService';

describe('Admin Outreach Email Service', () => {
  it('generates HTML email containing TALA logo, teacher name, and content', () => {
    const html = buildAdminOutreachEmailHtml({
      teacherName: 'מיכל לוי',
      teacherEmail: 'michal@school.org',
      remainingDays: 3,
      group: 'מתי"א מרכז',
      subject: 'בדיקת קשר לקראת סיום תקופת הניסיון',
      messageContent: 'רצינו לבדוק אם הכל ברור והאם את זקוקה לסיוע.'
    });

    expect(html).toContain('מיכל לוי');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('רצינו לבדוק אם הכל ברור');
    expect(html).toContain('https://zivitreshef.github.io/TALA/');
    expect(html).toContain('dir="rtl"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/adminOutreachEmail.test.ts`  
Expected: FAIL (functions not exported/defined)

- [ ] **Step 3: Implement `buildAdminOutreachEmailHtml` and `sendAdminOutreachEmailInBackground` in `src/emailService.ts`**

Add exported interfaces and functions incorporating the branded top stained-glass bar, header banner with official TALA logo, personalized greeting, formatted paragraphs, CTA button, and background dispatch via `sendReportEmailInBackground`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/adminOutreachEmail.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add src/emailService.ts src/__tests__/adminOutreachEmail.test.ts
git commit -m "feat(email): add outreach email html builder and background dispatcher"
```

---

### Task 2: Outreach Email Modal with Templates and Live Preview

**Files:**
- Create: `src/components/modals/AdminOutreachEmailModal.tsx`
- Modify: `src/__tests__/adminOutreachEmail.test.ts`

**Interfaces:**
- Consumes:
  - `buildAdminOutreachEmailHtml`, `sendAdminOutreachEmailInBackground` from `src/emailService.ts`
  - `getTrialRemainingDays` from `src/allowedUsers.ts`
- Produces:
  ```typescript
  export interface AdminOutreachEmailModalProps {
    isOpen: boolean;
    recipients: any[];
    onClose: () => void;
    onRemoveRecipient: (userId: string) => void;
    onSuccess?: (message: string) => void;
  }
  export default function AdminOutreachEmailModal(props: AdminOutreachEmailModalProps): JSX.Element | null;
  ```

- [ ] **Step 1: Write test for template placeholder interpolation in `src/__tests__/adminOutreachEmail.test.ts`**

Add tests checking interpolation of `{name}`, `{remainingDays}`, `{group}` and default fallback handling.

- [ ] **Step 2: Implement `AdminOutreachEmailModal.tsx`**

Build the modal featuring:
- Recipient chips with remove (`✕`) button.
- 3 predefined templates:
  1. "סיום תקופת ניסיון והצעת סיוע"
  2. "בדיקת שביעות רצון וקשר שוטף"
  3. "הודעה מותאמת אישית"
- Variable replacement: `{name}`, `{remainingDays}`, `{group}`.
- Editable subject and body textareas.
- Interactive tab for "עריכת תוכן" vs "תצוגה מקדימה" (rendered HTML preview).
- Sequential batch sender with live progress bar and status counter.
- Clean Hebrew titles with zero English in parentheses.

- [ ] **Step 3: Run test suite to verify component logic passes**

Run: `npx vitest run src/__tests__/adminOutreachEmail.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit Task 2**

```bash
git add src/components/modals/AdminOutreachEmailModal.tsx src/__tests__/adminOutreachEmail.test.ts
git commit -m "feat(admin): build outreach email modal with templates and preview"
```

---

### Task 3: Admin Table Multi-Selection and Quick Action Integration

**Files:**
- Modify: `src/components/modals/AdminAllowlistModal.tsx`
- Modify: `src/__tests__/adminOutreachEmail.test.ts`

**Interfaces:**
- Consumes:
  - `AdminOutreachEmailModal` from `src/components/modals/AdminOutreachEmailModal.tsx`
- Produces:
  - Checkbox column in user table.
  - "Select All" toggle in header respecting active filters and search query.
  - Floating/sticky action bar when >= 1 user is selected (`נבחרו X מורים | שליחת מייל יזום | בטל בחירה`).
  - Quick action mail icon in each row for single-click outreach.

- [ ] **Step 1: Add selection state and handlers in `AdminAllowlistModal.tsx`**

- `selectedUserIds: Set<string>`
- `handleToggleSelectUser(id: string)`
- `handleSelectAllToggle()`
- `handleClearSelection()`
- `handleOpenOutreachModalForSelection()`
- `handleOpenOutreachModalForSingleUser(user: AllowedUserRecord)`

- [ ] **Step 2: Add table header checkbox and row checkboxes**

Ensure checkboxes are accessible, clear, and styled cleanly with RTL alignment.

- [ ] **Step 3: Add floating / upper action bar and single-row mail icon**

When `selectedUserIds.size > 0`, render the action banner with recipient count and action button. Add a mail icon button (`<Mail size={12} />`) in the row actions column.

- [ ] **Step 4: Connect `AdminOutreachEmailModal` rendering**

Mount `AdminOutreachEmailModal` when open, passing selected recipients and handling removal/success.

- [ ] **Step 5: Run tests to verify table and modal integration**

Run: `npx vitest run src/__tests__/adminOutreachEmail.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/modals/AdminAllowlistModal.tsx
git commit -m "feat(admin): add multi-selection and outreach trigger in allowlist modal"
```

---

### Task 4: Mandatory Version Bump and Full Verification

**Files:**
- Modify: `package.json` (`2.6.54` -> `2.6.55`)
- Modify: `src/domain/telemetryTaxonomy.ts` (`2.6.54` -> `2.6.55`)
- Modify: `src/__tests__/appVersionSynchronization.test.js`
- Modify: `src/__tests__/typescriptPhase2Batch7.test.ts`
- Modify: `src/__tests__/typescriptStep2.test.tsx`

- [ ] **Step 1: Bump version to `2.6.55` across all required files**

Update `package.json`, `telemetryTaxonomy.ts`, and test files.

- [ ] **Step 2: Run all tests in repository**

Run: `npx vitest run`  
Expected: 100% tests PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit Task 4**

```bash
git add package.json src/domain/telemetryTaxonomy.ts src/__tests__/appVersionSynchronization.test.js src/__tests__/typescriptPhase2Batch7.test.ts src/__tests__/typescriptStep2.test.tsx
git commit -m "chore(version): bump app version to 2.6.55"
```

---

### Task 5: Pull Request and Integration

**Files:**
- Git commands

- [ ] **Step 1: Push feature branch to origin**

`git push origin feat/admin-proactive-outreach-email`

- [ ] **Step 2: Create PR using helper**

`node scripts/github-pr.js create --branch feat/admin-proactive-outreach-email --title "הוספת מנגנון שליחת מיילים יזומים ממרכז הבקרה" --body "..."`

- [ ] **Step 3: Merge PR into main**

`node scripts/github-pr.js merge --pr <PR_NUMBER> --squash`
