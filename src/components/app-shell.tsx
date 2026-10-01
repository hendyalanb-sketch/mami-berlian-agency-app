"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Image, LayoutGrid, MoreHorizontal, Plug, Settings, Users, type LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { isNavActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; match: string[] };

const main: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home, match: ["/"] },
  { href: "/pekerja", label: "Pekerja", icon: Users, match: ["/pekerja", "/preview"] },
  { href: "/konten", label: "Konten", icon: Image, match: ["/konten"] },
];
const adminItems: NavItem[] = [
  { href: "/master", label: "Master Data", icon: LayoutGrid, match: ["/master"] },
  { href: "/integrasi", label: "Integrasi", icon: Plug, match: ["/integrasi", "/canva-connected"] },
  { href: "/audit", label: "Audit", icon: Activity, match: ["/audit"] },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, match: ["/pengaturan"] },
];
const more: NavItem = { href: "/lainnya", label: "Lainnya", icon: MoreHorizontal, match: ["/lainnya", ...adminItems.flatMap((item) => item.match)] };

export type ShellUser = { name?: string | null; email?: string | null; role?: string | null };

const roleLabel: Record<string, string> = { ADMIN: "Admin", STAFF: "Staf", VIEWER: "Viewer" };

export function AppShell({ children, admin = false, user }: { children: React.ReactNode; admin?: boolean; user?: ShellUser | null }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return <div className="min-h-screen bg-app-bg text-slate-900">{children}</div>;

  const sideLink = (item: NavItem) => {
    const active = isNavActive(pathname, item);
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium", active ? "bg-brand-sky text-brand-navy" : "text-slate-600 hover:bg-slate-50")}><Icon size={18} aria-hidden />{item.label}</Link>;
  };

  return <div className="min-h-screen bg-app-bg text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
      <div className="mb-8 px-3"><p className="text-xs font-bold tracking-[0.2em] text-brand-pink">MAMI BERLIAN</p><p className="mt-1 text-lg font-bold text-brand-navy">Content Operations</p></div>
      <nav aria-label="Menu utama" className="space-y-1">{main.map(sideLink)}</nav>
      {admin && <nav aria-label="Administrasi" className="mt-6 space-y-1"><p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Administrasi</p>{adminItems.map(sideLink)}</nav>}
      <div className="mt-auto border-t border-slate-100 pt-4">
        {user && <div className="px-3 pb-2"><p className="truncate text-sm font-semibold text-brand-navy">{user.name || user.email}</p><p className="truncate text-xs text-slate-500">{user.role ? roleLabel[user.role] ?? user.role : ""}{user.name && user.email ? ` • ${user.email}` : ""}</p></div>}
        <LogoutButton />
      </div>
    </aside>
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
    <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">{[...main, more].map((item) => {
      const active = isNavActive(pathname, item);
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium", active ? "text-brand-navy" : "text-slate-500")}><span className={cn("rounded-full px-4 py-1", active && "bg-brand-sky")}><Icon size={20} aria-hidden /></span><span className={cn(active && "font-bold")}>{item.label}</span></Link>;
    })}</nav>
  </div>;
}
