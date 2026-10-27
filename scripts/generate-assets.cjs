const sharp = require("sharp");
const { resolve } = require("node:path");
const { stat } = require("node:fs/promises");

const images = resolve(__dirname, "../assets/images");
const palette = {
  ".": [0, 0, 0, 0],
  "#": [75, 84, 76, 255],
  "g": [160, 170, 157, 255],
  "w": [244, 244, 230, 255],
  "p": [195, 131, 121, 255],
  "k": [49, 56, 49, 255],
  "b": [187, 153, 124, 255],
  "d": [139, 111, 90, 255]
};

const sprites = {
  cat: [
    "........................",
    ".....##.......##........",
    ".....#g#.....#g#........",
    ".....#pg#####gp#........",
    ".....#ggggggggg#........",
    "....#ggggggggggg#.......",
    "....#ggkgggggkgg#.......",
    "....#ggggwpwgggg#.......",
    ".....#gggwwwggg#........",
    "......###ggg###.........",
    "...##...#ggggg#.........",
    "..#gg#..#gggwgg#........",
    "..#gg#.#gggwwwgg#.......",
    "...#gg##gggwwwgg#.......",
    "....#ggggggwwwgg#.......",
    ".....####ggwwwgg#.......",
    "........#gg###gg#.......",
    "........####.####.......",
    "........................",
    "........................"
  ],
  dog: [
    "........................",
    ".......########.........",
    "......#ddbbbbbdd#........",
    ".....#dddbwwbbddd#.......",
    ".....#ddbbwwbbbdd#.......",
    ".....#dbkbwwbkbdd#.......",
    "......#bbwwwbbbdd#.......",
    "......#bbwkwwbb##........",
    ".......#wwpww#..........",
    "........##b##......##...",
    ".......#bbbbb#....#bb#..",
    "......#bbbwwbb#..#bb#...",
    "......#bbbwwbb###bb#....",
    "......#bbbwwbbbbbb#.....",
    "......#bbbwwbb####......",
    "......#bbbwwbb#.........",
    "......#bb###bb#.........",
    "......####.####.........",
    "........................",
    "........................"
  ]
};

async function generateSprite(name, rows) {
  const width = Math.max(...rows.map((row) => row.length));
  const height = rows.length;
  const pixels = Buffer.alloc(width * height * 4);
  rows.forEach((row, rowIndex) => {
    [...row].forEach((character, columnIndex) => {
      const color = palette[character];
      if (!color) throw new Error(`Unknown pixel color: ${character}`);
      pixels.set(color, (rowIndex * width + columnIndex) * 4);
    });
  });
  const destination = resolve(images, `pixel-${name}.png`);
  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .resize(width * 3, height * 3, { kernel: "nearest" })
    .png({ palette: true })
    .toFile(destination);
  const metadata = await sharp(destination).metadata();
  if (!metadata.hasAlpha || metadata.width !== width * 3) throw new Error(`Invalid sprite: ${name}`);
  console.log(`Generated pixel-${name}.png (${metadata.width} x ${metadata.height})`);
}

async function main() {
  for (const [name, rows] of Object.entries(sprites)) await generateSprite(name, rows);
  for (const name of ["docatlas", "xl-docbench", "triooo", "wavecc"]) {
    const destination = resolve(images, `${name}-preview.webp`);
    await sharp(resolve(images, `${name}.png`)).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 87, effort: 5 }).toFile(destination);
    const size = await stat(destination);
    console.log(`Generated ${name}-preview.webp (${Math.round(size.size / 1024)} KB)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});