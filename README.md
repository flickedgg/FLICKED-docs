# FLICKED Docs

The documentation site for [FLICKED](https://github.com/flickedgg/FLICKED), built from the
repository's `README.md`, `CONTRIBUTING.md`, `docs/` and backend source.

Plain static HTML: open `index.html` straight from disk, or deploy the folder to any static
host (GitHub Pages, Vercel, Netlify, Caddy).

## Editing

Pages live in `src/pages/` as fragments: a JSON front-matter comment, then prose. The build
wraps each one in the shared layout and generates the sidebar, the "On this page" table of
contents, heading anchors, previous/next links, syntax highlighting and the search index.

```bash
npm install
npm run build        # HTML + Tailwind
npm run watch:css    # while editing styles
```

| Path | What it is |
|---|---|
| `src/pages/*.html` | Page content. Page order and sidebar groups are `NAV` in `build.mjs` |
| `src/styles.css` | Tailwind v4 source, with the tokens from FLICKED's `docs/DESIGN.md` |
| `build.mjs` | The build: layout, TOC, highlighting, search index |
| `assets/app.js` | Search (Ctrl/⌘ K or `/`), copy buttons, TOC highlight, mobile nav |
| `assets/diagrams.js` | Mermaid theme, loaded only on pages with diagrams |
| `*.html`, `assets/styles.css`, `assets/search-index.js` | Generated. Do not edit by hand |

### Writing conventions

- Code blocks are written raw: `<pre data-lang="bash" data-title="Terminal">…</pre>`.
- Diagrams: `<pre class="mermaid-src" data-caption="…">…</pre>`.
- Callouts: `<aside class="callout callout-note|warn|tip"><div>…</div></aside>`.
- Icons: `{{icon:name}}` or `{{icon:name:classes}}` (see `ICONS` in `build.mjs`).
- No em dashes in copy (DESIGN.md §9). The build warns if one appears.
