import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, Eye, ShieldCheck, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkerContentActions } from "@/components/worker-content-actions";
import { authOptions } from "@/lib/auth";
import { canGenerateContent, isAdmin } from "@/lib/permissions";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { getCanvaRuntimeState } from "@/modules/canva/runtime-state";
import { readinessFromBridge } from "@/modules/enrichment/serialization";
import { getGoogleAccessToken } from "@/modules/google/oauth-token-service";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";
import { getActivePublishChannels, getWorkerMasterOptions } from "@/modules/master-data/service";
import { getDisplayLabels, getGoogleStorageSettings } from "@/modules/settings/service";
import { buildPublicWorkerView } from "@/modules/workers/public-view";
import { WorkerSourceService } from "@/modules/workers/source-service";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ register: string }> }) {
  const { register } = await params;
  const decoded = decodeURIComponent(register);
  const capabilities = getRuntimeCapabilities();
  const session = await getServerSession(authOptions);
  const [canva, storage, labels, publishChannels] = await Promise.all([
    getCanvaRuntimeState(session?.user.id),
    getGoogleStorageSettings(),
    getDisplayLabels(),
    capabilities.database.configured ? getActivePublishChannels().catch(() => []) : Promise.resolve([]),
  ]);
  let view: ReturnType<typeof buildPublicWorkerView> | null = null;
  let readiness: ReturnType<typeof readinessFromBridge> | null = null;
  let contentStatus = "INCOMPLETE";
  let approved = false;
  let exportUrl: string | null = null;

  if (capabilities.enrichment.configured && session?.user.id) {
    try {
      const accessToken = await getGoogleAccessToken(session.user.id);
      const source = new WorkerSourceService({ spreadsheetId: process.env.GOOGLE_REGISTER_SPREADSHEET_ID!, accessToken });
      const bridgeService = new ContentBridgeService({ spreadsheetId: process.env.GOOGLE_BRIDGE_SPREADSHEET_ID!, accessToken });
      const worker = await source.getByRegister(decoded);
      const bridge = worker ? await bridgeService.get(worker.workerRegister) : null;
      if (worker) {
        const master = await getWorkerMasterOptions();
        view = buildPublicWorkerView(worker, bridge, master);
        readiness = readinessFromBridge(bridge);
        contentStatus = String(bridge?.content_status ?? readiness.status);
        approved = Boolean(bridge?.approved_at);
        exportUrl = bridge?.export_drive_url ? String(bridge.export_drive_url) : null;
      }
    } catch {}
  }

  return <div className="mx-auto max-w-3xl space-y-5">
    <header><Link href={`/pekerja/${encodeURIComponent(decoded)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={18}/>Detail pekerja</Link><div className="mt-2 flex items-center gap-2"><h2 className="text-2xl font-bold text-[#0B1F3A]">Preview Publik</h2><Badge>{contentStatus}</Badge></div></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Eye size={19}/>Yang akan terlihat publik</CardTitle></CardHeader><CardContent className="space-y-4">
      {view ? <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="grid md:grid-cols-[.9fr_1.1fr]"><div className="aspect-[4/5] bg-slate-100">{view.photo_asset_id ? <img src={`/api/workers/${encodeURIComponent(view.worker_register)}/photo?type=PROFILE`} alt={`Foto ${view.name}`} className="h-full w-full object-cover"/> : <div className="flex h-full flex-col items-center justify-center text-slate-400"><ImageOff size={32}/><span className="mt-2 text-xs">Foto profil belum ada</span></div>}</div><div className="flex flex-col justify-between p-5"><div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-600">{labels["display.ready_label"]}</p><h3 className="mt-2 text-3xl font-black text-[#0B1F3A]">{view.name}</h3><p className="mt-1 text-sm text-slate-500">{view.age}{view.origin ? ` • ${view.origin}` : ""}</p><p className="mt-5 text-lg font-extrabold text-[#0B1F3A]">{view.category}</p><div className="mt-3 flex flex-wrap gap-2">{view.skills.map((skill)=><span key={skill} className="rounded-full bg-[#EEF4FB] px-3 py-1 text-xs font-bold text-[#0B1F3A]">{skill}</span>)}</div><div className="mt-5 text-sm"><p className="text-slate-500">{labels["display.placement_label"]}</p><p className="font-bold">{view.placement || "—"}</p><p className="mt-3 text-slate-500">{labels["display.salary_label"]}</p><p className="font-bold">{view.salary || "—"}</p></div></div><div className="mt-6 rounded-xl bg-[#0B1F3A] p-3 text-sm font-semibold text-white">{labels["display.footer_text"]}</div></div></div></div> : <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-800">Data preview belum dapat dimuat. Lengkapi koneksi dan enrichment pekerja terlebih dahulu.</div>}
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><ShieldCheck className="mt-0.5 shrink-0" size={18}/><span>NIK/KTP, alamat lengkap, nomor HP pekerja, kontak darurat, scan dokumen, dan catatan sensitif tidak masuk public projection.</span></div>
    </CardContent></Card>
    {readiness && session?.user && <WorkerContentActions workerRegister={decoded} contentStatus={contentStatus} readinessScore={readiness.score} missing={[...readiness.missing]} approved={approved} isAdmin={isAdmin(session.user.role)} canGenerate={canGenerateContent({ role: session.user.role, canGenerate: session.user.canGenerate })} generationConfigured={canva.ready} exportConfigured={Boolean(storage.exportFolderId)} initialExportUrl={exportUrl} publishChannels={publishChannels} templateOptions={canva.templates}/>} 
  </div>;
}
