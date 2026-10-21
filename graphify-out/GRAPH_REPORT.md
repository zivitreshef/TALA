# Graph Report - TALA  (2026-10-20)

## Corpus Check
- 76 files · ~137,088 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .css 2, .rules 1)

## Summary
- 633 nodes · 1808 edges · 38 communities (25 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2839a29`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- firebaseBackend.js
- App.jsx
- index.js
- allowedUsers.js
- EcologicalWorkPlanForm.jsx
- coreDomain.test.js
- package.json
- utils/studentStage.js
- AI Security Hardening Plan: Backend Proxy, Validation, Rate Limiting
- parentInvite.js
- src/studentStage.js
- TALA integrated ecological work-plan system (Hebrew RTL web app)
- Seven-step authentication and session security flowchart
- Apple Touch Icon (180x180 PNG, ~64KB)
- TALA Logo (64x64 circular favicon emblem)
- TALA Logo (JPEG)
- checkPresenceGate.js
- TALA Logo (16x16 favicon)
- TALA Logo (32x32 favicon)
- Defense-in-Depth guiding security principle
- TALA Architecture and Security Whitepaper (PDF export, content unread)
- handleResendInvitationEmail (older copy with mojibake strings)
- goalSizingAndMerge.js
- Factual-only reporting and manual-edit overwrite guards against AI hallucination
- Firestore data isolation by ownerEmail and sharedWith with server rules
- Multi-year student tracking with smart goal rollover
- Controlled inter-team collaboration via matya team groups
- Three official reports: TALA plan, mid/end-year evaluation, educational-functional status report
- healthEvents.js
- react
- functions/package.json
- publishUsers
- setUpgradeBanner.js
- scripts
- dependencies
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `EcologicalWorkPlanForm()` - 77 edges
2. `App()` - 73 edges
3. `getFirestoreDb()` - 28 edges
4. `react` - 22 edges
5. `adaptTextToGender()` - 22 edges
6. `lucide-react` - 20 edges
7. `reverseEngineerRawTextLocally()` - 19 edges
8. `AdminAllowlistModal()` - 18 edges
9. `vitest` - 16 edges
10. `ParentVoiceControl()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `2) Where to Compute (When to Persist)` --references--> `saveStudentToCloud()`  [INFERRED]
  .kilo/plans/1791477913955-tala-stage-cached-once-plan.md → src/firebaseBackend.js
- `Current State (Relevant)` --references--> `saveStudentToCloud()`  [INFERRED]
  .kilo/plans/1791477913955-tala-stage-cached-once-plan.md → src/firebaseBackend.js
- `3) Hidden Variable Injection (Cached, Not Re-Calculated)` --references--> `reverseEngineerRawTextLocally()`  [INFERRED]
  .kilo/plans/1791477913955-tala-stage-cached-once-plan.md → src/goalBankData.js
- `4) Implementation Steps` --references--> `reverseEngineerRawTextLocally()`  [INFERRED]
  .kilo/plans/1791477913955-tala-stage-cached-once-plan.md → src/goalBankData.js
- `Current State (Relevant)` --references--> `reverseEngineerRawTextLocally()`  [INFERRED]
  .kilo/plans/1791477913955-tala-stage-cached-once-plan.md → src/goalBankData.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication and session flowchart mechanisms** — tala_architecture_and_security_authentication_session_flow, tala_architecture_and_security_password_hashing_pbkdf, tala_architecture_and_security_anti_brute_force_lockout, tala_architecture_and_security_trial_nda_gate, tala_architecture_and_security_daily_session_reset [EXTRACTED 1.00]
- **Defense-in-Depth security layers of TALA** — tala_architecture_and_security_defense_in_depth, tala_architecture_and_security_zero_trust_cicd, tala_architecture_and_security_password_hashing_pbkdf, tala_architecture_and_security_pii_redaction_engine, tala_architecture_and_security_firestore_ownership_isolation, tala_architecture_and_security_daily_session_reset, tala_architecture_and_security_secured_code_attitude [INFERRED 0.85]
- **Student PII protection across print and AI channels** — readme_print_privacy_protection, tala_architecture_and_security_pii_redaction_engine, _kilo_plans_1791449388302_mask_pii_before_ai_mask_prompt_for_ai, _kilo_plans_1791449388302_mask_pii_before_ai_mask_known_student_details [INFERRED 0.85]

## Communities (38 total, 13 thin omitted)

### Community 0 - "firebaseBackend.js"
Cohesion: 0.11
Nodes (37): AllowlistAuthGate(), DISCIPLINE_LEAD_OPTIONS, mergeGoalObjects(), mergeObservationsLists(), mergeStudentSnapshots(), clearHealthEventsInCloud(), DEFAULT_FB_KEY_CODES, DEFAULT_FIREBASE_CONFIG (+29 more)

### Community 1 - "App.jsx"
Cohesion: 0.10
Nodes (47): ensureUsersListPasswordsHashed(), loadAllowedUsers(), saveAllowedUsers(), App(), SessionEvictedModal(), ArchiveStudentModal(), DeleteStudentModal(), LogoutUnsavedModal() (+39 more)

### Community 2 - "index.js"
Cohesion: 0.13
Nodes (21): admin, ALLOWED_MODELS, ALLOWED_OPERATIONS, buildPromptForOperation(), buildSystemInstruction(), callGemini(), checkRateLimit(), containsInjection() (+13 more)

### Community 3 - "allowedUsers.js"
Cohesion: 0.08
Nodes (55): computeGroupStats(), computeTrialExpirationIso(), createPasswordCredentials(), DAILY_AI_QUOTA_LIMIT, DAILY_EMAIL_QUOTA_LIMIT, DEFAULT_TRIAL_DAYS, ensureUserPasswordHashed(), extendUserTrial() (+47 more)

### Community 4 - "EcologicalWorkPlanForm.jsx"
Cohesion: 0.08
Nodes (72): MinistryCopyModal(), ShareTeamModal(), StatusReportPanel(), buildMinistryCopyBlocks(), cleanLine(), formatAllMinistryBlocks(), maskPromptForAi(), maskSensitiveValue() (+64 more)

### Community 5 - "coreDomain.test.js"
Cohesion: 0.15
Nodes (17): DEFAULT_ALLOWED_USERS, canArchiveStudent(), canDeleteStudent(), canEditStudent(), canLockReport(), canRestoreStudent(), canShareStudent(), canViewStudent() (+9 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (31): dependencies, firebase, html2pdf.js, lucide-react, react, react-dom, devDependencies, @types/react (+23 more)

### Community 7 - "utils/studentStage.js"
Cohesion: 0.26
Nodes (15): BARE_AMBIGUOUS, calcAgeYears(), detectStudentStage(), formatPromptWithStudentContext(), getEffectiveStudentStage(), getStageRuleLine(), hasKindergarten(), hasSchool() (+7 more)

### Community 8 - "AI Security Hardening Plan: Backend Proxy, Validation, Rate Limiting"
Cohesion: 0.15
Nodes (15): CI quality gate: unit tests run before build and deploy, Deploy TALA Frontend to GitHub Pages workflow, maskKnownStudentDetails keyword masker (planned), maskPromptForAi prompt-level masking (planned), Plan: Mask Section 1 details before every Gemini call, Firebase Cloud Function AI backend proxy (POST /api/ai/generate), Client-side Gemini API key exposure (tala_gemini_api_key in localStorage), AI Security Hardening Plan: Backend Proxy, Validation, Rate Limiting (+7 more)

### Community 9 - "parentInvite.js"
Cohesion: 0.11
Nodes (40): firebase, react-dom, getFirstName(), ParentVoiceControl(), PILL_STYLES, Message(), PageShell(), ParentStudentInputView() (+32 more)

### Community 10 - "src/studentStage.js"
Cohesion: 0.26
Nodes (13): BARE_AMBIGUOUS, calcAgeYears(), detectStudentStage(), getEffectiveStudentStage(), getStageRuleLine(), hasKindergarten(), hasSchool(), KDG_KEYWORDS (+5 more)

### Community 11 - "TALA integrated ecological work-plan system (Hebrew RTL web app)"
Cohesion: 0.20
Nodes (9): Allowed Users List access control with admin management UI, Dynamic usage goal bank ranked by usage frequency, AI facilitating questions (max 3) auto-filling the 6 goal columns, Print privacy protection: name to initials and sensitive fields blacked out, TALA integrated ecological work-plan system (Hebrew RTL web app), PII redaction engine: initials conversion and sensitive field blacking, TALA Marketing Presentation for matya teams (6-slide HTML), Shared dynamic goal bank with gender auto-adjustment (marketing claim) (+1 more)

### Community 13 - "Seven-step authentication and session security flowchart"
Cohesion: 0.50
Nodes (4): Anti-brute-force lockout after 5 failed login attempts, Seven-step authentication and session security flowchart, Daily automatic logout for shared computers (sessionDate check), Trial-user onboarding gates: forced password change and digital NDA signature

### Community 14 - "Apple Touch Icon (180x180 PNG, ~64KB)"
Cohesion: 0.67
Nodes (3): iOS Home Screen App Icon Convention, Apple Touch Icon (180x180 PNG, ~64KB), TALA App Brand Identity / Icon Artwork (undetermined)

### Community 15 - "TALA Logo (64x64 circular favicon emblem)"
Cohesion: 0.67
Nodes (3): Depicted Motif (unconfirmed: circular badge with green/terracotta/blue organic forms), TALA Logo (64x64 circular favicon emblem), TALA Web Application

### Community 16 - "TALA Logo (JPEG)"
Cohesion: 0.67
Nodes (3): TALA Brand Identity, TALA Logo (JPEG), TALA Web Application

### Community 23 - "goalSizingAndMerge.js"
Cohesion: 0.08
Nodes (36): 1) Detection Logic, 2) Where to Compute (When to Persist), 3) Hidden Variable Injection (Cached, Not Re-Calculated), 4) Implementation Steps, 5) Test Cases (Concrete), 6) Risks & Mitigations, 7) Validation Plan, Current State (Relevant) (+28 more)

