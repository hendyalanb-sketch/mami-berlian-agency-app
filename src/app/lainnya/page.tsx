import Link from "next/link";
import { getServerSession } from "next-auth";
import { Activity, ChevronRight, LayoutGrid, Plug, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export const metadata = { title: "Lainnya" };
export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = { ADMIN: "Admin", STAFF: "Staf", VIEWER: "Viewer" };
const adminItems = [
  { label: "Master Data", description: "Kategori, gaji, mapping, template", href: "/master", icon: LayoutGrid },
  { label: "Integrasi", description: "Neon, Google, Canva", href: "/integrasi", icon: Plug },
  { label: "Audit", description: "Riwayat perubahan", href: "/audit", icon: Activity },
  { label: "Pengaturan", description: "User, role, izin Generate", href: "/pengaturan", icon: Settings },
];

export default async function MorePage() {
  const session = await getServerSession(authOptions);
  const admin = isAdmin(session?.user.role);
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold text-brand-navy">Lainnya</h1></header>
    {session?.user && <Card><CardContent className="p-4"><p className="font-semibold text-brand-navy">{session.user.name || session.user.email}</p><p className="mt-0.5 text-xs text-slate-500">{roleLabel[session.user.role] ?? session.user.role}{session.user.name ? ` • ${session.user.email}` : ""}</p></CardContent></Card>}
    {admin && <Card><CardContent className="p-2"><p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Administrasi</p><ul>{adminItems.map(({ label, description, href, icon: Icon }) => <li key={href}><Link href={href} className="flex min-h-14 items-center gap-3 rounded-xl px-3 hover:bg-slate-50"><Icon size={18} className="text-slate-500" aria-hidden /><span className="flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-slate-500">{description}</span></span><ChevronRight size={17} className="text-slate-400" aria-hidden /></Link></li>)}</ul></CardContent></Card>}
    <Card><CardContent className="p-2"><LogoutButton /></CardContent></Card>
  </div>;
}
