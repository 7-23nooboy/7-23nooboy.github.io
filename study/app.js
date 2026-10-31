(() => {
  "use strict";
  const data = { ...window.STUDY_DATA, formulas: window.STUDY_FORMULAS };
  const core = window.StudyCore;
  const renderer = window.createStudyRenderer({ markdownit: window.markdownit, texmath: window.texmath, katex: window.katex, purifier: window.DOMPurify });
  const storageKey = "pretraining-study-progress-v1";
  let stored;
  try { stored = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch {}
  let state = core.cleanState(stored, data);
  let current = { view: "notes", id: "" };
  let visibleItems = [];
  let toastTimer;
  let scrollTimer;
  let filter = "all";
  const searchIndex = core.makeSearchIndex(data);
  const reader = document.getElementById("reader");
  const catalog = document.getElementById("catalog-list");
  const filters = [document.getElementById("catalog-filter"), document.getElementById("mobile-filter")];
  const labels = { notes: "讲义目录", questions: "问题目录", papers: "文献索引", formulas: "公式与推导", saved: "我的收藏" };
  const types = { notes: "讲义", questions: "问答", papers: "文献", formulas: "公式" };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = element("i");
    node.dataset.lucide = name;
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function refreshIcons() { window.lucide?.createIcons(); }

  function button(label, name, action, className = "icon-button") {
    const node = element("button", className);
    node.type = "button";
    node.title = label;
    node.setAttribute("aria-label", label);
    if (name) node.append(icon(name));
    if (className !== "icon-button") node.append(document.createTextNode(label));
    node.addEventListener("click", action);
    return node;
  }

  function announce(message) {
    const status = document.getElementById("app-status");
    clearTimeout(toastTimer);
    status.textContent = message;
    status.hidden = false;
    toastTimer = setTimeout(() => { status.hidden = true; }, 3500);
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { announce("当前浏览器未能保存进度"); }
    updateProgress();
  }

  function updateProgress() {
    const known = Object.values(state.ratings).filter(value => value === "known").length;
    document.getElementById("mastered-count").textContent = `${known} / ${data.questions.length}`;
    document.getElementById("mastered-count").title = `已掌握 ${known} 道题`;
    document.getElementById("mastered-bar").style.width = `${known / data.questions.length * 100}%`;
    document.getElementById("progress-summary").textContent = `已读 ${state.read.length} 节 · 掌握 ${known} 题 · 收藏 ${state.bookmarks.length} 项`;
    document.body.dataset.font = state.font;
    document.querySelectorAll("button[data-font]").forEach(node => node.setAttribute("aria-pressed", String(node.dataset.font === state.font)));
  }

  function currentKey() { return `${current.view}:${current.id}`; }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function saveScroll() {
    if (["notes", "questions", "papers", "formulas"].includes(current.view) && current.id) state.scroll[currentKey()] = Math.max(0, window.scrollY || 0);
  }

  function navigate(view, id = "") {
    saveScroll();
    const next = core.route(view, id);
    if (location.hash === next) render();
    else location.hash = next;
    closeDialog("catalog-dialog");
    closeDialog("search-dialog");
  }

  function prose(markdown, className = "prose") {
    const node = element("div", className);
    node.innerHTML = renderer.render(markdown);
    node.querySelectorAll("table").forEach(table => {
      const wrap = element("div", "table-scroll");
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", "数据表格");
      table.replaceWith(wrap);
      wrap.append(table);
    });
    return node;
  }

  function toggleBookmark(key) {
    const position = state.bookmarks.indexOf(key);
    if (position >= 0) state.bookmarks.splice(position, 1);
    else state.bookmarks.push(key);
    persist();
    document.querySelectorAll("[data-bookmark]").forEach(node => {
      const selected = state.bookmarks.includes(node.dataset.bookmark);
      node.setAttribute("aria-pressed", String(selected));
      node.title = selected ? "取消收藏" : "收藏";
      node.setAttribute("aria-label", node.title);
    });
    if (current.view === "saved") renderSaved();
    refreshIcons();
  }

  function makeArticle(title, metadata) {
    const article = element("article", "article");
    const top = element("div", "article-top");
    const meta = element("div", "article-meta");
    metadata.forEach((text, index) => meta.append(element("span", index === 0 ? "meta-label" : "", text)));
    const actions = element("div", "article-tools");
    if (["notes", "questions", "papers", "formulas"].includes(current.view)) {
      const bookmark = button("收藏", "bookmark", () => toggleBookmark(currentKey()));
      bookmark.dataset.bookmark = currentKey();
      bookmark.setAttribute("aria-pressed", String(state.bookmarks.includes(currentKey())));
      actions.append(bookmark);
      actions.append(button("复制当前链接", "link", async () => {
        try { await navigator.clipboard.writeText(location.href); announce("链接已复制"); }
        catch { announce("复制未成功，可使用浏览器分享菜单"); }
      }));
    }
    top.append(meta, actions);
    article.append(top, element("h1", "", title));
    reader.replaceChildren(article);
    document.title = `${title} | 预训练数据学习笔记`;
    return article;
  }

  function pagination() {
    const index = visibleItems.findIndex(item => item.id === current.id);
    const previousId = visibleItems[index - 1]?.id;
    const nextId = visibleItems[index + 1]?.id;
    const commands = element("div", "previous-next");
    const previous = button("上一项", "arrow-left", () => { if (previousId) navigate(current.view, previousId); });
    const next = button("下一项", "arrow-right", () => { if (nextId) navigate(current.view, nextId); });
    previous.disabled = !previousId;
    next.disabled = !nextId;
    commands.append(previous, next);
    return commands;
  }

  function renderNote() {
    const note = data.notes.find(item => item.id === current.id) || visibleItems[0] || data.notes[0];
    current.id = note.id;
    const book = data.books.find(item => item.id === note.book);
    const article = makeArticle(note.title, [book.title, `${note.minutes} 分钟`, `${state.read.includes(note.id) ? "已读" : "未读"}`]);
    article.append(element("div", "article-rule"));
    const content = prose(note.body);
    const headings = [...content.querySelectorAll("h2,h3,h4")];
    if (headings.length > 1) {
      const outline = element("details", "article-outline");
      outline.append(element("summary", "", "本节目录"));
      const list = element("ul");
      headings.forEach((heading, index) => {
        heading.id = `section-${note.id}-${index}`;
        const link = element("a", "", heading.textContent);
        link.href = "#" + heading.id;
        link.addEventListener("click", event => { event.preventDefault(); heading.scrollIntoView({ block: "start", behavior: "auto" }); });
        const item = element("li");
        item.append(link);
        list.append(item);
      });
      outline.append(list);
      article.append(outline);
    }
    article.append(content);
    const footer = element("div", "note-footer");
    const label = element("label", "read-check");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.read.includes(note.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.read = [...new Set([...state.read, note.id])];
      else state.read = state.read.filter(id => id !== note.id);
      persist();
      renderCatalog();
    });
    label.append(checkbox, document.createTextNode("已读本节"));
    footer.append(label, pagination());
    article.append(footer);
  }

  function disclosure(label, question, answer, open = false) {
    const details = element("details", "answer-panel");
    details.open = open;
    const summary = element("summary");
    const heading = element("div");
    heading.append(element("span", "answer-label", label));
    if (question) heading.append(element("strong", "", core.plain(question)));
    summary.append(heading, icon("chevron-down"));
    details.append(summary, prose(answer, "prose answer-content"));
    return details;
  }

  function renderQuestion() {
    const question = data.questions.find(item => item.id === current.id) || visibleItems[0] || data.questions[0];
    current.id = question.id;
    const group = data.groups.find(item => item.id === question.group);
    const article = makeArticle(question.title, [question.id, group.title, question.priority === "P0" ? "核心" : "深入"]);
    const toolbar = element("div", "question-toolbar");
    const modes = element("div", "segmented");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "问答模式");
    for (const [mode, label] of [["read", "阅读"], ["test", "自测"]]) {
      const choice = button(label, null, () => { state.mode = mode; persist(); renderQuestion(); refreshIcons(); }, "mode-button");
      choice.dataset.mode = mode;
      choice.setAttribute("aria-pressed", String(state.mode === mode));
      modes.append(choice);
    }
    const counter = element("span", "question-counter", `${Number(question.id.slice(1))} / ${data.questions.length}`);
    const shuffle = button("随机一道题", "shuffle", () => {
      const candidates = visibleItems.filter(item => item.id !== current.id);
      if (candidates.length) navigate("questions", candidates[Math.floor(Math.random() * candidates.length)].id);
    });
    toolbar.append(modes, counter, shuffle);
    article.append(toolbar, disclosure("参考回答", "", question.answer, state.mode === "read"));
    question.deep.forEach((deep, index) => article.append(disclosure(index === 0 ? "一级追问" : "二级追问", deep.question, deep.answer)));
    const pitfalls = element("details", "answer-panel");
    pitfalls.append(element("summary", "", "常见失分点"));
    const pitfall = element("div", "pitfall");
    pitfall.append(prose(question.pitfalls));
    pitfalls.append(pitfall);
    article.append(pitfalls);
    const ratingRow = element("div", "rating-row");
    const ratingActions = element("div", "rating-actions");
    for (const [rating, label, symbol] of [["review", "待复习", "rotate-ccw"], ["known", "已掌握", "check"]]) {
      const rate = button(label, symbol, () => {
        if (state.ratings[question.id] === rating) delete state.ratings[question.id];
        else state.ratings[question.id] = rating;
        persist();
        ratingActions.querySelectorAll("[data-rating]").forEach(node => node.setAttribute("aria-pressed", String(state.ratings[question.id] === node.dataset.rating)));
        renderCatalog();
      }, "text-button");
      rate.dataset.rating = rating;
      rate.setAttribute("aria-pressed", String(state.ratings[question.id] === rating));
      ratingActions.append(rate);
    }
    ratingRow.append(ratingActions, pagination());
    article.append(ratingRow);
    if (question.relatedPapers.length) {
      const related = element("div", "related-papers");
      related.append(element("span", "muted", "相关文献"));
      question.relatedPapers.forEach(id => {
        const link = element("a", "", id);
        link.href = core.route("papers", id);
        related.append(link);
      });
      article.append(related);
    }
  }

  function sourceLink(source) {
    const link = element("a", "source-link", "官方原文");
    link.href = core.safeSource(source);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";
    link.append(icon("arrow-up-right"));
    return link;
  }

  function renderPaper() {
    const resource = data.library.find(item => item.id === current.id) || visibleItems[0] || data.library[0];
    current.id = resource.id;
    const paper = data.papers.find(item => item.id === resource.id);
    const article = makeArticle(paper?.title || resource.title, [resource.id, paper ? "近期文献" : resource.type === "paper" ? "基础与拓展" : "官方资料", paper?.year || ""]);
    article.append(sourceLink(paper?.source || resource.source));
    const guide = element("details", "evidence-guide");
    guide.append(element("summary", "", "阅读状态与证据"), element("p", "", data.evidenceGuide));
    article.append(guide);
    if (paper?.caution) article.append(element("p", "notice", "此条目存在需要澄清的源文口径或实现条件，不能只依据摘要数字下结论。"));
    if (paper) article.append(prose(paper.body));
    else {
      const citations = data.notes.filter(note => note.body.includes(resource.source.replace(/v\d+(?:#.*)?$/, "")) || note.body.includes(resource.id));
      const block = element("div", "prose");
      block.append(element("h2", "", "原文记录"), element("p", "", resource.title));
      const address = element("p", "muted", new URL(resource.source).hostname);
      block.append(address);
      if (citations.length) {
        block.append(element("h3", "", "相关章节"));
        citations.forEach(note => { const link = element("a", "text-button", note.title); link.href = core.route("notes", note.id); block.append(link); });
      }
      article.append(block);
    }
    const footer = element("div", "note-footer");
    footer.append(element("span", "muted", "公开来源"), pagination());
    article.append(footer);
  }

  function empty(container, title, message = "") {
    const stateNode = element("div", "empty-state");
    stateNode.append(icon("inbox"), element("h2", "", title));
    if (message) stateNode.append(element("p", "", message));
    container.append(stateNode);
    refreshIcons();
  }

  function renderSaved() {
    const article = makeArticle("我的收藏", ["本机记录", `${state.bookmarks.length} 项`]);
    const list = element("div", "saved-list");
    const bookmarks = state.bookmarks.filter(key => filter === "all" || key.startsWith(filter + ":"));
    if (!bookmarks.length) empty(list, "暂无收藏", "当前分类中没有记录");
    bookmarks.forEach(key => {
      const [view, id] = key.split(":");
      const item = (view === "notes" ? data.notes : view === "questions" ? data.questions : view === "formulas" ? data.formulas : data.library).find(item => item.id === id);
      if (!item) return;
      const row = element("div", "saved-row");
      const link = element("a");
      link.href = core.route(view, id);
      link.append(element("span", "", `${types[view]} · ${id}`), element("strong", "", item.title));
      row.append(link, button("取消收藏", "bookmark-minus", () => toggleBookmark(key)));
      list.append(row);
    });
    article.append(list);
    refreshIcons();
  }

  function renderFormula() {
    const formula = data.formulas.find(item => item.id === current.id) || visibleItems[0] || data.formulas[0];
    current.id = formula.id;
    const article = makeArticle(formula.title, ["公式与推导", formula.category]);
    const symbols = element("div", "formula-symbols");
    symbols.append(element("h2", "", "符号与单位"));
    const definitions = element("dl");
    formula.symbols.forEach(([symbol, meaning]) => {
      const row = element("div", "symbol-row");
      const term = element("dt");
      term.append(prose(symbol));
      row.append(term, element("dd", "", meaning));
      definitions.append(row);
    });
    symbols.append(definitions);
    article.append(symbols, prose(formula.body));
    const boundary = element("aside", "formula-boundary");
    boundary.append(element("h2", "", "适用边界"), element("p", "", formula.boundary));
    article.append(boundary);
    const links = element("div", "related-papers");
    const note = element("a", "", "完整讲义");
    note.href = core.route("notes", formula.note);
    const question = element("a", "", "相关问答 · " + formula.question);
    question.href = core.route("questions", formula.question);
    links.append(note, question);
    article.append(links);
    const footer = element("div", "note-footer");
    footer.append(element("span", "muted", "推导 · 代入 · 条件"), pagination());
    article.append(footer);
  }

  function optionsForView() {
    if (current.view === "notes") return [["all", "全部章节"], ...data.books.map(book => [book.id, book.title])];
    if (current.view === "questions") return [["all", "全部问题"], ["review", "待复习"], ["unknown", "尚未掌握"], ["P0", "核心问题"], ...data.groups.map(group => [group.id, group.title])];
    if (current.view === "papers") return [["all", "全部文献与资料"], ["recent", "近期精选"], ["foundation", "基础与拓展"], ["caution", "存在源文疑点"]];
    if (current.view === "saved") return [["all", "全部收藏"], ["notes", "讲义"], ["questions", "问答"], ["papers", "文献"], ["formulas", "公式"]];
    return [["all", "全部公式"], ...[...new Set(data.formulas.map(item => item.category))].map(category => [category, category])];
  }

  function filteredItems() {
    if (current.view === "notes") return data.notes.filter(item => filter === "all" || item.book === filter).map(item => ({ ...item, label: item.id.split("-")[1] }));
    if (current.view === "questions") return data.questions.filter(item => filter === "all" || item.group === filter || item.priority === filter || (filter === "review" && state.ratings[item.id] === "review") || (filter === "unknown" && state.ratings[item.id] !== "known")).map(item => ({ ...item, label: item.id }));
    if (current.view === "papers") return data.library.filter(item => filter === "all" || (filter === "recent" && item.id.startsWith("P")) || (filter === "foundation" && !item.id.startsWith("P")) || (filter === "caution" && data.papers.find(paper => paper.id === item.id)?.caution)).map(item => ({ ...item, label: item.id }));
    if (current.view === "formulas") return data.formulas.map((item, index) => ({ ...item, label: String(index + 1).padStart(2, "0") })).filter(item => filter === "all" || item.category === filter);
    return [];
  }

  function renderCatalog() {
    const title = labels[current.view];
    document.getElementById("catalog-title").textContent = title;
    document.getElementById("mobile-title").textContent = title;
    document.getElementById("mobile-catalog-label").textContent = title;
    const options = optionsForView();
    if (!options.some(([value]) => value === filter)) filter = "all";
    filters.forEach(select => {
      select.replaceChildren(...options.map(([value, label]) => { const option = element("option", "", label); option.value = value; return option; }));
      select.value = filter;
    });
    visibleItems = filteredItems();
    document.getElementById("catalog-count").textContent = String(visibleItems.length || (current.view === "saved" ? state.bookmarks.length : 0));
    document.getElementById("mobile-position").textContent = current.view === "questions" ? `${Object.values(state.ratings).filter(value => value === "known").length} / 48 已掌握` : `${visibleItems.length} 项`;
    const lists = [catalog, document.getElementById("mobile-catalog")];
    lists.forEach(list => {
      list.replaceChildren();
      if (current.view === "saved") {
        const summary = element("div", "empty-state");
        summary.append(icon("bookmark"), element("p", "", `${state.bookmarks.length} 项收藏`));
        list.append(summary);
        return;
      }
      if (!visibleItems.length) { empty(list, "没有匹配的记录"); return; }
      visibleItems.forEach(item => {
        const link = element("a", "catalog-item");
        link.href = core.route(current.view, item.id);
        if (item.id === current.id) link.setAttribute("aria-current", "location");
        link.append(element("span", "item-number", item.label), element("span", "item-name", item.title));
        if (state.read.includes(item.id) || state.ratings[item.id] === "known") link.append(icon("check"));
        link.addEventListener("click", event => { event.preventDefault(); navigate(current.view, item.id); });
        list.append(link);
      });
    });
    refreshIcons();
  }

  function render() {
    const previousView = current.view;
    current = core.parseRoute(location.hash || state.lastRoute);
    if (current.view !== previousView) filter = "all";
    visibleItems = filteredItems();
    if (current.view === "notes") renderNote();
    else if (current.view === "questions") renderQuestion();
    else if (current.view === "papers") renderPaper();
    else if (current.view === "formulas") renderFormula();
    else renderSaved();
    renderCatalog();
    document.querySelectorAll("[data-view-link]").forEach(link => {
      if (link.dataset.viewLink === current.view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    state.lastRoute = core.route(current.view, current.id);
    persist();
    refreshIcons();
    const position = state.scroll[currentKey()] || 0;
    requestAnimationFrame(() => window.scrollTo({ top: position, behavior: "instant" }));
  }

  function updateSearch() {
    const query = document.getElementById("search-input").value;
    const matches = core.search(searchIndex, query);
    const container = document.getElementById("search-results");
    container.replaceChildren();
    document.getElementById("search-status").textContent = query.trim() ? `${matches.length}${matches.length === 50 ? "+" : ""} 条结果` : "";
    if (query.trim() && !matches.length) { empty(container, "没有找到匹配内容"); return; }
    matches.forEach(item => {
      const link = element("a", "search-result");
      link.href = core.route(item.view, item.id);
      const normalizedQuery = core.normalize(query).split(/\s+/)[0];
      const position = core.normalize(item.content).indexOf(normalizedQuery);
      const start = Math.max(0, position - 25);
      const excerpt = (start > 0 ? "…" : "") + item.content.slice(start, start + 115) + (item.content.length > start + 115 ? "…" : "");
      link.append(element("span", "", `${types[item.view]} · ${item.label}`), element("strong", "", item.title), element("p", "", excerpt));
      link.addEventListener("click", event => { event.preventDefault(); navigate(item.view, item.id); });
      container.append(link);
    });
  }

  document.querySelectorAll("[data-close]").forEach(node => node.addEventListener("click", () => closeDialog(node.dataset.close)));
  document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog.id); } }));
  document.getElementById("open-search").addEventListener("click", () => { openDialog("search-dialog"); document.getElementById("search-input").focus(); updateSearch(); });
  document.getElementById("search-input").addEventListener("input", updateSearch);
  document.getElementById("clear-search").addEventListener("click", () => { document.getElementById("search-input").value = ""; updateSearch(); document.getElementById("search-input").focus(); });
  document.getElementById("open-catalog").addEventListener("click", () => openDialog("catalog-dialog"));
  document.getElementById("open-settings").addEventListener("click", () => { updateProgress(); openDialog("settings-dialog"); });
  filters.forEach(select => select.addEventListener("change", () => {
    filter = select.value;
    visibleItems = filteredItems();
    renderCatalog();
    if (current.view === "saved") renderSaved();
    else if (!visibleItems.length) {
      const article = makeArticle(labels[current.view], ["0 项"]);
      empty(article, "没有匹配的记录");
    } else if (!visibleItems.some(item => item.id === current.id)) navigate(current.view, visibleItems[0].id);
    else render();
  }));
  document.querySelectorAll("button[data-font]").forEach(node => node.addEventListener("click", () => { state.font = node.dataset.font; persist(); }));
  document.getElementById("export-progress").addEventListener("click", () => {
    saveScroll();
    const exported = { ...core.cleanState(state, data), exportedAt: new Date().toISOString() };
    const address = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" }));
    const link = element("a");
    link.href = address;
    link.download = "study-progress.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(address), 1000);
    announce("进度已导出");
  });
  document.getElementById("import-progress").addEventListener("click", () => document.getElementById("progress-file").click());
  document.getElementById("progress-file").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 256000) throw new Error("进度文件过大");
      const imported = JSON.parse(await file.text());
      if (!imported || imported.version !== 1 || !Array.isArray(imported.bookmarks)) throw new Error("不是有效的学习进度文件");
      state = core.cleanState(imported, data);
      persist();
      render();
      announce("进度已导入");
    } catch (failure) { announce(failure.message || "导入失败"); }
    event.target.value = "";
  });
  document.getElementById("reset-progress").addEventListener("click", () => { closeDialog("settings-dialog"); openDialog("reset-dialog"); });
  document.getElementById("confirm-reset").addEventListener("click", () => { state = core.cleanState(null, data); persist(); closeDialog("reset-dialog"); render(); announce("本机进度已清空"); });
  document.addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("open-search").click(); } });
  document.querySelector(".skip-link").addEventListener("click", event => { event.preventDefault(); reader.focus(); reader.scrollIntoView?.({ block: "start" }); });
  document.addEventListener("click", event => { const link = event.target.closest('a[href^="#/"]'); if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey) saveScroll(); });
  window.addEventListener("hashchange", render);
  window.addEventListener("scroll", () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { saveScroll(); try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} }, 250); }, { passive: true });
  window.addEventListener("pagehide", () => { saveScroll(); try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} });
  const connection = () => { const status = document.getElementById("connection-state"); status.hidden = navigator.onLine !== false; status.textContent = "离线"; };
  window.addEventListener("online", connection);
  window.addEventListener("offline", connection);
  connection();
  if (!location.hash) history.replaceState(null, "", state.lastRoute);
  render();
  if (["http:", "https:"].includes(location.protocol) && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  }
  window.STUDY_APP = { snapshot: () => JSON.parse(JSON.stringify(state)), render, errors: renderer.errors };
})();