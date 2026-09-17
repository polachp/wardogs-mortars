/*
 * Interakce nad mapou:
 *  - Shift+klik = zbraň, Ctrl+klik / pravé tlačítko = cíl
 *  - markery zbraň/cíl lze táhnout (jen když nedržím Shift/Ctrl)
 *  - prostý levý klik nedělá nic
 */
import L from "leaflet";
import { fireSolution } from "./firecontrol";
import { gameToLatLng, latLngToGame } from "./mapview";
import type { Point, SceneState, Weapon } from "./types";

export interface SceneOptions {
  metersPerUnit?: number;
  onUpdate?: (s: SceneState) => void;
}

export interface Scene {
  setWeapon(w: Weapon): void;
  setOrigin(p: Point): void;
  setTarget(p: Point): void;
  reset(): void;
  destroy(): void;
  readonly state: { weapon: Weapon | null; origin: Point | null; target: Point | null };
}

export function createScene(
  map: L.Map,
  { metersPerUnit = 100, onUpdate }: SceneOptions = {}
): Scene {
  let weapon: Weapon | null = null;
  let origin: Point | null = null;
  let target: Point | null = null;
  let modActive = false; // drží se Shift nebo Ctrl?

  const layer = L.layerGroup().addTo(map);
  let originMarker: L.Marker | null = null;
  let targetMarker: L.Marker | null = null;
  let line: L.Polyline | null = null;
  let ringMax: L.Polygon | null = null;
  let ringMin: L.Polygon | null = null;
  let ringLow: L.Polygon | null = null;
  let ringMaxT: L.Polygon | null = null;

  const round = (g: Point): Point => ({
    x: +g.x.toFixed(2),
    y: +g.y.toFixed(2),
  });
  const maxU = () => (weapon ? (weapon.maxRangeKm * 1000) / metersPerUnit : 0);
  const minU = () => (weapon ? (weapon.minRangeKm * 1000) / metersPerUnit : 0);
  // minimální dostřel LOW trajektorie (jen artillery s arc) — pod ním jen HIGH
  const lowMinU = () => {
    const t = weapon?.ballistics.low;
    if (!weapon?.ballistics.high || !t || !t.length) return 0;
    return Math.min(...t.map((r) => r[0])) / metersPerUnit;
  };

  function ringLatLngs(center: Point, rUnits: number, n = 96) {
    const pts: L.LatLng[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(
        gameToLatLng(
          center.x + Math.cos(a) * rUnits,
          center.y + Math.sin(a) * rUnits
        )
      );
    }
    return pts;
  }

  function dotIcon(fill: string, role: string) {
    return L.divIcon({
      className: `fc-dot ${role}`,
      html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${fill};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  // Křížkový kurzor: modrý (zbraň / Shift), červený (cíl / Ctrl)
  const crosshair = (hex: string) =>
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cg stroke='%23${hex}' stroke-width='2'%3E%3Cline x1='12' y1='1' x2='12' y2='8'/%3E%3Cline x1='12' y1='16' x2='12' y2='23'/%3E%3Cline x1='1' y1='12' x2='8' y2='12'/%3E%3Cline x1='16' y1='12' x2='23' y2='12'/%3E%3C/g%3E%3Ccircle cx='12' cy='12' r='3' fill='none' stroke='%23${hex}' stroke-width='1.5'/%3E%3C/svg%3E") 12 12, crosshair`;
  const CUR_WEAPON = crosshair("3b82f6");
  const CUR_TARGET = crosshair("f0607a");
  const container = map.getContainer();

  // živý popisek souřadnic kurzoru (jen když držím Shift/Ctrl), zaokr. na 1 desetinu
  const coordEl = L.DomUtil.create("div", "coord-cursor", container);
  coordEl.style.display = "none";

  function showCoord(e: L.LeafletMouseEvent) {
    const oe = e.originalEvent;
    const shift = !!oe?.shiftKey;
    const ctrl = !!(oe?.ctrlKey || oe?.metaKey);
    if (!shift && !ctrl) {
      coordEl.style.display = "none";
      return;
    }
    const g = latLngToGame(e.latlng);
    coordEl.textContent = `${g.x.toFixed(1)} / ${g.y.toFixed(1)}`;
    coordEl.style.left = `${e.containerPoint.x + 14}px`;
    coordEl.style.top = `${e.containerPoint.y + 14}px`;
    coordEl.classList.toggle("is-weapon", shift);
    coordEl.classList.toggle("is-target", ctrl && !shift);
    coordEl.style.display = "block";
  }
  function hideCoord() {
    coordEl.style.display = "none";
  }
  map.on("mousemove", showCoord);
  map.on("mouseout", hideCoord);

  function applyMarkerMod() {
    [originMarker, targetMarker].forEach((mk) => {
      if (!mk) return;
      if (modActive) {
        mk.dragging && mk.dragging.disable();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const icon = (mk as any)._icon as HTMLElement | undefined;
        if (icon) icon.style.pointerEvents = "none";
      } else {
        mk.dragging && mk.dragging.enable();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const icon = (mk as any)._icon as HTMLElement | undefined;
        if (icon) icon.style.pointerEvents = "";
      }
    });
  }

  function onKey(e: KeyboardEvent) {
    modActive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
    container.style.cursor = e.shiftKey
      ? CUR_WEAPON
      : e.ctrlKey || e.metaKey
      ? CUR_TARGET
      : "";
    if (!modActive) coordEl.style.display = "none";
    applyMarkerMod();
  }
  function onBlur() {
    modActive = false;
    container.style.cursor = "";
    coordEl.style.display = "none";
    applyMarkerMod();
  }
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);

  function bindDrag(mk: L.Marker, which: "origin" | "target") {
    mk.on("drag", (e) => {
      const p = round(latLngToGame((e.target as L.Marker).getLatLng()));
      if (which === "origin") origin = p;
      else target = p;
      liveUpdate();
    });
    mk.on("dragend", () => emit());
    mk.on("contextmenu", placeTarget); // pravé tl. i na markeru
  }

  function draw() {
    layer.clearLayers();
    originMarker = targetMarker = null;
    line = ringMin = ringMax = ringLow = ringMaxT = null;

    if (origin && weapon) {
      ringMax = L.polygon(ringLatLngs(origin, maxU()), {
        color: "#e0a92e",
        weight: 2,
        dashArray: "8 8",
        interactive: false,
        fill: false,
      }).addTo(layer);
      if (minU() > 0)
        ringMin = L.polygon(ringLatLngs(origin, minU()), {
          color: "#f0607a",
          weight: 1.5,
          dashArray: "6 6",
          interactive: false,
          fill: false,
        }).addTo(layer);
      // velmi slabý náznak LOW prstence (artillery) — hranice LOW trajektorie
      if (lowMinU() > 0)
        ringLow = L.polygon(ringLatLngs(origin, lowMinU()), {
          color: "#e0a92e",
          weight: 1.5,
          opacity: 0.55,
          dashArray: "4 6",
          interactive: false,
          fill: false,
        }).addTo(layer);
    }
    // lehčí prstenec kolem cíle = kam lze umístit zbraň (dostřel je symetrický)
    if (target && weapon) {
      ringMaxT = L.polygon(ringLatLngs(target, maxU()), {
        color: "#2dd4bf",
        weight: 1.5,
        opacity: 0.6,
        dashArray: "4 6",
        interactive: false,
        fill: false,
      }).addTo(layer);
    }
    if (origin && target)
      line = L.polyline(
        [gameToLatLng(origin.x, origin.y), gameToLatLng(target.x, target.y)],
        { color: "#e0a92e", weight: 2, dashArray: "8 8", interactive: false }
      ).addTo(layer);

    if (origin) {
      originMarker = L.marker(gameToLatLng(origin.x, origin.y), {
        draggable: true,
        icon: dotIcon("#3b82f6", "fc-origin"),
        zIndexOffset: 1000,
      }).addTo(layer);
      bindDrag(originMarker, "origin");
    }
    if (target) {
      targetMarker = L.marker(gameToLatLng(target.x, target.y), {
        draggable: true,
        icon: dotIcon("#f43f5e", "fc-target"),
        zIndexOffset: 1000,
      }).addTo(layer);
      targetMarker.bindTooltip(labelHtml(), {
        permanent: true,
        direction: "right",
        offset: [10, 0],
        className: "fc-label",
        interactive: false,
      });
      bindDrag(targetMarker, "target");
    }
    applyMarkerMod();
    updateLabel();
  }

  // malý popisek u cíle: azimut + vzdálenost (čitelné přímo od cíle)
  function currentSolution() {
    return weapon && origin && target
      ? fireSolution(weapon, origin, target, metersPerUnit)
      : null;
  }

  function labelHtml() {
    const sol = currentSolution();
    if (!sol) return "target";
    const head = `<b>${Math.round(sol.azimuth)}°</b> · ${Math.round(
      sol.distanceMeters
    )} m`;
    if (sol.inRange) return head;
    const warn = sol.status === "under" ? "⚠ TOO CLOSE" : "⚠ TOO FAR";
    return `${head}<br><span class="fc-warn">${warn}</span>`;
  }

  function updateLabel() {
    const tt = targetMarker?.getTooltip();
    if (!targetMarker || !tt) return;
    const sol = currentSolution();
    targetMarker.setTooltipContent(labelHtml());
    const el = tt.getElement();
    if (el) el.classList.toggle("fc-label--oob", !!sol && !sol.inRange);
  }

  // přesun prstenců + čáry během tažení (bez rekreace markerů)
  function liveUpdate() {
    if (origin && ringMax) ringMax.setLatLngs(ringLatLngs(origin, maxU()));
    if (origin && ringMin) ringMin.setLatLngs(ringLatLngs(origin, minU()));
    if (origin && ringLow) ringLow.setLatLngs(ringLatLngs(origin, lowMinU()));
    if (target && ringMaxT) ringMaxT.setLatLngs(ringLatLngs(target, maxU()));
    if (origin && target && line)
      line.setLatLngs([
        gameToLatLng(origin.x, origin.y),
        gameToLatLng(target.x, target.y),
      ]);
    updateLabel();
    emit();
  }

  function emit() {
    const sol =
      weapon && origin && target
        ? fireSolution(weapon, origin, target, metersPerUnit)
        : null;
    onUpdate?.({ weapon, origin, target, solution: sol });
  }

  function placeTarget(e: L.LeafletMouseEvent) {
    e.originalEvent?.preventDefault?.();
    target = round(latLngToGame(e.latlng));
    draw();
    emit();
  }

  function onClick(e: L.LeafletMouseEvent) {
    const oe = e.originalEvent;
    if (oe?.shiftKey) origin = round(latLngToGame(e.latlng));
    else if (oe?.ctrlKey || oe?.metaKey) target = round(latLngToGame(e.latlng));
    else return; // prostý levý klik = nic
    draw();
    emit();
  }

  map.on("click", onClick);
  map.on("contextmenu", placeTarget); // pravé tlačítko = cíl

  return {
    setWeapon(w: Weapon) {
      weapon = w;
      draw();
      emit();
    },
    setOrigin(p: Point) {
      origin = p;
      draw();
      emit();
    },
    setTarget(p: Point) {
      target = p;
      draw();
      emit();
    },
    reset() {
      origin = null;
      target = null;
      draw();
      emit();
    },
    destroy() {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      map.off("click", onClick);
      map.off("contextmenu", placeTarget);
      map.off("mousemove", showCoord);
      map.off("mouseout", hideCoord);
      coordEl.remove();
      layer.clearLayers();
    },
    get state() {
      return { weapon, origin, target };
    },
  };
}
