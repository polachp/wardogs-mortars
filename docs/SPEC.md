# Funkční specifikace

## 1. Přehled

Kalkulátor palebných dat pro WARDOGS. Vstup = pozice zbraně a cíle na mapě.
Výstup = vzdálenost, azimut, náměr (MIL). Vše se počítá v prohlížeči.

## 2. Vstupy

| Pole            | Typ    | Pozn.                                  |
|-----------------|--------|----------------------------------------|
| Zbraň           | select | L81, SPH-2, …                          |
| Zbraň X / Y     | číslo  | souřadnice v mapových jednotkách       |
| Cíl X / Y       | číslo  | souřadnice v mapových jednotkách       |
| Trajektorie     | toggle | jen SPH-2: LOW / HIGH                   |
| Korekce terénu  | toggle | backlog, jen podporované mapy          |

Validace: prázdné pole → výsledek se nepočítá; nečíselný vstup → chyba u pole.

## 3. Výpočet

```ts
const dx = target.x - weapon.x;
const dy = target.y - weapon.y;

const distanceM = 100 * Math.hypot(dx, dy);
const azimuthDeg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
const mil = interpolateMil(weapon, distanceM, trajectory); // z tabulky
```

- `atan2(dx, dy)` — pořadí `(dx, dy)` dává 0° = sever, kladný směr po směru
  hodinových ručiček.
- `interpolateMil` — lineární interpolace mezi sousedními body tabulky;
  mimo rozsah → `null` + příznak "mimo dostřel".

## 4. Výstupy

- **Vzdálenost** — metry, zaokrouhleno na celé číslo.
- **Azimut** — stupně, 1 desetinné místo.
- **MIL** — celé číslo (příp. 1 desetinné dle tabulky).
- **ΔX / ΔY** — pomocné, pro kontrolu.
- **Stav dostřelu** — v dosahu / pod minimem / nad maximem.
- SPH-2 — dvě řešení (LOW / HIGH) vedle sebe.

## 5. UI

- Jeden panel: vlevo vstupy, vpravo výsledky (na mobilu pod sebou).
- Tlačítko **Swap** prohodí zbraň ↔ cíl.
- Seznam **uložených cílů** (localStorage): uložit, načíst, smazat.
- **Export / Import** cílů jako JSON.
- Kopírování výsledku do schránky.

## 6. Perzistence

- Poslední zbraň, pozice a uložené cíle v `localStorage`.
- Žádná data neopouštějí prohlížeč.

## 7. Nefunkční požadavky

- Funguje offline po prvním načtení (PWA — backlog).
- Responzivní (desktop + mobil).
- Rychlý přepočet při každé změně vstupu (bez tlačítka "Spočítat").
