import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: { default: "Mami Berlian Content Operations", template: "%s | Mami Berlian" },
  description: "Content Operations & Worker Enrichment Platform Mami Berlian Agency",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0B1F3A", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return <html lang="id"><body className={geist.className}><PwaRegister/><AppShell admin={isAdmin(session?.user.role)}>{children}</AppShell></body></html>;
}
