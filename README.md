# WARDOGS Mortars

Webová utilita pro hru **WARDOGS** — počítá zaměření minometů a dělostřelectva
(mortar / artillery fire control). Uživatel zadá pozici zbraně a cíl, nástroj
vrátí **vzdálenost**, **azimut** a **náměr v MIL**.

Inspirace / motivace:
- <https://wardogs-artillery.com/>
- <https://wardogs-fire-control.karel-vik.chatgpt.site/cs>

---

## Cíl projektu

**Alternativní interface** nad daty a logikou existujícího nástroje
[apollyon-sys/wardogs-calculator](https://github.com/apollyon-sys/wardogs-calculator)
(MIT). Ten web je funkčně dobrý — chceme **jiné, vlastní UI**.

Přebíráme:
- balistiku (`data/weapons.json`),
- kalibraci map (`maps/*.json` — bounds herní↔pixel),
- dlaždice map (jejich CDN `assets.wardogs-artillery.com`).

Stavíme vlastní: layout, komponenty, UX, vizuální styl.

Rychlý, offline-friendly kalkulátor palebných dat, který hráči použijí přímo
během hry na druhém monitoru nebo mobilu. Žádná registrace, výpočet běží celý
v prohlížeči.

### Klíčové vlastnosti (MVP)

- Zadání pozic — souřadnice zbraně (X, Y) a cíle (X, Y).
- Výpočet:
  - **Vzdálenost** v metrech,
  - **Azimut** ve stupních (0° = sever, po směru hodin),
  - **Náměr v MIL** interpolovaný z balistických tabulek zbraně.
- Výběr zbraně (L81, SPH-2 …) s vlastními balistickými tabulkami.
- SPH-2: dvě řešení — **LOW** a **HIGH** trajektorie.
- Indikace dostřelu (cíl v dosahu / mimo dosah).
- Swap pozic zbraň ↔ cíl.
- Uložení a export/import cílů (localStorage).

### Mimo MVP (backlog)

- Hostované interaktivní mapy (Bakurani, Ozeti, Zestafona) — tile pyramid +
  kalibrace, klik pro nastavení pozic. Viz `docs/MAPS.md`.
- Fallback: user-upload vlastní mapy + kalibrace 2 body.
- Korekce na převýšení terénu (elevation) pro podporované mapy.
- Team lobby — sdílené kreslení a značky v reálném čase.
- Extrakce souřadnic z nahraného screenshotu (OCR, lokálně v prohlížeči).

---

## Balistický model

Souřadnicová soustava mapy: **1 mapová jednotka = 100 m**.

Vstup: pozice zbraně `(Wx, Wy)`, pozice cíle `(Tx, Ty)`.

```
ΔX = Tx − Wx
ΔY = Ty − Wy

vzdálenost = 100 × √(ΔX² + ΔY²)          [m]
azimut     = (atan2(ΔX, ΔY) + 360) mod 360   [°, 0° = sever, po směru hodin]
```

**Náměr (MIL)** se nepočítá vzorcem, ale **interpoluje** z komunitní balistické
tabulky pro danou zbraň (dvojice `vzdálenost → MIL`). Mezi tabulkovými body se
používá lineární interpolace.

Předpoklady MVP: plochý terén, stejná výška zbraně a cíle.

### Zbraně (výchozí data)

| Zbraň  | Dostřel        | Trajektorie      |
|--------|----------------|------------------|
| L81    | 132 – 684 m    | jedna            |
| SPH-2  | 780 – 2 629 m  | LOW + HIGH       |

> Balistické tabulky jsou komunitní a mohou se s patchi hry měnit — drží se
> odděleně od kódu, aby šly snadno aktualizovat (viz `docs/BALLISTICS.md`).

---

## Technologie

- **Next.js** (App Router) + **TypeScript**.
- **Tailwind CSS** + shadcn/ui pro UI.
- Výpočet čistě client-side; balistické tabulky jako statická data.
- Deploy na **Vercel**.

---

## Vývoj

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

---

## Struktura dokumentace

- `README.md` — tento přehled.
- `docs/SPEC.md` — funkční specifikace, UI, výpočetní logika.
- `docs/BALLISTICS.md` — balistické tabulky zbraní a jejich formát.
- `docs/MAPS.md` — hostování map, tile pyramid, kalibrace souřadnic.
- `docs/PROTOTYPES.md` — varianty interface, jak spustit.
- `docs/ROADMAP.md` — plán vývoje po fázích.
- `docs/HANDOFF.md` — **navázání práce po pauze** (stav, jak spustit, co dál).
