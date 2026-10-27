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
  "d": [139, 111, 90, 255],
  "c": [166, 181, 201, 255],
  "s": [115, 132, 156, 255],
  "l": [215, 225, 235, 255],
  "r": [208, 103, 128, 255],
  "t": [242, 117, 148, 255],
  "h": [255, 173, 189, 255]
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

async function generateSprite(name, rows, colors = palette) {
  const width = Math.max(...rows.map((row) => row.length));
  const height = rows.length;
  const pixels = Buffer.alloc(width * height * 4);
  rows.forEach((row, rowIndex) => {
    [...row].forEach((character, columnIndex) => {
      const color = colors[character];
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

function composePixels(width, height, layers) {
  const pixels = Array.from({ length: height }, () => Array(width).fill("."));
  for (const [left, top, rows] of layers) {
    rows.forEach((row, rowIndex) => {
      [...row].forEach((color, columnIndex) => {
        if (color === ".") return;
        const pixelX = left + columnIndex;
        const pixelY = top + rowIndex;
        if (!palette[color] || pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
          throw new Error("Invalid mascot pixel or layer bounds");
        }
        pixels[pixelY][pixelX] = color;
      });
    });
  }
  return pixels.map((row) => row.join(""));
}

async function generateWalkingCat() {
  const catPalette = {
    ...palette,
    "#": [99, 72, 56, 255],
    "c": [232, 165, 83, 255],
    "s": [192, 120, 59, 255],
    "l": [249, 207, 144, 255],
    "w": [255, 247, 229, 255],
    "p": [224, 138, 139, 255]
  };
  const body = [
    ".....########", "...##ccsccscc##", "..#cccllsllcccc#",
    ".#cccllsllsccccs#", "#ccccllllllcccss#", "#ccccllllllccsss#",
    "#cccclllwwwccsss#", ".#cccwwwwwwcss#", "..##cwwwwwcss#", "...##########"
  ];
  const head = [
    ".##......##", "#cc#....#cc#", "#cpc####cpc#", "#cccssscccc#",
    ".#clllllccc#", "#clllllccccc#", "#cllllkkcccc#", "#cllllwkcccww#",
    ".#clllccwwwwpk", "..#ccccwwww##", "...##wwww##", ".....####"
  ];
  const tail = [".###", "#sss#", "#scc#", ".#cc#", "..#cc#", "...#cc##", "....#ccc###", ".....##ccc#", ".......###"];
  const steps = [
    [[8, 24, ["#ss#", "#cc#", "#ww#", "####"]], [22, 24, ["#cc#", ".#cw#", "..#ww#", "..####"]]],
    [[10, 24, ["#cc#", "#ww#", "####"]], [21, 24, ["#cc#", "#cc#", "#ww#", "####"]]],
    [[11, 24, ["#cc#", ".#cw#", "..#ww#", "..####"]], [19, 24, ["#ss#", "#cc#", "#ww#", "####"]]],
    [[9, 24, ["#cc#", "#cc#", "#ww#", "####"]], [20, 24, ["#cc#", "#ww#", "####"]]]
  ];
  const frames = steps.map((legs, frame) => {
    const lift = frame % 2;
    return composePixels(32, 32, [[2, 12 - lift, tail], ...legs, [7, 15 - lift, body], [18, 6 - lift, head]]);
  });
  await generateSprite("cat-walk", Array.from({ length: 32 }, (_, row) => frames.map((frame) => frame[row]).join("")), catPalette);
  const frontHead = [
    ".##........##", "#cc#......#cc#", "#cpc#....#cpc#", "#cppc####cppc#",
    "#cccsccsccscc#", "#ccllsllsllcc#", "#cllllllllllc#", "#clkkllllkkll#",
    "#clkwllllwkll#", "#clkkllllkkll#", "#cppwwkkwwppc#", ".#cwwwpwwwwc#",
    "..#wwkwwkww#", "...##wwww##", ".....####"
  ];
  const frontBody = [
    "....####", "..##cccc##", ".#ccwwwccc#", "#cccwwwwccs#", "#cccwwwwcss#",
    "#cccwwwwcss#", ".#ccwwwwcs#", "..#cwwwwc#", "..#ww##ww#", "..#ww##ww#", "..########"
  ];
  await generateSprite("cat-front", composePixels(32, 32, [[4, 18, tail], [10, 17, frontBody], [9, 4, frontHead]]), catPalette);
}

async function generatePeekingDog() {
  const head = [
    "......########", "....##bbbbbbbb##", "...#ddbbwwbbbbdd#", "..#dddbwwwwbbbddd#",
    ".#dddblwwwwllbdddd#", ".#dddblwwwwllbdddd#", ".#ddbbkkwwwwkkbbdd#",
    "..#dbbkwlwwlwkbbd#", "..#bbbkkwwwwkkbbb#", "...#bbwwwwwwwwbb#",
    "....#wwwwkkwwww#", "....#wwwwkkwwww#", ".....#wwwddwww#", "......##wwww##", "........####"
  ];
  const paws = [".####......####", "#wwww#....#wwww#", "#wddw#....#wddw#", ".####......####"];
  const layers = [[6, 2, head], [8, 19, paws]];
  await generateSprite("dog-peek", composePixels(32, 24, layers));
  const tongue = [".kkkk.", "#thtt#", "#ttrt#", "#ttrt#", "#tttt#", ".#tt#.", "..##.."];
  await generateSprite("dog-tongue", composePixels(32, 24, [...layers, [14, 14, tongue]]));
  const restingPaw = [".####", "#wwww#", "#wddw#", ".####"];
  const raisedPaw = [".####.", "#wwww#", "#wpwp#", "#wppw#", ".#ww#.", "..##.."];
  const smile = ["wwwww", "wkwkw", "wwkww", "wwwww"];
  const poses = [
    [25, 5, ["....#bb#", "...#bb#.", "..#bb#..", ".#bb#...", "#bb#....", "#bb#....", ".##....."]],
    [24, 4, ["...#bb#.", "..#bb#..", "..#bb#..", ".#bb#...", "#bb#....", "#bb#....", ".##....."]],
    [23, 5, ["..#bb#..", "..#bb#..", "..#bb#..", ".#bb#...", "#bb#....", "#bb#....", ".##....."]],
    [24, 6, ["...#bb#.", "...#bb#.", "..#bb#..", ".#bb#...", "#bb#....", "#bb#....", ".##....."]]
  ];
  const waveFrames = poses.map(([pawLeft, pawTop, arm]) => composePixels(32, 24, [
    [6, 2, head],
    [12, 8, ["www", ".k.", "kwk"]],
    [18, 8, ["www", ".k.", "kwk"]],
    [14, 14, smile],
    [8, 19, restingPaw],
    [21, 12, arm],
    [pawLeft, pawTop, raisedPaw]
  ]));
  await generateSprite("dog-wave", Array.from({ length: 24 }, (_, row) => waveFrames.map((frame) => frame[row]).join("")));
}

async function main() {
  for (const [name, rows] of Object.entries(sprites)) await generateSprite(name, rows);
  await generateWalkingCat();
  await generatePeekingDog();
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