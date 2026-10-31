const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { JSDOM } = require("jsdom");
const root = resolve(__dirname, "../study");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const scripts = ["vendor/markdown-it.min.js", "vendor/katex/katex.min.js", "vendor/texmath.js", "vendor/purify.min.js", "data.js", "formulas.js", "core.js", "render.js", "app.js"].map(file => readFileSync(resolve(root, file), "utf8"));

function createPage(context, hash = "", saved) {
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://7-23nooboy.github.io/study/" + hash, pretendToBeVisual: true });
  context.after(() => dom.window.close());
  dom.window.scrollTo = () => {};
  if (saved) dom.window.localStorage.setItem("pretraining-study-progress-v1", JSON.stringify(saved));
  for (const dialog of dom.window.document.querySelectorAll("dialog")) {
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
  }
  scripts.forEach(script => dom.window.eval(script));
  return dom.window;
}

function navigate(browser, hash) {
  browser.location.hash = hash;
  browser.STUDY_APP.render();
}

test("reader boots with actual vendored libraries and chapter navigation", context => {
  const browser = createPage(context);
  assert.equal(browser.document.querySelectorAll("#catalog-list .catalog-item").length, 63);
  assert.ok(browser.document.querySelector("#reader .katex"));
  assert.equal(browser.STUDY_APP.errors.length, 0);
  assert.equal(browser.document.querySelectorAll("#reader h1").length, 1);
  browser.document.querySelector(".skip-link").click();
  assert.equal(browser.location.hash, "#/notes/data-01");
});

test("all 48 questions retain main and both deep answers in self-test mode", context => {
  const browser = createPage(context, "#/questions/Q13");
  browser.document.querySelector('[data-mode="test"]').click();
  assert.equal(browser.document.querySelector(".answer-panel").open, false);
  assert.equal(browser.document.querySelectorAll(".answer-content").length, 3);
  assert.match(browser.document.querySelector("#reader").textContent, /有限batch/);
  browser.document.querySelector('.answer-panel').open = true;
  browser.document.querySelector('[data-rating="known"]').click();
  assert.equal(browser.STUDY_APP.snapshot().ratings.Q13, "known");
  assert.equal(browser.document.querySelector("#mastered-count").textContent, "1 / 48");
});

test("bookmarks, read state and font choice persist under a dedicated key", context => {
  const browser = createPage(context);
  browser.document.querySelector("[data-bookmark]").click();
  const read = browser.document.querySelector(".read-check input");
  read.checked = true;
  read.dispatchEvent(new browser.Event("change"));
  browser.document.querySelector('button[data-font="large"]').click();
  const saved = JSON.parse(browser.localStorage.getItem("pretraining-study-progress-v1"));
  assert.ok(saved.bookmarks.includes("notes:data-01"));
  assert.ok(saved.read.includes("data-01"));
  assert.equal(saved.font, "large");
  navigate(browser, "#/saved");
  assert.equal(browser.document.querySelectorAll(".saved-row").length, 1);
  browser.document.querySelector(".saved-row button").click();
  assert.equal(browser.document.querySelectorAll(".saved-row").length, 0);
});

test("empty question filters show an empty state instead of mismatching content", context => {
  const browser = createPage(context, "#/questions/Q01");
  const filter = browser.document.getElementById("catalog-filter");
  filter.value = "review";
  filter.dispatchEvent(new browser.Event("change"));
  assert.match(browser.document.querySelector("#reader").textContent, /没有匹配/);
  assert.equal(browser.document.querySelector(".answer-panel"), null);
  filter.value = "all";
  filter.dispatchEvent(new browser.Event("change"));
  assert.ok(browser.document.querySelector(".answer-panel"));
});

test("global search includes deep answers and renders query text safely", context => {
  const browser = createPage(context);
  browser.document.getElementById("open-search").click();
  const input = browser.document.getElementById("search-input");
  input.value = "随机分母";
  input.dispatchEvent(new browser.Event("input"));
  assert.ok(browser.document.querySelectorAll(".search-result").length > 0);
  input.value = '<img src=x onerror="alert(1)">';
  input.dispatchEvent(new browser.Event("input"));
  assert.equal(browser.document.querySelector("#search-results img"), null);
});

test("formula pages explain symbols, derivation and scope without numeric inputs", context => {
  const browser = createPage(context, "#/formulas/compute");
  assert.equal(browser.document.querySelectorAll("#catalog-list .catalog-item").length, 12);
  assert.match(browser.document.querySelector(".formula-symbols").textContent, /GPU数量/);
  assert.match(browser.document.querySelector("#reader").textContent, /4.80/);
  assert.equal(browser.document.querySelector('#reader input, #reader form, .tool-results'), null);
  navigate(browser, "#/formulas/statistics");
  assert.match(browser.document.querySelector("#reader").textContent, /IUT/);
  assert.match(browser.document.querySelector(".formula-boundary").textContent, /非劣效/);
  browser.document.querySelector("[data-bookmark]").click();
  assert.ok(browser.STUDY_APP.snapshot().bookmarks.includes("formulas:statistics"));
});

test("official paper destinations are external and review caveats remain visible", context => {
  const browser = createPage(context, "#/papers/P20");
  const link = browser.document.querySelector(".source-link");
  assert.match(link.href, /^https:\/\/arxiv\.org\//);
  assert.equal(link.target, "_blank");
  assert.ok(link.rel.includes("noopener"));
  assert.match(browser.document.querySelector("#reader").textContent, /0\.98/);
  assert.match(browser.document.querySelector(".evidence-guide").textContent, /不是可靠性评级/);
});

test("corrupt persisted data is ignored and reset is explicit", context => {
  const browser = createPage(context, "", { version: 1, bookmarks: ["notes:not-real"], ratings: { Q99: "known" }, lastRoute: "javascript:alert(1)" });
  assert.equal(browser.STUDY_APP.snapshot().bookmarks.length, 0);
  browser.document.querySelector("[data-bookmark]").click();
  browser.document.getElementById("reset-progress").click();
  assert.equal(browser.STUDY_APP.snapshot().bookmarks.length, 1);
  browser.document.getElementById("confirm-reset").click();
  assert.equal(browser.STUDY_APP.snapshot().bookmarks.length, 0);
});