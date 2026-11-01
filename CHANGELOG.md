# Changelog

## 2.1.1 — 2026-11-01 (Node version floor fix)

No code change. Fixes a CI/local failure that was not a test failure:

- `npm test` on Node 20.20.2 failed before any test ran: "The Angular
  CLI requires a minimum Node.js version of v22.22.3 or v24.15.0 or
  v26.0.0", exit code 3. Root cause: `@angular/cli` 22.2.5 (and
  `@angular/build`) declare engines
  `^22.22.3 || ^24.15.0 || >=26.0.0`, but this repo still claimed
  `>=20.19.0` in `package.json` and tested Node 20 in CI — a stale floor
  carried over from the scaffold. The local verification here ran on
  Node 24, which is why it never surfaced before push.
- Fixed: `package.json` engines now mirror the CLI exactly
  (`^22.22.3 || ^24.15.0 || >=26.0.0`), CI matrix changed from
  `[20, 22]` to `[22, 24]`, README Prerequisites corrected, and the
  lockfile root version/engines re-synced (it was still on 2.0.0).
- If you hit this locally, the immediate workaround is switching Node,
  not changing code: `nvm install 22` then `nvm use` in the repo root
  (`.nvmrc` pins the 22 line).

## 2.1.0 — 2026-11-01 (dark theme)

### Added

- Dark theme, following the system preference on first visit, with a
  Dark/Light toggle in the header. The toggle saves an explicit choice
  in `localStorage` (`json-insight-theme`); until you toggle, the app
  keeps following system changes. An inline script in `index.html`
  applies the theme before the first paint so dark-preference users do
  not see a light flash on load. Theme logic lives in `src/app/theme.ts`
  (pure, unit-tested) and dark overrides live at the end of
  `src/styles.css`; the app shell background uses `:host-context(.dark)`
  so it works through Angular's view encapsulation.
- Theme tests: saved-choice precedence, corrupted-value fallback,
  `.dark` class toggling, and persist-only-on-toggle.

## 2.0.1 — 2026-11-01 (staff review)

Fixes and documentation from the staff review in `docs/REVIEW.md`. No
behaviour change except where noted.

### Fixed

- Save JSON refused falsy JSON values (`0`, `false`, `""`); it now checks
  against `null`, revokes the blob URL on a tick, and cleans up in a
  `finally` (F01).
- Templates used CSS utilities the hand-rolled stylesheet never defined
  (`bg-transparent`, `border-0`, `p-0`, `px-2`, `py-1`, `pb-2`, `mt-2`);
  tree toggles and table sort buttons rendered with browser-default
  button styling, and the type-count pill had no padding (F02).
- Failed loads no longer leave the previous file's name and size in
  state (F04).
- Secondary text contrast: gray-500 corrected to true Tailwind gray-500
  (`#6b7280`); indigo-100 corrected to `#e0e7ff` (F06).

### Changed

- File loading for the picker and drag-and-drop merged into one
  `loadFile` method; the picker stays deliberately more permissive than
  drag-and-drop about extensions (F03, F07).
- `isArrayOfObjects` extracted from `App` into `json-analysis.ts` and
  unit-tested; the size limit shown in the UI is now derived from
  `MAX_JSON_BYTES` instead of hardcoded (F09).
- Removed unused `@angular/router` and `@angular/forms` dependencies
  (F05).
- README rewritten with Description, Prerequisites, Installation, Local
  Development, and Deployment sections, plus an architecture diagram
  (`docs/assets/architecture.svg`), a Privacy and limits section, and
  `examples/sample.json`.

### Added

- JSDoc for analysis semantics, sort rank, and byte formatting;
  `formatBytes` GB branch; tests for falsy downloads, stale-state
  clearing, `isArrayOfObjects`, mixed-type sort rank, and GB formatting
  (35 tests, up from 31).

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
