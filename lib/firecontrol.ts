/*
 * Fire-control výpočet — věrný port logiky z apollyon-sys/wardogs-calculator (MIT).
 * dist_m = hypot(dx,dy) * coordinateMetersPerUnit(=100)
 * az     = atan2(dx,dy) → stupně, 0°=sever, po směru hodin
 * MIL    = lineární interpolace balistické tabulky [dist_m, mil]
 */
import type {
  BallisticTable,
  FireSolution,
  MilResult,
  Point,
  Weapon,
  WeaponRaw,
} from "./types";

const DATA_BASE = "/data";

export async function loadData(): Promise<{
  weapons: Weapon[];
  maps: import("./types").MapConfig[];
  defaultWeapon: string;
}> {
  const [weaponsRaw, ...mapsRaw] = await Promise.all([
    fetch(`${DATA_BASE}/weapons.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/maps/bakurani.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/maps/ozeti.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/maps/zestafona.json`).then((r) => r.json()),
  ]);

  const weapons: Weapon[] = weaponsRaw.weapons.map(normalizeWeapon);
  return { weapons, maps: mapsRaw, defaultWeapon: weaponsRaw.default };
}

function normalizeWeapon(w: WeaponRaw): Weapon {
  return {
    id: w.id,
    names: w.names,
    name: w.names?.en ?? w.id,
    minRangeKm: Number(w.minRangeKm ?? 0),
    maxRangeKm: Number(w.maxRangeKm ?? w.rangeKm ?? 0),
    minMil: w.minElevationMil,
    maxMil: w.maxElevationMil,
    ballistics: {
      single: w.ballistics?.single ?? null,
      low: w.ballistics?.low ?? null,
      high: w.ballistics?.high ?? null,
    },
  };
}

/* ---- geometrie ---- */

export function fireSolution(
  weapon: Weapon,
  origin: Point,
  target: Point,
  metersPerUnit = 100
): FireSolution {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dWorld = Math.hypot(dx, dy);
  const distanceMeters = dWorld * metersPerUnit;

  let azimuth = (Math.atan2(dx, dy) * 180) / Math.PI;
  if (azimuth < 0) azimuth += 360;

  const minM = weapon.minRangeKm * 1000;
  const maxM = weapon.maxRangeKm * 1000;
  const inRange = distanceMeters >= minM && distanceMeters <= maxM;

  return {
    dx,
    dy,
    distanceMeters,
    dxMeters: dx * metersPerUnit,
    dyMeters: dy * metersPerUnit,
    azimuth,
    inRange,
    status:
      distanceMeters < minM ? "under" : distanceMeters > maxM ? "over" : "ok",
    single: interpolate(weapon.ballistics.single, distanceMeters),
    low: interpolate(weapon.ballistics.low, distanceMeters),
    high: interpolate(weapon.ballistics.high, distanceMeters),
    hasArc: !!weapon.ballistics.low && !!weapon.ballistics.high,
  };
}

/* ---- interpolace (port interpolateBallisticTable) ---- */

interface Group {
  distance: number;
  mils: number[];
}

function groupTable(table: BallisticTable): Group[] {
  const grouped: Group[] = [];
  [...table]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .forEach(([distance, mil]) => {
      const prev = grouped[grouped.length - 1];
      if (prev && prev.distance === distance) {
        prev.mils.push(mil);
        return;
      }
      grouped.push({ distance, mils: [mil] });
    });
  return grouped;
}

function closestMil(values: number[], target: number): number {
  return values.reduce(
    (best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best),
    values[0]
  );
}

export function interpolate(
  table: BallisticTable | null,
  distanceMeters: number
): MilResult | null {
  if (!Array.isArray(table) || !table.length || !Number.isFinite(distanceMeters))
    return null;

  const groups = groupTable(table);
  const eps = 1e-6;

  const exact = groups.find((g) => Math.abs(g.distance - distanceMeters) <= eps);
  if (exact) {
    const minMil = Math.min(...exact.mils);
    const maxMil = Math.max(...exact.mils);
    return {
      mil: exact.mils.length === 1 ? exact.mils[0] : null,
      minMil,
      maxMil,
    };
  }

  let left: Group | null = null;
  let right: Group | null = null;
  for (let i = 0; i < groups.length - 1; i++) {
    if (
      distanceMeters > groups[i].distance &&
      distanceMeters < groups[i + 1].distance
    ) {
      left = groups[i];
      right = groups[i + 1];
      break;
    }
  }
  if (!left || !right) return null;

  const rightAvg = right.mils.reduce((s, v) => s + v, 0) / right.mils.length;
  const leftMil = closestMil(left.mils, rightAvg);
  const rightMil = closestMil(right.mils, leftMil);
  const factor =
    (distanceMeters - left.distance) / (right.distance - left.distance);
  const mil = leftMil + factor * (rightMil - leftMil);
  return { mil, minMil: mil, maxMil: mil };
}

/* ---- formátování ---- */

export function fmtMil(sol: MilResult | null): string {
  if (!sol) return "—";
  const lo = Math.round(sol.minMil);
  const hi = Math.round(sol.maxMil);
  return lo !== hi ? `${lo}–${hi}` : `${Math.round(sol.mil ?? lo)}`;
}
