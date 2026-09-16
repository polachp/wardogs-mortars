import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WARDOGS Fire Control",
  description:
    "Zaměření minometu (L81) a děla (SPH-2) pro WARDOGS — vzdálenost, azimut, náměr (MIL). Unofficial fan project.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className="dark">
      <body>{children}</body>
    </html>
  );
}
