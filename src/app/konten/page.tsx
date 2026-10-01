import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { ExternalLink, Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { canvaTemplates, generationJobs } from "@/db/schema";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getErrorInfo } from "@/lib/error-messages";
import { JOB_STATUS, TEMPLATE_STATUS, statusInfo } from "@/lib/status-labels";
import { CANVA_WORKER_TEMPLATE_CODES, WORKER_TEMPLATE_CONTRACTS } from "@/modules/canva/template-health";

export const metadata = { title: "Konten" };
export const dynamic = "force-dynamic";

const templateDescription: Record<string, string> = {
  "MB-01A": "Profil personal: quote, usia, asal, spesialisasi.",
  "MB-01B": "Promo: nama, pengalaman, skill, ketersediaan, dokumen.",
};

export default async function ContentPage() {
  const [templates, jobs] = db ? await Promise.all([
    db.select().from(canvaTemplates).where(inArray(canvaTemplates.code, [...CANVA_WORKER_TEMPLATE_CODES])),
    db.select().from(generationJobs).orderBy(desc(generationJobs.createdAt)).limit(20),
  ]) : [[], []];
  const templateByCode = new Map(templates.map((template) => [template.code, template]));

  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold text-brand-navy">Konten</h1><p className="mt-1 text-sm text-slate-500">Template Canva dan riwayat pembuatan desain.</p></header>

    <section aria-label="Template Canva" className="grid gap-4 md:grid-cols-2">
      {CANVA_WORKER_TEMPLATE_CODES.map((code) => {
        const template = templateByCode.get(code);
        const ready = Boolean(template?.isActive && template.canvaTemplateId);
        return <Card key={code}><CardContent className="flex items-start gap-3 p-5">
          <div className="rounded-xl bg-pink-50 p-2 text-brand-pink"><Sparkles size={20} aria-hidden /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-brand-navy">{template?.name ?? WORKER_TEMPLATE_CONTRACTS[code].name}</p><StatusBadge status={TEMPLATE_STATUS[String(ready) as "true" | "false"]} /></div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{templateDescription[code]}</p>
            {template && <p className="mt-1 text-xs text-slate-400">Versi {template.version} • Design {template.canvaTemplateId}</p>}
            {!template && <p className="mt-2 text-xs text-amber-700">Belum terdaftar di Master Data. Admin perlu menambahkannya di Master Data → Konten.</p>}
            {template && !ready && <p className="mt-2 text-xs text-amber-700">Terkunci sampai Canva terhubung dan field Autofill template lolos health check di menu Integrasi.</p>}
          </div>
        </CardContent></Card>;
      })}
    </section>

    <Card><CardHeader><CardTitle>Riwayat Generate</CardTitle></CardHeader><CardContent className="space-y-2">
      {!db && <Alert tone="warning" title="Riwayat belum tersedia.">Database Neon belum terhubung. Hubungi Admin.</Alert>}
      {db && jobs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada desain yang dibuat. Mulai dari menu <Link href="/pekerja" className="font-semibold text-brand-navy underline">Pekerja</Link>.</p>}
      {jobs.map((job) => {
        const error = job.errorCode ? getErrorInfo(job.errorCode) : null;
        return <div key={job.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Link href={`/preview/${encodeURIComponent(job.workerRegister)}`} className="text-sm font-bold text-brand-navy hover:underline">{job.workerRegister}</Link><StatusBadge status={statusInfo(JOB_STATUS, job.status)} /></div>
            <p className="mt-1 text-xs text-slate-500">{job.templateCode} • {job.templateVersion} • {job.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
            {error && <p className="mt-1 text-xs font-semibold text-red-600">{error.title} <span className="font-normal text-slate-600">{error.action}</span></p>}
          </div>
          {job.canvaDesignId && <a href={`https://www.canva.com/design/${encodeURIComponent(job.canvaDesignId)}/edit`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-brand-navy"><ExternalLink size={14} aria-hidden />Buka di Canva</a>}
        </div>;
      })}
    </CardContent></Card>
  </div>;
}
