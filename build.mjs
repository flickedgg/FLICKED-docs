/* Builds the static docs site.

     src/pages/<slug>.html   page fragments: front matter + prose
     ->  <slug>.html          full pages at the repository root
     ->  assets/search-index.js

   No framework on purpose: the output is plain HTML that opens straight from
   the filesystem and deploys to any static host. Tailwind is compiled
   separately (npm run build:css). */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import hljs from "highlight.js";

const root = dirname(fileURLToPath(import.meta.url));
const REPO = "https://github.com/flickedgg/FLICKED";

/* ---------- navigation: the one place page order lives ---------- */

const NAV = [
  { group: "Getting started", pages: [
    { slug: "index", title: "Introduction" },
    { slug: "quickstart", title: "Quickstart" },
    { slug: "configuration", title: "Configuration" },
  ]},
  { group: "Concepts", pages: [
    { slug: "architecture", title: "Architecture" },
    { slug: "parties", title: "Matchmaking & parties" },
    { slug: "rating", title: "Rating" },
  ]},
  { group: "Self-hosting", pages: [
    { slug: "deploy-windows", title: "Deploy on Windows" },
    { slug: "deploy-linux", title: "Deploy on Linux" },
    { slug: "security", title: "Security" },
  ]},
  { group: "CS2 servers", pages: [
    { slug: "cs2-server", title: "Running the CS2 server" },
    { slug: "matchzy", title: "MatchZy integration" },
  ]},
  { group: "Reference", pages: [
    { slug: "api", title: "API reference" },
    { slug: "design", title: "Design system" },
  ]},
  { group: "Project", pages: [
    { slug: "roadmap", title: "Roadmap & decisions" },
    { slug: "contributing", title: "Contributing" },
  ]},
];

const FLAT = NAV.flatMap(g => g.pages.map(p => ({ ...p, group: g.group })));
const href = slug => (slug === "index" ? "index.html" : `${slug}.html`);

/* ---------- icons: Lucide geometry, 24px grid, 1.7 stroke (DESIGN.md §7) ---------- */

const ICONS = {
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  server: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
  map: '<path d="M14.11 5.55a2 2 0 0 0 1.78 0l3.66-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.55 2.27a2 2 0 0 1-1.79 0l-4.21-2.1a2 2 0 0 0-1.79 0l-3.66 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9l4.55-2.27a2 2 0 0 1 1.79 0z"/><path d="M15 5.76v15"/><path d="M9 3.24v15"/>',
  pr: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  swords: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  vote: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
};

const GITHUB_MARK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-4"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"/></svg>';

const icon = (name, cls = "size-[18px]") => {
  if (!ICONS[name]) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
};

