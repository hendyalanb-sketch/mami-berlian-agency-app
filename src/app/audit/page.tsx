import { desc } from "drizzle-orm";
import { Activity } from "lucide-react";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = db ? await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100) : [];
  return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-brand-navy">Audit Log</h2><p className="mt-1 text-sm text-slate-500">100 aktivitas terbaru yang mengubah data atau status operasional.</p></header><Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity size={18}/>Aktivitas</CardTitle></CardHeader><CardContent className="space-y-2">{!db&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Audit aktif setelah Neon terhubung.</p>}{db&&logs.length===0&&<p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Belum ada audit log.</p>}{logs.map((log)=><div key={log.id} className="rounded-xl border border-slate-100 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-brand-navy">{log.action}</p><Badge>{log.entityType}</Badge>{log.workerRegister&&<Badge>{log.workerRegister}</Badge>}</div><p className="mt-1 text-xs text-slate-500">{log.createdAt.toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})}{log.entityId?` • ${log.entityId}`:""}</p></div>)}</CardContent></Card></div>;
}
