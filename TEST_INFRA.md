# E2E Test Infra: TALA Telemetry & Analytics

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md` and user-approved `PROJECT.md`.
- Zero-Trust Privacy Baseline: 100% mathematical verification that no PII, student identifiers, clinical diagnoses, notes, or AI prompts ever enter telemetry payloads.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Scenarios.

## Feature Inventory & Test Coverage Goals
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|--------|:-----------------:|:-------------------:|:----------------------:|:-------------------:|
| F1 | Centralized Telemetry Core (Batching, Ring Buffer) | R1 | 5 | 5 | ✓ | ✓ |
| F2 | Telemetry Event Taxonomy Registry | R1 | 5 | 5 | ✓ | ✓ |
| F3 | Zero-Trust Privacy Guard (5-Tier Sanitizer) | R2 | 5 | 5 | ✓ | ✓ |
| F4 | 3-Tier Pseudonymization Engine (`anonUserId`, etc.) | R2 | 5 | 5 | ✓ | ✓ |
| F5 | Storage Ingestion, Firestore Security Rules | R4 | 5 | 5 | ✓ | ✓ |
| F6 | Admin & Internal Test Account Segregation | R4 | 5 | 5 | ✓ | ✓ |
| F7 | Admin Analytics Dashboard: Overview Tab | R5 | 5 | 5 | ✓ | ✓ |
| F8 | Admin Analytics Dashboard: Feature Adoption | R5 | 5 | 5 | ✓ | ✓ |
| F9 | Admin Analytics Dashboard: Journeys & Abandonment | R5 | 5 | 5 | ✓ | ✓ |
| F10 | Admin Analytics Dashboard: UX Friction Intelligence | R5 | 5 | 5 | ✓ | ✓ |
| F11 | Admin Analytics Dashboard: Technical Health & Controls | R5 | 5 | 5 | ✓ | ✓ |
| F12 | Onboarding Journey Telemetry Integration | R6 | 5 | 5 | ✓ | ✓ |
| F13 | Client Technical Health Auto-Instrumentation | R1, R5 | 5 | 5 | ✓ | ✓ |
| F14 | Comprehensive E2E Test Suite | AC | 5 | 5 | ✓ | ✓ |
| F15 | Adversarial Hardening & Forensic Audit | AC | 5 | 5 | ✓ | ✓ |
| F16 | Daily Pedagogical Tracking Deep Metrics (Streaks/Voice) | Feedback | 5 | 5 | ✓ | ✓ |
| F17 | Pedagogical Summary & Staff Readiness Telemetry | Feedback | 5 | 5 | ✓ | ✓ |
| F18 | Document Sharing & Zero-PII Pedagogical Chat | Feedback | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Vitest (`npx vitest run`)
- **Location**: `src/__tests__/telemetryE2E.test.js`, `src/__tests__/telemetryPrivacyGuard.test.js`, `src/__tests__/usageTelemetryService.test.js`, `src/__tests__/adminAnalyticsDashboard.test.jsx`
- **Pass/Fail Semantics**: 100% pass rate, exit code 0, zero unhandled rejections, zero PII leak violations.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| S1 | New Teacher Complete Onboarding to First Student & Report | F1, F2, F3, F4, F12, F18 | High |
| S2 | Daily Pedagogical Tracking Week (Streaks, Voice vs Text, Edits) | F1, F2, F3, F16 | High |
| S3 | Staff Meeting Preparation & Summary Export Workflow | F1, F2, F3, F17, F18 | Medium |
| S4 | Network Interruption, Offline Bounded Queue & Batch Recovery | F1, F3, F5 | High |
| S5 | Administrator Access Control, Test Account Exclusion & Filtering | F5, F6, F7, F8, F9, F10, F11 | High |
| S6 | Accidental PII Ingestion Assault (Aggressive Leak Prevention) | F2, F3, F4 | Critical |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 90 test cases)
- Tier 2: ≥5 per feature (Total ≥ 90 test cases)
- Tier 3: Pairwise combinations across categories (≥ 25 test cases)
- Tier 4: ≥ 6 realistic application-level scenarios
- Total Test Target: ~210+ comprehensive test assertions
