# WARDOGS Mortars

Web utility for the game **WARDOGS** — mortar and artillery fire control. The
user sets the weapon position and the target; the tool returns **distance**,
**azimuth**, and **elevation in MIL**.

Inspiration / motivation:
- <https://wardogs-artillery.com/>
- <https://wardogs-fire-control.karel-vik.chatgpt.site/cs>

---

## Project goal

An **alternative interface** on top of the data and logic of the existing tool
[apollyon-sys/wardogs-calculator](https://github.com/apollyon-sys/wardogs-calculator)
(MIT). That site is functionally solid — we want a **different, custom UI**.

We reuse:
- ballistics (`data/weapons.json`),
- map calibration (`maps/*.json` — game ↔ pixel bounds),
- map tiles (their CDN `assets.wardogs-artillery.com`).

We build our own: layout, components, UX, visual style.

A fast, offline-friendly fire-control calculator that players use directly
during a match on a second monitor or phone. No sign-up; the whole computation
runs in the browser.

### Key features (MVP)

- Position input — weapon coordinates (X, Y) and target (X, Y).
- Computation:
  - **Distance** in meters,
  - **Azimuth** in degrees (0° = north, clockwise),
  - **Elevation in MIL** interpolated from the weapon's ballistic tables.
- Weapon selection (L81, SPH-2 …) with per-weapon ballistic tables.
- SPH-2: two solutions — **LOW** and **HIGH** trajectory.
- Range indication (target in range / out of range).
- Swap weapon ↔ target positions.
- Save and export/import targets (localStorage).

### Out of MVP (backlog)

- Hosted interactive maps (Bakurani, Ozeti, Zestafona) — tile pyramid +
  calibration, click to set positions. See `docs/MAPS.md`.
- Fallback: user-uploaded custom map + 2-point calibration.
- Terrain elevation correction for supported maps.
- Team lobby — shared drawing and markers in real time.
- Coordinate extraction from an uploaded screenshot (OCR, locally in the browser).

---

## Ballistic model

Map coordinate system: **1 map unit = 100 m**.

Input: weapon position `(Wx, Wy)`, target position `(Tx, Ty)`.

```
ΔX = Tx − Wx
ΔY = Ty − Wy

distance = 100 × √(ΔX² + ΔY²)               [m]
azimuth  = (atan2(ΔX, ΔY) + 360) mod 360    [°, 0° = north, clockwise]
```

**Elevation (MIL)** is not computed by a formula but **interpolated** from a
community ballistic table for the given weapon (`distance → MIL` pairs). Linear
interpolation is used between table points.

MVP assumptions: flat terrain, equal weapon and target altitude.

### Weapons (default data)

| Weapon | Range          | Trajectory       |
|--------|----------------|------------------|
| L81    | 132 – 684 m    | single           |
| SPH-2  | 780 – 2 629 m  | LOW + HIGH       |

> Ballistic tables are community-sourced and may change with game patches — they
> are kept separate from the code so they can be updated easily (see
> `docs/BALLISTICS.md`).

---

## Tech stack

- **Next.js** (App Router) + **TypeScript**.
- **Tailwind CSS** + shadcn/ui for the UI.
- **Leaflet** for the interactive map (custom CRS over WARDOGS tiles).
- Purely client-side computation; ballistic tables as static data.
- Deploy on **Vercel**.

---

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Data is served from `public/` at `/data/*` and `/assets/*`. Legacy UI prototypes
live in `prototypes/` (static HTML, reference only).

### Controls

- **Shift**+click = place weapon (blue)
- **Ctrl**+click / right-click = place target (red)
- Drag either point to move it
- Or type X/Y coordinates manually in the side panel
- The target shows an inline **azimuth + MIL** label

---

## Documentation

- `README.md` — this overview.
- `docs/SPEC.md` — functional spec, UI, computation logic.
- `docs/BALLISTICS.md` — weapon ballistic tables and their format.
- `docs/MAPS.md` — map hosting, tile pyramid, coordinate calibration.
- `docs/PROTOTYPES.md` — interface variants, how to run.
- `docs/ROADMAP.md` — phased development plan.
- `docs/HANDOFF.md` — **resuming work after a break** (state, how to run, next steps).

---

## Disclaimer

Unofficial fan project. Game maps & data © BULKHEAD. Not affiliated with or
endorsed by BULKHEAD or the WARDOGS team.
