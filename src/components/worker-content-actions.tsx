"use client";

import { useState } from "react";
import { Archive, CheckCircle2, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type TemplateOption = { code: string; name: string; version: string; designId: string };
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
  publishChannels: Array<{ code: string; name: string }>;
  templateOptions: TemplateOption[];
};

type GenerationResponse = { jobId?: string; status?: string; designUrl?: string; error?: string; missing?: string[]; wrongType?: string[]; templateCode?: string };

export function WorkerContentActions({ workerRegister, contentStatus: initialStatus, readinessScore, missing, approved: initialApproved, isAdmin, canGenerate, generationConfigured, exportConfigured, initialExportUrl, publishChannels, templateOptions }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [approved, setApproved] = useState(initialApproved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState(publishChannels[0]?.code ?? "");
  const [templateCode, setTemplateCode] = useState(templateOptions[0]?.code ?? "MB-01A");
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
      setGenerationNote(`Canva sedang memproses ${templateCode}… ${attempt + 1}/30`);
    }
    throw new Error("GENERATION_POLL_TIMEOUT");
  }

  async function generate() {
    setBusy(true); setError(null); setDesignUrl(null); setExportUrl(null); setGenerationNote(`Menyiapkan ${templateCode}…`);
    try {
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode }),
      });
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
        setStatus("GENERATING"); setGenerationNote(`Autofill ${templateCode} berjalan…`); result = await pollGeneration(body.jobId);
      }
      setStatus("GENERATED"); setDesignUrl(result.designUrl ?? null); setGenerationNote(`${body.templateCode ?? templateCode} berhasil dibuat. Periksa hasil di Canva lalu Export PNG ke Drive.`);
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
    if (!channel) return;
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
  const canRunGeneration = approved && !generating;
  const hasDesign = ["GENERATED", "ARCHIVED", "PUBLISHED"].includes(status);
  const archived = ["ARCHIVED", "PUBLISHED"].includes(status) && Boolean(exportUrl || status === "ARCHIVED" || status === "PUBLISHED");
  const selectedTemplate = templateOptions.find((item) => item.code === templateCode);

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div><p className="text-sm font-bold text-[#0B1F3A]">Workflow Konten</p><p className="mt-1 text-xs text-slate-500">Readiness {readinessScore}% • status {status}</p></div>
    {isAdmin && readyForApproval && <Button className="w-full gap-2" onClick={approve} disabled={busy}><CheckCircle2 size={17}/>{busy ? "Memproses…" : "Approve Konten"}</Button>}

    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Template Canva</span><select value={templateCode} disabled={busy || templateOptions.length === 0} onChange={(event) => setTemplateCode(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0B1F3A]">{templateOptions.map((item) => <option key={item.code} value={item.code}>{item.name} • {item.version}</option>)}</select></label>
      <p className="mt-2 text-xs leading-5 text-slate-500">{templateCode === "MB-01A" ? "Personal: profil lebih human, dengan quote, usia, asal, spesialisasi, dan status siap interview." : "Promo: nama, pengalaman, skill, availability, training, dan status dokumen lebih menonjol."}</p>
    </div>

    <Button className="w-full gap-2" variant="secondary" onClick={generate} disabled={busy || !canGenerate || !generationConfigured || !canRunGeneration || !selectedTemplate}>{generating || (busy && canRunGeneration) ? <Loader2 size={17} className="animate-spin"/> : <Sparkles size={17}/>}Generate {templateCode}</Button>
    {canGenerate && approved && (!generationConfigured || templateOptions.length === 0) && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Generate dikunci sampai Canva OAuth dan minimal satu template worker lolos health check.</p>}
    {generationNote && <p className="rounded-xl bg-[#EEF4FB] p-2 text-xs font-semibold text-[#0B1F3A]">{generationNote}</p>}
    {designUrl && <a href={designUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-[#0B1F3A]"><ExternalLink size={16}/>Buka hasil di Canva</a>}
    {hasDesign && <Button className="w-full gap-2" variant="secondary" onClick={exportToDrive} disabled={busy || !canGenerate || !exportConfigured}><Archive size={17}/>{status === "GENERATED" ? "Export PNG ke Drive" : "Export Ulang ke Drive"}</Button>}
    {hasDesign && !exportConfigured && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Export dikunci sampai folder arsip Drive sehat/provisioned.</p>}
    {exportUrl && <a href={exportUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800"><ExternalLink size={16}/>Buka arsip Drive</a>}
    {archived && publishChannels.length > 0 && <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><select value={channel} onChange={(event) => setChannel(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">{publishChannels.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><Button onClick={publish} disabled={busy || !channel} className="gap-2"><Send size={17}/>Mark Published</Button></div>}
    {archived && publishChannels.length === 0 && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Tidak ada channel publikasi aktif. Aktifkan minimal satu channel di Master Data.</p>}
    {missing.length > 0 && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Belum siap: {missing.join(", ")}.</p>}
    {error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}
