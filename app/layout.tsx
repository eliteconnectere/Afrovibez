import type { Metadata, Viewport } from "next";
import "./globals.css";

// Keep pinch-to-zoom available for mobile accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export const metadata: Metadata = {
  title: "AfroVibez — Feel the rhythm",
  description: "Discover and stream full-length music releases approved through AfroVibe Studio.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AfroVibez" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
