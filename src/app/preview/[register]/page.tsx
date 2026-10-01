import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, Eye, ImageOff, ShieldCheck } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkerContentActions } from "@/components/worker-content-actions";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { authOptions } from "@/lib/auth";
import { canEditWorkers, canGenerateContent, isAdmin } from "@/lib/permissions";
import { CONTENT_STATUS, statusInfo } from "@/lib/status-labels";
import { ContentBridgeService, type BridgeRecord } from "@/modules/bridge/content-bridge-service";
import { getCanvaRuntimeState } from "@/modules/canva/runtime-state";
import { isWorkerTemplateCode, recommendedWorkerTemplateCode } from "@/modules/canva/template-health";
import { buildWorkerTemplateTextPreview, type RenderTextPreview } from "@/modules/canva/worker-template-render";
import { readinessFromBridge } from "@/modules/enrichment/serialization";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";
import { getActivePublishChannels, getWorkerMasterOptions } from "@/modules/master-data/service";
import { getDisplayLabels, getGoogleStorageSettings } from "@/modules/settings/service";
import { buildPublicWorkerView } from "@/modules/workers/public-view";
import { WorkerSourceService } from "@/modules/workers/source-service";
import { buildWorkflowSteps } from "@/modules/workflow/steps";

export const metadata = { title: "Preview Publik" };
export const dynamic = "force-dynamic";

type Loaded = {
  view: ReturnType<typeof buildPublicWorkerView>;
  readiness: ReturnType<typeof readinessFromBridge>;
  bridge: BridgeRecord | null;
  experienceLabel: string;
};

/** Memuat data preview; error dikembalikan sebagai kode agar bisa diterjemahkan ke langkah perbaikan. */
async function loadPreview(register: string, userId: string): Promise<{ data: Loaded } | { errorCode: string }> {
  let stage: "register" | "bridge" | "master" = "register";
  try {
    const accessToken = await getGoogleAccessToken(userId);
    const source = new WorkerSourceService({ spreadsheetId: process.env.GOOGLE_REGISTER_SPREADSHEET_ID!, accessToken });
    const worker = await source.getByRegister(register);
    if (!worker) return { errorCode: "WORKER_NOT_FOUND" };
    stage = "bridge";
    const bridge = await new ContentBridgeService({ spreadsheetId: process.env.GOOGLE_BRIDGE_SPREADSHEET_ID!, accessToken }).get(worker.workerRegister);
    stage = "master";
    const master = await getWorkerMasterOptions();
    const experienceLabel = master.experiences.find((item) => item.code === String(bridge?.experience_level ?? ""))?.name ?? "";
    return { data: { view: buildPublicWorkerView(worker, bridge, master), readiness: readinessFromBridge(bridge), bridge, experienceLabel } };
  } catch (error) {
    if (error instanceof GoogleConnectionError) return { errorCode: error.code };
    return { errorCode: stage === "register" ? "REGISTER_READ_FAILED" : stage === "bridge" ? "ENRICHMENT_READ_FAILED" : "MASTER_READ_FAILED" };
  }
}

