const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const sharp = require("sharp");

test("walking cat has four distinct, nonblank frames with stable dimensions", async () => {
  const image = readFileSync(resolve(__dirname, "../assets/images/pixel-cat-walk.png"));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.width, 384);
  assert.equal(metadata.height, 96);
  assert.equal(metadata.hasAlpha, true);
  const hashes = new Set();
  for (let frame = 0; frame < 4; frame++) {
    const pixels = await sharp(image).extract({ left: frame * 96, top: 0, width: 96, height: 96 }).ensureAlpha().raw().toBuffer();
    assert.ok(pixels.some((value, index) => index % 4 === 3 && value > 0));
    hashes.add(createHash("sha256").update(pixels).digest("hex"));
  }
  assert.equal(hashes.size, 4);
});

test("front-facing cat and dog hover expressions are valid distinct transparent sprites", async () => {
  const hashes = new Set();
  for (const [name, height] of [["cat-front", 96], ["dog-peek", 72], ["dog-tongue", 72]]) {
    const image = readFileSync(resolve(__dirname, `../assets/images/pixel-${name}.png`));
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width, 96);
    assert.equal(metadata.height, height);
    assert.equal(metadata.hasAlpha, true);
    hashes.add(createHash("sha256").update(image).digest("hex"));
  }
  assert.equal(hashes.size, 3);
});

test("walking and front-facing cats share orange tabby fur and white markings", async () => {
  for (const name of ["cat-walk", "cat-front"]) {
    const pixels = await sharp(resolve(__dirname, `../assets/images/pixel-${name}.png`)).ensureAlpha().raw().toBuffer();
    const colors = new Set();
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] > 0) colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
    }
    assert.ok(colors.has("232,165,83"), `${name}: orange fur`);
    assert.ok(colors.has("192,120,59"), `${name}: tabby stripes`);
    assert.ok(colors.has("255,247,229"), `${name}: white markings`);
    assert.ok(!colors.has("166,181,201"), `${name}: no old gray-blue fur`);
  }
});