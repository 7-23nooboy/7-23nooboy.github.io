const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const sharp = require("sharp");

const context = {};
runInNewContext(readFileSync(resolve(__dirname, "../site.config.js"), "utf8"), context);
const config = context.SITE_CONFIG;

test("verified contact details are available", () => {
  assert.equal(config.email, "wangyuanzhe@mail.ustc.edu.cn");
  assert.equal(new URL(config.github).hostname, "github.com");
});

test("the supplied academic and professional profiles are configured", () => {
  assert.equal(new URL(config.scholar).searchParams.get("user"), "UEgGSPEAAAAJ");
  assert.equal(new URL(config.linkedin).hostname, "www.linkedin.com");
  assert.ok(decodeURIComponent(config.linkedin).endsWith("\u5143\u5586-\u6c6a-b8793b35b"));
});

test("the configured portrait is optimized and contains no EXIF", async () => {
  assert.equal(config.photo, "assets/images/portrait.webp");
  const image = readFileSync(resolve(__dirname, "..", config.photo));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.width, 840);
  assert.equal(metadata.height, 1008);
  assert.equal(metadata.exif, undefined);
  assert.ok(image.length < 300 * 1024);
});

test("CV and unpublished projects remain optional", () => {
  assert.equal(config.cv, "");
  assert.equal(config.showProjects, false);
  assert.equal(config.projects.length, 0);
});