### Community 29 - "healthEvents.js"
Cohesion: 0.13
Nodes (27): vitest, DiagnosticIntakeModal(), formatTime(), SEVERITY_STYLE, SystemHealthPanel(), applyDiagnosticIntakeToStudent(), buildDiagnosticPrompt(), extractTextFromFile() (+19 more)

### Community 30 - "react"
Cohesion: 0.09
Nodes (17): lucide-react, react, ErrorBoundary, QuickObservationModal(), TakeoverModal(), extractSignatureAssetsFromCanvas(), TrialNdaModal(), RATING_LABELS (+9 more)

### Community 31 - "functions/package.json"
Cohesion: 0.15
Nodes (12): description, engines, node, main, name, private, eslint, eslint-config-google (+4 more)

### Community 32 - "publishUsers"
Cohesion: 0.29
Nodes (12): callerEmail(), emailKey(), handleTalaConfigWrite(), handleTalaLogin(), hashPw(), lc(), pick(), publishUsers() (+4 more)

### Community 33 - "setUpgradeBanner.js"
Cohesion: 0.43
Nodes (5): fetchCurrentSettings(), getAccessToken(), main(), setUpgradeBanner(), showStatus()

### Community 34 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, deploy, lint, logs, serve, shell, start

### Community 35 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, firebase-admin, firebase-functions, node-fetch

