(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.StudyCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const views = new Set(["notes", "questions", "papers", "formulas", "saved"]);

  function parseRoute(hash) {
    const parts = String(hash || "").replace(/^#\/?/, "").split("/");
    const view = parts[0] === "tools" ? "formulas" : views.has(parts[0]) ? parts[0] : "notes";
    let id = parts[1] || "";
    if (!/^[a-zA-Z0-9-]*$/.test(id)) id = "";
    if (view === "formulas" && !id) id = "compute";
    return { view, id };
  }

  function route(view, id = "") {
    return `#/${views.has(view) ? view : "notes"}${id ? "/" + encodeURIComponent(id) : ""}`;
  }

  function plain(text) {
    return String(text || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`#*_>]/g, "").replace(/\s+/g, " ").trim();
  }

  function normalize(text) {
    return String(text || "").normalize("NFKC").toLocaleLowerCase().trim();
  }

  function makeSearchIndex(data) {
    return [
      ...data.notes.map(item => ({ id: item.id, view: "notes", title: item.title, label: data.books.find(book => book.id === item.book)?.title || "", content: plain(item.body) })),
      ...data.questions.map(item => ({ id: item.id, view: "questions", title: item.title, label: item.id, content: plain([item.answer, item.pitfalls, ...item.deep.flatMap(deep => [deep.question, deep.answer])].join(" ")) })),
      ...(data.formulas || []).map(item => ({ id: item.id, view: "formulas", title: item.title, label: item.category, content: plain(item.body + " " + item.boundary) })),
      ...data.library.map(item => ({ id: item.id, view: "papers", title: item.title, label: item.id, content: plain(data.papers.find(paper => paper.id === item.id)?.body || item.title) }))
    ].map(item => ({ ...item, normalizedTitle: normalize(item.title), searchable: normalize(item.title + " " + item.label + " " + item.content) }));
  }

  function search(index, query, limit = 50) {
    const normalized = normalize(query).slice(0, 160);
    if (!normalized) return [];
    const terms = normalized.split(/\s+/);
    return index.filter(item => terms.every(term => item.searchable.includes(term)))
      .map(item => ({ ...item, score: terms.reduce((sum, term) => sum + (item.normalizedTitle.includes(term) ? 5 : 0) + (normalize(item.label) === term ? 10 : 0), 0) }))
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "zh-CN"))
      .slice(0, limit);
  }

  function safeSource(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }

  function cleanState(value, data) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const noteIds = new Set(data.notes.map(item => item.id));
    const questionIds = new Set(data.questions.map(item => item.id));
    const keys = new Set([
      ...data.notes.map(item => `notes:${item.id}`), ...data.questions.map(item => `questions:${item.id}`), ...data.library.map(item => `papers:${item.id}`), ...(data.formulas || []).map(item => `formulas:${item.id}`)
    ]);
    const selected = (entries, allowed) => Array.isArray(entries) ? [...new Set(entries.filter(item => typeof item === "string" && allowed.has(item)))] : [];
    const ratings = {};
    if (source.ratings && typeof source.ratings === "object") {
      for (const [id, rating] of Object.entries(source.ratings)) if (questionIds.has(id) && ["review", "known"].includes(rating)) ratings[id] = rating;
    }
    const scroll = {};
    if (source.scroll && typeof source.scroll === "object") {
      for (const [key, position] of Object.entries(source.scroll)) if (keys.has(key) && Number.isFinite(position) && position >= 0 && position < 1e7) scroll[key] = position;
    }
    return {
      version: 1,
      bookmarks: selected(source.bookmarks, keys),
      read: selected(source.read, noteIds),
      ratings,
      scroll,
      lastRoute: typeof source.lastRoute === "string" && /^#\/(notes|questions|papers|formulas|tools|saved)(\/[a-zA-Z0-9-]+)?$/.test(source.lastRoute) ? source.lastRoute.replace("#/tools", "#/formulas") : "#/notes/data-01",
      font: ["small", "medium", "large"].includes(source.font) ? source.font : "medium",
      mode: source.mode === "test" ? "test" : "read"
    };
  }

  return { parseRoute, route, plain, normalize, makeSearchIndex, search, safeSource, cleanState };
});