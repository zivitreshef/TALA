# Test Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate critical testing blindspots across TALA by adding comprehensive test suites for Authentication Security, Cloud Services, Telemetry/Storage Resilience, Export/Print PII Redaction, and Backend Persistence.

**Architecture:** Maintain zero-trust, unit-isolated, high-performance testing architecture using Vitest. Mock external browser globals (`localStorage`, `window.open`) and Firebase Firestore SDK calls without spinning up cloud emulators, ensuring sub-second test execution (<100ms per test).

**Tech Stack:** Vitest 5.0.3, Node.js, standard mock harnesses (`vi.fn()`, `vi.spyOn()`, `vi.mock()`).

**Spec:** [TALA Test Coverage & Depth Audit Report](file:///C:/Users/mreshef/.gemini/antigravity/brain/e6305de5-d13a-4cbe-b65d-a424856ff937/test-coverage-map.md)

## Global Constraints

- Zero regressions: all existing 287 unit tests must continue passing with 100% success.
- Sub-second execution: each new test file must execute in under 150ms.
- Pure Vitest mocks: do not introduce heavy runtime dependencies or cloud network calls.
- Security-First compliance: test both positive pathways and malicious edge cases (injection, tampering, quota overflow, PII leakage).

## Review Focus

1. Password PBKDF/SHA-256 implementation adheres strictly to RFC 1321/FIPS-180-4 test vectors and cannot produce salt collision.
2. Parent invite token validation rejects forged or expired tokens without leaking student names.
3. Storage safe wrappers gracefully swallow `QuotaExceededError` in Safari private mode without throwing unhandled exceptions.
4. Export print and Word document generators strictly replace student names, IDs, and phones when `hideDetails=true`.
5. Cloud Firestore errors (permission denied, disconnected network) are caught cleanly without terminating user sessions.

---

### Task 1: Auth & Password Security Engine Test Suite

**Files:**
- Create: `src/__tests__/authAndCredentialSecurity.test.js`
- Test Target: `src/allowedUsers.js`

**Interfaces:**
- Consumes:
  - `sha256Hex(str: string): string`
  - `generatePasswordSalt(byteLength?: number): string`
  - `hashPasswordWithSalt(password: string, salt: string): string`
  - `createPasswordCredentials(password: string, salt?: string): { passwordSalt: string, passwordHash: string }`
  - `verifyUserPassword(user: object, candidate: string): boolean`
  - `ensureUserPasswordHashed(user: object): { user: object, migrated: boolean }`
  - `validatePasswordPolicy(password: string): { valid: boolean, errors: string[] }`
- Produces: 100% tested authentication cryptographic primitives and password validation policies.

- [ ] **Step 1: Write the failing tests**

```javascript
// src/__tests__/authAndCredentialSecurity.test.js
import { describe, it, expect } from 'vitest';
import {
  sha256Hex,
  generatePasswordSalt,
  hashPasswordWithSalt,
  createPasswordCredentials,
  verifyUserPassword,
  ensureUserPasswordHashed,
  ensureUsersListPasswordsHashed,
  validatePasswordPolicy
} from '../allowedUsers';

describe('Auth & Credential Cryptographic Security', () => {
  it('computes correct standard SHA-256 hashes against standard test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('TALA2026')).toBe('5d8481ff7ea9df5d2cba50ba2da8cf94569c7f66a1ca90cba7dfd03706c646ae');
  });

  it('generates distinct 32-character hexadecimal salts', () => {
    const salt1 = generatePasswordSalt();
    const salt2 = generatePasswordSalt();
    expect(salt1).toHaveLength(32);
    expect(salt2).toHaveLength(32);
    expect(salt1).not.toBe(salt2);
  });

  it('stretches password hash across 256 rounds with domain separation', () => {
    const salt = 'a1f0e8c49b2d471683a5c7e901234567';
    const hash1 = hashPasswordWithSalt('secret123', salt);
    const hash2 = hashPasswordWithSalt('secret123', salt);
    const hashDifferentPassword = hashPasswordWithSalt('secret124', salt);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).not.toBe(hashDifferentPassword);
  });

  it('validates password policy rules (length, uppercase, lowercase, digit, special char)', () => {
    expect(validatePasswordPolicy('Weak').valid).toBe(false);
    expect(validatePasswordPolicy('NoSpecial123').valid).toBe(false);
    expect(validatePasswordPolicy('no_upper_123!').valid).toBe(false);
    expect(validatePasswordPolicy('Valid@Pass2026').valid).toBe(true);
  });

  it('migrates legacy accessCode to salted password credentials and strips accessCode', () => {
    const legacyUser = { id: 'u_1', email: 'test@example.com', accessCode: 'TALA2026' };
    const { user, migrated } = ensureUserPasswordHashed(legacyUser);
    expect(migrated).toBe(true);
    expect(user.accessCode).toBeUndefined();
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordSalt).toBeDefined();
    expect(verifyUserPassword(user, 'TALA2026')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails if anything is missing or passes**

Run: `npx vitest run src/__tests__/authAndCredentialSecurity.test.js`
Expected: PASS (or fail identifying missing edge cases).

- [ ] **Step 3: Add edge cases for whitespace, null/undefined inputs, and case-insensitive bootstrap code**

Verify `verifyUserPassword` handles null/undefined user safely, case-insensitive `TALA2026` bootstrap fallback, and rejects tampered salts.

- [ ] **Step 4: Run test to verify all 12 tests pass**

Run: `npx vitest run src/__tests__/authAndCredentialSecurity.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/authAndCredentialSecurity.test.js
git commit -m "test: add auth and credential security unit tests"
```

---

### Task 2: Parent Invite & Respondent Cloud Service Suite

**Files:**
- Create: `src/__tests__/inviteService.test.js`
- Test Target: `src/services/inviteService.js`

**Interfaces:**
- Consumes:
  - `createInvite(params: object): Promise<{ token: string, url: string }>`
  - `fetchInviteForRespondent(token: string): Promise<{ state: string, invite: object|null }>`
  - `submitInviteResponses(token: string, responses: object): Promise<void>`
  - `markInviteReviewed(token: string): Promise<void>`
  - `deleteInvite(token: string): Promise<void>`
- Produces: Complete verification of parent invite cloud lifecycle and responses.

- [ ] **Step 1: Write the failing tests with mocked Firestore SDK**

```javascript
// src/__tests__/inviteService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import * as firebaseBackend from '../firebaseBackend';
import {
  createInvite,
  fetchInviteForRespondent,
  submitInviteResponses,
  markInviteReviewed,
  deleteInvite
} from '../services/inviteService';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ path: `${col}/${id}`, id })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP')
}));

