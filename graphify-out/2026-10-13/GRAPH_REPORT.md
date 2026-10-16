# Graph Report - TALA  (2026-10-08)

## Corpus Check
- 52 files · ~131,558 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .patch 1, .rules 1)

## Summary
- 379 nodes · 947 edges · 25 communities (15 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 1% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 79,800 input · 11,600 output

## Community Hubs (Navigation)
- App Shell & Student Modals
- Goal Sizing, Rollover & Domain Rules
- Cloud Function AI Proxy & Validation
- Privacy Masking & Report Generation
- Auth, Password Hashing & Allowlist
- Build Config & Dependencies
- Student Ownership & Session Permissions
- Email Service & PDF Documents
- AI Security Hardening & CI
- Docs, Marketing & Privacy Claims
- Allowlist UI (Legacy & Refs)
- Authentication & Session Security
- Apple Touch Icon
- Favicon Emblem (64x64)
- TALA Logo (JPEG)
- Favicon 16x16
- Favicon 32x32
- Architecture & Defense-in-Depth
- Architecture Whitepaper (PDF/HTML)
- AI Hallucination Guards
- Firestore Data Isolation
- Multi-Year Tracking
- Team Collaboration
- Three Official Reports

## God Nodes (most connected - your core abstractions)
1. `App()` - 54 edges
2. `EcologicalWorkPlanForm()` - 53 edges
3. `resolveStudentAgeAndDateInfo()` - 15 edges
4. `maskSensitiveValue()` - 14 edges
5. `isStudentOwnedByUser()` - 13 edges
6. `buildWorkPlanPrintHtml()` - 13 edges
7. `buildWordDocumentHtml()` - 13 edges
8. `react` - 12 edges
9. `ensureUsersListPasswordsHashed()` - 12 edges
10. `handleAiGenerate()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `TALA Architecture and Security Whitepaper (PDF export, content unread)` --semantically_similar_to--> `TALA Architecture and Security Whitepaper (6-slide HTML)`  [AMBIGUOUS] [semantically similar]
  TALA_Architecture_And_Security.pdf → TALA_Architecture_And_Security.html
- `TALA Marketing Presentation (PDF export, content unread)` --semantically_similar_to--> `TALA Marketing Presentation for matya teams (6-slide HTML)`  [AMBIGUOUS] [semantically similar]
  TALA_Marketing_Presentation.pdf → TALA_Marketing_Presentation.html
- `Salted SHA-256 PBKDF password hashing (256 rounds + 128-bit salt)` --references--> `hashPasswordWithSalt()`  [EXTRACTED]
  TALA_Architecture_And_Security.html → src/allowedUsers.js
- `maskKnownStudentDetails keyword masker (planned)` --references--> `redactStudentNameInText()`  [EXTRACTED]
  .kilo/plans/1791449388302-mask-pii-before-ai.md → src/domain/privacyAndAcronyms.js
- `PII redaction engine: initials conversion and sensitive field blacking` --references--> `redactStudentNameInText()`  [EXTRACTED]
  TALA_Architecture_And_Security.html → src/domain/privacyAndAcronyms.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication and session flowchart mechanisms** — tala_architecture_and_security_authentication_session_flow, tala_architecture_and_security_password_hashing_pbkdf, tala_architecture_and_security_anti_brute_force_lockout, tala_architecture_and_security_trial_nda_gate, tala_architecture_and_security_daily_session_reset [EXTRACTED 1.00]
- **Defense-in-Depth security layers of TALA** — tala_architecture_and_security_defense_in_depth, tala_architecture_and_security_zero_trust_cicd, tala_architecture_and_security_password_hashing_pbkdf, tala_architecture_and_security_pii_redaction_engine, tala_architecture_and_security_firestore_ownership_isolation, tala_architecture_and_security_daily_session_reset, tala_architecture_and_security_secured_code_attitude [INFERRED 0.85]
- **Student PII protection across print and AI channels** — readme_print_privacy_protection, tala_architecture_and_security_pii_redaction_engine, _kilo_plans_1791449388302_mask_pii_before_ai_mask_prompt_for_ai, _kilo_plans_1791449388302_mask_pii_before_ai_mask_known_student_details [INFERRED 0.85]

## Communities (25 total, 10 thin omitted)

### Community 0 - "App Shell & Student Modals"
Cohesion: 0.07
Nodes (41): lucide-react, react, react-dom, ensureUsersListPasswordsHashed(), saveAllowedUsers(), App(), ErrorBoundary, ArchiveStudentModal() (+33 more)

### Community 1 - "Goal Sizing, Rollover & Domain Rules"
Cohesion: 0.09
Nodes (43): adaptTextToGender(), addMonthsClamped(), attachAiBaselineToGoal(), doGoalsReferToSameTopic(), doSingleGoalPairMatch(), DURATION_TSHIRT_OPTIONS, formatDateHe(), GENDER_PHRASE_PAIRS (+35 more)

### Community 2 - "Cloud Function AI Proxy & Validation"
Cohesion: 0.05
Nodes (45): admin, ALLOWED_MODELS, ALLOWED_OPERATIONS, buildPromptForOperation(), buildSystemInstruction(), callGemini(), checkRateLimit(), containsInjection() (+37 more)

### Community 3 - "Privacy Masking & Report Generation"
Cohesion: 0.18
Nodes (38): ShareTeamModal(), StatusReportPanel(), adaptGoalToGender(), maskPromptForAi(), maskSensitiveValue(), redactStudentNameInText(), toHebrewAcronym(), generateStatusReportLocally() (+30 more)

### Community 4 - "Auth, Password Hashing & Allowlist"
Cohesion: 0.11
Nodes (34): Admin allowlist modal UI (allowed-users management table and forms), handleDeleteUser, handleResendInvitationEmail, handleSaveNewPassword, handleToggleActive, handleUnlockUser, Allowed-users modal component signature and local state, handleResendInvitationEmail (older copy with mojibake strings) (+26 more)

### Community 5 - "Build Config & Dependencies"
Cohesion: 0.06
Nodes (29): dependencies, firebase, html2pdf.js, lucide-react, react, react-dom, devDependencies, @types/react (+21 more)

### Community 6 - "Student Ownership & Session Permissions"
Cohesion: 0.20
Nodes (18): getCurrentLocalDayKey(), isSessionUserValidForToday(), stampSessionUserWithDate(), canArchiveStudent(), canDeleteStudent(), canEditStudent(), canLockReport(), canRestoreStudent() (+10 more)

### Community 7 - "Email Service & PDF Documents"
Cohesion: 0.19
Nodes (15): blobToBase64(), buildOnboardingInvitationHtml(), buildSignedNdaDocumentHtml(), buildUserSurveyEmailHtml(), DEFAULT_APPS_SCRIPT_URL, EMAIL_ENGINE_STORAGE_KEY, generateSignedNdaPdfBlob(), GOOGLE_APPS_SCRIPT_TEMPLATE (+7 more)

### Community 8 - "AI Security Hardening & CI"
Cohesion: 0.15
Nodes (15): CI quality gate: unit tests run before build and deploy, Deploy TALA Frontend to GitHub Pages workflow, maskKnownStudentDetails keyword masker (planned), maskPromptForAi prompt-level masking (planned), Plan: Mask Section 1 details before every Gemini call, Firebase Cloud Function AI backend proxy (POST /api/ai/generate), Client-side Gemini API key exposure (tala_gemini_api_key in localStorage), AI Security Hardening Plan: Backend Proxy, Validation, Rate Limiting (+7 more)

### Community 9 - "Docs, Marketing & Privacy Claims"
Cohesion: 0.20
Nodes (9): Allowed Users List access control with admin management UI, Dynamic usage goal bank ranked by usage frequency, AI facilitating questions (max 3) auto-filling the 6 goal columns, Print privacy protection: name to initials and sensitive fields blacked out, TALA integrated ecological work-plan system (Hebrew RTL web app), PII redaction engine: initials conversion and sensitive field blacking, TALA Marketing Presentation for matya teams (6-slide HTML), Shared dynamic goal bank with gender auto-adjustment (marketing claim) (+1 more)

### Community 10 - "Allowlist UI (Legacy & Refs)"
Cohesion: 0.31
Nodes (4): AdminAllowlistModal(), generateRandomTempPassword(), PasswordPolicyChecklist(), UserSelfPasswordModal()

### Community 12 - "Authentication & Session Security"
Cohesion: 0.50
Nodes (4): Anti-brute-force lockout after 5 failed login attempts, Seven-step authentication and session security flowchart, Daily automatic logout for shared computers (sessionDate check), Trial-user onboarding gates: forced password change and digital NDA signature

### Community 13 - "Apple Touch Icon"
Cohesion: 0.67
Nodes (3): iOS Home Screen App Icon Convention, Apple Touch Icon (180x180 PNG, ~64KB), TALA App Brand Identity / Icon Artwork (undetermined)

### Community 14 - "Favicon Emblem (64x64)"
Cohesion: 0.67
Nodes (3): Depicted Motif (unconfirmed: circular badge with green/terracotta/blue organic forms), TALA Logo (64x64 circular favicon emblem), TALA Web Application

### Community 15 - "TALA Logo (JPEG)"
Cohesion: 0.67
Nodes (3): TALA Brand Identity, TALA Logo (JPEG), TALA Web Application

## Ambiguous Edges - Review These
- `TALA Architecture and Security Whitepaper (6-slide HTML)` → `TALA Architecture and Security Whitepaper (PDF export, content unread)`  [AMBIGUOUS]
  TALA_Architecture_And_Security.pdf · relation: semantically_similar_to
- `TALA Marketing Presentation for matya teams (6-slide HTML)` → `TALA Marketing Presentation (PDF export, content unread)`  [AMBIGUOUS]
  TALA_Marketing_Presentation.pdf · relation: semantically_similar_to
- `Apple Touch Icon (180x180 PNG, ~64KB)` → `TALA App Brand Identity / Icon Artwork (undetermined)`  [AMBIGUOUS]
  public/apple-touch-icon.png · relation: conceptually_related_to
- `TALA Logo (64x64 circular favicon emblem)` → `Depicted Motif (unconfirmed: circular badge with green/terracotta/blue organic forms)`  [AMBIGUOUS]
  public/favicon.png · relation: conceptually_related_to
- `TALA Logo (JPEG)` → `TALA Web Application`  [AMBIGUOUS]
  public/tala-logo.png · relation: semantically_similar_to

## Knowledge Gaps
- **104 isolated node(s):** `functions`, `admin`, `ALLOWED_OPERATIONS`, `ALLOWED_MODELS`, `OPERATION_LIMITS` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `TALA Architecture and Security Whitepaper (6-slide HTML)` and `TALA Architecture and Security Whitepaper (PDF export, content unread)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `redactStudentNameInText()` connect `Privacy Masking & Report Generation` to `AI Security Hardening & CI`, `Goal Sizing, Rollover & Domain Rules`, `Student Ownership & Session Permissions`, `Docs, Marketing & Privacy Claims`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `functions`, `admin`, `ALLOWED_OPERATIONS` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Student Modals` be split into smaller, more focused modules?**
  _Cohesion score 0.07019230769230769 - nodes in this community are weakly interconnected._
- **What is the exact relationship between `TALA Marketing Presentation for matya teams (6-slide HTML)` and `TALA Marketing Presentation (PDF export, content unread)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `react` connect `App Shell & Student Modals` to `Goal Sizing, Rollover & Domain Rules`, `Privacy Masking & Report Generation`, `Auth, Password Hashing & Allowlist`, `Build Config & Dependencies`, `Allowlist UI (Legacy & Refs)`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `Goal Sizing, Rollover & Domain Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.08865248226950355 - nodes in this community are weakly interconnected._