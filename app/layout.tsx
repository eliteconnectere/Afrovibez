import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfroVibez — Feel the rhythm",
  description: "Discover and stream full-length music releases approved through AfroVibe Studio.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AfroVibez" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
