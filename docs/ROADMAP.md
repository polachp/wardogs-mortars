# Roadmap

## Fáze 0 — Setup ✅
- Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui (Button) — hotovo.
- Recon+graft layout přenesen: `app/`, `components/`, `lib/` (TS port).
- `npm run dev` (port 3000). Data serve z `public/` na `/data`, `/assets`.
- Výpočet ověřen 1:1 v Next stacku (az 90°/300 m/MIL 690). Build + tsc čisté.
- **Zbývá:** nasazení na Vercel (preview + prod).

## Fáze 0.5 — Prototypy interface ✅
- Varianty UI: **Recon** + **Sidebar** (Command vyřazen) — viz `PROTOTYPES.md`.
- Sdílený výpočet (port apollyon-sys) + Leaflet mapa z CDN dlaždic.
- Ovládání: Shift=zbraň, Ctrl/pravé tl.=cíl, táhnutelné body, prstence
  zbraň (amber) + cíl (teal), spawny/věže, přepínače tlačítky.
- **Vítěz vybrán (2026-09-16): Recon + graft** (Recon layout + schopnosti
  Sidebaru do sbalitelného panelu). Zbývá: přepis do finálního stacku (Fáze 0).

## Fáze 1 — MVP kalkulátor
- Vstupní pole zbraň/cíl (X, Y), výběr zbraně.
- Výpočet vzdálenost + azimut.
- Interpolace MIL z tabulky, indikace dostřelu.
- SPH-2 LOW/HIGH.
- Swap pozic, kopírování výsledku.

## Fáze 2 — Perzistence a UX
- localStorage: uložené cíle, poslední stav.
- Export / import cílů (JSON).
- Responzivní layout, mobil.

## Fáze 3 — Hostované mapy
- Tile pyramid (dlaždice) + kalibrační config per mapa — viz `MAPS.md`.
- Získání rasterů (rip / komunitní assety), nařezání dlaždic offline.
- Interaktivní mapa (leaflet-like, pixelové CRS): pan, zoom.
- Klik na mapě = nastavení pozice zbraně / cíle.
- Mapy: Bakurani, Ozeti, Zestafona.
- Disclaimer v patičce (fan project, © BULKHEAD).

## Fáze 4 — Rozšíření
- Fallback user-upload mapy + kalibrace 2 body.
- Korekce převýšení terénu (elevation).
- OCR souřadnic ze screenshotu (lokálně).
- PWA / offline.
- Team lobby — sdílené značky v reálném čase.
