# Project: TALA Usage Telemetry, Product Analytics & UX Intelligence

## Architecture

TALA's usage telemetry and product analytics subsystem is designed to operate seamlessly within TALA's existing static SPA (React 19 + Vite 8 on GitHub Pages) and BaaS (Firebase Firestore + Cloud Functions) architecture without adding external third-party tracking dependencies or incurring runtime costs.

```
+-----------------------------------------------------------------------------------------+
|                                    TALA Web Client                                      |
|                                                                                         |
|  +--------------------+   +---------------------+   +--------------------------------+  |
|  | User Interactions  |   | Pedagogical Funnels |   | Technical & Health Monitor     |  |
|  | - Navigation & Tabs|   | - Student Onboarding|   | - ErrorBoundary catches        |  |
|  | - Form changes     |   | - IEP Goals created |   | - Window unhandled errors      |  |
|  | - Daily Tracking   |   | - Daily Tracking    |   | - AI Proxy latency & retries   |  |
|  |   (Streaks, Voice/ |   |   (Voice/Text/Edit) |   | - Page load / web vitals       |  |
|  |    Text, Abandon)  |   | - Staff Readiness & |   |                                |  |
|  | - Doc Sharing      |   |   Pedagogical Summs |   |                                |  |
|  | - Pedagogical Chat |   | - Ministry Reports  |   |                                |  |
|  +---------+----------+   +----------+----------+   +---------------+----------------+  |
|            |                         |                              |                   |
|            +-------------------------+------------------------------+                   |
|                                      | (raw event payload)                              |
|                                      v                                                  |
|                   +------------------------------------+                                |
|                   |   Telemetry Privacy Guard          |                                |
|                   |   (5-Tier Sanitization Pipeline)   |                                |
|                   |   1. Taxonomy Whitelist            |                                |
|                   |   2. Prohibited Key Denylist       |                                |
|                   |   3. Multi-Pattern Regex Scrubber  |                                |
|                   |   4. Value Clamping & Types        |                                |
|                   |   5. Pseudonymizer (anonUserId)    |                                |
|                   +------------------+-----------------+                                |
|                                      | (sanitized, zero-PII event)                      |
|                                      v                                                  |
|                   +------------------------------------+                                |
|                   |   Telemetry Service & Ingestion    |                                |
|                   |   - In-memory event ring buffer    |                                |
|                   |   - Bounded localStorage fallback  |                                |
|                   |   - Auto-batching (15 evt / 45s)   |                                |
|                   |   - Non-blocking promise dispatch  |                                |
|                   |   - Retry with exponential backoff |                                |
|                   |   - Test/Admin exclusion filter    |                                |
|                   +------------------+-----------------+                                |
+--------------------------------------|--------------------------------------------------+
                                       |
                                       | HTTPS batched write (Firestore SDK)
                                       v
+-----------------------------------------------------------------------------------------+
|                                 Google Firebase (Cloud)                                 |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | Cloud Firestore Collection: tala_telemetry_events / tala_telemetry_batches        |  |
|  | - Security Rules: Append-only for signed-in users with schema validation          |  |
|  | - Read & Delete: Admin-only (request.auth.token.role == 'admin')                  |  |
|  | - 30-day / 90-day retention policies via Cloud Functions cleanup                  |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
                                       |
                                       | Admin query & aggregation
                                       v
+-----------------------------------------------------------------------------------------+
|                              Administrative Analytics Hub                               |
|                                                                                         |
|  - Host: AdminAllowlistModal (tab: 'analytics') or Dedicated Admin View                 |
|  - Access Control: Strict isAdminUser guard (currentUser.role === 'admin')              |
|  - Modules:                                                                             |
|    1. Overview (DAU/WAU/MAU, Cohorts, Adoption Index, Onboarding Completion)            |
|    2. Feature Adoption (Student Mgr, Goals, Daily Tracking, Reports, Parent Voice)      |
|    3. User Journey & Abandonment (Stage funnels, drop-off rates, time-to-first-X)       |
|    4. Daily Tracking & Teacher Routine (Entry freq, streaks, text vs voice, edit vs new)|
|    5. Pedagogical Summary & Staff Meeting Readiness (Summaries gen, readiness checks)   |
|    6. Document Sharing & Pedagogical Chat (Export channels, chat discovery/sessions)   |
|    7. UX Friction Intelligence (Unsaved exits, AI retries, observation gaps, errors)    |
|    8. Technical Health (API latencies, client JS exceptions, device/browser shares)     |
|    9. Controls: Time-range (24h/7d/30d/90d), test account exclusion, sampling & export  |
|  - UI/UX: Native Hebrew RTL, CSS design tokens, Lucide icons, lightweight SVG charts    |
+-----------------------------------------------------------------------------------------+
```

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Centralized Telemetry Service Core | In-memory ring buffer, batch queue, non-blocking dispatch, retry with backoff, duplicate detection | M1 | R1 |
| F2 | Telemetry Event Taxonomy | Strongly-typed event registry across engagement, workflows, UX friction, and technical health | M1 | R1 |
| F3 | Zero-Trust Privacy Guard & Sanitizer | 5-tier sanitization pipeline eliminating all student/teacher PII, clinical data, and AI prompts | M2 | R2 |
| F4 | 3-Tier Pseudonymization Engine | Salted SHA-256 `anonUserId`, ephemeral UUID v4 `sessionId`, and funnel `correlationId` | M2 | R2 |
| F5 | Ingestion & Storage Architecture | Firestore batch persistence (`tala_telemetry_events`) with strict security rules and quota protection | M3 | R4 |
| F6 | Admin & Test Account Segregation | Automatic classification (`teacher`, `admin`, `internal_test`, `demo`) and metric exclusion filter | M3 | R4 |
| F7 | Administrative Analytics Dashboard: Overview | DAU/WAU/MAU, user frequency, cohort retention, top features, onboarding rate | M4 | R5 |
| F8 | Administrative Analytics Dashboard: Feature Adoption | Multi-module adoption trends (Students, Goals, Tracking, Reports, Parent Voice) | M4 | R5 |
| F9 | Administrative Analytics Dashboard: User Journey & Abandonment | End-to-end stage funnels, workflow completion rates, step-by-step drop-offs | M4 | R5 |
| F10 | Administrative Analytics Dashboard: UX Friction Analysis | Form dirty-exit abandonment, AI retry rates, observation gaps, client JS errors | M4 | R5 |
| F11 | Administrative Analytics Dashboard: Technical Health & Controls | Latency percentiles, error rates, browser/device distribution, time filters, retention toggles | M4 | R5 |
| F12 | Onboarding Journey Telemetry Integration | Measuring start rates, 10-step progress, drop-off stages, time-to-first-student, time-to-first-report | M5 | R6 |
| F13 | Client Technical Health Auto-Instrumentation | Global ErrorBoundary logging, unhandled rejection capture, and navigation timing | M5 | R1, R5 |
| F14 | Comprehensive E2E Test Suite | 4-tier requirement-driven opaque-box test suite (Tiers 1-4) with 100% pass rate | E2E | AC |
| F15 | Adversarial Hardening & Forensic Audit | White-box coverage expansion (Tier 5) and zero-tolerance forensic privacy audit | AUDIT | AC |
| F16 | Daily Tracking Deep Analytics | Entry frequency, completion rate, daily tracking streaks/consistency, creation vs editing, voice vs text logging, abandonment | M4, M5 | Feedback #1 |
| F17 | Pedagogical Summary & Staff Readiness Telemetry | Teacher adoption count, summary generation frequency, staff meeting readiness checklist usage | M4, M5 | Feedback #2 |
| F18 | Document Sharing & Pedagogical Chat Telemetry | Document export/share channels, chat session frequency, tool discovery, zero-PII chat metadata | M4, M5 | Feedback #3 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M0 | Pre-Implementation Review & Visual Mock Gate | Document architecture, event taxonomy, privacy model; generate interactive wireframe artifact reflecting user feedback | None | DONE |
| M1 | Centralized Telemetry Service Core & Taxonomy | Core ring buffer, batching, retry, deduplication, event taxonomy definitions (`src/domain/telemetryTaxonomy.js`, `src/services/usageTelemetryService.js`) | M0 | DONE |
| M2 | Zero-Trust Privacy Guard & Pseudonymization | 5-tier sanitization pipeline, salted hashing, PII scrubbers, zero-PII unit tests (`src/domain/telemetryPrivacy.js`) | M1 | DONE |
| M3 | Storage Ingestion, Firestore Rules & Admin Exclusion | Firestore storage backend, admin security rules (`firestore.rules`), retention controls, test account exclusion (`src/services/telemetryStorage.js`) | M2 | DONE |
| M4 | Administrative Analytics Dashboard Hub | Admin analytics cockpit (`src/components/admin/AdminAnalyticsDashboard.jsx`), Daily Tracking deep metrics, Staff Meeting Readiness, Doc Sharing & Chat analytics, Hebrew RTL styling | M3 | DONE |
| M5 | Workflow Journey & Technical Health Instrumentation | Hooking Onboarding (10 steps), Daily Tracking (voice/text, streaks, abandonment), Staff Summaries, Doc Sharing, Chat, ErrorBoundary | M4 | DONE |
| M6 | Dual Track E2E Test Suite Pass & Adversarial Hardening | Running and passing 100% of Tiers 1-4 tests, followed by Tier 5 adversarial hardening | M5 | DONE |
| M7 | Forensic Audit & Final Delivery | Independent forensic audit for PII leaks, dummy facades, and full acceptance sign-off | M6 | DONE |

