import { Search, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Pekerja" };

export default function WorkerPage() {
  return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Pekerja</h2><p className="mt-1 text-sm text-slate-500">Sumber identitas: REGISTER PEKERJA MAJIKAN (read-only).</p></header><div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm"><Search size={18} className="text-slate-400"/><input className="w-full bg-transparent text-sm outline-none" placeholder="Cari nomor register, nama, asal, atau status" disabled /></div><Card><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><div className="rounded-2xl bg-[#EEF4FB] p-4 text-[#0B1F3A]"><UserRound size={28}/></div><h3 className="mt-4 font-semibold">WorkerSource belum diaktifkan</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Setelah Google OAuth dikonfigurasi, halaman ini memakai pencarian server-side dan tidak memuat seluruh Register ke browser.</p></CardContent></Card></div>;
}