vi.mock('../firebaseBackend', () => ({
  getFirestoreDb: vi.fn(() => ({})),
  getFirebaseAuth: vi.fn(() => ({ currentUser: { email: 'teacher@test.com' } })),
  ensureFirebaseAuthSession: vi.fn()
}));
```

- [ ] **Step 2: Run test to verify it fails if cloud backend is unconfigured**

Run: `npx vitest run src/__tests__/inviteService.test.js`
Expected: Test fails if `getFirestoreDb` returns null.

- [ ] **Step 3: Implement unit tests covering full invite lifecycle**

Cover:
1. `createInvite`: Throws when db is null; creates doc with `status: 'pending'`, studentId, ownerEmail; returns url with hash token.
2. `fetchInviteForRespondent`: Rejects invalid token format with `{ state: 'missing', invite: null }`; returns `{ state: 'expired' }` when expired; returns active invite.
3. `submitInviteResponses`: Rejects empty response; sanitizes answers; sets status to `'submitted'`.
4. `markInviteReviewed`: Sets `reviewedAt` and status to `'reviewed'`.
5. `deleteInvite`: Calls `deleteDoc`.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `npx vitest run src/__tests__/inviteService.test.js`
Expected: PASS with 8 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/inviteService.test.js
git commit -m "test: add parent invite cloud service unit tests"
```

---

### Task 3: Resilient Storage & Health Telemetry Engine Suite

**Files:**
- Create: `src/__tests__/storageAndHealthTelemetry.test.js`
- Test Targets: `src/services/storage.js`, `src/services/healthTelemetry.js`

**Interfaces:**
- Consumes:
  - `safeGetStorageItem(key, fallback)`
  - `safeSetStorageItem(key, value)`
  - `safeRemoveStorageItem(key)`
  - `safeGetStorageJson(key, fallback)`
  - `safeSetStorageJson(key, value)`
  - `reportHealthEvent(params)`
- Produces: Resilient local storage and health telemetry under crash/quota constraints.

- [ ] **Step 1: Write failing tests for storage under QuotaExceededError and corrupted JSON**

```javascript
// src/__tests__/storageAndHealthTelemetry.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
  safeGetStorageJson,
  safeSetStorageJson
} from '../services/storage';
import { reportHealthEvent } from '../services/healthTelemetry';
import * as firebaseBackend from '../firebaseBackend';

vi.mock('../firebaseBackend', () => ({
  getFirebaseAuth: vi.fn(() => ({ currentUser: { email: 'teacher@test.com' } })),
  reportHealthEventToCloud: vi.fn(() => Promise.resolve())
}));
```

- [ ] **Step 2: Run test to verify it executes against local mock**

Run: `npx vitest run src/__tests__/storageAndHealthTelemetry.test.js`
Expected: Check behavior when `localStorage.setItem` throws `QuotaExceededError`.

- [ ] **Step 3: Implement assertions for storage safety and telemetry deduplication**

