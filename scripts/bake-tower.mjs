// Bake tower marker: white silhouette + thick black outline on dark disc.
// One static webp → no runtime CSS filters → smooth zoom.
// Run: node scripts/bake-tower.mjs
import sharp from "sharp";
import { readFile, writeFile, copyFile, access } from "node:fs/promises";

const SRC = "public/assets/map-markers/tower.webp";
const RAW = "public/assets/map-markers/tower_raw.webp"; // záloha originálu
const OUT = SRC;

const N = 256; // master rozlišení (crisp při zoomu)
const OUTLINE = 16; // tloušťka obrysu v master px
const DISC_R = 120; // poloměr tmavého disku
const PAD = 8; // okraj kolem siluety uvnitř disku

// zachovej originál jednou
try {
  await access(RAW);
} catch {
  await copyFile(SRC, RAW);
}

const srcBuf = await readFile(RAW);

// silueta zvětšená, vycentrovaná; necháme prostor pro disk
const glyph = await sharp(srcBuf)
  .resize(N - DISC_R - PAD, N - DISC_R - PAD, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .extend({
    top: (DISC_R + PAD) / 2,
    bottom: (DISC_R + PAD) / 2,
    left: (DISC_R + PAD) / 2,
    right: (DISC_R + PAD) / 2,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .ensureAlpha()
  .png()
  .toBuffer();

// alpha maska siluety
const alpha = await sharp(glyph).extractChannel("alpha").toBuffer();
const meta = await sharp(glyph).metadata();
const W = meta.width,
  H = meta.height;

// černá silueta (obrys) = alpha vybarvená černě
async function tinted(hex) {
  return sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: hex,
    },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

const black = await tinted({ r: 0, g: 0, b: 0 });
const white = await tinted({ r: 255, g: 255, b: 255 });

// obrys = černá silueta poskládaná v 8 směrech (dilatace)
const dirs = [];
const d = OUTLINE;
const dd = Math.round(d * 0.7);
[
  [d, 0],
  [-d, 0],
  [0, d],
  [0, -d],
  [dd, dd],
  [-dd, dd],
  [dd, -dd],
  [-dd, -dd],
].forEach(([dx, dy]) => dirs.push({ input: black, left: dx, top: dy }));

// tmavý disk podklad (SVG)
const disc = Buffer.from(
  `<svg width="${W}" height="${H}"><circle cx="${W / 2}" cy="${H / 2}" r="${DISC_R}" fill="rgba(0,0,0,0.6)" stroke="rgba(0,0,0,0.85)" stroke-width="4"/></svg>`
);

// finální kompozit: disk → obrys → bílá silueta
const baked = await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: disc },
    ...dirs,
    { input: white },
  ])
  .webp({ quality: 95, alphaQuality: 100 })
  .toBuffer();

await writeFile(OUT, baked);
console.log(`baked ${OUT} @ ${W}x${H} (raw kept at ${RAW})`);
