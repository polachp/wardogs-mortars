// Ořízne mapový raster na hratelnou oblast (+margin) → menší GPU textura,
// méně dekódování, plynulejší zoom. Zbytek mapy (hory mimo červený box)
// nikoho nezajímá. Aktualizuje tileBounds v JSONu, aby markery/zóny seděly.
// Run: node scripts/crop-maps.mjs
import sharp from "sharp";
import { readFile, writeFile, copyFile, access } from "node:fs/promises";

const MAPS = ["ozeti", "zestafona", "bakurani"];
const MARGIN = 0.06; // 6 % šířky/výšky hratelné oblasti jako lem kolem

for (const id of MAPS) {
  const jsonPath = `public/data/maps/${id}.json`;
  const webPath = `public/data/maps/${id}.webp`;
  const rawPath = `public/data/maps/${id}_full.webp`; // záloha celého rastru

  const cfg = JSON.parse(await readFile(jsonPath, "utf8"));
  const tb = cfg.tileBounds; // rozsah rastru (world units)
  const b = cfg.bounds; // hratelná oblast (world units)

  // záloha originálu jednou
  try {
    await access(rawPath);
  } catch {
    await copyFile(webPath, rawPath);
  }

  const src = sharp(rawPath);
  const meta = await src.metadata();
  const W = meta.width,
    H = meta.height;

  const tbW = tb.maxX - tb.minX;
  const tbH = tb.maxY - tb.minY;
  const pw = b.maxX - b.minX;
  const ph = b.maxY - b.minY;

  // crop region v world units = hratelná oblast + lem, clamp do rastru
  const cMinX = Math.max(tb.minX, b.minX - pw * MARGIN);
  const cMaxX = Math.min(tb.maxX, b.maxX + pw * MARGIN);
  const cMinY = Math.max(tb.minY, b.minY - ph * MARGIN);
  const cMaxY = Math.min(tb.maxY, b.maxY + ph * MARGIN);

  // world → pixel. Obraz: top = maxY, left = minX (y invertované).
  const left = Math.round(((cMinX - tb.minX) / tbW) * W);
  const right = Math.round(((cMaxX - tb.minX) / tbW) * W);
  const top = Math.round(((tb.maxY - cMaxY) / tbH) * H);
  const bottom = Math.round(((tb.maxY - cMinY) / tbH) * H);
  const cw = right - left;
  const ch = bottom - top;

  await src
    .extract({ left, top, width: cw, height: ch })
    .webp({ quality: 90 })
    .toFile(webPath + ".tmp");
  await copyFile(webPath + ".tmp", webPath);
  await (await import("node:fs/promises")).unlink(webPath + ".tmp");

  // nové tileBounds = crop region (přesně world souřadnice ořezu)
  cfg.tileBounds = {
    minX: +cMinX.toFixed(3),
    maxX: +cMaxX.toFixed(3),
    minY: +cMinY.toFixed(3),
    maxY: +cMaxY.toFixed(3),
  };
  await writeFile(jsonPath, JSON.stringify(cfg, null, 2) + "\n");

  const pct = ((cw * ch) / (W * H) * 100).toFixed(0);
  console.log(
    `${id}: ${W}x${H} → ${cw}x${ch} (${pct}% pixelů), tileBounds updated`
  );
}