### Community 36 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, eslint, eslint-config-google, firebase-functions-test

## Ambiguous Edges - Review These
- `TALA Marketing Presentation for matya teams (6-slide HTML)` → `TALA Marketing Presentation (PDF export, content unread)`  [AMBIGUOUS]
  TALA_Marketing_Presentation.pdf · relation: semantically_similar_to
- `TALA App Brand Identity / Icon Artwork (undetermined)` → `Apple Touch Icon (180x180 PNG, ~64KB)`  [AMBIGUOUS]
  public/apple-touch-icon.png · relation: conceptually_related_to
- `Depicted Motif (unconfirmed: circular badge with green/terracotta/blue organic forms)` → `TALA Logo (64x64 circular favicon emblem)`  [AMBIGUOUS]
  public/favicon.png · relation: conceptually_related_to
- `TALA Web Application` → `TALA Logo (JPEG)`  [AMBIGUOUS]
  public/tala-logo.png · relation: semantically_similar_to
- `TALA Architecture and Security Whitepaper (PDF export, content unread)` → `TALA Architecture and Security Whitepaper (6-slide HTML)`  [AMBIGUOUS]
  TALA_Architecture_And_Security.pdf · relation: semantically_similar_to

## Knowledge Gaps
- **39 isolated node(s):** `node-fetch`, `eslint`, `eslint-config-google`, `firebase-functions-test`, `@types/react` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 167 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `healthEvents.js` to `firebaseBackend.js`, `App.jsx`, `allowedUsers.js`, `EcologicalWorkPlanForm.jsx`, `coreDomain.test.js`, `package.json`, `utils/studentStage.js`, `parentInvite.js`, `react`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `node-fetch`, `eslint`, `eslint-config-google` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `firebaseBackend.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10993657505285412 - nodes in this community are weakly interconnected._
- **Why does `redactStudentNameInText()` connect `EcologicalWorkPlanForm.jsx` to `AI Security Hardening Plan: Backend Proxy, Validation, Rate Limiting`, `App.jsx`, `TALA integrated ecological work-plan system (Hebrew RTL web app)`, `coreDomain.test.js`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `TALA Marketing Presentation for matya teams (6-slide HTML)` and `TALA Marketing Presentation (PDF export, content unread)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `TALA App Brand Identity / Icon Artwork (undetermined)` and `Apple Touch Icon (180x180 PNG, ~64KB)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._