const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const vendor = path.join(root, "study", "vendor");
const files = [
  ["markdown-it/dist/browser/markdown-it.umd.min.js", "markdown-it.min.js"],
  ["markdown-it/LICENSE", "markdown-it-LICENSE.txt"],
  ["markdown-it-texmath/texmath.js", "texmath.js"],
  ["markdown-it-texmath/license.txt", "texmath-LICENSE.txt"],
  ["dompurify/dist/purify.min.js", "purify.min.js"],
  ["dompurify/LICENSE", "dompurify-LICENSE.txt"],
  ["katex/dist/katex.min.js", "katex/katex.min.js"],
  ["katex/dist/katex.min.css", "katex/katex.min.css"],
  ["katex/LICENSE", "katex-LICENSE.txt"]
];

for (const [source, destination] of files) {
  const target = path.join(vendor, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, "node_modules", source), target);
  if (destination === "texmath.js") fs.appendFileSync(target, "\nif (typeof globalThis === 'object') globalThis.texmath = texmath;\n", "utf8");
}
fs.cpSync(path.join(root, "node_modules", "katex", "dist", "fonts"), path.join(vendor, "katex", "fonts"), { recursive: true });

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? listFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}

async function finish() {
  const study = path.join(root, "study");
  for (const size of [192, 512]) {
    await sharp(path.join(root, "assets", "images", "portrait.webp")).resize(size, size, { fit: "cover", position: "north" }).png().toFile(path.join(study, `icon-${size}.png`));
  }
  const assets = ["./", ...listFiles(study)
    .filter(file => /\.(?:html|js|css|woff2?|ttf|png|webmanifest)$/.test(file) && !["sw.js", "asset-manifest.js"].includes(path.basename(file)))
    .map(file => "./" + path.relative(study, file).replaceAll("\\", "/")),
    "../assets/vendor/lucide.min.js", "../assets/fonts/dm-sans.ttf", "../assets/fonts/bricolage-grotesque.ttf", "../assets/images/portrait.webp"
  ].sort();
  const hash = crypto.createHash("sha256");
  for (const asset of assets) if (asset !== "./") hash.update(asset).update(fs.readFileSync(path.resolve(study, asset)));
  const version = hash.digest("hex").slice(0, 16);
  fs.writeFileSync(path.join(study, "asset-manifest.js"), `self.STUDY_ASSET_VERSION = ${JSON.stringify(version)};\nself.STUDY_ASSETS = ${JSON.stringify(assets, null, 2)};\n`, "utf8");
  console.log(`Prepared public rendering libraries, icons and ${assets.length} offline assets (${version}).`);
}

finish().catch(error => { console.error(error); process.exitCode = 1; });