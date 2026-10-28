# Changelog

## 2.0.0 — 2026-10-28

Squashed public export of the original Angular 19 project. The original history is not included.

### Changed

- Angular 19.2 → 22.2, TypeScript 5.7 → 6.0, Vitest replaces Karma/Jasmine.
- Dropped SSR, prerendering, and the Express server. The app is a static PWA build.
- One service-worker registration in `app.config.ts` (`provideServiceWorker`); the legacy `environments/` files and the duplicate registration in `main.ts` are gone.
- Components rewritten with signal inputs, computed values, and `@if` / `@for` / `@switch` control flow.
- Pure JSON helpers extracted to `src/app/json-analysis.ts` (analysis, search matching, sorting, byte formatting) and unit-tested directly.
- Removed the scaffold placeholder styles and comments from the app template and the duplicate manifest link in `index.html`.
- Flattened layout: the app lives at the repo root instead of a nested `json-insight/` folder.

### Fixed

- The only test was the stock scaffold spec and failed against the real component. It now tests the real title and behavior, with specs for all three components (31 tests).
- Table sorting mutated the input array. Sorting now works on a copy, compares numbers numerically, and sorts null/undefined last in both directions.
- Tree view rendered the whole document expanded. Levels deeper than the first now start collapsed.

### Added

- Drag-and-drop file loading and a paste-JSON panel.
- Search across keys and values in the tree and table views.
- A 10 MB size guard, checked before parsing, with a clear error message.
- Parse errors now surface the parser's message instead of a generic "Invalid JSON".
- Clear button, file-size display, keyboard-accessible tree toggles and sort headers (`aria-expanded`, `aria-sort`, `aria-pressed`).
- MIT LICENSE, `.gitattributes` (LF), CI (build + tests + format check), GitHub Pages deployment, landing-page README, and this changelog.

## 1.0.0 — 2025-11-20 (original, private history)

Angular 19.2 PWA with SSR: load a JSON file, Analysis / Tree / Table views, Save JSON download.
