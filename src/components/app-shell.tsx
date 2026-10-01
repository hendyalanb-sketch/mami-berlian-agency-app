"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Image, LayoutGrid, MoreHorizontal, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const main = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pekerja", label: "Pekerja", icon: Users },
  { href: "/konten", label: "Konten", icon: Image },
  { href: "/lainnya", label: "Lainnya", icon: MoreHorizontal },
];
const desktop = [
  ...main.slice(0, 3),
  { href: "/master", label: "Master Data", icon: LayoutGrid },
  { href: "/integrasi", label: "Integrasi", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return <div className="min-h-screen bg-[#F7F9FC] text-slate-900">{children}</div>;
  return <div className="min-h-screen bg-[#F7F9FC] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 lg:block">
      <div className="mb-8 px-3"><p className="text-xs font-bold tracking-[0.2em] text-[#E7508B]">MAMI BERLIAN</p><h1 className="mt-1 text-lg font-bold text-[#0B1F3A]">Content Operations</h1></div>
      <nav className="space-y-1">{desktop.map(({href,label,icon:Icon})=>{const active=pathname===href;return <Link key={href} href={href} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",active?"bg-[#EEF4FB] text-[#0B1F3A]":"text-slate-600 hover:bg-slate-50")}><Icon size={18}/>{label}</Link>;})}</nav>
    </aside>
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">{main.map(({href,label,icon:Icon})=>{const active=pathname===href;return <Link key={href} href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium",active?"text-[#0B1F3A]":"text-slate-500")}><Icon size={20}/><span>{label}</span></Link>;})}</nav>
  </div>;
}
