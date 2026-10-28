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
  for (const name of ["cat-walk", "cat-front", "cat-groom"]) {
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

test("cat grooming lowers its head toward a stationary paw without an extended tongue", async () => {
  const image = readFileSync(resolve(__dirname, "../assets/images/pixel-cat-groom.png"));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.width, 576);
  assert.equal(metadata.height, 96);
  assert.equal(metadata.hasAlpha, true);
  const frameHashes = new Set();
  const headHashes = new Set();
  const bodyHashes = new Set();
  const pawHashes = new Set();
  const headTopRows = [];
  const tonguePixels = [];
  for (let frame = 0; frame < 6; frame++) {
    const pixels = await sharp(image).extract({ left: frame * 96, top: 0, width: 96, height: 96 }).ensureAlpha().raw().toBuffer();
    assert.ok(pixels.some((value, index) => index % 4 === 3 && value > 0));
    frameHashes.add(createHash("sha256").update(pixels).digest("hex"));
    const head = await sharp(image).extract({ left: frame * 96, top: 0, width: 96, height: 33 }).ensureAlpha().raw().toBuffer();
    headHashes.add(createHash("sha256").update(head).digest("hex"));
    const body = await sharp(image).extract({ left: frame * 96, top: 75, width: 96, height: 21 }).ensureAlpha().raw().toBuffer();
    bodyHashes.add(createHash("sha256").update(body).digest("hex"));
    const paw = await sharp(image).extract({ left: frame * 96 + 57, top: 57, width: 9, height: 9 }).ensureAlpha().raw().toBuffer();
    pawHashes.add(createHash("sha256").update(paw).digest("hex"));
    const firstOpaque = head.findIndex((value, index) => index % 4 === 3 && value > 0);
    headTopRows.push(Math.floor(firstOpaque / 4 / 96));
    let pinkCount = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 255 && (
        (pixels[offset] === 242 && pixels[offset + 1] === 117 && pixels[offset + 2] === 148) ||
        (pixels[offset] === 255 && pixels[offset + 1] === 173 && pixels[offset + 2] === 189)
      )) pinkCount++;
    }
    tonguePixels.push(pinkCount);
  }
  assert.equal(frameHashes.size, 6);
  assert.equal(headHashes.size, 6);
  assert.equal(bodyHashes.size, 1);
  assert.equal(pawHashes.size, 1);
  assert.deepEqual(headTopRows, [12, 15, 18, 21, 18, 15]);
  assert.deepEqual(tonguePixels, [0, 0, 0, 0, 0, 0]);
});

test("dog greeting has four distinct raised-paw frames with a stationary resting paw", async () => {
  const image = readFileSync(resolve(__dirname, "../assets/images/pixel-dog-wave.png"));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.width, 384);
  assert.equal(metadata.height, 72);
  assert.equal(metadata.hasAlpha, true);
  const pawHashes = new Set();
  const restingPaw = await sharp(resolve(__dirname, "../assets/images/pixel-dog-peek.png"))
    .extract({ left: 24, top: 57, width: 18, height: 12 }).ensureAlpha().raw().toBuffer();
  for (let frame = 0; frame < 4; frame++) {
    const raised = await sharp(image).extract({ left: frame * 96 + 69, top: 12, width: 24, height: 24 }).ensureAlpha().raw().toBuffer();
    assert.ok(raised.some((value, index) => index % 4 === 3 && value > 0));
    pawHashes.add(createHash("sha256").update(raised).digest("hex"));
    const resting = await sharp(image).extract({ left: frame * 96 + 24, top: 57, width: 18, height: 12 }).ensureAlpha().raw().toBuffer();
    assert.deepEqual(resting, restingPaw);
  }
  assert.equal(pawHashes.size, 4);
});