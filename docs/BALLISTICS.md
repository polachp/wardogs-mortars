# Balistické tabulky

Náměr (MIL) se **neodvozuje vzorcem**, ale interpoluje z komunitních tabulek
vzdálenost → MIL. Tabulky jsou oddělené od kódu, aby šly aktualizovat s patchi
hry bez zásahu do logiky.

## Formát dat

```ts
type BallisticPoint = {
  distance: number; // metry
  mil: number;      // náměr
};

type Trajectory = "single" | "low" | "high";

type Weapon = {
  id: string;            // "l81", "sph2"
  name: string;          // "L81 Mortar"
  minRange: number;      // m
  maxRange: number;      // m
  tables: Partial<Record<Trajectory, BallisticPoint[]>>;
};
```

Body v každé tabulce jsou seřazené vzestupně podle `distance`.

## Interpolace

```ts
function interpolateMil(table: BallisticPoint[], distance: number): number | null {
  if (distance < table[0].distance) return null;
  if (distance > table[table.length - 1].distance) return null;

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (distance >= a.distance && distance <= b.distance) {
      const t = (distance - a.distance) / (b.distance - a.distance);
      return a.mil + t * (b.mil - a.mil);
    }
  }
  return null;
}
```

## Zbraně

### L81 (minomet)
- Dostřel: 132 – 684 m
- Trajektorie: `single`

### SPH-2 (dělo)
- Dostřel: 780 – 2 629 m
- Trajektorie: `low`, `high`

> TODO: doplnit skutečné dvojice vzdálenost → MIL z komunitních zdrojů.
> Body níže jsou **placeholder** a musí se ověřit ve hře.

```ts
// PLACEHOLDER — ověřit!
export const weapons: Weapon[] = [
  {
    id: "l81",
    name: "L81 Mortar",
    minRange: 132,
    maxRange: 684,
    tables: {
      single: [
        { distance: 132, mil: 1500 },
        { distance: 684, mil: 800 },
      ],
    },
  },
  {
    id: "sph2",
    name: "SPH-2",
    minRange: 780,
    maxRange: 2629,
    tables: {
      low:  [ { distance: 780, mil: 1200 }, { distance: 2629, mil: 600 } ],
      high: [ { distance: 780, mil: 1400 }, { distance: 2629, mil: 900 } ],
    },
  },
];
```

## Zdroje k ověření

- <https://wardogs-artillery.com/>
- <https://wardogs-fire-control.karel-vik.chatgpt.site/cs>
