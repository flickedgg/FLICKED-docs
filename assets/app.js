/* FLICKED Docs: the small amount of behaviour a static page needs.
   Navigation, copy buttons, the "on this page" highlight, and search. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  $$("[data-mod-key]").forEach(k => { k.textContent = isMac ? "⌘" : "Ctrl"; });

  /* ---------- mobile navigation ---------- */
  const drawer = $("#mobile-nav");
  const setDrawer = open => {
    if (!drawer) return;
    drawer.classList.toggle("hidden", !open);
    document.documentElement.classList.toggle("overflow-hidden", open);
  };
  $$("[data-nav-open]").forEach(b => b.addEventListener("click", () => setDrawer(true)));
  $$("[data-nav-close]").forEach(b => b.addEventListener("click", () => setDrawer(false)));

  /* ---------- copy buttons ---------- */
  const CHECK = '<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  $$("[data-copy]").forEach(btn => {
    const original = btn.innerHTML;
    btn.addEventListener("click", async () => {
      const code = btn.closest(".codeblock")?.querySelector("pre")?.innerText ?? "";
      try {
        await navigator.clipboard.writeText(code.replace(/\n$/, ""));
        btn.innerHTML = `${CHECK}<span>Copied</span>`;
        btn.classList.add("!text-primary-light");
      } catch {
        btn.innerHTML = "<span>Press Ctrl+C</span>";
      }
      setTimeout(() => { btn.innerHTML = original; btn.classList.remove("!text-primary-light"); }, 1600);
    });
  });

  /* ---------- "on this page": highlight the section being read ---------- */
  const tocLinks = $$("#toc a");
  if (tocLinks.length) {
    const targets = tocLinks.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = 120;
      let current = targets[0];
      for (const t of targets) { if (t.getBoundingClientRect().top - line <= 0) current = t; else break; }
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      if (atBottom) current = targets[targets.length - 1];
      tocLinks.forEach(a => a.classList.toggle("is-active", a.hash === `#${current?.id}`));
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- search ---------- */
  const dialog = $("#search-dialog");
  const input = $("#search-input");
  const list = $("#search-results");
  const INDEX = window.SEARCH_INDEX || [];

  // Each page is an entry, and so is each of its sections.
  const entries = INDEX.flatMap(p => [
    { title: p.t, group: p.g, url: p.u, text: p.d, page: true },
    ...p.h.map(([h, id]) => ({ title: h, group: p.t, url: `${p.u}#${id}`, text: "", page: false })),
  ]);

  const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const highlight = (s, terms) => {
    let out = escapeHtml(s);
    terms.forEach(t => { if (t) out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>"); });
    return out;
  };

  const score = (e, terms) => {
    const title = e.title.toLowerCase(), hay = `${title} ${e.group.toLowerCase()} ${e.text.toLowerCase()}`;
    let s = 0;
    for (const t of terms) {
      if (!hay.includes(t)) return 0;
      if (title.startsWith(t)) s += 6; else if (title.includes(t)) s += 4; else s += 1;
    }
    return s + (e.page ? 2 : 0);
  };

  let selected = 0, results = [];
  const PAGE_ICON = '<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
  const HASH_ICON = '<span class="font-mono text-[13px]">#</span>';

  const render = () => {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    results = terms.length
      ? entries.map(e => [score(e, terms), e]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, e]) => e)
      : entries.filter(e => e.page);
    selected = 0;
    if (!results.length) {
      list.innerHTML = `<li class="px-3 py-10 text-center text-sm text-subtle">No results for “${escapeHtml(input.value)}”</li>`;
      return;
    }
    list.innerHTML = results.map((r, i) => `
      <li role="option" class="search-hit flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5" aria-selected="${i === 0}" data-i="${i}">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/[.08] bg-white/[.02] text-subtle">${r.page ? PAGE_ICON : HASH_ICON}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[14px] text-foreground">${highlight(r.title, terms)}</span>
          <span class="block truncate text-[12.5px] text-subtle">${escapeHtml(r.page ? r.group : `in ${r.group}`)}</span>
        </span>
        <span class="search-hit-arrow text-subtle opacity-0">↵</span>
      </li>`).join("");
  };

  const select = i => {
    selected = (i + results.length) % results.length;
    $$(".search-hit", list).forEach((el, j) => el.setAttribute("aria-selected", String(j === selected)));
    $$(".search-hit", list)[selected]?.scrollIntoView({ block: "nearest" });
  };
  const go = i => { const r = results[i]; if (r) { dialog.close(); location.href = r.url; } };

  const openSearch = () => {
    if (!dialog || dialog.open) return;
    setDrawer(false);
    dialog.showModal();
    input.value = "";
    render();
    input.focus();
  };

  $$("[data-search-open]").forEach(b => b.addEventListener("click", openSearch));
  input?.addEventListener("input", render);
  input?.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); select(selected + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(selected - 1); }
    else if (e.key === "Enter") { e.preventDefault(); go(selected); }
  });
  list?.addEventListener("click", e => { const li = e.target.closest("[data-i]"); if (li) go(Number(li.dataset.i)); });
  list?.addEventListener("mousemove", e => { const li = e.target.closest("[data-i]"); if (li && Number(li.dataset.i) !== selected) select(Number(li.dataset.i)); });
  dialog?.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

  addEventListener("keydown", e => {
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
    else if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); openSearch(); }
    else if (e.key === "Escape") setDrawer(false);
  });
})();
