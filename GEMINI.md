# Hebrew RTL Formatting Rule

Whenever you write responses or sections in Hebrew to the user:
1. Always align the Hebrew text to the right (`dir="rtl"` and right-aligned) by wrapping your Hebrew response content in `<div dir="rtl" align="right">` ... `</div>`.
2. Ensure lists, headings, and paragraphs in Hebrew are inside the `<div dir="rtl" align="right">` container so they render right-to-left and aligned to the right.

# Mandatory Engineering Pillars (Zero-Exception Baselines)

For ANY feature, enhancement, or modification in TALA, you MUST proactively design and implement according to these 4 foundational pillars without waiting for user prompting:

1. **KISS Implementation (Keep It Simple, Stupid)**
   - Deliver the simplest, cleanest solution that solves the actual problem.
   - Avoid speculative abstractions, unnecessary dependencies, and complex state models.
   - Enforce progressive disclosure: secondary, advanced, or optional actions MUST be clean and collapsible (defaulting to collapsed where appropriate) to avoid cognitive overload for teachers.

2. **Security-First Architecture & Coding (Mandatory, No Exceptions)**
   - Never treat security as a "phase 2" or wait for the user to request it.
   - Enforce zero-trust boundaries at all ingest points:
     - Strict validation, sanitization, and quota/size limits on all inputs (files, text, network requests).
     - Multi-layer defense: binary magic-byte inspection for uploads (blocking binaries, scripts, macros, double extensions), strict server/storage rules, and auth checks (`request.auth != null`, tenant/owner isolation).
     - Strict protection of student PII (masking in AI requests, privacy print toggles, redaction).
   - If a solution has a potential security vulnerability, surface it and resolve it BEFORE shipping.

3. **High Performance & Optimization**
   - Minimize client bundle bloat and avoid unnecessary third-party packages.
   - Optimize render cycles: prevent unnecessary re-renders in large forms, clean up listeners/timers, and debounce heavy calculations.
   - Ensure instantaneous UI responsiveness (<100ms feedback, async operations with non-blocking feedback and loaders).

4. **Professional Look & Feel (Polished UI/UX)**
   - Deliver enterprise-grade pedagogical UI: polished, clean, modern, and uncluttered.
   - Maintain strict design consistency across the entire app:
     - Unified icon system and button dimensions (e.g. standard 32x32px square `+` / `-` collapse buttons, consistent border radii, matching padding).
     - Flawless Hebrew RTL layout and typography, clean visual hierarchy, and harmonious pastel/slate palettes.
     - Cohesive transitions, clear empty states, accessible contrast, and zero visual bugs across desktop and mobile.

# Mandatory Upgrade & Deployment Protocol (TALA)

For ANY enhancement or bug fix, ALWAYS strictly follow this 6-step lifecycle:
1. **Red Banner (2 min)**: Trigger the live red warning banner in Firestore so active teachers know to save their work: `npm run upgrade:start`. Wait 2 minutes (or ensure banner is live) before deploying.
2. **Branch & Mandatory Test Authorship**:
   - Develop on a dedicated feature/bugfix branch.
   - **Zero Uncovered Code**: Every new feature MUST include new unit tests covering its behavior and edge cases in `src/__tests__/`; every bug fix MUST include a regression test reproducing the issue and proving the fix.
3. **Verification & Build**: Run all unit tests (`npx vitest run`) and verify the production build (`npm run build`). All tests must pass with 100% success before proceeding.
4. **PR & Merge**: Open a PR with clear test evidence and squash/merge into `main`.
5. **Deploy Web**: Confirm that the GitHub Actions deployment workflow to GitHub Pages starts and finishes successfully.
6. **Disable Banner**: Once the deployment is live, turn off the red warning banner: `npm run upgrade:end`.
