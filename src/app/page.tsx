import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = ["Total Pekerja", "Belum Lengkap", "Siap Konten", "Generate Gagal"];

export default function DashboardPage() {
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Badge className="border-pink-100 bg-pink-50 text-[#B8326A]">MVP v3</Badge><h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B1F3A] sm:text-3xl">Content Operations</h2><p className="mt-1 text-sm text-slate-500">Pekerja → Lengkap → Foto → Ready → Konten</p></div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-400 shadow-sm"><Search size={18}/><span>Cari nomor register atau nama</span></div>
    </header>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((label) => <Card key={label}><CardContent className="p-4 sm:p-5"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1F3A]">—</p><p className="mt-1 text-[11px] text-slate-400">Menunggu sinkronisasi runtime</p></CardContent></Card>)}
    </section>
    <section className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
      <Card><CardHeader><CardTitle>Perlu Dikerjakan</CardTitle></CardHeader><CardContent><div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5"><p className="font-semibold text-slate-800">Hubungkan Google OAuth untuk mulai membaca Register</p><p className="mt-1 text-sm text-slate-500">Register tetap read-only. Enrichment akan disimpan ke Content Bridge.</p><div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F3A]">Lihat Integrasi <ArrowRight size={16}/></div></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Privacy Guard</CardTitle></CardHeader><CardContent><div className="flex gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ShieldCheck size={20}/></div><div><p className="text-sm font-semibold">Whitelist public projection</p><p className="mt-1 text-xs leading-5 text-slate-500">NIK, alamat lengkap, nomor HP, kontak darurat, dan dokumen identitas diblok dari Canva.</p></div></div></CardContent></Card>
    </section>
  </div>;
}