/* ---------- small text helpers ---------- */

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = s => esc(s).replace(/"/g, "&quot;");
const stripTags = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const slugify = s => stripTags(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function dedent(text) {
  const lines = text.replace(/\t/g, "    ").replace(/^\n+|\s+$/g, "").split("\n");
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map(l => l.slice(min)).join("\n");
}

const LANG_LABEL = { bash: "bash", powershell: "powershell", csharp: "c#", json: "json", sql: "sql", ini: "ini", css: "css", text: "text", caddyfile: "caddyfile", markdown: "markdown", cmd: "cmd" };

/* ---------- turning a fragment into finished prose ---------- */

function processContent(html) {
  const toc = [];
  let hasMermaid = false;
  const seen = new Set();

  // Code blocks are written raw inside <pre>, so they are pulled out first and
  // nothing below can mistake code for markup.
  const stash = [];
  html = html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_, attrs, body) => {
    const attr = n => (attrs.match(new RegExp(`${n}="([^"]*)"`)) || [])[1];
    const code = dedent(body);

    if (/class="mermaid-src"/.test(attrs)) {
      hasMermaid = true;
      const caption = attr("data-caption");
      stash.push(`<figure class="diagram not-prose"><pre class="mermaid">${esc(code)}</pre></figure>${caption ? `<p class="diagram-caption">${caption}</p>` : ""}`);
    } else {
      const lang = attr("data-lang") || "text";
      const title = attr("data-title") || LANG_LABEL[lang] || lang;
      const hl = lang === "caddyfile" ? "nginx" : lang === "cmd" ? "dos" : lang;
      const highlighted = hl !== "text" && hljs.getLanguage(hl)
        ? hljs.highlight(code, { language: hl, ignoreIllegals: true }).value
        : esc(code);
      stash.push(
        `<div class="codeblock"><div class="codeblock-head"><span class="codeblock-title">${esc(title)}</span>` +
        `<button type="button" class="copy-btn" data-copy aria-label="Copy code">${icon("copy", "size-3.5")}<span>Copy</span></button></div>` +
        `<pre><code class="hljs language-${lang}">${highlighted}</code></pre></div>`
      );
    }
    return `\u0000${stash.length - 1}\u0000`;
  });

  html = html.replace(/\{\{icon:([a-z]+)(?::([^}]+))?\}\}/g, (_, name, cls) => icon(name, cls));

  html = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, inner) => {
    let id = (attrs.match(/id="([^"]+)"/) || [])[1] || slugify(inner);
    while (seen.has(id)) id += "-2";
    seen.add(id);
    toc.push({ level: Number(level), id, text: stripTags(inner) });
    const rest = attrs.replace(/\s*id="[^"]*"/, "");
    return `<h${level} id="${id}"${rest}>${inner}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`;
  });

  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");

  const calloutIcon = { note: "info", warn: "alert", tip: "bulb" };
  html = html.replace(/<aside class="callout callout-(note|warn|tip)">/g, (m, kind) => `${m}${icon(calloutIcon[kind])}`);

  html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
  return { html, toc, hasMermaid };
}

