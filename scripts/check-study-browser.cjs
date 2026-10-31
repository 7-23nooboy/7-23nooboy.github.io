"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const root = path.resolve(__dirname, "..");
const screenshots = path.join(root, "screenshots", "study");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".ttf": "font/ttf", ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml" };

async function run() {
  fs.mkdirSync(screenshots, { recursive: true });
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname.split("/").some(part => part.startsWith(".") || part === "node_modules")) { response.writeHead(404).end(); return; }
    const relative = pathname.endsWith("/") ? pathname + "index.html" : pathname;
    const file = path.resolve(root, "." + relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + "/")) externalRequests.push(request.url()); });
  async function settle() { await page.evaluate(() => document.fonts.ready); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function navigate(route) {
    await page.goto(origin + "/study/" + route);
    await page.waitForFunction(() => Boolean(window.STUDY_APP));
    await settle();
  }
  async function layout(mobile) {
    return page.evaluate(isMobile => {
      const width = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > width + 1) throw new Error(`Page overflow ${document.documentElement.scrollWidth}/${width}: ${location.hash}`);
      const heading = document.querySelector("#reader h1");
      if (!heading || !heading.textContent.trim()) throw new Error("Missing article heading");
      if (window.STUDY_APP.errors.length) throw new Error("Math rendering failure");
      if (isMobile) {
        const navigation = document.querySelector(".view-tabs").getBoundingClientRect();
        if (Math.abs(navigation.bottom - innerHeight) > 2 || navigation.top < 100) throw new Error("Bottom navigation misplaced");
      }
      return { route: location.hash, width, title: heading.textContent };
    }, mobile);
  }
  try {
    await navigate("#/notes/data-01");
    await layout(false);
    await page.screenshot({ path: path.join(screenshots, "desktop-notes.png") });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const routes = await page.evaluate(() => [
      ...window.STUDY_DATA.notes.map(note => `#/notes/${note.id}`),
      ...window.STUDY_DATA.questions.map(question => `#/questions/${question.id}`),
      ...window.STUDY_DATA.papers.map(paper => `#/papers/${paper.id}`),
      ...window.STUDY_FORMULAS.map(formula => `#/formulas/${formula.id}`)
    ]);
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of routes) { await navigate(route); await layout(true); }
    console.log(`PASS ${routes.length} reader routes at 360px: no page overflow or math errors`);
    for (const width of [320, 390, 430, 768, 1365]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["#/formulas/scaling", "#/formulas/statistics", "#/questions/Q13", "#/papers/P20"]) { await navigate(route); await layout(width <= 720); }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate("#/formulas/compute");
    assert.equal(await page.locator('#reader input[type="number"], .tool-results').count(), 0);
    await page.screenshot({ path: path.join(screenshots, "mobile-formulas.png") });
    await navigate("#/questions/Q13");
    await page.getByRole("button", { name: "自测", exact: true }).click();
    assert.equal(await page.locator(".answer-panel").first().getAttribute("open"), null);
    await page.locator(".answer-panel > summary").nth(2).click();
    assert.ok(await page.locator(".answer-panel").nth(2).locator(".answer-content").isVisible());
    await page.locator("[data-bookmark]").click();
    await page.locator('[data-rating="known"]').click();
    await page.screenshot({ path: path.join(screenshots, "mobile-question.png") });
    await page.reload();
    assert.equal(await page.evaluate(() => window.STUDY_APP.snapshot().ratings.Q13), "known");
    assert.ok(await page.evaluate(() => window.STUDY_APP.snapshot().bookmarks.includes("questions:Q13")));
    await page.getByRole("button", { name: "搜索全部笔记、问题和文献" }).click();
    await page.getByRole("searchbox", { name: "搜索全部内容" }).fill("随机分母");
    assert.ok(await page.locator(".search-result").count() > 0);
    await page.getByRole("button", { name: "关闭搜索", exact: true }).click();
    await page.getByRole("button", { name: "问题目录", exact: true }).click();
    assert.ok(await page.locator("#catalog-dialog").isVisible());
    await page.locator("#mobile-filter").selectOption("evaluation");
    assert.equal(await page.locator("#mobile-catalog .catalog-item").count(), 6);
    if (await page.locator("#catalog-dialog").isVisible()) await page.getByRole("button", { name: "关闭目录", exact: true }).click();
    await context.setOffline(true);
    await navigate("#/formulas/ddp");
    assert.ok(await page.locator(".formula-symbols").isVisible());
    assert.equal(await page.locator(".katex-error").count(), 0);
    await layout(true);
    await page.screenshot({ path: path.join(screenshots, "mobile-offline.png") });
    await context.setOffline(false);
    await page.goto(origin + "/?lang=zh");
    await settle();
    await page.locator(".menu-toggle").click();
    await page.getByRole("link", { name: "研究笔记", exact: true }).click();
    await page.waitForURL("**/study/**");
    await page.waitForFunction(() => Boolean(window.STUDY_APP));
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    console.log("PASS mobile self-test, deep answers, persistent bookmarks/ratings, full-text search, catalog, offline reload, and bilingual homepage entry");
    console.log("PASS no external requests or uncaught browser errors; screenshots saved under ignored screenshots/study");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });