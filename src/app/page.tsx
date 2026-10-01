import Link from "next/link";
import { getServerSession } from "next-auth";
import { count, desc, gte, inArray } from "drizzle-orm";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { db } from "@/db/client";
import { canvaTemplates, generationJobs } from "@/db/schema";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { JOB_STATUS, statusInfo } from "@/lib/status-labels";
import { CANVA_WORKER_TEMPLATE_CODES } from "@/modules/canva/template-health";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const dynamic = "force-dynamic";

const IN_PROGRESS = ["QUEUED", "PREPARING", "UPLOADING_PHOTO", "CREATING_CANVA_DESIGN", "FINALIZING"] as const;

async function loadDashboard() {
  if (!db) return null;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [statusRows, activeTemplates, recent] = await Promise.all([
    db.select({ status: generationJobs.status, total: count() }).from(generationJobs).where(gte(generationJobs.createdAt, since)).groupBy(generationJobs.status),
    db.select({ code: canvaTemplates.code, isActive: canvaTemplates.isActive }).from(canvaTemplates).where(inArray(canvaTemplates.code, [...CANVA_WORKER_TEMPLATE_CODES])),
    db.select().from(generationJobs).where(gte(generationJobs.createdAt, since)).orderBy(desc(generationJobs.createdAt)).limit(5),
  ]);
  const byStatus = (statuses: readonly string[]) => statusRows.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + Number(row.total), 0);
  return {
    done: byStatus(["DONE"]),
    failed: byStatus(["ERROR"]),
    inProgress: byStatus(IN_PROGRESS),
    templatesReady: activeTemplates.filter((row) => row.isActive).length,
    recent,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const admin = isAdmin(session?.user.role);
  const capabilities = getRuntimeCapabilities();
  const stats = await loadDashboard().catch(() => null);
  const setupIncomplete = !capabilities.database.configured || !capabilities.registerRead.configured || !capabilities.enrichment.configured;
  const firstName = session?.user.name?.split(/\s+/)[0];

  const metrics = stats ? [
    { label: "Desain dibuat", value: stats.done, hint: "7 hari terakhir" },
    { label: "Sedang diproses", value: stats.inProgress, hint: "di Canva" },
    { label: "Generate gagal", value: stats.failed, hint: "7 hari terakhir", alert: stats.failed > 0 },
    { label: "Template siap", value: `${stats.templatesReady}/${CANVA_WORKER_TEMPLATE_CODES.length}`, hint: "MB-01A & MB-01B", alert: stats.templatesReady === 0 },
  ] : [];

  return <div className="space-y-6">
    <header className="space-y-4">
      <div><p className="text-xs font-bold tracking-[0.2em] text-brand-pink lg:hidden">MAMI BERLIAN</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">{firstName ? `Halo, ${firstName}` : "Content Operations"}</h1><p className="mt-1 text-sm text-slate-500">Pekerja → Data → Foto → Setujui → Generate → Export → Publikasi</p></div>
      <Link href="/pekerja" className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm hover:border-slate-300 sm:max-w-md"><Search size={18} aria-hidden /><span className="flex-1">Cari nomor register atau nama pekerja</span><ArrowRight size={16} className="text-slate-400" aria-hidden /></Link>
    </header>

    {setupIncomplete && (admin
      ? <Alert tone="warning" title="Aplikasi belum selesai dikonfigurasi."><p>Beberapa koneksi (Neon, Google, atau Canva) belum siap, jadi pencarian dan generate belum bisa dipakai.</p><Link href="/integrasi" className="mt-1 inline-flex min-h-8 items-center gap-1 font-bold underline underline-offset-2">Selesaikan di Integrasi <ArrowRight size={14} aria-hidden /></Link></Alert>
      : <Alert tone="warning" title="Aplikasi belum siap dipakai.">Koneksi aplikasi sedang disiapkan. Hubungi Admin.</Alert>)}

    {stats && <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => <Card key={metric.label}><CardContent className="p-4 sm:p-5"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className={`mt-2 text-2xl font-bold ${metric.alert ? "text-red-600" : "text-brand-navy"}`}>{metric.value}</p><p className="mt-1 text-[11px] text-slate-400">{metric.hint}</p></CardContent></Card>)}
    </section>}

    <section className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Generate terbaru</CardTitle><Link href="/konten" className="-my-2 inline-flex min-h-10 items-center px-2 text-xs font-bold text-brand-navy hover:underline">Lihat semua</Link></CardHeader><CardContent>
        {!stats || stats.recent.length === 0
          ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5"><p className="font-semibold text-slate-800">Belum ada desain minggu ini</p><p className="mt-1 text-sm text-slate-500">Mulai dari mencari pekerja, lengkapi data & fotonya, lalu Generate.</p><Link href="/pekerja" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-navy">Cari pekerja <ArrowRight size={16} aria-hidden /></Link></div>
          : <ul className="space-y-2">{stats.recent.map((job) => <li key={job.id}><Link href={`/preview/${encodeURIComponent(job.workerRegister)}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"><span className="min-w-0"><span className="block text-sm font-bold text-brand-navy">{job.workerRegister}</span><span className="block text-xs text-slate-500">{job.templateCode} • {job.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</span></span><StatusBadge status={statusInfo(JOB_STATUS, job.status)} /></Link></li>)}</ul>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Privasi terjaga</CardTitle></CardHeader><CardContent><div className="flex gap-3"><div className="h-fit rounded-xl bg-emerald-50 p-2 text-emerald-700"><ShieldCheck size={20} aria-hidden /></div><p className="text-xs leading-5 text-slate-500">NIK, alamat lengkap, nomor HP, kontak darurat, dan dokumen identitas pekerja tidak pernah dikirim ke Canva atau tampil di konten publik.</p></div></CardContent></Card>
    </section>
  </div>;
}
