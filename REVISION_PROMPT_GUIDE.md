**CS2CaseOpener — Full Revision Guide & Assistant Prompts**

Purpose
-------
This file is a comprehensive, actionable guide and a set of assistant prompts designed to inspect, find, and fix mistakes and bugs across the entire site. Use it as the single-source checklist for a full revision and as a library of prompts you (or an AI assistant) can reuse to implement improvements.

Scope
-----
- Repository root and everything under `cs2-case-opener/` and `src/`.
- Static assets in `public/` and `cs2-case-opener/assets/`.
- Build, dev tooling, CI, dependency configuration, and documentation.

Audit Goals
-----------
- Identify functional bugs and broken user flows.
- Surface runtime errors and unhandled exceptions.
- Improve performance, accessibility, and security.
- Remove dead code and reorganize for maintainability.
- Add missing tests and strengthen CI.

How to use this guide
---------------------
1. Run the automated checks listed below.
2. Triage failing items by priority and impact.
3. Use the manual checklists to reproduce UI/UX issues.
4. Apply fixes in small, reviewed commits using the example assistant prompts below.
5. Re-run checks and iterate until all high-priority items are cleared.

Automated checks (run first)
---------------------------
- Install dependencies and run the existing package scripts:

  - `npm ci`
  - `npm run lint` (or `npm run lint:js` / `eslint` if defined)
  - `npm test` / `vitest` / any test runner
  - `npm run build` (Vite)

- Static analysis & security:
  - `npm audit` / `npm audit fix` (review changes carefully)
  - Run `eslint` with `--ext .js,.mjs` across `src/` and `cs2-case-opener/`.
  - Dependency vulnerability scanner (Snyk, Dependabot suggestions).

- Performance & bundle:
  - `vite build --mode production` and inspect output.
  - Use `rollup-plugin-visualizer` or `source-map-explorer` on the bundle.
  - Run Lighthouse (Chrome) for homepage and primary flows.

- Accessibility:
  - Run `axe-core` or Lighthouse accessibility audits on critical pages.

Automated check outcomes to capture
----------------------------------
- Lint errors & warnings (group by type: unused vars, incorrect imports, unreachable code).
- Test failures (capture stack traces and failing assertions).
- Build errors and warnings (tree-shaking issues, missing assets referenced at runtime).
- Audit vulnerabilities with severity levels.
- Lighthouse scores and largest-contentful-paint, cumulative layout shift, first-contentful-paint.

Manual review checklist (functionality)
--------------------------------------
- Start app in dev mode and exercise the flows:
  - Open homepage, open a case, simulate inventory operations.
  - Use `CaseSelector`, `Inventory`, `ResultModal` flows thoroughly.
  - Test edge cases: empty inventory, missing images, network failures.

- Console/Network checks:
  - Monitor console for errors, warnings, and unhandled promise rejections.
  - Inspect network for 404s on images, scripts, API requests.

- Data integrity:
  - Validate `image-map.json`, `missing-images.json` and `image-catalog.js` consistency.
  - Verify `src/data/*` modules export expected shapes and that `caseEngine` uses them correctly.

- Randomness & RNG:
  - Test `engine/rng.js` and `engine/caseEngine.js` deterministically where applicable.
  - Check for off-by-one or weighting mistakes in probability calculations.

Manual review checklist (UX & accessibility)
------------------------------------------
- Keyboard navigation: open/close modals using `Esc`, move focus into modal.
- ARIA roles and labels on interactive controls.
- Color contrast and readable fonts (Lighthouse + manual validation).
- Screen-reader friendly announcements for important events (result modal, errors).

Manual review checklist (assets & media)
----------------------------------------
- Verify all images in `public/assets/images/` are reachable and correctly sized.
- Look for unnecessarily large images ( >200 KB ) and create optimized variants.
- Confirm `sw.js` doesn't cache stale or sensitive content.

Code quality & architecture review
---------------------------------
- Module boundaries: ensure `engine/`, `store/`, `ui/`, and `utils/` have clear responsibilities.
- Single Responsibility: isolate side-effects (I/O, DOM, network) from pure logic for easier testing.
- Duplication: run a quick search for duplicated logic (e.g., image path building, rarity math).
- Large functions: identify and split functions > 100 lines or doing more than one concern.

Tests & CI
----------
- Add unit tests for pure logic (`engine/*`, `utils/probability.js`, `store/*` reducers).
- Add integration tests (Vitest + jsdom or Playwright) to simulate critical UI flows.
- Configure CI to run lint, tests, build, and Lighthouse (or a subset) on PRs.

Performance & optimizations
---------------------------
- Lazy-load images using `loading="lazy"` and consider IntersectionObserver for previews.
- Use `srcset` / multiple sizes for skin & case images.
- Move large static data (e.g., `cases/` data files) to JSON that can be fetched, not bundled.
- Avoid shipping large dev-only datasets in production bundles.
- Use efficient algorithms in `engine/caseEngine.js`; avoid O(n^2) where possible.

