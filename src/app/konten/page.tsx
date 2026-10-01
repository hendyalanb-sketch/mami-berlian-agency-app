import { desc, eq } from "drizzle-orm";
import { ExternalLink, Image, Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { canvaTemplates, generationJobs } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Konten" };
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [template, jobs] = db ? await Promise.all([
    db.select().from(canvaTemplates).where(eq(canvaTemplates.code, "MB-01")).limit(1).then((rows) => rows[0] ?? null),
    db.select().from(generationJobs).orderBy(desc(generationJobs.createdAt)).limit(20),
  ]) : [null, []];

  return <div className="space-y-5">
    <header><h2 className="text-2xl font-bold text-[#0B1F3A]">Konten</h2><p className="mt-1 text-sm text-slate-500">Generate, riwayat, dan kegagalan Canva.</p></header>
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardHeader><CardTitle>MB-01 • Pekerja Ready</CardTitle></CardHeader><CardContent><div className="flex items-start gap-3"><div className="rounded-xl bg-pink-50 p-2 text-[#E7508B]"><Sparkles size={20}/></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">Template Canva</p><Badge>{template?.isActive ? "HEALTHY" : "LOCKED"}</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">{template ? `Design ${template.canvaTemplateId} • ${template.version}` : "Template akan tersedia setelah Neon migration + seed."}</p>{template && !template.isActive && <p className="mt-2 text-xs text-amber-700">Generate dikunci sampai OAuth Canva tersambung dan dataset MB-01 lolos health check.</p>}</div></div></CardContent></Card>
      <Card><CardContent className="flex min-h-40 flex-col items-center justify-center text-center"><Image className="text-slate-300"/><p className="mt-3 text-sm font-semibold">{jobs.length} job terbaru</p><p className="mt-1 text-xs text-slate-500">Idempotensi memakai register + versi template + content hash.</p></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Riwayat Generation</CardTitle></CardHeader><CardContent className="space-y-2">{!db && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Riwayat aktif setelah Neon terhubung.</p>}{db && jobs.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Belum ada generation job.</p>}{jobs.map((job)=><div key={job.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-[#0B1F3A]">{job.workerRegister}</p><Badge>{job.status}</Badge></div><p className="mt-1 text-xs text-slate-500">{job.templateCode} • {job.templateVersion} • {job.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p>{job.errorCode && <p className="mt-1 text-xs font-semibold text-red-600">{job.errorCode}: {job.errorMessage}</p>}</div>{job.canvaDesignId && <a href={`https://www.canva.com/design/${encodeURIComponent(job.canvaDesignId)}/edit`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-[#0B1F3A]"><ExternalLink size={14}/>Canva</a>}</div>)}</CardContent></Card>
  </div>;
}
