const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const createRenderer = require("../study/render.js");
const root = resolve(__dirname, "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, "study/data.js"), "utf8"), sandbox);
const data = JSON.parse(JSON.stringify(sandbox.window.STUDY_DATA));

function renderer(context) {
  const dom = new JSDOM("");
  context.after(() => dom.window.close());
  return createRenderer({ markdownit: require("markdown-it"), texmath: require("markdown-it-texmath"), katex: require("katex"), purifier: require("dompurify")(dom.window) });
}

test("public dataset contains complete chapters, answers and official references", () => {
  assert.equal(data.notes.length, 63);
  assert.equal(data.questions.length, 48);
  assert.equal(data.papers.length, 22);
  assert.equal(data.library.filter(item => item.type === "paper").length, 49);
  data.questions.forEach((item, index) => {
    assert.equal(item.id, "Q" + String(index + 1).padStart(2, "0"));
    assert.equal(item.deep.length, 2);
    assert.ok(item.answer.length > 30);
    assert.ok(item.deep.every(deep => deep.answer.length > 70));
  });
  assert.ok(data.evidenceGuide.includes("不是可靠性评级"));
  assert.ok(data.papers.find(item => item.id === "P06").body.includes("Docling"));
  assert.ok(data.papers.find(item => item.id === "P17").body.includes("63.5"));
  assert.ok(data.notes.find(item => item.id === "data-03").body.includes("T_s>0"));
  assert.ok(data.library.every(item => /^https:\/\//.test(item.source)));
});

test("every published equation can be rendered without KaTeX errors", context => {
  const view = renderer(context);
  const fragments = [
    ...data.notes.map(item => item.body), ...data.papers.map(item => item.body),
    ...data.questions.flatMap(item => [item.answer, item.pitfalls, ...item.deep.flatMap(deep => [deep.question, deep.answer])])
  ];
  let equationCount = 0;
  fragments.forEach(fragment => {
    const html = view.render(fragment);
    equationCount += (html.match(/class="katex"/g) || []).length;
    assert.doesNotMatch(html, /<script|javascript:|<iframe/i);
  });
  assert.deepEqual(view.errors, []);
  assert.ok(equationCount > 100, `Only ${equationCount} rendered equations`);
});

test("renderer treats HTML as text and blocks script links", context => {
  const view = renderer(context);
  const html = view.render('<img src=x onerror=alert(1)> [unsafe](javascript:alert(1))\n\n$\\href{javascript:alert(1)}{x}$');
  const dom = new JSDOM(html);
  context.after(() => dom.window.close());
  assert.equal(dom.window.document.querySelector("img,script,iframe,[onerror]"), null);
  assert.equal(dom.window.document.querySelector('a[href^="javascript:"]'), null);
});

test("reader routes replace local document paths and no binary document is shipped", () => {
  const serialized = JSON.stringify(data);
  assert.doesNotMatch(serialized, /[A-Z]:\\Users\\|\]\(\.\.\/|\]\([^)]*\.md\)/i);
  assert.doesNotMatch(serialized, /\bfile:\/\/|blob:|data:application\/pdf/i);
  function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(directory, entry.name)) : [entry.name]);
  }
  assert.ok(files(resolve(root, "study")).every(name => !/\.(pdf|zip|tex|txt\.pdf)$/i.test(name)));
});