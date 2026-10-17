# Hebrew RTL Formatting Rule

Whenever you write responses or sections in Hebrew to the user:
1. Always align the Hebrew text to the right (`dir="rtl"` and right-aligned) by wrapping your Hebrew response content in `<div dir="rtl" align="right">` ... `</div>`.
2. Ensure lists, headings, and paragraphs in Hebrew are inside the `<div dir="rtl" align="right">` container so they render right-to-left and aligned to the right.

# Mandatory Upgrade & Deployment Protocol (TALA)

For ANY enhancement or bug fix, ALWAYS strictly follow this 6-step lifecycle:
1. **Red Banner (2 min)**: Trigger the live red warning banner in Firestore so active teachers know to save their work: `npm run upgrade:start`. Wait 2 minutes (or ensure banner is live) before deploying.
2. **Branch & PR**: Develop on a dedicated feature/bugfix branch and create a PR.
3. **Tests & Build**: Run all unit tests (`npx vitest run`) and verify the build (`npm run build`). All tests must pass before proceeding.
4. **Merge**: Merge the PR into `main`.
5. **Deploy Web**: Confirm that the GitHub Actions deployment workflow to GitHub Pages starts and finishes successfully.
6. **Disable Banner**: Once the deployment is live, turn off the red warning banner: `npm run upgrade:end`.

