/*
 * Interakce nad mapou:
 *  - Shift+klik = zbraň, Ctrl+klik / pravé tlačítko = cíl
 *  - markery zbraň/cíl lze táhnout (jen když nedržím Shift/Ctrl)
 *  - prostý levý klik nedělá nic
 */
import { fireSolution } from "./firecontrol.js";
import { gameToLatLng, latLngToGame } from "./mapview.js";

export function createScene(map, { metersPerUnit = 100, onUpdate } = {}) {
  let weapon = null;
  let origin = null;
  let target = null;
  let modActive = false; // drží se Shift nebo Ctrl?

  const layer = L.layerGroup().addTo(map);
  let originMarker, targetMarker, line, ringMin, ringMax, ringMinT, ringMaxT;

  const round = (g) => ({ x: +g.x.toFixed(2), y: +g.y.toFixed(2) });
  const maxU = () => (weapon ? (weapon.maxRangeKm * 1000) / metersPerUnit : 0);
  const minU = () => (weapon ? (weapon.minRangeKm * 1000) / metersPerUnit : 0);

  function ringLatLngs(center, rUnits, n = 96) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(gameToLatLng(center.x + Math.cos(a) * rUnits, center.y + Math.sin(a) * rUnits));
    }
    return pts;
  }

  function dotIcon(fill, role) {
    return L.divIcon({
      className: `fc-dot ${role}`,
      html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${fill};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  // Křížkový kurzor: modrý (zbraň / Shift), červený (cíl / Ctrl)
  const crosshair = (hex) =>
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cg stroke='%23${hex}' stroke-width='2'%3E%3Cline x1='12' y1='1' x2='12' y2='8'/%3E%3Cline x1='12' y1='16' x2='12' y2='23'/%3E%3Cline x1='1' y1='12' x2='8' y2='12'/%3E%3Cline x1='16' y1='12' x2='23' y2='12'/%3E%3C/g%3E%3Ccircle cx='12' cy='12' r='3' fill='none' stroke='%23${hex}' stroke-width='1.5'/%3E%3C/svg%3E") 12 12, crosshair`;
  const CUR_WEAPON = crosshair("3b82f6");
  const CUR_TARGET = crosshair("f0607a");
  const container = map.getContainer();

  function applyMarkerMod() {
    // při držení Shift/Ctrl markery neblokují klik (nejde táhnout, klik projde na mapu)
    [originMarker, targetMarker].forEach((mk) => {
      if (!mk) return;
      if (modActive) {
        mk.dragging && mk.dragging.disable();
        if (mk._icon) mk._icon.style.pointerEvents = "none";
      } else {
        mk.dragging && mk.dragging.enable();
        if (mk._icon) mk._icon.style.pointerEvents = "";
      }
    });
  }

  function onKey(e) {
    modActive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
    container.style.cursor = e.shiftKey
      ? CUR_WEAPON
      : e.ctrlKey || e.metaKey
      ? CUR_TARGET
      : "";
    applyMarkerMod();
  }
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKey);
  window.addEventListener("blur", () => {
    modActive = false;
    container.style.cursor = "";
    applyMarkerMod();
  });

  function bindDrag(mk, which) {
    mk.on("drag", (e) => {
      const p = round(latLngToGame(e.target.getLatLng()));
      if (which === "origin") origin = p;
      else target = p;
      liveUpdate();
    });
    mk.on("dragend", () => emit());
    mk.on("contextmenu", placeTarget); // pravé tl. i na markeru
  }

  function draw() {
    layer.clearLayers();
    originMarker = targetMarker = line = ringMin = ringMax = ringMinT = ringMaxT = null;

    if (origin && weapon) {
      ringMax = L.polygon(ringLatLngs(origin, maxU()), {
        color: "#e0a92e", weight: 2, dashArray: "8 8", interactive: false,
        fill: true, fillColor: "#a5772a", fillOpacity: 0.22,
      }).addTo(layer);
      if (minU() > 0)
        ringMin = L.polygon(ringLatLngs(origin, minU()), {
          color: "#f0607a", weight: 1.5, dashArray: "6 6", interactive: false, fill: false,
        }).addTo(layer);
    }
    // lehčí prstenec kolem cíle = kam lze umístit zbraň (dostřel je symetrický)
    if (target && weapon) {
      ringMaxT = L.polygon(ringLatLngs(target, maxU()), {
        color: "#2dd4bf", weight: 1.5, opacity: 0.6, dashArray: "4 6", interactive: false, fill: false,
      }).addTo(layer);
      if (minU() > 0)
        ringMinT = L.polygon(ringLatLngs(target, minU()), {
          color: "#2dd4bf", weight: 1, opacity: 0.45, dashArray: "3 6", interactive: false, fill: false,
        }).addTo(layer);
    }
    if (origin && target)
      line = L.polyline([gameToLatLng(origin.x, origin.y), gameToLatLng(target.x, target.y)], {
        color: "#e0a92e", weight: 2, dashArray: "8 8", interactive: false,
      }).addTo(layer);

    if (origin) {
      originMarker = L.marker(gameToLatLng(origin.x, origin.y), {
        draggable: true, icon: dotIcon("#3b82f6", "fc-origin"), zIndexOffset: 1000,
      }).addTo(layer);
      bindDrag(originMarker, "origin");
    }
    if (target) {
      targetMarker = L.marker(gameToLatLng(target.x, target.y), {
        draggable: true, icon: dotIcon("#f43f5e", "fc-target"), zIndexOffset: 1000,
      }).addTo(layer);
      bindDrag(targetMarker, "target");
    }
    applyMarkerMod();
  }

  // přesun prstenců + čáry během tažení (bez rekreace markerů)
  function liveUpdate() {
    if (origin && ringMax) ringMax.setLatLngs(ringLatLngs(origin, maxU()));
    if (origin && ringMin) ringMin.setLatLngs(ringLatLngs(origin, minU()));
    if (target && ringMaxT) ringMaxT.setLatLngs(ringLatLngs(target, maxU()));
    if (target && ringMinT) ringMinT.setLatLngs(ringLatLngs(target, minU()));
    if (origin && target && line)
      line.setLatLngs([gameToLatLng(origin.x, origin.y), gameToLatLng(target.x, target.y)]);
    emit();
  }

  function emit() {
    const sol = weapon && origin && target ? fireSolution(weapon, origin, target, metersPerUnit) : null;
    onUpdate?.({ weapon, origin, target, solution: sol });
  }

  function placeTarget(e) {
    e.originalEvent?.preventDefault?.();
    target = round(latLngToGame(e.latlng));
    draw();
    emit();
  }

  map.on("click", (e) => {
    const oe = e.originalEvent;
    if (oe?.shiftKey) origin = round(latLngToGame(e.latlng));
    else if (oe?.ctrlKey || oe?.metaKey) target = round(latLngToGame(e.latlng));
    else return; // prostý levý klik = nic
    draw();
    emit();
  });
  map.on("contextmenu", placeTarget); // pravé tlačítko = cíl

  return {
    setWeapon(w) { weapon = w; draw(); emit(); },
    setOrigin(p) { origin = p; draw(); emit(); },
    setTarget(p) { target = p; draw(); emit(); },
    reset() { origin = null; target = null; draw(); emit(); },
    get state() { return { weapon, origin, target }; },
  };
}
