const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { JSDOM } = require("jsdom");
const root = resolve(__dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const configScript = readFileSync(resolve(root, "site.config.js"), "utf8");
const languageScript = readFileSync(resolve(root, "scripts/i18n.js"), "utf8");
const mainScript = readFileSync(resolve(root, "scripts/main.js"), "utf8");

function createPage(context, overrides = {}, prepare) {
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://7-23nooboy.github.io/" });
  context.after(() => dom.window.close());
  dom.window.eval(configScript);
  Object.assign(dom.window.SITE_CONFIG, overrides);
  prepare?.(dom.window);
  dom.window.eval(languageScript);
  dom.window.eval(mainScript);
  return dom.window;
}

function copyEmail(window) {
  return new Promise((resolveStatus) => {
    const observer = new window.MutationObserver(() => {
      observer.disconnect();
      resolveStatus();
    });
    observer.observe(window.document.querySelector("#copy-status"), { childList: true });
    window.document.querySelector(".copy-email").click();
  });
}

test("static content has valid anchors, local assets, and no GitHub avatar", (context) => {
  const { document } = createPage(context);
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelectorAll("[data-category]").length, 4);
  assert.equal(document.querySelectorAll("img[src*=avatar]").length, 0);
  assert.ok(existsSync(resolve(root, ".nojekyll")));
  for (const link of document.querySelectorAll("a[href]")) {
    if (link.getAttribute("href").startsWith("#")) assert.ok(document.querySelector(link.hash));
    if (link.target === "_blank") assert.ok(link.rel.includes("noopener"));
  }
  for (const resource of document.querySelectorAll("script[src], img[src], link[rel=stylesheet]")) {
    const source = resource.getAttribute("src") || resource.getAttribute("href");
    const url = new URL(source, document.baseURI);
    assert.equal(url.origin, new URL(document.baseURI).origin);
    assert.ok(existsSync(resolve(root, decodeURIComponent(url.pathname.slice(1)))), source);
  }
});

test("social profiles render and unset CV and projects stay hidden", (context) => {
  const { document } = createPage(context);
  assert.equal(document.querySelector("[data-social=scholar]").hidden, false);
  assert.equal(document.querySelector("[data-social=linkedin]").hidden, false);
  assert.equal(document.querySelector("[data-social=cv]").hidden, true);
  assert.equal(document.querySelector("#projects").hidden, true);
  assert.equal(document.querySelector("[data-project-nav]").hidden, true);
  assert.match(document.querySelector("[data-portrait]").src, /assets\/images\/portrait\.webp$/);
});

test("an unset photo keeps the initials placeholder without requesting an image", (context) => {
  const { document } = createPage(context, { photo: "" });
  assert.equal(document.querySelector("[data-portrait]").hasAttribute("src"), false);
  assert.equal(document.querySelector("[data-portrait]").hidden, true);
  assert.equal(document.querySelector(".portrait-placeholder").hidden, false);
});