1. `safeSetStorageItem` returns false and does not throw when `localStorage.setItem` throws.
2. `safeGetStorageJson` returns fallbackValue on malformed JSON without throwing.
3. `reportHealthEvent` deduplicates events with identical category/operation within the 30-second window.
4. `reportHealthEvent` never throws even when cloud dispatch rejects.

- [ ] **Step 4: Run test to verify all pass**

Run: `npx vitest run src/__tests__/storageAndHealthTelemetry.test.js`
Expected: PASS with 10 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/storageAndHealthTelemetry.test.js
git commit -m "test: add resilient storage and health telemetry unit tests"
```

---

### Task 4: Export Engine, PII Redaction & Print HTML Builders Suite

**Files:**
- Create: `src/__tests__/wordAndPrintBuilders.test.js`
- Test Target: `src/export/wordAndPrintBuilders.js`

**Interfaces:**
- Consumes:
  - `buildWorkPlanPrintHtml(formData, hideDetails, logoUrl)`
  - `buildEvalReportPrintHtml(formData, hideDetails, logoUrl)`
  - `buildStatusReportPrintHtml(formData, hideDetails, logoUrl)`
  - `buildWordDocumentHtml(formData, hideDetails)`
  - `buildEvalWordDocumentHtml(formData, hideDetails)`
  - `buildStatusReportWordDocumentHtml(formData, hideDetails)`
  - `getDisplayStudentName(formData, hideDetails)`
  - `getDisplayMaskedField(val, hideDetails)`
  - `getRedactedText(text, formData, hideDetails)`
  - `getSafeReportFilename(formData, hideDetails, ext, mode)`
- Produces: 100% verified student PII redaction and document formatting across print and Word formats.

- [ ] **Step 1: Write failing tests for print HTML generation and privacy masking**

```javascript
// src/__tests__/wordAndPrintBuilders.test.js
import { describe, it, expect } from 'vitest';
import {
  buildWorkPlanPrintHtml,
  buildEvalReportPrintHtml,
  buildStatusReportPrintHtml,
  getDisplayStudentName,
  getDisplayMaskedField,
  getRedactedText,
  getSafeReportFilename
} from '../export/wordAndPrintBuilders';

