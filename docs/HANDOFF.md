# Handoff — WARDOGS Mortars

Stav k **2026-09-16**. Slouží k navázání práce po pauze.

## Co to je

Webová utilita pro hru WARDOGS — zaměření minometu (L81) a děla (SPH-2):
klik/zadání zbraně a cíle → **vzdálenost, azimut, náměr (MIL)**.

**Klíčové rozhodnutí:** existující web
[apollyon-sys/wardogs-calculator](https://github.com/apollyon-sys/wardogs-calculator)
(wardogs-artillery.com) je funkčně dobrý → **NEstavíme logiku znovu, děláme
jen nový interface (reskin)**. Data + dlaždice + matematiku přebíráme.

## Jak spustit

**Finální stack (Next.js — hlavní vývoj):**

```bash
npm install
npm run dev        # http://localhost:3000
```

Recon+graft layout: fullscreen mapa + HUD (AZIMUT/MIL/VZDÁLENOST) + sbalitelný
panel (ruční X/Y, prohodit, reset, kopírovat řešení). Popisek AZ+MIL u cíle.
Data se servírují z `public/` → `/data/*`, `/assets/*`. HMR řeší dřívější
cache/port-hopping.

**Legacy prototypy** (jen reference, statické HTML):

```bash
python -m http.server 8783        # z C:\Development\WardogsMortars
# http://localhost:8783/prototypes/
```

> **Cache gotcha:** prohlížeč agresivně cachuje ES moduly (`lib/*.js`). Po
> editaci modulu: **tvrdý refresh (Ctrl+Shift+R)**, nebo spusť server na jiném
> portu. (Během vývoje jsem střídal porty 8777→8783.) TODO: dev server s
> no-cache hlavičkami odpadne port hopping.

## Stav prototypů

Dvě varianty interface (Command vyřazen):

| Cesta | Název | Popis |
|-------|-------|-------|
| `prototypes/a-recon/` | **Recon** | celoobrazovková mapa + plovoucí HUD |
| `prototypes/b-sidebar/` | **Sidebar** | mapa + panel, ruční X/Y, swap, reset |

Launcher: `prototypes/index.html`.

**Rozhodnuto (2026-09-16): vítěz = Recon + graft.** Recon fullscreen mapa + HUD
jako základ, schopnosti Sidebaru (ruční X/Y, swap, reset, copy) přenést do
**sbalitelného/overlay panelu**. Další krok = přepis do finálního stacku
(Fáze 0, `docs/ROADMAP.md`).

## Ovládání (sdílené oběma)

- **Shift**+klik = zbraň (modrý bod) · kurzor modrý křížek
- **Ctrl**+klik nebo **pravé tlačítko** = cíl (červený bod) · kurzor červený křížek
- **Prostý levý klik = nic**
- Body **táhnutelné** myší — jen když nedržím Shift/Ctrl (ty klik pouštějí na mapu)
- Přepínač zbraně (L81 / SPH-2) a mapy (Bakurani / Ozeti / Zestafona) = **tlačítka**
- Dostřelové prstence: kolem **zbraně** amber (s výplní) + červený min;
  kolem **cíle** teal (lehký) — kam umístit zbraň v dostřelu. Mění se dle zbraně.
- **Spawny/věže** z map dat: spawny **barevné** (manticore zelená, valkyra modrá,
  lonestar amber, spawn_board světlý), věže bílé — **neinteraktivní**.

## Architektura

```
prototypes/
  index.html            launcher
  a-recon/index.html    varianta A
  b-sidebar/index.html  varianta B
  lib/
    firecontrol.js      načtení dat + výpočet (port apollyon)
    mapview.js          Leaflet CRS + dlaždice + preset markery
    scene.js            interakce: umístění/tažení bodů, prstence, kurzor
public/
  data/weapons.json           balistika (mortar single; spg low/high)
  data/maps/*.json            kalibrace (bounds, tileBounds, tiles path, mpu=100)
  assets/map-markers/*.webp    ikony markerů (tower, spawny, vendoři)
docs/
  README, SPEC, BALLISTICS, MAPS, PROTOTYPES, ROADMAP, HANDOFF
```

Prototypy = statické HTML + Leaflet z CDN (unpkg). Žádný build.

## Výpočet (věrný port, 1:1 ověřeno)

```
dx = Tx−Wx ; dy = Ty−Wy
dist_m = hypot(dx,dy) × coordinateMetersPerUnit(=100)
azimut = atan2(dx,dy)·180/π  (pod 0 → +360)   ; 0°=sever, po směru hodin
MIL    = lineární interpolace tabulky [dist_m, mil]  (interpolate v firecontrol.js)
```

Zbraně: L81 132–684 m (single); SPH-2 780–2629 m (low/high).

## Integrace dat — neobvyklosti (důležité!)

1. **Dlaždice map** — URL schéma NENÍ standardní XYZ:
   `…/tiles/<mapa>/zoom_{z}/{x}_{y}.webp` (řádek 0 = nahoře/maxY).
   Styly: `tiles/` grayscale, `tiles-color/` barevná.
2. **Hotlink CDN** `assets.wardogs-artillery.com` má ochranu (Cloudflare):
   cizí `Referer` → **403**. Obchází se `referrerPolicy:"no-referrer"` na tile
   vrstvě. **Produkce musí dlaždice self-hostovat** (viz `docs/MAPS.md`).
3. **Markery** (spawny/věže) mají x,y v **metrech** → world = /100 →
   `L.latLng(y/100, x/100)`.
4. Kalibrace: markery/klik ↔ herní souřadnice přes custom `L.CRS.Simple`
   transformaci v `mapview.js` (tileBounds normalizace).

## Co je hotové

- [x] Průzkum obou referenčních webů + zdroj dat (apollyon repo, MIT).
- [x] Data stažena do `public/data`, ikony do `public/assets/map-markers`.
- [x] Výpočet portován + ověřen 1:1 (Playwright).
- [x] 2 prototypy interface, dlaždice z CDN, kalibrace ověřená.
- [x] Ovládání Shift/Ctrl/pravé tl., tažení bodů, kurzory.
- [x] Prstence zbraň (amber) + cíl (teal), dle zbraně.
- [x] Mapy tlačítky, spawny barevné + věže, neinteraktivní.

## Co dál (backlog)

1. **Vybrat vítěznou variantu** interface.
2. Přenést do finálního stacku — návrh **Next.js + TypeScript + Tailwind +
   shadcn/ui**, deploy Vercel (viz `docs/ROADMAP.md` Fáze 0).
3. **Produkční hosting dlaždic** (self-host/mirror, ne hotlink) — právní +
   spolehlivost.
4. Perzistence: uložené cíle, export/import (localStorage).
5. Volitelně: korekce převýšení terénu (apollyon má `data/terrain/*` a
   `data/ballistics/terrain-correction/*` — lze taky přebrat), OCR souřadnic,
   PWA, team lobby.

## Reference

- Repo dat/logiky: <https://github.com/apollyon-sys/wardogs-calculator> (MIT)
- Živý web: <https://wardogs-artillery.com/>
- Druhý vzor: <https://wardogs-fire-control.karel-vik.chatgpt.site/cs>
- Disclaimer do patičky: *"Unofficial fan project. Game maps & data © BULKHEAD.
  Not affiliated with or endorsed by BULKHEAD or the WARDOGS team."*

## Paměť (Claude)

Uloženo v `memory/`: `wardogs-project-scope.md`, `wardogs-data-integration.md`
(+ `MEMORY.md` index). Obsahují scope, rozhodnutí a integrační fakta.
