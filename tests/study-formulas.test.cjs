const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const formulas = require("../study/formulas.js");
const createRenderer = require("../study/render.js");

test("formula chapters contain definitions, derivations and scope without calculators", context => {
  assert.equal(formulas.length, 12);
  assert.equal(new Set(formulas.map(item => item.id)).size, 12);
  const dom = new JSDOM("");
  context.after(() => dom.window.close());
  const renderer = createRenderer({ markdownit: require("markdown-it"), texmath: require("markdown-it-texmath"), katex: require("katex"), purifier: require("dompurify")(dom.window) });
  formulas.forEach(item => {
    assert.ok(item.symbols.length >= 3);
    assert.ok(item.body.includes("### 1."));
    assert.ok(item.body.includes("### 3."));
    assert.ok(item.boundary.length > 30);
    assert.match(renderer.render(item.body), /class="katex"/);
    item.symbols.forEach(([symbol]) => renderer.render(symbol));
    assert.doesNotMatch(item.body, /<input|<form|onclick=/i);
  });
  assert.deepEqual(renderer.errors, []);
});

test("formula examples retain the corrected counting and probability boundaries", () => {
  assert.ok(formulas.find(item => item.id === "mixture").boundary.includes("有限batch"));
  assert.ok(formulas.find(item => item.id === "ddp").boundary.includes("总体token风险无偏"));
  assert.ok(formulas.find(item => item.id === "statistics").body.includes("IUT"));
  assert.ok(formulas.find(item => item.id === "cvar").body.includes("权重上界"));
  assert.equal((1 - 56 / 120).toFixed(4), "0.5333");
  assert.equal(Math.round((1.96 + .84) ** 2 * .2 / .02 ** 2), 3920);
});