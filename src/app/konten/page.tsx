import { Image, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Konten" };
export default function ContentPage() {
  return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Konten</h2><p className="mt-1 text-sm text-slate-500">Generate, riwayat, dan kegagalan Canva.</p></header><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>MB-01 • Pekerja Ready</CardTitle></CardHeader><CardContent><div className="flex items-start gap-3"><div className="rounded-xl bg-pink-50 p-2 text-[#E7508B]"><Sparkles size={20}/></div><div><p className="text-sm font-semibold">Template sumber ditemukan</p><p className="mt-1 text-xs leading-5 text-slate-500">Autofill field belum tersedia pada desain sumber; template health harus valid sebelum tombol Generate dibuka.</p></div></div></CardContent></Card><Card><CardContent className="flex min-h-40 flex-col items-center justify-center text-center"><Image className="text-slate-300"/><p className="mt-3 text-sm font-semibold">Belum ada generation job</p><p className="mt-1 text-xs text-slate-500">Job akan dicatat di Neon dan bersifat idempotent.</p></CardContent></Card></div></div>;
}
