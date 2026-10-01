"use client";

import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkerContentActions } from "@/components/worker-content-actions";
import { WorkerEnrichmentForm, type EnrichmentPayload } from "@/components/worker-enrichment-flow";
import { WorkerPhotoPrep } from "@/components/worker-photo-prep";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { CopyPresetsEditor } from "@/components/copy-presets-editor";
import { CONTENT_STATUS } from "@/lib/status-labels";
import { COPY_PRESETS_DEFAULTS } from "@/modules/content/copy-presets";
import { buildWorkflowSteps } from "@/modules/workflow/steps";

// Galeri komponen dengan data contoh FIKTIF (tanpa PII) untuk cek tampilan 360/390/412 px
// sebelum staging tersedia. Tidak tersedia di production (Keputusan D2, docs/UI_UX_PLAN.md).

const options = (names: string[]) => names.map((name) => ({ code: name.toUpperCase().replace(/\W+/g, "_"), name }));
const fixture: EnrichmentPayload = {
  worker: { name: "Contoh Pekerja", workerRegister: "DEMO-001", origin: "Kota Contoh", age: "30", status: "Tersedia", categoryMappingRequired: false, legacyCategoryCode: null },
  master: {
    categories: options(["ART", "Babysitter", "Suster Lansia"]),
    skills: options(["Masak", "Bersih Rumah", "Momong Anak", "Setrika", "Merawat Lansia"]),
    experiences: options(["Pemula", "Pengalaman"]),
    placements: options(["Surabaya", "Sidoarjo", "Seluruh Indonesia"]),
  },
  form: { category: "ART", experience: "", skills: ["MASAK"], placement: "", publicationConsent: false, publicTitle: "", workerQuote: "", specialty: "", liveInStatus: "", availability: "", trainingStatus: "", documentStatus: "" },
  salaryDisplay: "",
  contentStatus: "INCOMPLETE",
  readiness: { status: "INCOMPLETE", score: 43, missing: ["experience", "placement", "salary", "profile_photo"], checks: { category: true, skills: true, publication_consent: false } },
};
const fullChecks = { category: true, experience: true, skills: true, placement: true, salary: true, profile_photo: true, publication_consent: true };
const templates = [{ code: "MB-01A", name: "MB-01A — Personal", version: "v1", designId: "DEMO" }, { code: "MB-01B", name: "MB-01B — Promo", version: "v1", designId: "DEMO" }];
const channels = [{ code: "INSTAGRAM", name: "Instagram" }, { code: "TIKTOK", name: "TikTok" }];
const actionBase = { workerRegister: "DEMO-001", readinessScore: 100, missing: [], isAdmin: true, canGenerate: true, canPublish: true, generationConfigured: true, exportConfigured: true, publishChannels: channels, templateOptions: templates };

export function DevUiGallery() {
  return <div className="space-y-8">
    <header><h1 className="text-2xl font-bold text-brand-navy">Galeri UI (dev)</h1><p className="mt-1 text-sm text-slate-500">Data fiktif. Halaman ini tidak ada di production.</p></header>

    <section className="space-y-3"><h2 className="font-bold">Stepper</h2>
      <WorkflowStepper workerRegister="DEMO-001" steps={buildWorkflowSteps({ checks: { category: true }, contentStatus: "INCOMPLETE", approved: false })} />
      <WorkflowStepper workerRegister="DEMO-001" steps={buildWorkflowSteps({ checks: fullChecks, contentStatus: "ERROR", approved: true })} />
    </section>

    <section className="space-y-3"><h2 className="font-bold">Status & pesan</h2>
      <div className="flex flex-wrap gap-2">{Object.values(CONTENT_STATUS).map((status) => <StatusBadge key={status.label} status={status} />)}</div>
      <ErrorAlert code="GOOGLE_RECONNECT_REQUIRED" />
      <ErrorAlert code="RATE_NOT_FOUND" />
      <ErrorAlert code="SOMETHING_UNKNOWN" />
      <Alert tone="success" title="Tersimpan ke Content Bridge." />
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr] [&>*]:min-w-0">
      <Card><CardHeader><CardTitle>Data pekerja</CardTitle></CardHeader><CardContent><WorkerEnrichmentForm workerRegister="DEMO-001" data={fixture} editable onSaved={() => undefined} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Foto</CardTitle></CardHeader><CardContent><WorkerPhotoPrep workerRegister="DEMO-001" driveEnabled editable /></CardContent></Card>
    </section>

    <section className="space-y-3"><h2 className="font-bold">Master: rekomendasi teks</h2>
      <CopyPresetsEditor presets={COPY_PRESETS_DEFAULTS} categories={fixture.master.categories.map((item) => ({ ...item, isActive: true }))} busy={false} onSave={async () => true} />
    </section>

    <section className="space-y-3"><h2 className="font-bold">Workflow Konten per status</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <WorkerContentActions {...actionBase} contentStatus="INCOMPLETE" readinessScore={57} missing={["placement", "profile_photo"]} approved={false} />
        <WorkerContentActions {...actionBase} contentStatus="READY" approved={false} />
        <WorkerContentActions {...actionBase} contentStatus="APPROVED" approved />
        <WorkerContentActions {...actionBase} contentStatus="GENERATED" approved initialDesignUrl="https://www.canva.com" />
        <WorkerContentActions {...actionBase} contentStatus="ARCHIVED" approved initialExportUrl="https://drive.google.com" />
        <WorkerContentActions {...actionBase} contentStatus="APPROVED" approved canGenerate={false} />
      </div>
    </section>
  </div>;
}