export default async function PreviewPage({ params }: { params: Promise<{ register: string }> }) {
  const { register } = await params;
  const decoded = decodeURIComponent(register);
  const capabilities = getRuntimeCapabilities();
  const session = await getServerSession(authOptions);
  const admin = isAdmin(session?.user.role);
  const [canva, storage, labels, publishChannels] = await Promise.all([
    getCanvaRuntimeState(session?.user.id),
    getGoogleStorageSettings(),
    getDisplayLabels(),
    capabilities.database.configured ? getActivePublishChannels().catch(() => []) : Promise.resolve([]),
  ]);

  const result = capabilities.enrichment.configured && session?.user.id ? await loadPreview(decoded, session.user.id) : null;
  const data = result && "data" in result ? result.data : null;
  const errorCode = result && "errorCode" in result ? result.errorCode : null;
  const bridge = data?.bridge ?? null;
  const contentStatus = String(bridge?.content_status ?? data?.readiness.status ?? "INCOMPLETE");
  const approved = Boolean(bridge?.approved_at);
  const view = data?.view ?? null;
  // Teks akhir per template (sama dengan yang dikirim route generate) untuk dipratinjau sebelum Generate.
  const renderPreviews: Record<string, RenderTextPreview> = data && bridge
    ? Object.fromEntries(canva.templates.filter((template) => isWorkerTemplateCode(template.code)).map((template) => [
      template.code,
      buildWorkerTemplateTextPreview({ templateCode: template.code as Parameters<typeof buildWorkerTemplateTextPreview>[0]["templateCode"], view: data.view, bridge, experienceLabel: data.experienceLabel }),
    ]))
    : {};
  const steps = data ? buildWorkflowSteps({ checks: data.readiness.checks, contentStatus, approved }) : null;

  return <div className="mx-auto max-w-5xl space-y-5">
    <header>
      <Link href={`/pekerja/${encodeURIComponent(decoded)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={18} aria-hidden />Data pekerja</Link>
      <div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-brand-navy">Preview & Konten</h1><Badge>{decoded}</Badge>{data && <StatusBadge status={statusInfo(CONTENT_STATUS, contentStatus)} />}</div>
    </header>

    {steps && <WorkflowStepper workerRegister={view?.worker_register ?? decoded} steps={steps} />}

    {!capabilities.enrichment.configured && <Alert tone="warning" title="Preview belum bisa dibuka.">{admin ? "Neon, Google OAuth, Content Bridge, dan kunci enkripsi token harus siap. Periksa menu Integrasi." : "Koneksi aplikasi belum siap. Hubungi Admin."}</Alert>}
    <ErrorAlert code={errorCode} />

    <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start [&>*]:min-w-0">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Eye size={19} aria-hidden />Yang akan terlihat publik</CardTitle></CardHeader><CardContent className="space-y-4">
        {view ? <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="grid md:grid-cols-[.9fr_1.1fr]">
          <div className="aspect-[4/5] bg-slate-100">{data?.readiness.checks.profile_photo
            // eslint-disable-next-line @next/next/no-img-element -- foto privat dari API internal
            ? <img src={`/api/workers/${encodeURIComponent(view.worker_register)}/photo?type=PROFILE`} alt={`Foto ${view.name}`} className="h-full w-full object-cover" />
            : <Link href={`/pekerja/${encodeURIComponent(view.worker_register)}#foto`} className="flex h-full flex-col items-center justify-center text-slate-400 hover:text-slate-600"><ImageOff size={32} aria-hidden /><span className="mt-2 text-xs font-semibold underline">Foto profil belum ada — unggah</span></Link>}
          </div>
          <div className="flex flex-col justify-between p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-pink-600">{labels["display.ready_label"]}</p>
              <h2 className="mt-2 text-3xl font-black text-brand-navy">{view.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{view.age}{view.origin ? ` • ${view.origin}` : ""}</p>
              <p className="mt-5 text-lg font-extrabold text-brand-navy">{view.category || "Kategori belum dipilih"}</p>
              <div className="mt-3 flex flex-wrap gap-2">{view.skills.map((skill) => <span key={skill} className="rounded-full bg-brand-sky px-3 py-1 text-xs font-bold text-brand-navy">{skill}</span>)}</div>
              <div className="mt-5 text-sm"><p className="text-slate-500">{labels["display.placement_label"]}</p><p className="font-bold">{view.placement || "—"}</p><p className="mt-3 text-slate-500">{labels["display.salary_label"]}</p><p className="font-bold">{view.salary || "—"}</p></div>
            </div>
            <div className="mt-6 rounded-xl bg-brand-navy p-3 text-sm font-semibold text-white">{labels["display.footer_text"]}</div>
          </div>
        </div></div> : !errorCode && capabilities.enrichment.configured && <Alert tone="warning" title="Data preview belum tersedia.">Lengkapi data pekerja terlebih dahulu.</Alert>}
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden /><span>NIK/KTP, alamat lengkap, nomor HP pekerja, kontak darurat, scan dokumen, dan catatan sensitif tidak pernah masuk preview publik maupun Canva.</span></div>
      </CardContent></Card>

      {data && session?.user && <div className="lg:sticky lg:top-8"><WorkerContentActions
        workerRegister={view?.worker_register ?? decoded}
        contentStatus={contentStatus}
        readinessScore={data.readiness.score}
        missing={[...data.readiness.missing]}
        approved={approved}
        isAdmin={admin}
        canGenerate={canGenerateContent({ role: session.user.role, canGenerate: session.user.canGenerate })}
        canPublish={canEditWorkers(session.user.role)}
        generationConfigured={canva.ready}
        exportConfigured={Boolean(storage.exportFolderId)}
        initialExportUrl={bridge?.export_drive_url ? String(bridge.export_drive_url) : null}
        initialDesignUrl={bridge?.canva_design_url ? String(bridge.canva_design_url) : null}
        publishedChannel={bridge?.published_channel ? String(bridge.published_channel) : null}
        publishChannels={publishChannels}
        templateOptions={canva.templates}
        renderPreviews={renderPreviews}
        recommendedTemplate={recommendedWorkerTemplateCode(bridge?.category ? String(bridge.category) : null)}
      /></div>}
    </div>
  </div>;
}
