# Staff review — json-insight v2.0.0 → v2.0.1

Review date: 2026-11-01. Scope: the whole v2.0.0 tree as delivered 2026-10-28
(Angular 22.2, TypeScript 6.0, Vitest, static PWA), read file by file, plus
the README checked line by line against the code it describes. No live-browser
click-through was run in this review either: the same loopback limitation that
blocked it for v2.0.0 still applies on this box, so the browser + CI after
push remain the final visual gate (see "What was not verified").

## Verdict

This is a clean, honest small app, and v2.0.0's modernization held up: the
pure-helper extraction, signal inputs, non-mutating sort, and 10 MB guard are
real improvements, and the test suite covers the behaviours it claims. The
review found one user-visible bug, one user-visible styling failure, and a
handful of maintainability debts — no security issue, no secret, no data leak.
All of the cheap, safe fixes are applied in v2.0.1. The expensive items
(virtualization, a service layer, real Tailwind) are deliberately deferred
with a design sketch each, not silently dropped, because each one changes
rendering or public behaviour and deserves its own change, not a drive-by
in a review patch.

What is good, and should not be "fixed":

- `src/app/json-analysis.ts` is genuinely framework-free, so its 10+ tests
  run without a component fixture. That separation is the best decision in
  the codebase; v2.0.1 keeps it and extends it (`isArrayOfObjects`).
- The size guard is checked before `JSON.parse` in all three entry points
  (picker, drop, paste), not just the picker. The paste path measures bytes
  with `TextEncoder`, not characters — the right choice for non-ASCII input.
- Sorting copies before sorting, nulls sort last in both directions, and
  numbers sort numerically. All three were regressions in v1 and all three
  have tests that would catch a reversion.
- No network call is made for user data, no analytics, no router, no
  backend. The privacy claim in the README is true, not aspirational.
- Strict TypeScript, strict templates, Prettier, and CI (Node 20 + 22,
  format check, tests, build) are all present and passing.

## Findings

Severity: **High** = user-visible wrong behaviour or data risk.
**Medium** = user-visible glitch, performance cliff, or debt that will bite
on the next change. **Low** = polish, consistency, or future-proofing.

### Fixed in v2.0.1

#### F01 — High — Save JSON refused falsy JSON values

`src/app/app.ts`, `downloadJson()` (v2.0.0) tested `if (!data)`. Valid JSON
`0`, `false`, and `""` are all falsy, so loading any of them and pressing
Save JSON reported "No JSON data to download." The rest of the app already
used the correct check (`jsonData() !== null` in the template), so this was
an inconsistency, not a design choice.

Fix: compare against `null`, not truthiness. Also in the same method:
revoke the blob URL on a tick (`setTimeout(..., 0)`) instead of
synchronously after `click()`, which can race the browser's download start,
and clean up in a `finally` so a throwing `click()` cannot leak the URL or
leave the anchor in the DOM. Tests added for `0`, `false`, and `""`, and the
existing download test now awaits the deferred revoke.

Known edge that remains, by design: a literal JSON `null` parses to `null`,
which is indistinguishable from "no data" in the current signal model, so
it still shows the empty state. Fixing it properly means a separate
`hasData` signal (or a discriminated load state) — a small change, but a
behaviour change, so it is deferred to F12 rather than smuggled in here.
The README now documents this edge instead of letting users discover it.

#### F02 — Medium — The hand-rolled Tailwind mimic silently dropped classes

`src/styles.css` (v2.0.0) defines ~116 utility classes by hand. Templates
used seven more that it never defined, and because a missing utility class
is not a build error, nothing failed — the UI just rendered wrong:

| Class used                          | Where                                  | Visible effect in v2.0.0                                                               |
| ----------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `bg-transparent`, `border-0`, `p-0` | tree toggle button, table sort buttons | Browser-default button background, border, and padding behind the toggle/sort controls |
| `px-2`, `py-1`                      | type-count pill in DataAnalyzer        | Pill with no padding                                                                   |
| `pb-2`                              | Analysis heading                       | Heading border with no bottom padding                                                  |
| `mt-2`                              | "Load pasted JSON" button              | Button flush against the textarea                                                      |

