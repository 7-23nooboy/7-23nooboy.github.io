const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { JSDOM } = require("jsdom");
const root = resolve(__dirname, "..");

test("XYZ AI Lab uses the local official wordmark and links to the verified website", (context) => {
  const dom = new JSDOM(readFileSync(resolve(root, "index.html"), "utf8"));
  context.after(() => dom.window.close());
  const link = dom.window.document.querySelector(".xyz-mark");
  assert.equal(link.getAttribute("href"), "https://xyz-lab.ai/");
  assert.equal(link.querySelector("img").getAttribute("src"), "assets/images/xyz-ai-lab.svg");
  assert.equal(link.querySelector("img").alt, "XYZ AI Lab");
  assert.match(readFileSync(resolve(root, "assets/images/xyz-ai-lab.svg"), "utf8"), /<svg/);
});

test("ICT publications and project are categorized as AI4S accelerator-chip research in both languages", (context) => {
  const dom = new JSDOM(readFileSync(resolve(root, "index.html"), "utf8"), {
    runScripts: "outside-only",
    url: "https://7-23nooboy.github.io/"
  });
  context.after(() => dom.window.close());
  for (const script of ["site.config.js", "scripts/i18n.js", "scripts/main.js"]) {
    dom.window.eval(readFileSync(resolve(root, script), "utf8"));
  }
  const document = dom.window.document;
  for (const language of ["en", "zh"]) {
    document.querySelector(`[data-language=${language}]`).click();
    document.querySelector("[data-filter=systems]").click();
    assert.match(document.querySelector("[data-filter=systems]").textContent, /AI4S/);
    assert.equal(document.querySelectorAll("[data-category]:not([hidden])").length, 2);
    for (const paper of document.querySelectorAll("[data-category=systems]")) {
      assert.match(paper.querySelector(".paper-description").textContent, /AI4S/);
      assert.match(paper.querySelector(".paper-description").textContent, language === "zh" ? /芯片/ : /chip/);
    }
    assert.match(document.querySelector(".research-footnote").textContent, /AI4S/);
    assert.match(document.querySelector(".bio").textContent, /AI4S/);
  }
});

test("all four papers have distinct local figures and accurate public-resource states", (context) => {
  const dom = new JSDOM(readFileSync(resolve(root, "index.html"), "utf8"), { runScripts: "outside-only", url: "https://7-23nooboy.github.io/" });
  context.after(() => dom.window.close());
  for (const script of ["site.config.js", "scripts/i18n.js", "scripts/main.js"]) dom.window.eval(readFileSync(resolve(root, script), "utf8"));
  const document = dom.window.document;
  for (const language of ["en", "zh", "en"]) {
    document.querySelector(`[data-language=${language}]`).click();
    for (const name of ["docatlas", "xl-docbench", "triooo", "wavecc"]) {
      const article = document.getElementById(name);
      assert.equal(article.querySelector("[data-lightbox]").getAttribute("href"), `assets/images/${name}.png`);
      assert.equal(article.querySelector(".publication-image img").getAttribute("src"), `assets/images/${name}-preview.webp`);
      assert.ok(readFileSync(resolve(root, `assets/images/${name}.png`)).length > 1000);
      assert.ok(article.querySelector(".contribution summary"));
    }
    assert.match(document.querySelector("#triooo .paper-subtitle").textContent, language === "zh" ? /可扩展/ : /Extensible DSA/);
    assert.match(document.querySelector("#wavecc .paper-subtitle").textContent, language === "zh" ? /信用引导/ : /Credit-Guided/);
    assert.match(document.querySelector("#triooo .paper-availability").textContent, language === "zh" ? /尚未公开/ : /not yet public/);
    assert.equal(document.querySelector("#triooo .paper-links"), null);
    assert.equal(document.querySelector("#wavecc .paper-links a").href, "https://doi.org/10.1145/3789240.3829210");
    assert.equal(document.querySelector("#wavecc .publication-type").textContent, language === "zh" ? "会议论文" : "Conference paper");
    assert.match(document.querySelector("#triooo .contribution p").textContent, language === "zh" ? /验证数据集/ : /validation datasets/);
    assert.match(document.querySelector("#wavecc .contribution p").textContent, /BookSim2/);
    assert.equal(document.querySelector("#wavecc .authors strong").textContent, "Yuanzhe Wang");
    assert.ok(document.querySelector("#wavecc .figure-credit a[href='https://creativecommons.org/licenses/by/4.0/']"));
  }
});