import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: { default: "Mami Berlian Content Operations", template: "%s | Mami Berlian" },
  description: "Content Operations & Worker Enrichment Platform Mami Berlian Agency",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0B1F3A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={geist.className}><AppShell>{children}</AppShell></body></html>;
}