Fix: the seven utilities are added to `styles.css` with a comment naming
this failure mode. This is the single strongest argument in this review for
F09 (adopt real Tailwind or replace the mimic with semantic CSS): the next
missing class will fail exactly as silently as these did.

#### F03 — Medium — Duplicated file-loading path

`handleFileInput` and `handleDrop` in `src/app/app.ts` (v2.0.0) each
duplicated the size check and the whole `FileReader` boilerplate (~20 lines
each). Two copies of a validation rule is how one entry point gets a fix
and the other does not.

Fix: one private `loadFile(file)` does the size check and the reader setup;
both handlers call it. The one intentional difference is preserved and now
commented: the picker is more permissive than drag-and-drop (see F07).

#### F04 — Low — Stale file name/size after a failed load

In v2.0.0 every failure path set `jsonData` to `null` but left `fileName`
and `fileSize` from the previous successful load. Nothing displayed them
while data was null, so this was latent, not visible — until any future
change displays the file name in an error state.

Fix: one private `failLoad(message)` used by all failure paths
(oversize, empty, parse error, read error). Test added: load valid, then
load invalid, expect name `''` and size `null`.

#### F05 — Low — Unused dependencies

`@angular/router` and `@angular/forms` were in `package.json` but never
imported anywhere (`grep` over `src/` finds neither). They added install
time, lockfile surface, and audit surface for zero functionality — there
is no navigation and no `ngModel`/reactive form in the app.

Fix: `npm uninstall @angular/router @angular/forms`; `package.json` and
`package-lock.json` updated, tests and build re-run. If routing or forms
ever become real, they come back as part of that feature, not as cargo.

#### F06 — Low — Contrast and a misnamed colour

- `.text-gray-500` was `#a0aec0`, which is Tailwind's gray-400, at ~2.4:1
  contrast on white — failing WCAG AA for the secondary text that uses it
  (dropzone help, file size, empty states). Fixed to true gray-500
  `#6b7280` (~4.8:1).
- `.bg-indigo-100` was `#ebf4ff`, which is Tailwind's blue-100, not
  indigo-100. Fixed to `#e0e7ff`. The pill colour shifts slightly; that is
  the correction, not a redesign.

#### F07 — Low — Picker vs. drag-and-drop extension check (documented, not changed)

Drag-and-drop rejects non-`.json` files with a clean message; the picker
does not check the extension at all (its `accept` attribute is advisory —
a user can choose "All files" and pick a `.txt` containing JSON, which
then parses fine). Both behaviours are defensible, but v2.0.0 never said
which was intended.

Decision in v2.0.1: keep the picker permissive — the parser, not the
extension, is the gate for a file the user explicitly chose — and comment
that decision in `app.ts` so a future "make them consistent" change is a
deliberate choice, not a guess. Do not "fix" this by rejecting `.txt` in
the picker without asking: that would remove a working path users may
rely on.

#### F08 — Low — Tree toggle aria-label missing a space

`tree-view.html` built the label as `'toggle ' + openingBracket() +
itemCount()`, producing "toggle {5 items" (no space, no closing bracket
context). Fixed to insert the space. The label is still terse; a fuller
label ("Toggle Alice's children, 5 items") would need the key and bracket
in a single readable sentence and is left as polish, not a correctness fix.

#### F09 — Low — Hardcoded size label in the template

`app.html` hardcoded "Files up to 10 MB" while `app.ts` held
`MAX_JSON_BYTES`. Raising the limit in code would have left the UI lying.