test("language switch translates core sections and restores English without changing links", (context) => {
  const window = createPage(context);
  const document = window.document;
  const scholar = document.querySelector("[data-social=scholar]").href;
  document.querySelector("[data-language=zh]").click();
  assert.equal(document.documentElement.lang, "zh-CN");
  assert.equal(document.querySelector("#education-title").textContent, "教育背景");
  assert.match(document.querySelector(".bio").textContent, /中国科学院/);
  assert.equal(document.querySelector("[data-social=scholar]").href, scholar);
  assert.equal(window.localStorage.getItem("homepage-language"), "zh");
  document.querySelector("[data-language=en]").click();
  assert.equal(document.querySelector("#education-title").textContent, "Education");
  assert.match(document.querySelector(".bio").textContent, /master's student/);
  assert.equal(document.querySelector(".nav-contact").querySelectorAll("i").length, 1);
});

test("biography preserves the advisor, contribution scope, and current interests across language switches", (context) => {
  const { document } = createPage(context);
  for (const language of ["en", "zh", "en"]) {
    document.querySelector(`[data-language=${language}]`).click();
    const biography = document.querySelector(".bio").textContent;
    assert.equal(document.querySelectorAll(".bio p").length, 4);
    assert.match(biography, /AI4S/);
    if (language === "zh") {
      for (const phrase of ["元国军高级工程师", "高性能中心", "信息安全", "负责验证工作", "参与部分设计", "评测数据集", "预训练数据处理", "大语言模型训练中的数据科学", "数据配比", "数据质量", "数据利用", "训练效率", "同一数据在多轮训练中的效果", "后训练算法", "长程智能体"]) {
        assert.ok(biography.includes(phrase), phrase);
      }
      assert.match(document.querySelector(".research-note").textContent, /当前研究兴趣/);
      assert.match(document.querySelector(".research-note li").textContent, /大语言模型训练中的数据科学/);
      assert.match(document.querySelector("meta[name=description]").content, /大语言模型训练中的数据科学/);
    } else {
      for (const phrase of ["Guojun Yuan", "senior engineer", "High-Performance Computing Center", "Information Security", "verification", "parts of the design", "evaluating agent capabilities", "pretraining data processing", "data science for LLM training", "data mixtures", "data quality", "data utilization", "training efficiency", "same data over multiple epochs", "post-training algorithms", "long-horizon agents"]) {
        assert.ok(biography.includes(phrase), phrase);
      }
      assert.match(document.querySelector(".research-note").textContent, /Current research interests/);
      assert.match(document.querySelector(".research-note li").textContent, /Data science for LLM training/);
      assert.match(document.querySelector("meta[name=description]").content, /data science for LLM training/);
    }
  }
});

test("saved Chinese preference is restored and Chinese text is valid Unicode", (context) => {
  const window = createPage(context, {}, (browser) => browser.localStorage.setItem("homepage-language", "zh"));
  assert.equal(window.document.documentElement.lang, "zh-CN");
  assert.equal(window.document.querySelector("#publications-title").textContent, "论文与海报");
  assert.equal(window.document.querySelector(".chinese-name").textContent, "汪元喆");
  assert.ok(!window.document.body.textContent.includes("\ufffd"));
});

test("switching languages preserves filters and translates dynamic status messages", async (context) => {
  const window = createPage(context, {}, (browser) => {
    Object.defineProperty(browser.navigator, "clipboard", { value: { writeText: async () => {} } });
  });
  const document = window.document;
  document.querySelector("[data-filter=systems]").click();
  document.querySelector("[data-language=zh]").click();
  assert.equal(document.querySelector("#filter-status").textContent, "当前显示 2 项研究成果。");
  assert.equal(document.querySelector(".menu-toggle").getAttribute("aria-label"), "展开导航");
  assert.equal(document.querySelector("[data-filter=systems]").getAttribute("aria-pressed"), "true");
  await copyEmail(window);
  assert.equal(document.querySelector("#copy-status").textContent, "邮箱已复制");
  document.querySelector("[data-language=en]").click();
  assert.equal(document.querySelector("#copy-status").textContent, "Email copied!");
});

test("Chinese project metadata is optional and localized when supplied", (context) => {
  const window = createPage(context, { showProjects: true, projects: [{ title: "Research tool", titleZh: "研究工具", description: "A tool", descriptionZh: "工具简介", url: "https://github.com/7-23nooboy" }] });
  window.document.querySelector("[data-language=zh]").click();
  assert.equal(window.document.querySelector(".project-item h3").textContent, "研究工具");
  assert.match(window.document.querySelector(".project-item a").textContent, /查看项目/);
});

test("publication filters update visible papers and accessible state", (context) => {
  const { document } = createPage(context);
  document.querySelector("[data-filter=systems]").click();
  assert.equal(document.querySelectorAll("[data-category]:not([hidden])").length, 2);
  assert.equal(document.querySelector(".publication-grid").hidden, true);
  assert.equal(document.querySelector("[data-filter=systems]").getAttribute("aria-pressed"), "true");
  document.querySelector("[data-filter=documents]").click();
  assert.equal(document.querySelector(".systems-publications").hidden, true);
  assert.equal(document.querySelector(".publication-grid").hidden, false);
  document.querySelector("[data-filter=all]").click();
  assert.equal(document.querySelectorAll("[data-category]:not([hidden])").length, 4);
  assert.equal(document.querySelector("#filter-status").textContent, "Showing 4 publications.");
});

test("mobile menu closes with Escape and section selection", (context) => {
  const window = createPage(context);
  const menu = window.document.querySelector(".menu-toggle");
  menu.click();
  assert.equal(menu.getAttribute("aria-expanded"), "true");
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
  assert.equal(menu.getAttribute("aria-expanded"), "false");
  assert.equal(window.document.activeElement, menu);
  menu.click();
  window.document.querySelector(".nav-link").click();
  assert.equal(menu.getAttribute("aria-expanded"), "false");
});

test("figure dialog loads the original image and explicitly handles Escape", (context) => {
  const window = createPage(context, {}, (browser) => {
    const dialog = browser.document.querySelector("dialog");
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
  });
  const document = window.document;
  document.querySelector("[data-lightbox]").click();
  const dialog = document.querySelector("dialog");
  assert.equal(dialog.open, true);
  assert.match(dialog.querySelector("img").src, /docatlas\.png$/);
  dialog.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(dialog.open, false);
});

test("projects require both the toggle and valid entries; content is text-safe", (context) => {
  const { document } = createPage(context, {
    showProjects: true,
    projects: [
      { title: "<b>Research tool</b>", description: "<img src=x>", url: "https://github.com/7-23nooboy" },
      { title: "Invalid URL", url: "javascript:alert(1)" }
    ]
  });
  assert.equal(document.querySelector("#projects").hidden, false);
  assert.equal(document.querySelector("[data-project-nav]").hidden, false);
  assert.equal(document.querySelectorAll(".project-item").length, 1);
  assert.equal(document.querySelector(".project-item h3").textContent, "<b>Research tool</b>");
  assert.equal(document.querySelector(".project-item b"), null);
});

test("empty projects and unsafe social URLs never produce clickable placeholders", (context) => {
  const { document } = createPage(context, { showProjects: true, projects: [], scholar: "javascript:alert(1)", linkedin: "" });
  assert.equal(document.querySelector("#projects").hidden, true);
  assert.equal(document.querySelector("[data-social=scholar]").hasAttribute("href"), false);
  assert.equal(document.querySelector("[data-social=linkedin]").hidden, true);
});

test("a personal photo replaces the placeholder only after loading", (context) => {
  const window = createPage(context, { photo: "assets/images/portrait.jpg" });
  const portrait = window.document.querySelector("[data-portrait]");
  const placeholder = window.document.querySelector(".portrait-placeholder");
  assert.equal(portrait.hidden, true);
  portrait.dispatchEvent(new window.Event("load"));
  assert.equal(portrait.hidden, false);
  assert.equal(placeholder.hidden, true);
  portrait.dispatchEvent(new window.Event("error"));
  assert.equal(portrait.hidden, true);
  assert.equal(placeholder.hidden, false);
});

test("copy email succeeds using the configured address", async (context) => {
  let copied;
  const window = createPage(context, {}, (browser) => {
    Object.defineProperty(browser.navigator, "clipboard", { value: { writeText: async (text) => { copied = text; } } });
  });
  await copyEmail(window);
  assert.equal(copied, window.SITE_CONFIG.email);
  assert.equal(window.document.querySelector("#copy-status").textContent, "Email copied!");
});

test("copy failure produces an accessible recovery message", async (context) => {
  const window = createPage(context, {}, (browser) => {
    Object.defineProperty(browser.navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } });
  });
  await copyEmail(window);
  assert.match(window.document.querySelector("#copy-status").textContent, /select the address/);
});