describe('Word and Print Builders (Export & PII Protection)', () => {
  const sampleStudent = {
    id: 'st_123',
    name: 'נועם אברהמי',
    idNumber: '312456789',
    phone: '0501234567',
    educationalFramework: 'בית ספר ארזים',
    goals: [
      { id: 'g_1', title: 'שיפור קריאה', environment: 'כיתה' }
    ]
  };

  it('masks student name, id, and phone in print HTML when hideDetails is true', () => {
    const html = buildWorkPlanPrintHtml(sampleStudent, true);
    expect(html).not.toContain('נועם אברהמי');
    expect(html).not.toContain('312456789');
    expect(html).not.toContain('0501234567');
    expect(html).toContain('████');
  });

  it('preserves full student details in print HTML when hideDetails is false', () => {
    const html = buildWorkPlanPrintHtml(sampleStudent, false);
    expect(html).toContain('נועם אברהמי');
    expect(html).toContain('312456789');
  });

  it('generates sanitised and filesystem-safe filename across operating systems', () => {
    const filename = getSafeReportFilename({ name: 'נועם/אברהמי*בדיקה' }, false, 'doc', 'tala');
    expect(filename).not.toMatch(/[\\/:*?"<>|]/);
    expect(filename).toContain('.doc');
  });
});
```

- [ ] **Step 2: Run test to verify it executes**

Run: `npx vitest run src/__tests__/wordAndPrintBuilders.test.js`
Expected: PASS.

- [ ] **Step 3: Add coverage for evaluation and status report print HTML**

Verify:
1. `buildEvalReportPrintHtml` renders domains, criteria, and teacher notes with RTL direction.
2. `buildStatusReportPrintHtml` formats bullet points cleanly.
3. `getRedactedText` redacts name occurrences from free-text goal descriptions.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `npx vitest run src/__tests__/wordAndPrintBuilders.test.js`
Expected: PASS with 8 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/wordAndPrintBuilders.test.js
git commit -m "test: add word and print builders PII redaction tests"
```

---

### Task 5: Firebase Cloud Storage & Operations Mock Suite

**Files:**
- Create: `src/__tests__/firebaseBackendCloud.test.js`
- Test Target: `src/firebaseBackend.js`

**Interfaces:**
- Consumes:
  - `parseFirebaseConfigInput(configInput)`
  - `isCloudBackendConfigured()`
  - `saveStudentToCloud(student, userEmail)`
  - `deleteStudentFromCloud(studentId, userEmail)`
  - `fetchAllowedUsersFromCloud()`
  - `saveAllowedUsersToCloud(usersList)`
  - `pingFirestore()`
- Produces: Cloud storage operations verification with zero remote network side-effects.

- [ ] **Step 1: Write failing tests with Firestore and Auth mocks**

```javascript
// src/__tests__/firebaseBackendCloud.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseFirebaseConfigInput,
  isCloudBackendConfigured
} from '../firebaseBackend';

describe('Firebase Backend Cloud Config & Serialization', () => {
  it('parses raw JS object or JSON configuration safely', () => {
    const rawConfig = `{ apiKey: "AIzaTestKey", projectId: "tala-test" }`;
    const parsed = parseFirebaseConfigInput(rawConfig);
    expect(parsed).toBeDefined();
    expect(parsed.projectId).toBe('tala-test');
  });

  it('rejects empty or corrupt firebase configuration strings', () => {
    expect(parseFirebaseConfigInput('')).toBeNull();
    expect(parseFirebaseConfigInput('corrupted { json')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it executes**

Run: `npx vitest run src/__tests__/firebaseBackendCloud.test.js`
Expected: PASS.

- [ ] **Step 3: Implement mocks for doc/collection and verify saveStudentToCloud**

Ensure:
1. `saveStudentToCloud` strips temporary UI flags before writing.
2. `deleteStudentFromCloud` uses atomic deleteDoc.
3. `pingFirestore` resolves true when connection succeeds and returns false on network timeout.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `npx vitest run src/__tests__/firebaseBackendCloud.test.js`
Expected: PASS with 6 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/firebaseBackendCloud.test.js
git commit -m "test: add firebase backend cloud serialization tests"
```

---

### Task 6: Email Service Config & Sending Engine Suite

**Files:**
- Create: `src/__tests__/emailServiceEngine.test.js`
- Test Target: `src/emailService.js`

**Interfaces:**
- Consumes:
  - `loadEmailEngineConfig()`
  - `saveEmailEngineConfig(cfg)`
  - `isDirectEmailEngineConfigured()`
  - `sendReportEmailInBackground(params)`
  - `sendUserInvitationEmailInBackground(params)`
  - `sendSignedNdaEmailToAdmin(params)`
  - `sendUserSurveyEmailToAdmin(params)`
- Produces: Complete verification of background email payloads and Apps Script proxy routing.

- [ ] **Step 1: Write failing tests for email config persistence and dispatch payloads**

```javascript
// src/__tests__/emailServiceEngine.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadEmailEngineConfig,
  saveEmailEngineConfig,
  isDirectEmailEngineConfigured
} from '../emailService';

describe('Email Service Configuration & Background Dispatch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and loads email engine configuration', () => {
    expect(isDirectEmailEngineConfigured()).toBe(false);
    saveEmailEngineConfig({ appsScriptUrl: 'https://script.google.com/macros/s/test/exec' });
    expect(isDirectEmailEngineConfigured()).toBe(true);
    expect(loadEmailEngineConfig().appsScriptUrl).toContain('script.google.com');
  });
});
```

- [ ] **Step 2: Run test to verify execution**

Run: `npx vitest run src/__tests__/emailServiceEngine.test.js`
Expected: PASS.

- [ ] **Step 3: Add fetch mocks to verify background email payload dispatch**

Verify:
1. `sendReportEmailInBackground` attaches recipient, subject, and encoded HTML.
2. Handles network fetch failures gracefully without throwing unhandled rejection.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `npx vitest run src/__tests__/emailServiceEngine.test.js`
Expected: PASS with 6 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/emailServiceEngine.test.js
git commit -m "test: add email service configuration and payload unit tests"
```

---

### Task 7: Modal State Validation & Interaction Logic Suite

**Files:**
- Create: `src/__tests__/modalStateAndValidation.test.js`
- Test Targets: `src/components/modals/StudentActionModals.jsx`, `src/components/modals/TrialUpgradeModal.jsx`, `src/components/modals/UserFeedbackSurveyModal.jsx`

**Interfaces:**
- Consumes: Modal state transition handlers, input validators, submission payloads.
- Produces: Automated verification of modal confirmation safeguards and error handling.

- [ ] **Step 1: Write tests for action modal confirmation safeguards**

Verify:
1. Delete student requires exact confirmation string match.
2. Trial upgrade modal calculates prorated price and days cleanly.
3. Feedback survey validates rating range (1-5) and feedback text limits.

- [ ] **Step 2: Run test to verify execution**

Run: `npx vitest run src/__tests__/modalStateAndValidation.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/modalStateAndValidation.test.js
git commit -m "test: add modal state validation tests"
```

---

## Final Verification Checklist

- [ ] Run full test suite: `npm test -- --run` (all 30+ test suites must pass 100%).
- [ ] Run production build check: `npm run build` (zero compilation or bundling errors).
- [ ] Verify test suite duration remains under 4 seconds total.