Fix: `maxJsonSizeLabel = formatBytes(MAX_JSON_BYTES)` in `App`, rendered
in the template. It now reads "10.0 MB" (the formatter's one-decimal form)
instead of "10 MB" — slightly more precise, and it can never drift from
the constant again. The README's "10 MB" is prose, not code, and stays
as the rounded human form.

### Documentation added in v2.0.1 (no behaviour change)

- `Analysis`: `totalKeys` counts array indices (an array contributes one
  "key" per element) and the root value is not counted; `maxDepth` is 0
  for a top-level primitive and 1 for an empty object/array; `dataTypes`
  does not count the root value, so a top-level primitive reports an
  empty map. These semantics were already true and already tested in
  places, but nowhere written down — the next reader would have had to
  infer them from the traversal code.
- `compareRank` / `compareJsonValues`: the rank order (boolean, number,
  string, object/array, null last in both directions) and why it exists,
  plus a note that string ordering uses the runtime's default locale and
  can therefore differ between browsers (see F13).
- `formatBytes`: the new GB branch exists for the rejection message — a
  2 GB file used to be reported as "2048.0 MB".
- `isArrayOfObjects`: extracted from `App.isDataArrayOfObjects` (which
  repeated the same five-part cast chain) into `json-analysis.ts`, where
  it is unit-testable without a fixture. Its contract is explicit: only
  the first element is inspected, an empty array is not a table, and a
  mixed array still renders with "—" for non-object rows.

### Deferred — not fixed in this patch, with the design each one needs

#### F10 — Medium — No rendering ceiling: 10 MB in, unbounded DOM out

The size guard limits input bytes, not rendered output. The tree renders
every node (recursive components, one per node) and the table renders
every row; there is no virtualization, pagination, or row cap, and no
truncation for a single very long string. A 10 MB, deeply nested or
wide document will therefore still freeze or crawl the tab — the exact
failure the size guard was written to prevent, one layer down.

Why deferred: the fix is a design choice, not a patch. Options, in order
of increasing effort: (a) cap rendered tree nodes / table rows with a
"showing first N of M" affordance and an explicit expand; (b) virtual
scrolling (e.g. Angular CDK scrolling) for the table and a flattened,
windowed tree; (c) an iterative, depth-capped traversal so a 10,000-deep
document cannot overflow the call stack in `analyzeJson`/`matchesSearch`
before rendering even starts. Any of these needs a benchmark fixture
(a generated 10 MB nested document and a 100k-row array) and a before/after
render timing, not just a code change. Do (a) first if only one is done:
it bounds the worst case with the least new machinery.

Related, same root cause: search is O(nodes × subtree). `TreeView`
computes `showChildren` per node by calling `matchesSearch` over that
node's whole subtree, and every keystroke re-runs it (no debounce, no
memoized lowercased query). For large documents typing lags. A search
index built once per document (flattened paths → match) plus a debounced
search signal would fix both the per-keystroke cost and the repeated
lowercasing. Do not add a debounce alone: it hides the quadratic cost,
it does not remove it.

#### F11 — Medium — App is a god component; no service layer

`App` (181 lines) owns file I/O, validation, the size guard, view
switching, search state, paste state, download, and drag-and-drop.
`loadJsonText` was already extracted for testability, which proves the
pattern works — but file loading was not, so it can only be tested
through a component fixture with a mocked `FileReader`.

Sketch for the next change (not implemented here, to keep this patch
reviewable):

```typescript
// Proposed, not yet code: src/app/json-loader.service.ts
interface JsonLoadResult {
  ok: true;
  name: string;
  data: unknown;
  sizeBytes: number;
}
interface JsonLoadError {
  ok: false;
  message: string;
}
@Injectable({ providedIn: 'root' })
class JsonLoader {
  loadFile(file: File): Promise<JsonLoadResult | JsonLoadError>;
  loadText(name: string, text: string): JsonLoadResult | JsonLoadError;
}
```

`App` then holds only signals and view state; the service owns
`FileReader`, the size guard, and `JSON.parse` error mapping. That also
makes the literal-`null` edge (F01) fixable: the result type can carry a
`hasData` flag instead of overloading `null`. Keep signals in the
component; do not introduce NgRx or any store for a three-view app —
that would be more machinery than the problem warrants.

#### F12 — Low — Literal JSON `null` is indistinguishable from "no data"

Covered under F01. Fix needs a discriminated load state (see F11's
sketch), not a truthiness tweak. Documented in the README until then.

#### F13 — Low — Locale-dependent string sort

