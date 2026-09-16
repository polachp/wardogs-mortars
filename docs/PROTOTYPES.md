# Prototypy interface

Tři varianty UI k porovnání. Společný záměr: **míň bordelu, rychlé zadání,
klik do mapy, desktop (2. monitor)**. Sdílí výpočet i mapovou vrstvu, liší se
layoutem a vizuálem.

## Jak spustit

Potřeba statický server z kořene repa (kvůli `fetch` dat + ES modulům):

```bash
python -m http.server 8777      # z C:\Development\WardogsMortars
# otevři http://localhost:8777/prototypes/
```

## Varianty

| # | Cesta | Název | Charakteristika |
|---|-------|-------|-----------------|
| A | `prototypes/a-recon/` | **Recon** | Celoobrazovková mapa + plovoucí HUD. Azimut a MIL velké, nula rozptýlení. |
| B | `prototypes/b-sidebar/` | **Sidebar** | Mapa + panel: velké odečty, ruční X/Y, swap, reset. Plná kontrola. |

> Varianta C (Command) vyřazena.

Ovládání: **Shift**+klik = zbraň (modrá) · **Ctrl**+klik / **pravé tl.** = cíl
(červená) · body lze táhnout (Shift/Ctrl je blokuje). Dostřelový prstenec kolem
zbraně (amber) i cíle (teal) dle zbraně. Přepínač zbraně (L81 / SPH-2) a mapy
(Bakurani / Ozeti / Zestafona) tlačítky. Spawny + věže z map dat (spawny barevné).

## Architektura (sdílené `prototypes/lib/`)

- **`firecontrol.js`** — načtení dat + výpočet. Věrný port logiky z
  apollyon-sys/wardogs-calculator:
  - `dist_m = hypot(Δx, Δy) × coordinateMetersPerUnit` (=100)
  - `azimut = atan2(Δx, Δy) → °`, 0°=sever, po směru hodin
  - MIL = lineární interpolace tabulky `[dist_m, mil]` (`interpolate`)
- **`mapview.js`** — Leaflet `L.CRS.Simple`, custom transformace herní
  souřadnice ↔ dlaždicový prostor. Tile URL `zoom_{z}/{x}_{y}.webp`,
  `referrerPolicy:"no-referrer"` (hotlink CDN — viz `MAPS.md`).
- **`scene.js`** — umísťování zbraně/cíle klikáním, markery, čára, prstence.

## Data

- `public/data/weapons.json` — balistika (mortar `single`, spg `low`/`high`).
- `public/data/maps/{bakurani,ozeti,zestafona}.json` — kalibrace (bounds,
  tileBounds, tiles path, `coordinateMetersPerUnit`).

Staženo z apollyon-sys/wardogs-calculator (MIT kód; mapové assety © BULKHEAD).

## Ověřeno (Playwright)

- Dlaždice se načítají z CDN (40/40), mapa kalibrovaná správně.
- Výpočet 1:1: východ → az 90°/300 m, sever → az 0°, MIL 690 (L81 @ 300 m),
  SPH-2 arc low/high, „mimo dostřel" nad max dosahem.

## Rozhodnutí

- **Vítěz (2026-09-16): Recon + graft.** Recon layout (fullscreen mapa + HUD)
  je základ; ruční X/Y + swap + reset + copy ze Sidebaru → sbalitelný panel.
  Důvod: Recon nejlíp plní vizi (míň bordelu, 2. monitor, klik do mapy),
  Sidebar dodá featury které chce MVP (Fáze 1). Oba ověřeny živě
  (az 90°/300 m/MIL 690).
- TODO: vyřešit dlaždice pro produkci (self-host, ne hotlink).
