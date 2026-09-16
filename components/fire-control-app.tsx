"use client";

import dynamic from "next/dynamic";

// Leaflet sahá na window → jen klient, žádné SSR.
const FireControl = dynamic(
  () => import("./fire-control").then((m) => m.FireControl),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-dvh place-items-center text-muted-foreground">
        Načítám mapu…
      </div>
    ),
  }
);

export function FireControlApp() {
  return <FireControl />;
}
