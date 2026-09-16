# Mapy

Aplikace hostuje podkladové mapy jako **tile pyramid** (dlaždice po zoom
úrovních) + **kalibrační config** pro každou mapu, který převádí herní
souřadnice na pixely. Uživatel klikne do mapy → nástroj dopočítá pozici
zbraně / cíle.

## Zdroj map

Podkladová rastrová mapa každé lokace pochází z herních assetů WARDOGS
(~1 m/pixel, ~16 × 16 km). Získání:

1. **Rip z herních souborů** — textury map z instalace hry.
2. **Reuse komunitních assetů** — např. open-source repo
   [apollyon-sys/wardogs-calculator](https://github.com/apollyon-sys/wardogs-calculator)
   (kód MIT; mapové assety mimo MIT).

> **Právní stav:** mapová grafika je copyright BULKHEAD. Projekt je
> neoficiální fanouškovský nástroj, není spojen s BULKHEAD ani WARDOGS týmem.
> V patičce webu uvést disclaimer:
> *"Unofficial fan project. Game maps and data © BULKHEAD. Not affiliated
> with or endorsed by BULKHEAD or the WARDOGS team."*

## Mapy ve hře

| Mapa       | Lokace                | Rozměr    |
|------------|-----------------------|-----------|
| Bakurani   | horské říční údolí    | 16×16 km  |
| Ozeti      | záp. Evropa, město    | 16×16 km  |
| Zestafona  | (novější)             | 16×16 km  |

## Tile pyramid

Velký raster se nařeže na dlaždice 256×256 px pro každou zoom úroveň (0–7).
Renderuje se přes Leaflet s custom `L.CRS.Simple` (pixelové souřadnice).

**Pojmenování dlaždic (WARDOGS, ne standardní XYZ!):**

```
<base>/zoom_{z}/{x}_{y}.webp
# příklad: .../tiles/bakurani/zoom_3/4_3.webp
```

- `zoom_{z}` = zoom úroveň (0 = 1 dlaždice přes celý tileBounds, z=N → 2^N × 2^N).
- `{x}_{y}` = sloupec_řádek. `x` roste od `minX` (vlevo), `y` roste od `maxY`
  dolů (řádek 0 = nahoře). Odpovídá Leaflet non-TMS pořadí.
- Existují dva styly: `tiles/` (grayscale) a `tiles-color/` (barevná).

Řezání vlastních dlaždic offline (`vips dzsave` / vlastní skript) → do repa
jdou hotové dlaždice, ne originální raster.

## Hotlink jejich CDN — pozor

CDN `assets.wardogs-artillery.com` má **hotlink ochranu (Cloudflare)**:
request s cizím `Referer` → **403**, prázdný Referer → 200.

- Prototypy to obcházejí `referrerPolicy: "no-referrer"` na tile vrstvě —
  funguje, ale je to **jejich bandwidth a můžou kdykoli zablokovat**.
- **Produkce: dlaždice self-hostovat / zrcadlit**, nehotlinkovat.

## Kalibrační config

```ts
type MapConfig = {
  id: string;              // "bakurani"
  name: string;            // "Bakurani"
  imageSize: number;       // px, strana rasteru (32768)
  tileSize: number;        // 256
  maxZoom: number;
  worldMeters: number;     // 16000 (16 km)
  // převod herní souřadnice -> pixel:
  origin: { x: number; y: number };  // pixel odpovídající herní (0,0)
  metersPerUnit: number;             // 100 (1 jednotka = 100 m)
};
```

Převody:

```ts
// herní jednotka -> metr
const meters = unit * cfg.metersPerUnit;
// metr -> pixel
const pixelsPerMeter = cfg.imageSize / cfg.worldMeters;
const px = cfg.origin.x + meters * pixelsPerMeter;
```

Kalibrace nové mapy = najít 2 body se známými herními souřadnicemi, dopočítat
`origin` + měřítko.

## Fallback: user-upload

Pro nepodporované/nové mapy: uživatel nahraje vlastní screenshot, zadá 2
kalibrační body (klik + herní X/Y) → nástroj dopočítá transformaci. Obrázek
zůstává lokálně v prohlížeči, nikam se neodesílá.
