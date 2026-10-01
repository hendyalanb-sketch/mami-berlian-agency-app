"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, ClipboardList, Loader2, TriangleAlert } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkerEnrichmentForm, type EnrichmentPayload, type EnrichmentSaveResult } from "@/components/worker-enrichment-flow";
import { WorkerPhotoPrep } from "@/components/worker-photo-prep";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { CONTENT_STATUS, statusInfo } from "@/lib/status-labels";
import { buildWorkflowSteps } from "@/modules/workflow/steps";

async function fetchEnrichment(workerRegister: string, signal?: AbortSignal) {
  const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/enrichment`, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "LOAD_FAILED");
  return body as EnrichmentPayload;
}

export function WorkerWorkspace({ workerRegister, enabled, editable, driveEnabled, isAdmin }: {
  workerRegister: string;
  enabled: boolean;
  editable: boolean;
  driveEnabled: boolean;
  isAdmin: boolean;
}) {
  const [data, setData] = useState<EnrichmentPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback((signal?: AbortSignal) => fetchEnrichment(workerRegister, signal)
    .then((body) => { setData(body); setError(null); return body; })
    .catch((cause) => { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "LOAD_FAILED"); return null; })
    .finally(() => { if (!signal?.aborted) setLoading(false); }), [workerRegister]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  function onSaved(result: EnrichmentSaveResult) {
    setData((current) => current ? { ...current, ...result, form: { ...current.form, ...result.form } } : current);
  }

  async function onPhotoUploaded() {
    // Foto mengubah readiness & content_status di Bridge; muat ulang tanpa mereset isian form yang belum disimpan.
    const previous = data;
    const next = await load();
    if (next && previous && JSON.stringify(previous.form) !== JSON.stringify(next.form)) setFormKey((value) => value + 1);
  }

  const approved = data?.readiness.status === "APPROVED";
  const steps = data ? buildWorkflowSteps({ checks: data.readiness.checks, contentStatus: data.contentStatus, approved }) : null;

  return <div className="space-y-5">
    <header>
      <Link href="/pekerja" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={18} aria-hidden />Daftar pekerja</Link>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-brand-navy">{data?.worker.name || "Detail Pekerja"}</h1>
        <Badge>{data?.worker.workerRegister ?? workerRegister}</Badge>
        {data && <StatusBadge status={statusInfo(CONTENT_STATUS, data.contentStatus)} />}
      </div>
      {data && <p className="mt-1 text-sm text-slate-500">{[data.worker.origin, data.worker.age ? `${data.worker.age} tahun` : "", data.worker.status].filter(Boolean).join(" • ") || "Identitas dari Register (read-only)."}</p>}
      {data?.worker.categoryMappingRequired && <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800"><TriangleAlert size={15} className="shrink-0" aria-hidden />Kode lama {data.worker.legacyCategoryCode} belum dipetakan ke kategori. {isAdmin ? "Tambahkan di Master Data → Mapping." : "Minta Admin menambahkan mapping."}</p>}
    </header>

    {!enabled && <Alert tone="warning" title="Data pekerja belum bisa dibuka.">{isAdmin ? "Neon, Google OAuth, Content Bridge, dan kunci enkripsi token harus siap. Periksa menu Integrasi." : "Koneksi aplikasi belum siap. Hubungi Admin."}</Alert>}
    {enabled && loading && <div className="flex min-h-40 items-center justify-center" role="status" aria-label="Memuat data pekerja"><Loader2 className="animate-spin text-slate-400" aria-hidden /></div>}
    {enabled && !loading && !data && <div className="space-y-3"><ErrorAlert code={error} /><Button variant="secondary" onClick={() => { setLoading(true); void load(); }}>Coba lagi</Button></div>}

    {data && steps && <>
      <WorkflowStepper workerRegister={data.worker.workerRegister} steps={steps} />
      {error && <ErrorAlert code={error} />}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr] lg:items-start [&>*]:min-w-0">
        <Card id="data" className="scroll-mt-4"><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList size={18} aria-hidden />Data pekerja</CardTitle></CardHeader><CardContent>
          <WorkerEnrichmentForm key={formKey} workerRegister={data.worker.workerRegister} data={data} editable={editable} onSaved={onSaved} />
        </CardContent></Card>
        <div className="space-y-4 lg:sticky lg:top-8">
          <Card id="foto" className="scroll-mt-4"><CardHeader><CardTitle className="flex items-center gap-2"><Camera size={18} aria-hidden />Foto</CardTitle></CardHeader><CardContent>
            <WorkerPhotoPrep workerRegister={data.worker.workerRegister} workerName={data.worker.name} driveEnabled={driveEnabled} editable={editable} hasProfilePhoto={Boolean(data.readiness.checks.profile_photo)} onUploaded={onPhotoUploaded} />
          </CardContent></Card>
          <Link href={`/preview/${encodeURIComponent(data.worker.workerRegister)}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-brand-navy px-4 text-white">
            <span><span className="block text-sm font-bold">Preview & Konten</span><span className="block text-xs text-white/70">Setujui, generate Canva, export, publikasi</span></span><ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </>}
  </div>;
}
