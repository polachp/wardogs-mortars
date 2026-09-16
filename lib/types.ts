export type BallisticTable = [distanceMeters: number, mil: number][];

export interface WeaponRaw {
  id: string;
  rangeKm?: number;
  names: Record<string, string>;
  minRangeKm?: number;
  maxRangeKm?: number;
  minElevationMil?: number;
  maxElevationMil?: number;
  ballistics?: {
    single?: BallisticTable | null;
    low?: BallisticTable | null;
    high?: BallisticTable | null;
  };
}

export interface Weapon {
  id: string;
  names: Record<string, string>;
  name: string;
  minRangeKm: number;
  maxRangeKm: number;
  minMil?: number;
  maxMil?: number;
  ballistics: {
    single: BallisticTable | null;
    low: BallisticTable | null;
    high: BallisticTable | null;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapMarker {
  icon: string;
  x: number;
  y: number;
  label?: string;
}

export interface MapPolygon {
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  dashed?: boolean;
  label?: string;
  points: { x: number; y: number }[];
}

export interface MapConfig {
  id: string;
  name: string;
  bounds: MapBounds;
  tileBounds: MapBounds;
  coordinateMetersPerUnit?: number;
  tiles: {
    path: string;
    tileSize: number;
    minZoom: number;
    maxZoom: number;
    extension: string;
    defaultStyle?: string;
    styles?: Record<string, { path: string }>;
  };
  markers?: MapMarker[];
  polygons?: MapPolygon[];
}

export interface MilResult {
  mil: number | null;
  minMil: number;
  maxMil: number;
}

export interface FireSolution {
  dx: number;
  dy: number;
  distanceMeters: number;
  dxMeters: number;
  dyMeters: number;
  azimuth: number;
  inRange: boolean;
  status: "under" | "over" | "ok";
  single: MilResult | null;
  low: MilResult | null;
  high: MilResult | null;
  hasArc: boolean;
}

export interface SceneState {
  weapon: Weapon | null;
  origin: Point | null;
  target: Point | null;
  solution: FireSolution | null;
}
