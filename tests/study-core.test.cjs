const assert = require("node:assert/strict");
const { test } = require("node:test");
const core = require("../study/core.js");

const fixture = {
  books: [{ id: "data", title: "数据理论" }],
  notes: [{ id: "data-01", book: "data", title: "随机分母", body: "有限样本的比值期望不同。" }],
  questions: [{ id: "Q13", title: "配比怎样计算", answer: "关注累计token", pitfalls: "忽略期望", deep: [{ question: "分母条件", answer: "重要性采样不是自动无偏" }] }],
  papers: [{ id: "P01", body: "代理模型排序" }],
  library: [{ id: "P01", title: "DataDecide" }]
};

test("study routes reject unexpected views and unsafe identifiers", () => {
  assert.deepEqual(core.parseRoute("#/notes/data-01"), { view: "notes", id: "data-01" });
  assert.deepEqual(core.parseRoute("#/tools/compute"), { view: "formulas", id: "compute" });
  assert.deepEqual(core.parseRoute("#/formulas"), { view: "formulas", id: "compute" });
  assert.equal(core.parseRoute("#/notes/<script>").id, "");
  assert.equal(core.safeSource("javascript:alert(1)"), null);
  assert.equal(core.safeSource("file:///private"), null);
  assert.equal(core.safeSource("https://arxiv.org/abs/2504.11393"), "https://arxiv.org/abs/2504.11393");
});

test("study search includes both deep answers and article prose", () => {
  const index = core.makeSearchIndex(fixture);
  assert.equal(core.search(index, "重要性 采样")[0].id, "Q13");
  assert.equal(core.search(index, "随机分母")[0].id, "data-01");
  assert.equal(core.search(index, "ｄａｔａｄｅｃｉｄｅ")[0].id, "P01");
  assert.equal(core.search(index, "").length, 0);
  assert.equal(core.search(index, "完全没有的词").length, 0);
});

test("saved state only retains known IDs and bounded settings", () => {
  const state = core.cleanState({ bookmarks: ["notes:data-01", "notes:data-01", "notes:bad"], read: ["data-01", "bad"], ratings: { Q13: "known", Q99: "known" }, scroll: { "notes:data-01": 120, "notes:bad": 12 }, font: "huge", lastRoute: "javascript:bad" }, fixture);
  assert.deepEqual(state.bookmarks, ["notes:data-01"]);
  assert.deepEqual(state.ratings, { Q13: "known" });
  assert.deepEqual(state.read, ["data-01"]);
  assert.equal(state.font, "medium");
  assert.equal(state.lastRoute, "#/notes/data-01");
  assert.deepEqual(core.cleanState(null, fixture).ratings, {});
});