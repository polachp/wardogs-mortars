"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtMil, loadData } from "@/lib/firecontrol";
import { createMap } from "@/lib/mapview";
import { createScene, type Scene } from "@/lib/scene";
import type { MapConfig, Point, SceneState, Weapon } from "@/lib/types";
import { Check, Copy } from "lucide-react";

interface Loaded {
  weapons: Weapon[];
  maps: MapConfig[];
  defaultWeapon: string;
}

type Coords = { wx: string; wy: string; tx: string; ty: string };
const EMPTY: Coords = { wx: "", wy: "", tx: "", ty: "" };
const fmtCoord = (n: number | undefined | null) =>
  n === undefined || n === null ? "" : String(n);

export function FireControl() {
  const [data, setData] = useState<Loaded | null>(null);
  const [mapIdx, setMapIdx] = useState(0);
  const [weaponIdx, setWeaponIdx] = useState(0);
  const [state, setState] = useState<SceneState>({
    weapon: null,
    origin: null,
    target: null,
    solution: null,
  });
  const [coords, setCoords] = useState<Coords>(EMPTY);
  const [copied, setCopied] = useState(false);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<LMap | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const focusedRef = useRef<keyof Coords | null>(null);

  // update HUD + doplň X/Y pole (ne to, do kterého se právě píše)
  const onUpdate = useCallback((s: SceneState) => {
    setState(s);
    setCoords((prev) => {
      const next = { ...prev };
      const put = (k: keyof Coords, v: string) => {
        if (focusedRef.current !== k) next[k] = v;
      };
      put("wx", fmtCoord(s.origin?.x));
      put("wy", fmtCoord(s.origin?.y));
      put("tx", fmtCoord(s.target?.x));
      put("ty", fmtCoord(s.target?.y));
      return next;
    });
  }, []);

  // načtení dat jednou
  useEffect(() => {
    let alive = true;
    loadData().then((d) => {
      if (!alive) return;
      const wi = Math.max(
        0,
        d.weapons.findIndex((w) => w.id === d.defaultWeapon)
      );
      setWeaponIdx(wi);
      setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  // (re)vytvoř mapu + scénu při změně mapy
  useEffect(() => {
    if (!data || !mapElRef.current) return;
    const { map } = createMap(mapElRef.current, data.maps[mapIdx]);
    const scene = createScene(map, {
      metersPerUnit: data.maps[mapIdx].coordinateMetersPerUnit ?? 100,
      onUpdate,
    });
    scene.setWeapon(data.weapons[weaponIdx]);
    mapObjRef.current = map;
    sceneRef.current = scene;
    setCoords(EMPTY);
    return () => {
      scene.destroy();
      map.remove();
      mapObjRef.current = null;
      sceneRef.current = null;
    };
    // weaponIdx záměrně mimo deps — zbraň se mění vlastním efektem níže
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mapIdx, onUpdate]);

  // změna zbraně bez rekreace mapy
  useEffect(() => {
    if (!data || !sceneRef.current) return;
    sceneRef.current.setWeapon(data.weapons[weaponIdx]);
  }, [data, weaponIdx]);

  // ruční zadání X/Y
  function editCoord(k: keyof Coords, v: string) {
    setCoords((prev) => {
      const next = { ...prev, [k]: v };
      const scene = sceneRef.current;
      if (scene) {
        const o = parsePoint(next.wx, next.wy);
        const t = parsePoint(next.tx, next.ty);
        if (o && (k === "wx" || k === "wy")) scene.setOrigin(o);
        if (t && (k === "tx" || k === "ty")) scene.setTarget(t);
      }
      return next;
    });
  }

  async function copyResult() {
    const sol = state.solution;
    if (!sol) return;
    const mil = sol.hasArc
      ? `LOW ${fmtMil(sol.low)} / HIGH ${fmtMil(sol.high)} MIL`
      : `${fmtMil(sol.single)} MIL`;
    const txt = `AZ ${sol.azimuth.toFixed(1)}° · ${Math.round(
      sol.distanceMeters
    )} m · ${mil}`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard nedostupný */
    }
  }

  const sol = state.solution;
  const milText = sol
    ? sol.hasArc
      ? `${fmtMil(sol.low)} / ${fmtMil(sol.high)}`
      : fmtMil(sol.single)
    : "—";
  const statusText = !sol
    ? "Shift+click weapon · Ctrl / right-click target"
    : sol.inRange
    ? "✓ in range"
    : sol.status === "under"
    ? "below minimum range"
    : "out of range";

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background">
      <div ref={mapElRef} className="absolute inset-0 z-0" />

      {/* ---- horní toolbar: mapy + zbraně ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-wrap items-center gap-2 p-3">
        <div className="pointer-events-auto flex gap-1 rounded-lg border bg-card/85 p-1 backdrop-blur">
          {data?.maps.map((m, i) => (
            <Button
              key={m.id}
              size="sm"
              variant={i === mapIdx ? "default" : "ghost"}
              onClick={() => setMapIdx(i)}
            >
              {m.name}
            </Button>
          ))}
        </div>
        <div className="pointer-events-auto flex gap-1 rounded-lg border bg-card/85 p-1 backdrop-blur">
          {data?.weapons.map((w, i) => (
            <Button
              key={w.id}
              size="sm"
              variant={i === weaponIdx ? "default" : "ghost"}
              onClick={() => setWeaponIdx(i)}
            >
              {w.name}
            </Button>
          ))}
        </div>
      </div>

      {/* ---- HUD: velké odečty ---- */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] w-72 rounded-xl border bg-card/85 p-4 backdrop-blur">
        <Readout label="AZIMUTH" value={sol ? `${sol.azimuth.toFixed(1)}°` : "—"} big />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Readout label="MIL" value={milText} />
          <Readout
            label="DISTANCE"
            value={sol ? `${Math.round(sol.distanceMeters)} m` : "—"}
          />
        </div>
        <div
          className={cn(
            "mt-3 text-xs",
            !sol
              ? "text-muted-foreground"
              : sol.inRange
              ? "text-emerald-400"
              : "text-rose-400"
          )}
        >
          {statusText}
        </div>
      </div>

      {/* ---- panel: cíl X/Y + kopírování (vždy viditelný) ---- */}
      <div className="absolute right-0 top-0 z-[600] flex h-full w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto border-l bg-card/95 p-4 pt-16 backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
            <span className="inline-block size-2 rounded-full bg-rose-500" />
            TARGET (X / Y)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field
              k="tx"
              value={coords.tx}
              onEdit={editCoord}
              focusedRef={focusedRef}
              placeholder="X"
            />
            <Field
              k="ty"
              value={coords.ty}
              onEdit={editCoord}
              focusedRef={focusedRef}
              placeholder="Y"
            />
          </div>
        </div>

        <Button variant="outline" onClick={copyResult} disabled={!sol}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy solution"}
        </Button>

        <p className="mt-auto text-[11px] leading-relaxed text-muted-foreground">
          <b>Shift</b>+click = weapon · <b>Ctrl</b>+click / right-click = target ·
          drag points. Or type coordinates manually.
        </p>
      </div>

      {/* ---- ovládání hint + disclaimer ---- */}
      <div className="pointer-events-none absolute bottom-2 right-3 z-[500] max-w-md text-right text-[11px] leading-tight text-muted-foreground/80">
        <div>
          <b className="text-blue-400">Shift</b>+click weapon ·{" "}
          <b className="text-rose-400">Ctrl</b>+click / right-click target · drag
          points
        </div>
        <div className="mt-0.5 opacity-70">
          Unofficial fan project. Maps &amp; data © BULKHEAD.
        </div>
      </div>
    </div>
  );
}

/* ---- pomocné ---- */

// česká klávesnice: číselná řada bez Shiftu píše diakritiku → přemapuj na číslice
const CZ_DIGITS: Record<string, string> = {
  "+": "1",
  "ě": "2",
  "š": "3",
  "č": "4",
  "ř": "5",
  "ž": "6",
  "ý": "7",
  "á": "8",
  "í": "9",
  "é": "0",
};

function czToNum(s: string): string {
  return s
    .split("")
    .map((ch) => CZ_DIGITS[ch] ?? ch)
    .join("")
    .replace(",", ".");
}

function parsePoint(x: string, y: string): Point | null {
  if (x.trim() === "" || y.trim() === "") return null;
  const nx = Number(x);
  const ny = Number(y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  return { x: nx, y: ny };
}

function Readout({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-mono tabular-nums leading-none text-foreground",
          big ? "text-4xl" : "text-xl"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  k,
  value,
  onEdit,
  focusedRef,
  placeholder,
}: {
  k: keyof Coords;
  value: string;
  onEdit: (k: keyof Coords, v: string) => void;
  focusedRef: React.MutableRefObject<keyof Coords | null>;
  placeholder: string;
}) {
  return (
    <input
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onFocus={() => (focusedRef.current = k)}
      onBlur={(e) => {
        if (focusedRef.current === k) focusedRef.current = null;
        // přepiš českou diakritiku na číslice při opuštění pole
        const conv = czToNum(e.target.value);
        if (conv !== e.target.value) onEdit(k, conv);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const conv = czToNum(e.currentTarget.value);
          if (conv !== e.currentTarget.value) onEdit(k, conv);
          e.currentTarget.blur();
        }
      }}
      onChange={(e) => onEdit(k, e.target.value)}
      className="h-9 w-full rounded-md border bg-input/40 px-3 font-mono text-sm outline-none focus:ring-1 focus:ring-ring"
    />
  );
}