function parseFragment(slug) {
  const file = join(root, "src", "pages", `${slug}.html`);
  if (!existsSync(file)) throw new Error(`Missing page: src/pages/${slug}.html`);
  // Normalised so code blocks never carry a stray \r from a Windows checkout.
  const raw = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`${slug}: missing front matter`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

/* ---------- layout pieces ---------- */

function sidebar(current) {
  return NAV.map(g => `
        <div class="mb-7">
          <p class="mb-2 px-3 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-subtle">${g.group}</p>
          <ul class="space-y-px">
            ${g.pages.map(p => `<li><a class="nav-link" href="${href(p.slug)}"${p.slug === current ? ' aria-current="page"' : ""}>${esc(p.title)}</a></li>`).join("\n            ")}
          </ul>
        </div>`).join("");
}

function tocHtml(toc, meta) {
  const items = toc.filter(t => t.level <= 3);
  const edit = meta.source
    ? `<a href="${REPO}/blob/main/${meta.source}" class="mt-6 inline-flex items-center gap-2 text-[13px] text-subtle transition-colors hover:text-foreground" target="_blank" rel="noopener">${icon("file", "size-3.5")}View source on GitHub</a>`
    : "";
  if (!items.length) return edit;
  return `
        <p class="mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-subtle">On this page</p>
        <nav aria-label="On this page" id="toc">
          ${items.map(t => `<a class="toc-link${t.level === 3 ? " toc-sub" : ""}" href="#${t.id}">${esc(t.text)}</a>`).join("\n          ")}
        </nav>
        ${edit}`;
}

function pager(index) {
  const prev = FLAT[index - 1], next = FLAT[index + 1];
  const card = (p, dir) => p ? `
          <a href="${href(p.slug)}" class="group flex flex-col rounded-xl border border-white/[.08] bg-surface px-5 py-4 transition-colors hover:border-white/[.16] ${dir === "next" ? "items-end text-right sm:col-start-2" : ""}">
            <span class="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[.14em] text-subtle">${dir === "prev" ? icon("left", "size-3.5") + "Previous" : "Next" + icon("right", "size-3.5")}</span>
            <span class="mt-1.5 text-[15px] font-medium text-foreground transition-colors group-hover:text-primary-light">${esc(p.title)}</span>
          </a>` : "";
  return `<nav class="mt-20 grid gap-3 sm:grid-cols-2" aria-label="Pagination">${card(prev, "prev")}${card(next, "next")}
        </nav>`;
}

function layout({ slug, meta, content, toc, hasMermaid, index }) {
  const page = FLAT[index];
  const isHome = slug === "index";
  const title = isHome ? "FLICKED Docs" : `${meta.title} · FLICKED Docs`;
  const header = isHome ? "" : `
          <header class="mb-12">
            <p class="eyebrow !text-primary-light">${esc(page.group)}</p>
            <h1 class="display mt-3 text-[2.6rem] leading-[.95] sm:text-[3.4rem]">${esc(meta.title)}</h1>
            ${meta.lead ? `<p class="mt-5 max-w-[60ch] text-[17px] leading-[1.65] text-muted">${meta.lead}</p>` : ""}
          </header>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${escAttr(meta.description)}">
  <meta name="theme-color" content="#0c0c0d">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(meta.description)}">
  <link rel="icon" href="assets/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;1,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="min-h-screen">
  <div class="ambient pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px]" aria-hidden="true"></div>
  <a href="#content" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-elevated focus:px-3 focus:py-2 focus:text-foreground">Skip to content</a>

  <header class="sticky top-0 z-40 border-b border-white/[.06] bg-bg/75 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
      <button type="button" class="-ml-1.5 inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-white/[.04] hover:text-foreground lg:hidden" data-nav-open aria-label="Open navigation">${icon("menu", "size-5")}</button>
      <a href="index.html" class="flex items-center gap-2.5" aria-label="FLICKED Docs home">
        <img src="assets/logo.png" alt="" class="h-7 w-auto">
        <span class="wordmark text-[22px] leading-none">FLICKED</span>
        <span class="ml-1 rounded-[4px] border border-white/[.09] px-1.5 py-px font-mono text-[10.5px] uppercase tracking-[.12em] text-subtle">Docs</span>
      </a>

      <button type="button" data-search-open class="ml-auto flex h-9 items-center gap-2.5 rounded-lg border border-white/[.08] bg-white/[.02] px-3 text-sm text-subtle transition-colors hover:border-white/[.14] hover:text-muted md:ml-8 md:w-72 lg:w-80">
        ${icon("search", "size-4")}<span class="hidden md:inline">Search the docs</span>
        <span class="ml-auto hidden items-center gap-1 md:flex"><kbd class="kbd" data-mod-key>Ctrl</kbd><kbd class="kbd">K</kbd></span>
      </button>

      <nav class="ml-auto hidden items-center gap-1 md:flex" aria-label="External">
        <span class="mr-2 hidden items-center gap-2 font-mono text-[11px] text-subtle xl:flex"><span class="dot dot-live"></span>v0.1 · Alpha</span>
        <a href="${REPO}/issues" target="_blank" rel="noopener" class="rounded-md px-3 py-1.5 text-[13.5px] text-subtle transition-colors hover:text-foreground">Report an issue</a>
        <a href="${REPO}" target="_blank" rel="noopener" class="ml-1 inline-flex h-9 items-center gap-2 rounded-md border border-white/[.14] px-3 text-[13.5px] font-medium text-foreground transition-colors hover:border-white/[.28] hover:bg-white/[.03]">${GITHUB_MARK}GitHub</a>
      </nav>
    </div>
  </header>

  <!-- mobile navigation -->
  <div id="mobile-nav" class="fixed inset-0 z-50 hidden lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" data-nav-close></div>
    <div class="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-y-auto border-r border-white/[.08] bg-surface px-3 py-5">
      <div class="mb-6 flex items-center justify-between px-3">
        <span class="wordmark text-[20px]">FLICKED</span>
        <button type="button" class="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-white/[.05] hover:text-foreground" data-nav-close aria-label="Close navigation">${icon("x", "size-5")}</button>
      </div>
      <nav aria-label="Documentation">${sidebar(slug)}
      </nav>
      <a href="${REPO}" target="_blank" rel="noopener" class="mx-3 mt-2 flex items-center gap-2 text-sm text-subtle hover:text-foreground">${GITHUB_MARK}GitHub</a>
    </div>
  </div>

  <div class="mx-auto max-w-[1440px] px-4 sm:px-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12 lg:px-8 xl:grid-cols-[232px_minmax(0,1fr)_216px]">
    <aside class="hidden lg:block">
      <nav class="sticky top-16 -ml-3 h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-2" aria-label="Documentation">${sidebar(slug)}
      </nav>
    </aside>

    <main id="content" class="min-w-0 py-10 lg:py-14">
      <article class="mx-auto max-w-[760px]">${header}
        <div class="prose-docs">
${content}
        </div>
        ${pager(index)}
      </article>
    </main>

    <aside class="hidden xl:block">
      <div class="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-14">${tocHtml(toc, meta)}
      </div>
    </aside>
  </div>

  <footer class="mt-10 border-t border-white/[.06]">
    <div class="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-10 text-[13px] text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div class="flex items-center gap-2.5">
        <img src="assets/logo.png" alt="" class="h-5 w-auto opacity-80">
        <span>FLICKED is free, open source and MIT licensed. Not affiliated with Valve.</span>
      </div>
      <div class="flex gap-5">
        <a href="${REPO}" class="hover:text-foreground" target="_blank" rel="noopener">Repository</a>
        <a href="contributing.html" class="hover:text-foreground">Contributing</a>
        <a href="roadmap.html" class="hover:text-foreground">Roadmap</a>
      </div>
    </div>
  </footer>

  <!-- search -->
  <dialog id="search-dialog" class="m-0 mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-white/10 bg-elevated p-0 text-muted shadow-plane2" aria-label="Search the docs">
    <div class="flex items-center gap-3 border-b border-white/[.08] px-4">
      ${icon("search", "size-[18px] shrink-0 text-subtle")}
      <input id="search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search pages and sections" class="h-14 w-full bg-transparent text-[15px] text-foreground placeholder:text-subtle focus:outline-none" aria-controls="search-results">
      <kbd class="kbd">Esc</kbd>
    </div>
    <ul id="search-results" role="listbox" class="max-h-[56vh] overflow-y-auto p-2"></ul>
    <div class="flex items-center gap-4 border-t border-white/[.06] px-4 py-2.5 font-mono text-[10.5px] text-subtle">
      <span class="flex items-center gap-1.5"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> navigate</span>
      <span class="flex items-center gap-1.5"><kbd class="kbd">↵</kbd> open</span>
    </div>
  </dialog>

  <script src="assets/search-index.js"></script>
  <script src="assets/app.js"></script>${hasMermaid ? '\n  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>\n  <script src="assets/diagrams.js"></script>' : ""}
</body>
</html>
`;
}

/* ---------- build ---------- */

const searchIndex = [];
let warnings = 0;

FLAT.forEach((p, index) => {
  const { meta, body } = parseFragment(p.slug);
  const { html, toc, hasMermaid } = processContent(body);

  // DESIGN.md §9: no em dashes in copy. Caught here so it cannot creep back in.
  const prose = html.replace(/<pre[\s\S]*?<\/pre>/g, "");
  if (prose.includes("—") || (meta.lead || "").includes("—")) {
    console.warn(`  ! ${p.slug}: contains an em dash`);
    warnings++;
  }

  writeFileSync(join(root, href(p.slug)), layout({ slug: p.slug, meta, content: html, toc, hasMermaid, index }));
  searchIndex.push({
    t: meta.title, g: p.group, u: href(p.slug), d: meta.description,
    h: toc.map(t => [t.text, t.id]),
  });
  console.log(`  ✓ ${href(p.slug)}`);
});

writeFileSync(join(root, "assets", "search-index.js"),
  `/* generated by build.mjs */\nwindow.SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n`);
console.log(`Built ${FLAT.length} pages${warnings ? `, ${warnings} warning(s)` : ""}.`);
