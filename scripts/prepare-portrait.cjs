const sharp = require("sharp");
const { resolve } = require("node:path");
const { stat } = require("node:fs/promises");

async function main() {
  const source = resolve(__dirname, "../assets/images/portrait.jpg");
  const destination = resolve(__dirname, "../assets/images/portrait.webp");
  const { data, info } = await sharp(source).autoOrient().toBuffer({ resolveWithObject: true });
  const cropWidth = Math.round(info.width * 0.60);
  const crop = {
    left: Math.round(info.width * 0.15),
    top: Math.round(info.height * 0.12),
    width: cropWidth,
    height: Math.round(cropWidth * 6 / 5)
  };
  if (crop.left + crop.width > info.width || crop.top + crop.height > info.height) {
    throw new Error("Portrait crop exceeds image bounds. Adjust the crop for the new photo.");
  }
  await sharp(data).extract(crop).resize(840, 1008).webp({ quality: 86, effort: 5 }).toFile(destination);
  const metadata = await sharp(destination).metadata();
  const size = await stat(destination);
  if (metadata.width !== 840 || metadata.height !== 1008 || metadata.exif) {
    throw new Error("Portrait dimensions or metadata validation failed.");
  }
  console.log(`Portrait prepared: ${metadata.width} x ${metadata.height}, ${Math.round(size.size / 1024)} KB, no EXIF.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});