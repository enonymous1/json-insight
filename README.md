# JSON Insight

Inspect JSON files locally in your browser: analysis, tree view, and a sortable table view. A static progressive web app — your file never leaves your device. No uploads, no server, no account.

## What it does

- **Load** a `.json` file by choosing it, dropping it on the page, or pasting JSON text.
- **Analysis** — top-level type, item count, total keys, maximum depth, and a count of each data type found.
- **Tree View** — collapsible nested view. Deeper levels start collapsed; searching auto-expands matching branches.
- **Table View** — for arrays of objects. Headers are the union of all keys, sorting never mutates your data, and nulls always sort last.
- **Search** — filter keys and values across the tree and table views.
- **Save JSON** — download the loaded data pretty-printed.
- **Installable** — a service worker caches the app so it works offline after the first visit.

Files up to 10 MB are accepted; larger files are rejected before parsing so a huge file cannot freeze the tab. Everything is parsed and rendered on the client.

## Try it

```bash
npm ci
npm start
```

Open <http://localhost:4200/>, then load a JSON file or paste something like:

```json
[
  { "name": "Alice", "age": 30, "tags": ["a", "b"] },
  { "name": "Bob", "age": 25 }
]
```

## Build and test

```bash
npm run build   # production build in dist/json-insight/browser
npm test        # Vitest, run once: ng test --watch=false
npm run format  # Prettier over src/ and top-level JSON/Markdown
```

Requires Node.js 20.19+ (see `.nvmrc`). The production build is a static site: serve `dist/json-insight/browser/` from any static host, or deploy it with the included GitHub Pages workflow.

## Project layout

```text
src/
  main.ts                    # bootstrapApplication with appConfig
  index.html                 # single manifest link, theme color
  styles.css                 # shared utilities + focus/dropzone styles
  app/
    app.ts / app.html        # file loading, drag-drop, paste, view switching
    app.config.ts            # one service-worker registration, error listeners
    json-analysis.ts         # pure helpers: analysis, search, sorting, formatting
    components/
      data-analyzer/         # analysis cards
      tree-view/             # recursive collapsible tree
      table-view/            # sortable, filterable table (non-mutating sort)
ngsw-config.json             # service-worker asset groups
public/
  manifest.webmanifest       # PWA manifest
  icons/                     # PWA icons
```

Components use signal inputs and computed values with Angular's `@if` / `@for` / `@switch` control flow. There is no SSR and no Express server: the app has no server-rendered content, so a static build keeps the deploy simple and the service worker reliable.

## History

v2.0.0 is a fresh, squashed export of the original Angular 19 project (`ss-angular-json-insight-pwa`, 2025). The original history is not included. See [CHANGELOG.md](CHANGELOG.md) for what changed.

## License

MIT. See [LICENSE](LICENSE).
