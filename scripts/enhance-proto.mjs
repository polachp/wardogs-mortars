// Prototyp: digitální zpracování mapy — zaostření + zvýraznění baráků/silnic.
// Vyřízne patch kolem věží (ozeti) a vyrenderuje varianty + montáž pro srovnání.
// Run: node scripts/enhance-proto.mjs   → výstup public/data/maps/_proto/
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/data/maps/ozeti_full.webp"; // celý raster (před ořezem)
const OUT = "public/data/maps/_proto";
await mkdir(OUT, { recursive: true });

// full raster tileBounds (viz git před ořezem): -0.03..163.81 / -0.01..163.83
const tb = { minX: -0.03, maxX: 163.81, minY: -0.01, maxY: 163.83 };
const W = 8192,
  H = 8192;
// oblast věží (world units) + lem
const region = { minX: 90, maxX: 110, minY: 53, maxY: 73 };
const tbW = tb.maxX - tb.minX,
  tbH = tb.maxY - tb.minY;
const left = Math.round(((region.minX - tb.minX) / tbW) * W);
const right = Math.round(((region.maxX - tb.minX) / tbW) * W);
const top = Math.round(((tb.maxY - region.maxY) / tbH) * H);
const bottom = Math.round(((tb.maxY - region.minY) / tbH) * H);
const cw = right - left,
  ch = bottom - top;

const base = () =>
  sharp(SRC).extract({ left, top, width: cw, height: ch });

// baseline patch
const orig = await base().webp({ quality: 92 }).toBuffer();

// A) unsharp mask + kontrast — klasické zaostření
const sharpen = await base()
  .sharpen({ sigma: 1.6, m1: 1.2, m2: 2.5 })
  .linear(1.15, -18)
  .webp({ quality: 92 })
  .toBuffer();

// B) CLAHE — lokální kontrast, vytáhne struktury (baráky/pole) bez přepalu
const clahe = await base()
  .clahe({ width: 128, height: 128, maxSlope: 3 })
  .sharpen({ sigma: 1.0 })
  .webp({ quality: 92 })
  .toBuffer();

// C) CLAHE + gamma + silnější doostření — kombo
const combo = await base()
  .clahe({ width: 96, height: 96, maxSlope: 4 })
  .gamma(1.15)
  .sharpen({ sigma: 1.4, m1: 1.5, m2: 3 })
  .linear(1.12, -12)
  .webp({ quality: 92 })
  .toBuffer();

// D) high-pass edge boost — zvýrazní hrany (obrysy baráků, silnice)
//   3x3 laplacián přimíchaný přes unsharp; převedeme na tmavé linky
const edgesRaw = await base()
  .greyscale()
  .convolve({
    width: 3,
    height: 3,
    // mírný sharpen/high-pass kernel
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  })
  .png() // roundtrip → zpět na uchar, aby clahe prošlo
  .toBuffer();
const edges = await sharp(edgesRaw)
  .clahe({ width: 128, height: 128, maxSlope: 3 })
  .webp({ quality: 92 })
  .toBuffer();

// E) normalise + median (odšumění) + sharpen — čistší podklad
const clean = await base()
  .median(3)
  .normalise()
  .sharpen({ sigma: 1.3, m1: 1.3, m2: 2.2 })
  .webp({ quality: 92 })
  .toBuffer();

// F) MIX C+E: median odšum → mírné CLAHE → sharpen → jemný kontrast.
//    Baráky/silnice jasné, nízký šum ve vegetaci. = kandidát na finální.
const mix = await base()
  .median(3) // odšum stromového speklu
  .clahe({ width: 112, height: 112, maxSlope: 3 }) // mírný lokální kontrast
  .sharpen({ sigma: 1.3, m1: 1.3, m2: 2.4 })
  .linear(1.1, -10)
  .webp({ quality: 92 })
  .toBuffer();

const tiles = [
  ["orig", orig],
  ["C_combo", combo],
  ["E_clean", clean],
  ["F_mix", mix],
];

// ulož jednotlivé
for (const [name, buf] of tiles)
  await sharp(buf).toFile(`${OUT}/ozeti_towers_${name}.webp`);

// montáž 3x2, každý zmenšený na 520 px, s popiskem
const T = 620;
const cols = 2,
  rows = 2,
  pad = 8,
  labelH = 22;
const cellW = T + pad,
  cellH = T + labelH + pad;
const mW = cols * cellW + pad,
  mH = rows * cellH + pad;

const composites = [];
for (let i = 0; i < tiles.length; i++) {
  const [name, buf] = tiles[i];
  const col = i % cols,
    row = (i / cols) | 0;
  const x = pad + col * cellW,
    y = pad + row * cellH;
  const img = await sharp(buf).resize(T, T, { fit: "cover" }).toBuffer();
  const label = Buffer.from(
    `<svg width="${T}" height="${labelH}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" fill="#7dd3fc" font-family="monospace" font-size="14">${name}</text></svg>`
  );
  composites.push({ input: label, left: x, top: y });
  composites.push({ input: img, left: x, top: y + labelH });
}

await sharp({
  create: { width: mW, height: mH, channels: 3, background: "#000" },
})
  .composite(composites)
  .webp({ quality: 90 })
  .toFile(`${OUT}/_montage.webp`);

console.log(
  `patch ${cw}x${ch} @ (${left},${top}) → ${OUT}/_montage.webp + ${tiles.length} variant`
);
