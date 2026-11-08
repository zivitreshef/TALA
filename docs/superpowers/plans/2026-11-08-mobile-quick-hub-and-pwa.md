# Mobile Teacher Quick-Hub and PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide teachers with an intuitive, 1-click mobile quick-hub for searching students, printing/sharing reports, recording voice observations for today, typing notes, and running AI analysis to save directly to student goals—all wrapped in a seamless, free PWA shell with zero desktop regressions.

**Architecture:** 
- A mobile floating action button (FAB) that triggers a bottom-sheet modal (`MobileQuickActionsModal`).
- Responsive display triggers (`@media (max-width: 768px)` and mobile detection) ensuring desktop remains 100% unaffected.
- Reuses existing pedagogical AI observation match logic, `VoiceObservationRecorder`, and print/share builders.
- PWA manifest enhancements for iOS/Android standalone experience without app store fees.

**Tech Stack:** React, TypeScript, Vitest, Lucide React, Web Share API, Web Audio API, Gemini Proxy API.

**Spec:** Teacher request for mobile quick-hub: instant student search, print report, email report, voice record for today, typed note alternative, and AI analysis & save.

## Global Constraints
- KISS Implementation: Minimal complexity, progressive disclosure, clean modular components.
- Security-First: Student PII masking on AI calls, sanitized inputs.
- High Performance: Responsive, non-blocking audio recording and AI feedback.
- Professional Look & Feel: Clean RTL layout, 32x32px buttons, smooth transitions.
- Zero Uncovered Code: Unit tests in `src/__tests__/mobileQuickActionsModal.test.tsx`.
- Mandatory Version Bump: `package.json`, `src/domain/telemetryTaxonomy.ts`, and test suites.
- Hebrew-Only Titles: Strictly Hebrew titles and labels with ZERO English in parentheses.

## Review Focus
1. Mobile viewport boundaries: FAB and sheet must only show on mobile or toggle, never interfering with desktop tables or forms.
2. Touch target accessibility: Student chips and audio controls must be easily tappable on small screens (>44px touch targets).
3. Audio/Text fallback: Seamless transition between voice recording and manual typing if microphone is unavailable.
4. AI match resilience: Clear Hebrew feedback when student has no goals or no clear audio was detected.
5. PWA metadata integrity: Web manifest and iOS meta tags valid without breaking asset paths.

---

### Task 1: PWA Metadata & iOS Standalone Optimization
**Files:**
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`

- [ ] Add iOS standalone meta tags to `index.html` (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`).
- [ ] Verify `manifest.webmanifest` fields: standalone display, RTL direction, correct background and theme colors.

### Task 2: Create Mobile Quick-Actions Modal Component
**Files:**
- Create: `src/components/mobile/MobileQuickActionsModal.tsx`
- Create: `src/components/mobile/MobileQuickActionsModal.css`

- [ ] Build search input with instantaneous filtering on student list.
- [ ] Build student chip selection bar with active student highlighting.
- [ ] Implement quick actions bar: "הדפסת דוח" and "שיתוף דוח במייל".
- [ ] Implement today's observation section with voice recorder and text note toggle.
- [ ] Integrate AI goal analysis and auto-save matching to student goals.
- [ ] Apply mobile-only styling, smooth slide-up animation, and RTL layout.

### Task 3: Integrate Floating Action Button (FAB) in App.tsx
**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css` (or mobile CSS)

- [ ] Mount `MobileQuickActionsModal` conditionally or as a persistent floating button on mobile screens.
- [ ] Pass `students`, `selectedStudentId`, `onSelectStudent`, and `handleSaveStudentPlan`.
- [ ] Ensure desktop layout is completely unaffected.

### Task 4: Unit Test Suite & Version Bump
**Files:**
- Create: `src/__tests__/mobileQuickActionsModal.test.tsx`
- Modify: `package.json`
- Modify: `src/domain/telemetryTaxonomy.ts`
- Modify: `src/__tests__/appVersionSynchronization.test.js`
- Modify: `src/__tests__/typescriptPhase2Batch7.test.ts`
- Modify: `src/__tests__/typescriptStep2.test.tsx`

- [ ] Write tests covering student search filtering, print trigger, share trigger, voice/text mode switching, and AI save flow.
- [ ] Bump version from `2.6.36` to `2.6.37`.
- [ ] Run full test suite `npx vitest run` and build `npm run build`.
- [ ] Open PR, squash & merge via git hooks policy.
