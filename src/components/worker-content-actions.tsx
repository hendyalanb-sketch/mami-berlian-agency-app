"use client";

import { useState } from "react";
import { Archive, CheckCircle2, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  workerRegister: string;
  contentStatus: string;
  readinessScore: number;
  missing: string[];
  approved: boolean;
  isAdmin: boolean;
  canGenerate: boolean;
  generationConfigured: boolean;
  exportConfigured: boolean;
  initialExportUrl?: string | null;
};

type GenerationResponse = { jobId?: string; status?: string; designUrl?: string; error?: string; missing?: string[]; wrongType?: string[] };

export function WorkerContentActions({ workerRegister, contentStatus: initialStatus, readinessScore, missing, approved: initialApproved, isAdmin, canGenerate, generationConfigured, exportConfigured, initialExportUrl }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [approved, setApproved] = useState(initialApproved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState("WHATSAPP");
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(initialExportUrl ?? null);
  const [generationNote, setGenerationNote] = useState<string | null>(null);

  async function approve() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/approve`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "APPROVAL_FAILED");
      setApproved(true); setStatus("APPROVED");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "APPROVAL_FAILED"); }
    finally { setBusy(false); }
  }

  async function pollGeneration(jobId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const response = await fetch(`/api/generation/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const body = await response.json() as GenerationResponse;
      if (body.status === "DONE") return body;
      if (body.status === "ERROR" || (!response.ok && response.status !== 202)) throw new Error(body.error ?? "GENERATION_FAILED");
      setGenerationNote(`Canva sedang memproses… ${attempt + 1}/30`);
    }
    throw new Error("GENERATION_POLL_TIMEOUT");
  }

  async function generate() {
    setBusy(true); setError(null); setDesignUrl(null); setExportUrl(null); setGenerationNote("Menyiapkan foto dan data…");
    try {
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/generate`, { method: "POST" });
      const body = await response.json() as GenerationResponse;
      if (!response.ok && response.status !== 202) {
        if (body.error === "TEMPLATE_UNHEALTHY") {
          const issues = [...(body.missing ?? []), ...(body.wrongType ?? []).map((field) => `${field}: tipe salah`)];
          throw new Error(`TEMPLATE_UNHEALTHY${issues.length ? ` — ${issues.join(", ")}` : ""}`);
        }
        throw new Error(body.error ?? "GENERATION_FAILED");
      }
      let result = body;
      if (body.status !== "DONE") {
        if (!body.jobId) throw new Error("GENERATION_JOB_MISSING");
        setStatus("GENERATING"); setGenerationNote("Autofill Canva berjalan…"); result = await pollGeneration(body.jobId);
      }
      setStatus("GENERATED"); setDesignUrl(result.designUrl ?? null); setGenerationNote("Konten Canva berhasil dibuat. Lanjutkan Export ke Drive.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "GENERATION_FAILED"); setGenerationNote(null); }
    finally { setBusy(false); }
  }

  async function exportToDrive() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/export`, { method: "POST" });
      const body = await response.json() as { error?: string; contentStatus?: string; export?: { webViewLink?: string } };
      if (!response.ok) throw new Error(body.error ?? "EXPORT_FAILED");
      setStatus(body.contentStatus ?? "ARCHIVED"); setExportUrl(body.export?.webViewLink ?? null);
      setGenerationNote("PNG final sudah diarsipkan ke Google Drive.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "EXPORT_FAILED"); }
    finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "PUBLISH_FAILED");
      setStatus("PUBLISHED");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "PUBLISH_FAILED"); }
    finally { setBusy(false); }
  }

  const readyForApproval = missing.length === 0 && !approved;
  const generating = status === "GENERATING";
  const canRunGeneration = approved && ["APPROVED", "ERROR"].includes(status);
  const hasDesign = ["GENERATED", "ARCHIVED", "PUBLISHED"].includes(status);
  const archived = ["ARCHIVED", "PUBLISHED"].includes(status) && Boolean(exportUrl || status === "ARCHIVED" || status === "PUBLISHED");

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div><p className="text-sm font-bold text-[#0B1F3A]">Workflow Konten</p><p className="mt-1 text-xs text-slate-500">Readiness {readinessScore}% • status {status}</p></div>
    {isAdmin && readyForApproval && <Button className="w-full gap-2" onClick={approve} disabled={busy}><CheckCircle2 size={17}/>{busy ? "Memproses…" : "Approve Konten"}</Button>}
    <Button className="w-full gap-2" variant="secondary" onClick={generate} disabled={busy || !canGenerate || !generationConfigured || !canRunGeneration}>{generating || (busy && canRunGeneration) ? <Loader2 size={17} className="animate-spin"/> : <Sparkles size={17}/>}Generate MB-01</Button>
    {canGenerate && approved && !generationConfigured && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Generate dikunci sampai Canva OAuth dan MB-01 lolos health check.</p>}
    {generationNote && <p className="rounded-xl bg-[#EEF4FB] p-2 text-xs font-semibold text-[#0B1F3A]">{generationNote}</p>}
    {designUrl && <a href={designUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-[#0B1F3A]"><ExternalLink size={16}/>Buka hasil di Canva</a>}
    {hasDesign && <Button className="w-full gap-2" variant="secondary" onClick={exportToDrive} disabled={busy || !canGenerate || !exportConfigured}><Archive size={17}/>{status === "GENERATED" ? "Export PNG ke Drive" : "Export Ulang ke Drive"}</Button>}
    {hasDesign && !exportConfigured && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Export dikunci sampai folder arsip Drive sehat/provisioned.</p>}
    {exportUrl && <a href={exportUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800"><ExternalLink size={16}/>Buka arsip Drive</a>}
    {archived && <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><select value={channel} onChange={(event)=>setChannel(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="WHATSAPP">WhatsApp</option><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option><option value="KATALOG">Katalog</option><option value="WEBSITE">Website</option><option value="OTHER">Lainnya</option></select><Button onClick={publish} disabled={busy} className="gap-2"><Send size={17}/>Mark Published</Button></div>}
    {missing.length > 0 && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Belum siap: {missing.join(", ")}.</p>}
    {error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}