`compareJsonValues` uses bare `localeCompare`, so string column order can
differ between browsers/locales. Pinning `Intl.Collator('en')` (or the
user's locale, explicitly) would make it deterministic, but it changes
the sort users see and needs a test locking the order in — including
case and accent handling — before it lands. Do not change it in a patch
that also changes other sort behaviour.

#### F14 — Low — Tree state is lost when an ancestor collapses

`TreeView` keeps `expanded` per component instance, and collapsing a
parent destroys its children. Re-expanding the parent resets every
descendant to its `ngOnInit` default (depth ≥ 2 collapsed), discarding
any nodes the user had opened. Also, while a search is active,
`showChildren` ignores `expanded` entirely, so clicking a toggle during
a search appears to do nothing (the signal flips, the computed does not
change). Fix options: lift expansion state to a service keyed by node
path, or make `showChildren` respect an explicit user toggle even during
search (e.g. a user-collapsed branch stays collapsed and is marked as
"matches hidden"). The second option is smaller and preserves the
auto-expand behaviour for untouched branches. Either way, add a test:
open a deep node, collapse its ancestor, re-expand, expect the deep node
still open.

#### F15 — Low — Drag highlight flickers; dropzone only exists when empty

`handleDragLeave` fires when the pointer enters a child element inside
the dropzone (the Paste button, the textarea), so the highlight flickers
during a drag. A drag-enter counter (increment on `dragenter`, decrement
on `dragleave`, clear on `drop`) fixes it. Separately, the dropzone and
paste panel only render when no data is loaded, so replacing a document
requires Clear first. That is a defensible "one document at a time" model,
but if a replace flow is wanted, the dropzone should be a persistent
target (e.g. a header drop area) rather than a second copy of the empty
state.

#### F16 — Low — No lint, no dependency automation, no e2e

- Prettier is the only static check. ESLint (with Angular ESLint) would
  catch unused imports, template issues, and the next hand-rolled-class
  drift at build time — but adding it is a config change with its own
  rule-tuning, not a one-line fix.
- No Dependabot/Renovate config: Angular security updates will not
  auto-PR. Enabling Dependabot for npm + GitHub Actions is a one-file
  addition (`.github/dependabot.yml`) and is the highest-value item in
  this section.
- No end-to-end test. Vitest covers components in isolation, but nothing
  exercises load → switch view → sort → download as a user would, and
  nothing checks the service worker or the Pages base-href build. A
  Playwright smoke test (load `examples/sample.json`, assert Analysis
  numbers, switch to Table, sort, assert order) would cover the path the
  unit tests cannot. The live-browser gate in "What was not verified"
  is the manual version of this test today.
- Test gaps that remain after v2.0.1: drag-and-drop extension rejection,
  picker size rejection through `FileReader` (needs a mock), tree
  depth ≥ 2 default collapse (only the root toggle is tested), table
  "—" for missing keys, DataAnalyzer on an empty object, `analyzeJson`
  on a top-level primitive (semantics now documented, but no test locks
  them in), and the stale-cache behaviour after a Pages deploy.

#### F17 — Low — Architecture notes for the next upgrade

- Real Tailwind vs. the mimic: either adopt Tailwind properly (the
  Angular 22 route is the PostCSS/Vite plugin, and it changes the build,
  so it needs its own branch and a visual diff) or delete the mimic and
  write semantic CSS (`.card`, `.btn-primary`) for the ~30 classes
  actually used. What must not continue is the current middle state:
  class names that look like Tailwind but are not, with no tool to tell
  you which ones are missing.
- The three empty component `.css` files (comment only) and `app.css`
  (one `:host` rule) are noise. Either give components real scoped
  styles or drop `styleUrl` and keep the shared sheet; do not keep
  placeholder files "for later".
- `ngsw-config.json` prefetches the app shell and lazily caches images,
  which is correct for this app, but there is no `dataGroups` entry —
  correct, because there is no API to cache. Do not add one "for
  completeness": it would cache nothing and confuse the next reader.
- Versioning is manual (`package.json` + `CHANGELOG.md`, no release
  workflow). That is fine at this size; a tag-triggered release workflow
  only earns its keep once there are consumers waiting on releases.
- `isRoot` on `TreeView` duplicates `depth === 0`. Deriving it would
  remove an input, but it would also change the component's public API
  for a cosmetic gain — leave it unless the component is refactored
  for F14 anyway.

## README review

The v2.0.0 README was largely accurate — its feature list, 10 MB limit,
and "no uploads, no server" claims all checked out against the code —
but it did not have the sections a new contributor or deployer needs,
and it buried the deploy steps in a single sentence.

What changed in v2.0.1's README (rewritten, not patched):

- Explicit **Description, Prerequisites, Installation, Local Development,
  and Deployment** sections, as requested.
- Prerequisites now name the Node floor (20.19+, `.nvmrc` pins the 22
  line, CI tests 20 and 22) instead of leaving it as an aside, and state
  plainly that no backend, database, key, or account is needed.
- Installation is separated from "try it": `git clone` + `npm ci`, with
  the `npm ci` vs. `npm install` distinction called out.
- Local Development points at `examples/sample.json` (new in v2.0.1, the
  same Alice/Bob example the README already showed) so a first run and
  every screenshot below are reproducible from the same file.
- Deployment now has the one-time Pages setup (Settings → Pages →
  Source: GitHub Actions), the live URL, the base-href rename warning
  (the failure mode is a blank deployed page, and nothing in CI catches
  a wrong base-href), and the stale-service-worker note (hard refresh /
  close all tabs, not site-data clearing).
- Privacy and limits are stated as a section, including the literal-`null`
  edge and the no-virtualization limit, so the README does not promise
  more than the code delivers.
- The architecture diagram (see below) is embedded after Description.

What the README still does not claim: browser support beyond "a modern
browser" (no browser matrix was tested here), offline behaviour before
the first visit (the service worker cannot cache what has never loaded),
or any performance number for large files (no benchmark was run).

## Visual asset strategy

Rule followed throughout: **no screenshot, GIF, or diagram is faked.**
The architecture diagram below is drawn from the actual code structure,
so it ships now. Screenshots and the demo GIF must be captured from a
real run of the app (locally or from the deployed Pages site) against
`examples/sample.json` or a stated larger file — never mocked up, never
generated. A referenced-but-missing image is worse than no image: it
ships broken, so no screenshot markdown is added to the README until
the file exists in the repo.

### Shipped now

**A1. Architecture diagram — `docs/assets/architecture.svg`, embedded in
the README directly after the Description section.**

Depicts, left to right: Input (`.json` file, drop, pasted text) →
App component (signals, 10 MB guard, `JSON.parse`, view state) →
`json-analysis.ts` (pure helpers, no Angular: analysis, search, sort) →
Views (Analysis · Tree · Table, signal inputs) → Output (Save JSON
download, Blob, in-browser only), with a second row for Static host +
PWA (GitHub Pages / any static host, ngsw cache) and a footer line
stating the privacy property: no server, no upload, data lives only in
memory, the service worker caches the app shell, not your data. The SVG
carries its own `<title>` and `<desc>` so it is not an empty image to a
screen reader. Placement rationale: it is the first thing a visitor sees
after the one-paragraph description, it answers "how does this work and
where does my data go?" before the feature list, and it is the only
visual that does not depend on a running app.

### To capture from a real run (in this order of impact)

Capture at a desktop width (~1280 px), light theme, with the browser
chrome cropped out, and load `examples/sample.json` unless a shot says
otherwise. Save under `docs/assets/screenshots/` and insert at the exact
anchors below. Alt text is given verbatim; do not shorten it, because
the alt text is what carries the privacy claim for readers who cannot
see the image.

**S1. Hero — Analysis view, `docs/assets/screenshots/analysis.png`.**
Depicts: the app after loading `examples/sample.json`, Analysis view
selected, showing Top-Level Type "array", Item Count 2, Total Keys, Max
Depth, and the Data Types list. This is the shot that proves the app
does something in one glance, and it shows the most distinctive view
(the tree and table are familiar; the analysis cards are not).
Insert: immediately after the Description paragraph and before the
architecture diagram is wrong — the diagram already sits there. Insert
S1 **between the Description paragraph and the architecture diagram**,
i.e. as the first visual under the title, with this markdown:

```markdown
![JSON Insight Analysis view for the sample data: top-level type array, item count 2, total keys, max depth, and data-type counts](docs/assets/screenshots/analysis.png)
```

Then the diagram follows it. If only one screenshot is ever captured,
capture this one.

**S2. Tree view with search — `docs/assets/screenshots/tree-search.png`.**
Depicts: Tree View for a nested file (use `examples/sample.json` plus
one nested object, or any nested JSON you state in the caption),
with "alice" typed in the search box and the matching branch expanded
while non-matching branches stay collapsed. This shot sells the one
feature a plain JSON viewer does not have: search that expands to the
match.
Insert: at the end of the **Description** section, after the bullet
list, before the `## Prerequisites` heading, with this markdown:

```markdown
![Tree view with search for "alice": the matching branch is expanded and non-matching branches stay collapsed](docs/assets/screenshots/tree-search.png)
```

**S3. Table view sorted — `docs/assets/screenshots/table-sort.png`.**
Depicts: Table View for `examples/sample.json`, sorted by `age`
ascending (Bob 25 above Alice 30), with the sort arrow visible on the
`age` header and the "—" for Bob's missing `tags` column visible. That
missing-cell dash is a deliberate detail: it shows the union-of-keys
behaviour, not just a pretty table.
Insert: directly after S2, in the same Description tail position, with
this markdown:

```markdown
![Table view for the sample data sorted by age ascending, with a dash where Bob has no tags column value](docs/assets/screenshots/table-sort.png)
```

Do not add S2/S3 to the Features bullets or to Local Development: they
belong with the description of what the app does, not with the setup
instructions, where they would push the commands a contributor needs
below the fold.

**G1. Demo GIF — `docs/assets/demo.gif`, optional, only after S1–S3.**
Depicts, in ~15 seconds, no audio: load `examples/sample.json` →
Analysis → Tree (expand a node) → Table (click `age` to sort) → type
"alice" in search → Save JSON. Loop once, ~800 px wide, under 2 MB.
This is the only animated asset worth making: it replaces a paragraph
of "how to use it" and it is the asset most likely to be shared.
Insert: in place of S1 (not alongside it) if the GIF is good — a hero
GIF and a hero screenshot compete for the same first-glance slot.
If both exist, keep S1 and put G1 at the end of Local Development,
after the sample JSON block, captioned as a walkthrough. Never embed
a GIF larger than 2 MB in the README; link it instead.

**What not to add:** a logo (the app has no brand mark beyond its PWA
icons; inventing one adds nothing), a "dark mode" screenshot (there is
no dark mode — a dark screenshot would be a fake), a mobile screenshot
as the hero (the table is the weakest mobile view; a mobile shot belongs
in an issue about responsive tables, not in the README), or any
screenshot containing real user data (use `examples/sample.json` or
synthetic data only — a README screenshot is a public artifact).

## What was not verified

- Live-browser click-through (load, switch views, sort, download) — not
  run here for the same loopback reason as v2.0.0. The user's browser
  and CI after push are the gate. The new download and CSS fixes are
  covered by unit tests, but a visual check of the tree-toggle and sort
  buttons (F02's actual symptom) still needs a real browser.
- Performance numbers for large files — no benchmark fixture was run,
  so F10 states the risk qualitatively, not with timings.
- Angular/dependency freshness beyond the lockfile — no claim is made
  that 22.2 is the latest release at review time; Dependabot (F16) is
  the durable answer, not a one-off version bump in this review.
- The deployed Pages site — the repo has not been pushed yet (see the
  v2.0.0 push steps, unchanged by v2.0.1 except for the zip name), so
  the Pages workflow itself is still unrun.

## Changelog for this review (v2.0.1)

- Fixed: Save JSON for falsy values `0`, `false`, `""` (F01).
- Fixed: missing CSS utilities for tree toggles, table sort buttons,
  type-count pill, analysis heading, paste button (F02).
- Fixed: duplicated file-loading path merged into `loadFile` (F03).
- Fixed: failed loads no longer leave a stale file name/size (F04).
- Removed: unused `@angular/router` and `@angular/forms` (F05).
- Fixed: gray-500 contrast and indigo-100 colour value (F06).
- Added: `isArrayOfObjects` helper + tests, `formatBytes` GB branch,
  JSDoc for analysis semantics, sort rank, and byte formatting.
- Added: single-source size label in the template (F09).
- Added: `examples/sample.json`, `docs/assets/architecture.svg`.
- Rewrote: README with Description, Prerequisites, Installation, Local
  Development, Deployment, Privacy and limits, and Project layout.
- Documented, not changed: picker-vs-drop extension policy (F07),
  literal-`null` edge (F12), locale-dependent sort (F13).
- Deferred with designs: rendering ceiling / search index (F10),
  service layer (F11), tree state loss (F14), drag flicker / replace
  flow (F15), lint / Dependabot / e2e / test gaps (F16), Tailwind and
  placeholder CSS files (F17).
