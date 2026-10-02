import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Activity, Search, X } from "lucide-react";
import { db } from "@/db/client";
import { appUsers, auditLogs } from "@/db/schema";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auditActionLabel } from "@/lib/status-labels";
import { canonicalizeWorkerRegister } from "@/modules/workers/register-normalization";

export const metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ worker?: string }> }) {
  const { worker } = await searchParams;
  const workerFilter = worker?.trim() ? canonicalizeWorkerRegister(worker) : "";
  const logs = db
    ? await db.select({ log: auditLogs, actorEmail: appUsers.email, actorName: appUsers.name })
      .from(auditLogs)
      .leftJoin(appUsers, eq(auditLogs.userId, appUsers.id))
      .where(workerFilter ? eq(auditLogs.workerRegister, workerFilter) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100)
    : [];

  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold text-brand-navy">Audit Log</h1><p className="mt-1 text-sm text-slate-500">100 aktivitas terbaru yang mengubah data atau status konten.</p></header>
    <form method="get" role="search" className="flex gap-2">
      <div className="relative flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden /><Input name="worker" defaultValue={worker ?? ""} placeholder="Filter nomor register pekerja" aria-label="Filter nomor register pekerja" className="pl-9" /></div>
      <Button type="submit" variant="secondary">Filter</Button>
      {workerFilter && <Link href="/audit" aria-label="Hapus filter" className="inline-flex min-h-11 items-center rounded-xl px-3 text-slate-500 hover:bg-slate-100"><X size={18} /></Link>}
    </form>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity size={18} aria-hidden />{workerFilter ? `Aktivitas ${workerFilter}` : "Aktivitas"}</CardTitle></CardHeader><CardContent className="space-y-2">
      {!db && <Alert tone="warning" title="Audit belum tersedia.">Database Neon belum terhubung.</Alert>}
      {db && logs.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">{workerFilter ? "Tidak ada aktivitas untuk pekerja ini." : "Belum ada aktivitas."}</p>}
      <ul className="space-y-2">{logs.map(({ log, actorEmail, actorName }) => <li key={log.id} className="rounded-xl border border-slate-100 p-3">
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-brand-navy">{auditActionLabel(log.action)}</p>{log.workerRegister && <Link href={`/audit?worker=${encodeURIComponent(log.workerRegister)}`}><Badge className="hover:bg-slate-100">{log.workerRegister}</Badge></Link>}</div>
        <p className="mt-1 text-xs text-slate-500">{log.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} • {actorName || actorEmail || "Sistem"}{log.entityId && !log.workerRegister ? ` • ${log.entityId}` : ""}</p>
      </li>)}</ul>
    </CardContent></Card>
  </div>;
}