Security review
---------------
- XSS: sanitize any content that renders user input or external data.
- CSP: consider adding a Content Security Policy header for production.
- Auth: validate session handling in `auth/session.js` and ensure tokens are not leaked to logs or window.
- Dependencies: lockfile present and reviewed; set up Dependabot.

Maintainability & repo hygiene
------------------------------
- Folder names: prefer consistent kebab-case or camelCase across `src/` and `cs2-case-opener/`.
- Remove dead files discovered by `find-placeholders.js` and `verify-assets.js` checks.
- Add or update README sections about running, building, and testing locally.

Prioritization matrix (triage)
------------------------------
- P0 (fix immediately): runtime errors, build failures, severe security issues, broken core flows.
- P1 (high): performance regressions, missing accessibility features that block use, incorrect probability math.
- P2 (medium): lint errors, test gaps, refactors, improvements to structure.
- P3 (low): micro-optimizations, cosmetic refactors, formatting.

Example Assistant Prompts (use these when opening issues or creating PRs)
------------------------------------------------------------------------
- Bug triage prompt
  "I ran automated scans and saw these failing items: [paste list]. Reproduce steps: [paste steps]. Please list probable root causes and a step-by-step fix plan prioritized by risk and effort. Include code snippets or specific files to edit."

- Fix lint errors prompt
  "Fix ESLint errors in `src/` and `cs2-case-opener/` without changing behavior. Apply rule-based fixes first, then propose manual edits for remaining complex issues. Provide a patch or list of changed files with short rationales."

- Refactor prompt (example: `caseEngine`)
  "Refactor `engine/caseEngine.js` to separate pure probability calculations from DOM and state side-effects. Keep behavior identical; add unit tests for the calculation functions. Return a patch and new test files."

- Performance optimization prompt
  "Analyze the production bundle and suggest three high-impact optimizations (e.g., code-splitting, lazy-loading, removing large dependencies). Provide exact file-level changes and an estimate of bytes saved."

- Accessibility fix prompt
  "Run an `axe` audit and fix the top 10 accessibility violations on the main flow (homepage -> open case -> result modal). Provide a patch with code changes and describe how each change fixes the issue."

- Asset optimization prompt
  "Find all images > 150 KB in `public/assets/images/` and `cs2-case-opener/assets/images/`, generate optimized WebP and resized variants, and update image references to use `srcset`. Provide a script to batch-optimize and a patch updating references."

Reusable assistant command templates
----------------------------------
- "Create a PR that fixes: [list of issues]. Branch: `fix/XYZ`. Tests: add unit tests for the changed modules. CI: run lint and test."
- "Generate a changelog entry describing: [summary of fixes], affected modules: [list]."

Example detailed prompt for a full automated run (copy/paste to assistant)
------------------------------------------------------------------
Run these steps and produce a single JSON report with categorized findings (lint, tests, build, accessibility, lighthouse, vulnerabilities), plus suggested fixes and a patch for the top 3 P0/P1 items.

Steps:
1. `npm ci`
2. `npm run lint -- --format json > lint.json`
3. `npm test -- --reporter json > test-report.json`
4. `npm run build` and capture build warnings (save as `build-report.txt`).
5. Run Lighthouse programmatically against the homepage and result modal; save scores.
6. Run `npm audit --json > audit.json`.
7. Run `axe` on critical pages and save `axe-report.json`.

Then output a single JSON object with keys: `lint`, `tests`, `build`, `lighthouse`, `audit`, `axe`, `suggestedPatches`.

Quick starters (small interventions you can run now)
-----------------------------------------------
- Add or run ESLint autofix:
  - `npx eslint "src/**/*.{js,jsx,mjs}" --fix`
- Run a quick image audit script (write a small Node script to scan file sizes in `public/assets/images/`).
- Add a GitHub Actions workflow to run lint+tests on push if none exists.

Project health prompts (higher level)
------------------------------------
- "Provide a prioritized roadmap for the next 90 days to move this repo to production readiness. Include milestones: critical bug fixes, tests coverage goals, performance targets, and release checklist."
- "Given current dependencies, recommend major upgrades and identify any breaking changes for v1.0.0 release readiness."

Appendix: Useful commands
------------------------
- Install deps: `npm ci`
- Lint: `npm run lint` or `npx eslint .`
- Tests: `npm test` or `npx vitest`
- Build: `npm run build`
- Audit: `npm audit --production`
- Bundle inspect: `npx source-map-explorer dist/assets/*.js` or use `rollup-plugin-visualizer`

Files worth checking first
--------------------------
- `cs2-case-opener/index.html` and `cs2-case-opener/src/main.js` (entry points)
- `src/api/client.js` (network layer)
- `src/engine/caseEngine.js` and `src/engine/rng.js`
- `src/store/inventory.js`, `src/ui/resultModal.js`, `src/components/ResultModal.js`
- `cs2-case-opener/sw.js` (service worker)
- `cs2-case-opener/image-map.json` and `public/assets/images/` references

End of guide — use the prompts above to automate triage and produce patches. Update this file with findings and any new high-value prompts discovered during the audit.
