import Link from "next/link";
import { ArrowLeft, Camera, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadinessCard } from "@/components/readiness-card";

export default async function WorkerDetailPage({ params }: { params: Promise<{ register: string }> }) {
  const { register } = await params;
  return <div className="space-y-5"><header><Link href="/pekerja" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={18}/>Pekerja</Link><div className="mt-2 flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-[#0B1F3A]">Detail Pekerja</h2><Badge>{decodeURIComponent(register)}</Badge></div><p className="mt-1 text-sm text-slate-500">Data sensitif tidak ditampilkan pada public preview.</p></header><div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-4"><Card><CardHeader><CardTitle>Alur Enrichment</CardTitle></CardHeader><CardContent className="space-y-2">{["1  Data","2  Kategori & Keahlian","3  Penempatan & Rate","4  Foto","5  Preview"].map((step,idx)=><button key={step} disabled className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 px-4 text-left text-sm font-semibold text-slate-700 disabled:opacity-70"><span>{step}</span>{idx===3?<Camera size={17}/>:<ChevronRight size={17}/>}</button>)}<p className="pt-2 text-xs leading-5 text-slate-500">Form aktif setelah Google OAuth, Bridge, dan master Neon terkoneksi. Opsi bisnis tidak akan di-hardcode di UI.</p></CardContent></Card></div><ReadinessCard/></div></div>;
}
