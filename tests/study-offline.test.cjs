const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const root = resolve(__dirname, "../study");

test("offline manifest includes every entry script and stylesheet and only existing public assets", context => {
  const sandbox = { self: {} };
  vm.runInNewContext(readFileSync(resolve(root, "asset-manifest.js"), "utf8"), sandbox);
  const assets = sandbox.self.STUDY_ASSETS;
  const dom = new JSDOM(readFileSync(resolve(root, "index.html"), "utf8"));
  context.after(() => dom.window.close());
  for (const resource of dom.window.document.querySelectorAll("script[src],link[rel=stylesheet],link[rel=manifest]")) {
    const source = resource.getAttribute("src") || resource.getAttribute("href");
    assert.ok(assets.includes(source.startsWith("../") ? source : "./" + source), source);
  }
  assert.ok(assets.includes("./formulas.js"));
  assets.filter(asset => asset !== "./").forEach(asset => {
    assert.ok(existsSync(resolve(root, asset)), asset);
    assert.doesNotMatch(asset, /\.(pdf|zip)$/i);
  });
});

test("service worker serves the cached shell consistently and does not force activation", async () => {
  const handlers = {};
  const cachedResponse = { cached: true };
  const sandbox = {
    URL,
    importScripts() {},
    self: { STUDY_ASSET_VERSION: "test", STUDY_ASSETS: ["./index.html", "./app.js", "./formulas.js"], location: { href: "https://example.org/study/sw.js", origin: "https://example.org" }, addEventListener: (type, listener) => { handlers[type] = listener; }, clients: { claim: async () => {} } },
    caches: { open: async () => ({ match: async () => cachedResponse, addAll: async () => {} }), keys: async () => [] },
    fetch() { throw new Error("Network should not replace an available versioned shell"); }
  };
  vm.runInNewContext(readFileSync(resolve(root, "sw.js"), "utf8"), sandbox);
  let response;
  handlers.fetch({ request: { method: "GET", mode: "navigate", url: "https://example.org/study/" }, respondWith: promise => { response = promise; } });
  assert.equal(await response, cachedResponse);
  let intercepted = false;
  handlers.fetch({ request: { method: "GET", mode: "navigate", url: "https://example.org/study/not-a-page.pdf" }, respondWith() { intercepted = true; } });
  assert.equal(intercepted, false);
  assert.doesNotMatch(readFileSync(resolve(root, "sw.js"), "utf8"), /skipWaiting\(/);
});