---

## Interface Contracts

### `src/domain/telemetryTaxonomy.js` ↔ Telemetry Clients
```javascript
export const TELEMETRY_CATEGORIES = {
  ENGAGEMENT: 'engagement',
  WORKFLOW: 'workflow',
  FRICTION: 'friction',
  TECHNICAL_HEALTH: 'technical_health',
  ONBOARDING: 'onboarding',
  DAILY_TRACKING: 'daily_tracking',
  PEDAGOGICAL_SUMMARY: 'pedagogical_summary',
  SHARING_AND_CHAT: 'sharing_and_chat'
};

export const TELEMETRY_EVENTS = {
  // Engagement
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  NAVIGATE_SCREEN: 'navigate_screen',
  FEATURE_VIEW: 'feature_view',
  
  // Workflows
  STUDENT_CREATED: 'student_created',
  STUDENT_ARCHIVED: 'student_archived',
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  REPORT_GENERATED: 'report_generated',
  PARENT_VOICE_LINK_CREATED: 'parent_voice_link_created',
  
  // Daily Pedagogical Tracking (Detailed)
  DAILY_TRACKING_ENTRY_STARTED: 'daily_tracking_entry_started',       // { mode: 'text' | 'voice', isEdit: boolean }
  DAILY_TRACKING_ENTRY_COMPLETED: 'daily_tracking_entry_completed',   // { mode: 'text' | 'voice', durationSec: number, isEdit: boolean, streakDays: number }
  DAILY_TRACKING_ENTRY_ABANDONED: 'daily_tracking_entry_abandoned',   // { mode: 'text' | 'voice', timeSpentSec: number }
  DAILY_TRACKING_STREAK_RECORDED: 'daily_tracking_streak_recorded',   // { currentStreakDays: number }
  
  // Pedagogical Summary & Staff Meeting Readiness
  PEDAGOGICAL_SUMMARY_GENERATED: 'pedagogical_summary_generated',     // { summaryType: 'staff_meeting' | 'periodic_review', studentCountBand: '1-5'|'6-15'|'16+' }
  STAFF_MEETING_READINESS_CHECKED: 'staff_meeting_readiness_checked', // { itemsCompletedCount: number, isFullyReady: boolean }
  
  // Document Sharing & Pedagogical Chat
  DOCUMENT_SHARED: 'document_shared',                                 // { format: 'pdf' | 'docx' | 'print', channel: 'download' | 'whatsapp_link' | 'email_link' }
  PEDAGOGICAL_CHAT_SESSION_STARTED: 'pedagogical_chat_session_started', // { triggerSource: 'floating_dock' | 'student_form' }
  PEDAGOGICAL_CHAT_TOOL_DISCOVERED: 'pedagogical_chat_tool_discovered', // { toolType: 'goal_suggester' | 'acronym_explainer' | 'observation_assistant' }
  PEDAGOGICAL_CHAT_SESSION_ENDED: 'pedagogical_chat_session_ended',   // { durationSec: number, turnsCount: number } (strictly NO message content!)
  
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_PAUSED: 'onboarding_paused',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_DISMISSED: 'onboarding_dismissed',
  
  // UX Friction
  FORM_DIRTY_ABANDONED: 'form_dirty_abandoned',
  ACTION_FAILED_REPEATEDLY: 'action_failed_repeatedly',
  OBSERVATION_GAP_DETECTED: 'observation_gap_detected',
  SEARCH_ZERO_RESULTS: 'search_zero_results',
  
  // Technical Health
  CLIENT_JS_ERROR: 'client_js_error',
  API_OPERATION_FAILED: 'api_operation_failed',
  AI_LATENCY_RECORDED: 'ai_latency_recorded',
  PAGE_LOAD_RECORDED: 'page_load_recorded'
};
```

### `src/domain/telemetryPrivacy.js` ↔ `src/services/usageTelemetryService.js`
```javascript
// Sanitizes incoming event payloads against 0% PII rules
export function sanitizeTelemetryPayload(eventName, rawProperties, userContext);
// Returns: {
//   eventId: string,
//   eventName: string,
//   category: string,
//   anonUserId: string,      // 32-char salted hash
//   sessionId: string,       // ephemeral UUID v4
//   accountType: 'teacher' | 'admin' | 'internal_test' | 'demo',
//   properties: Record<string, string | number | boolean>,
//   timestampMs: number
// }
```

---

## Code Layout

```
src/
├── domain/
│   ├── telemetryTaxonomy.js       # Centralized event taxonomy definitions & schemas (includes Daily Tracking, Staff Readiness, Doc Sharing & Chat)
│   ├── telemetryPrivacy.js        # 5-tier zero-trust sanitization & pseudonymization
│   └── telemetryAggregator.js     # Analytics aggregation, funnels, streaks & cohort metrics computation
├── services/
│   ├── usageTelemetryService.js   # Non-blocking ring buffer, batch queue & retry manager
│   └── telemetryStorage.js        # Firestore storage adapter, retention & admin exclusion
├── components/
│   └── admin/
│       ├── AdminAnalyticsDashboard.jsx       # Primary administrative analytics hub
│       ├── AnalyticsOverviewTab.jsx          # Active users, cohorts, top features
│       ├── AnalyticsFeatureTab.jsx           # Multi-module feature adoption breakdowns
│       ├── AnalyticsDailyTrackingTab.jsx     # Deep Daily Tracking metrics (streaks, voice/text, completion)
│       ├── AnalyticsStaffAndChatTab.jsx      # Pedagogical summaries, staff meeting readiness, doc share & chat
│       ├── AnalyticsJourneyTab.jsx           # Workflow funnels & onboarding paths
│       ├── AnalyticsFrictionTab.jsx          # Form abandonment, latency & error friction
│       └── AnalyticsHealthTab.jsx            # Technical health, errors, device stats & controls
└── __tests__/
    ├── usageTelemetryService.test.js         # Queue, batching, retry & deduplication tests
    ├── telemetryPrivacyGuard.test.js         # Strict zero-PII leak prevention tests
    ├── telemetryTaxonomy.test.js             # Event schema validation & classification tests
    ├── telemetryAggregator.test.js           # Funnel, cohort, streak & friction aggregation tests
    └── adminAnalyticsDashboard.test.jsx      # Dashboard rendering, RTL & access control tests
```
