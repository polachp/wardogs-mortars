/*
 * Leaflet vrstva nad dlaždicemi WARDOGS.
 * Custom CRS: herní souřadnice -> normalizovaný tileBounds prostor (XYZ pyramida).
 * game (x,y)  <->  L.latLng(y, x)
 */
import L from "leaflet";
import type { MapBounds, MapConfig } from "./types";

export function makeCRS(tb: MapBounds): L.CRS {
  const sx = 1 / (tb.maxX - tb.minX);
  const sy = 1 / (tb.maxY - tb.minY);
  // pixel = scale * transform(projectedPoint); projected = Point(lng=x, lat=y)
  const transformation = new L.Transformation(
    sx,
    -tb.minX * sx,
    -sy,
    tb.maxY * sy
  );
  return L.extend({}, L.CRS.Simple, {
    transformation,
    scale: (z: number) => 256 * Math.pow(2, z),
    zoom: (s: number) => Math.log2(s / 256),
    infinite: false,
  }) as L.CRS;
}

export const gameToLatLng = (x: number, y: number) => L.latLng(y, x);
export const latLngToGame = (ll: L.LatLng) => ({ x: ll.lng, y: ll.lat });

export interface TileStyle {
  style?: "grayscale" | "color";
}

export function createMap(
  el: HTMLElement,
  mapCfg: MapConfig,
  { style = "grayscale" }: TileStyle = {}
) {
  const tb = mapCfg.tileBounds;
  const b = mapCfg.bounds;
  const crs = makeCRS(tb);

  const map = L.map(el, {
    crs,
    zoomControl: false,
    attributionControl: false,
    boxZoom: false, // Shift+click rezervován pro umístění zbraně
    minZoom: mapCfg.tiles.minZoom,
    maxZoom: mapCfg.tiles.maxZoom + 2, // overzoom pro detail
    zoomSnap: 0.25,
    wheelPxPerZoomLevel: 90,
  });

  const path = mapCfg.tiles.styles?.[style]?.path ?? mapCfg.tiles.path;
  // WARDOGS tile naming: zoom_{z}/{x}_{y}.webp  (ne standardní XYZ)
  const layer = L.tileLayer(
    `${path}/zoom_{z}/{x}_{y}.${mapCfg.tiles.extension}`,
    {
      tileSize: mapCfg.tiles.tileSize,
      minZoom: mapCfg.tiles.minZoom,
      maxZoom: mapCfg.tiles.maxZoom + 2,
      maxNativeZoom: mapCfg.tiles.maxZoom,
      noWrap: true,
      // CDN má hotlink ochranu (Cloudflare, blok cizího Referer). Bez refereru vrací 200.
      // POZN.: pro produkci dlaždice zrcadlit/self-hostovat, ne hotlinkovat.
      referrerPolicy: "no-referrer",
      bounds: L.latLngBounds(
        gameToLatLng(tb.minX, tb.minY),
        gameToLatLng(tb.maxX, tb.maxY)
      ),
    } as L.TileLayerOptions
  ).addTo(map);

  const playable = L.latLngBounds(
    gameToLatLng(b.minX, b.minY),
    gameToLatLng(b.maxX, b.maxY)
  );
  map.fitBounds(playable);
  map.setMaxBounds(
    L.latLngBounds(
      gameToLatLng(tb.minX, tb.minY),
      gameToLatLng(tb.maxX, tb.maxY)
    ).pad(0.1)
  );

  const markers = addPresetMarkers(map, mapCfg);

  return { map, layer, markers, playable, crs };
}

// Spawny + věže dle vzoru apollyon. Marker x,y jsou v metrech → world = /100.
const MARKER_ICONS = "/assets/map-markers";
const SHOWN_MARKERS = new Set([
  "tower",
  "spawn_board",
  "valkyra",
  "manticore",
  "lonestar",
]);
// barvy spawn-frakcí (viz apollyon)
const SPAWN_COLORS: Record<string, string> = {
  manticore: "#4ade80", // zelená
  valkyra: "#38bdf8", // modrá
  lonestar: "#f59e0b", // amber
  spawn_board: "#e2e8f0", // neutrální světlá
};

export function addPresetMarkers(
  map: L.Map,
  mapCfg: MapConfig,
  { filter = SHOWN_MARKERS }: { filter?: Set<string> } = {}
) {
  const group = L.layerGroup().addTo(map);
  const mpu = mapCfg.coordinateMetersPerUnit ?? 100;
  (mapCfg.markers ?? [])
    .filter((m) => filter.has(m.icon))
    .forEach((m) => {
      const url = `${MARKER_ICONS}/${m.icon}.webp`;
      const color = SPAWN_COLORS[m.icon];
      const icon = color
        ? L.divIcon({
            className: "preset-marker",
            html: `<span style="display:block;width:22px;height:22px;background:${color};-webkit-mask:url('${url}') center/contain no-repeat;mask:url('${url}') center/contain no-repeat;filter:drop-shadow(0 0 1px rgba(0,0,0,.9))"></span>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          })
        : L.icon({
            iconUrl: url,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            className: "preset-marker",
          });
      L.marker(gameToLatLng(m.x / mpu, m.y / mpu), {
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(group);
    });
  return group;
}
