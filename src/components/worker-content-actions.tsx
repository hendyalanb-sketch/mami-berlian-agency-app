"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive, CheckCircle2, ExternalLink, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { CONTENT_STATUS, readinessFieldLabel, statusInfo } from "@/lib/status-labels";
import { pendingGeneration, startTemplateBatch, type TemplateGenerationResult } from "@/modules/generation/results";

type TemplateOption = { code: string; name: string; version: string; designId: string };
type Props = {
  workerRegister: string;
  contentStatus: string;
  readinessScore: number;
  missing: string[];
  approved: boolean;
  isAdmin: boolean;
  canGenerate: boolean;
  canPublish: boolean;
  generationConfigured: boolean;
  exportConfigured: boolean;
  initialResults?: TemplateGenerationResult[];
  initialTemplateCode?: string;
  initialExportUrl?: string | null;
  initialDesignUrl?: string | null;
  publishedChannel?: string | null;
  publishChannels: Array<{ code: string; name: string }>;
  templateOptions: TemplateOption[];
  recommendedTemplate?: string | null;
  renderPreviews?: Record<string, Array<{ field: string; label: string; text: string }>>;
};

const POLL_DELAYS = [...Array(10).fill(2000), ...Array(32).fill(5000)] as number[];

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const cancel = () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = window.setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, ms);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export function WorkerContentActions({ workerRegister, contentStatus, readinessScore, missing, approved: initialApproved, isAdmin, canGenerate, canPublish, generationConfigured, exportConfigured, initialResults = [], initialTemplateCode, initialExportUrl, initialDesignUrl, publishedChannel, publishChannels, templateOptions, recommendedTemplate, renderPreviews = {} }: Props) {
  const [status, setStatus] = useState(contentStatus);
  const [approved, setApproved] = useState(initialApproved);
  const [busy, setBusy] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // New active templates are selected automatically; explicit deselections are retained.
  const [excluded, setExcluded] = useState<string[]>([]);
  const [channels, setChannels] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, TemplateGenerationResult>>(() => {
    const rows = [...initialResults];
    if (initialDesignUrl && !rows.some((row) => row.templateCode === initialTemplateCode)) rows.push({ templateCode: initialTemplateCode || "DESAIN-SEBELUMNYA", status: "DONE", designUrl: initialDesignUrl, exportUrl: initialExportUrl, publishedChannel: publishedChannel ?? undefined });
    return Object.fromEntries(rows.map((row) => [row.templateCode, row]));
  });
  useEffect(() => () => controller.current?.abort(), []);

  const register = encodeURIComponent(workerRegister);
  const selected = templateOptions.filter((item) => !excluded.includes(item.code)).map((item) => item.code);
  const allSelected = templateOptions.length > 0 && selected.length === templateOptions.length;
  const rows = Object.values(results);
  const pending = rows.filter(pendingGeneration);
  const failed = rows.filter((row) => row.status === "ERROR" && templateOptions.some((template) => template.code === row.templateCode));
  const complete = rows.filter((row) => row.status === "DONE");
  const lockReason = !canGenerate ? "Akun Anda belum diberi izin Generate. Minta Admin mengaktifkan “Boleh Generate” di Pengaturan."
    : !generationConfigured || !templateOptions.length ? isAdmin ? "Hubungkan Canva dan jalankan health check template di menu Integrasi." : "Canva atau template belum siap. Hubungi Admin." : null;
  const canStart = approved && missing.length === 0 && !lockReason;

  function updateResult(result: TemplateGenerationResult) {
    setResults((previous) => ({ ...previous, [result.templateCode]: result }));
    if (result.status === "DONE") setStatus("GENERATED");
  }

  async function run(key: string, action: (signal: AbortSignal) => Promise<void>) {
    if (controller.current) return;
    const operation = new AbortController();
    controller.current = operation;
    setBusy(key); setError(null); setNote(null);
    try { await action(operation.signal); }
    catch (cause) { if (!operation.signal.aborted) setError(cause instanceof Error ? cause.message : "GENERATION_FAILED"); }
    finally { if (!operation.signal.aborted) setBusy(null); controller.current = null; }
  }

  const approve = () => run("approve", async (signal) => {
    const response = await fetch(`/api/workers/${register}/approve`, { method: "POST", signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "APPROVAL_FAILED");
    setApproved(true); setStatus("APPROVED");
    setNote("Konten disetujui. Pilih template, lalu tekan Buat Semua.");
  });

  async function pollResults(started: TemplateGenerationResult[], signal: AbortSignal) {
    let waiting = started.filter(pendingGeneration);
    for (const delay of POLL_DELAYS) {
      if (!waiting.length) return;
      await pause(delay, signal);
      const next: TemplateGenerationResult[] = [];
      // Poll serially to bound load on Canva and Google Sheets.
      for (const row of waiting) {
        try {
          const response = await fetch(`/api/generation/${encodeURIComponent(row.jobId!)}`, { cache: "no-store", signal });
          const body = await response.json() as Partial<TemplateGenerationResult>;
          if (!response.ok && response.status !== 202) {
            // A temporary network/provider error does not mean the Canva job failed.
            if (response.status >= 500) { next.push(row); continue; }
            updateResult({ ...row, status: "ERROR", error: body.error ?? "GENERATION_FAILED" });
            continue;
          }
          const result = { ...row, ...body, templateCode: row.templateCode };
          updateResult(result);
          if (pendingGeneration(result)) next.push(result);
        } catch (cause) {
          if (signal.aborted) throw cause;
          next.push(row);
        }
      }
      waiting = next;
    }
    if (waiting.length) setNote("Beberapa desain masih diproses Canva. Hasil yang sudah selesai tetap tersedia. Tekan Cek lagi untuk melanjutkan.");
  }

  const generate = (codes: string[]) => run("generate", async (signal) => {
    if (!canStart || !codes.length) return;
    const started = await startTemplateBatch(codes, async (code) => {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      setNote(`Menyiapkan ${code}… Foto yang sama dipakai untuk semua template.`);
      const response = await fetch(`/api/workers/${register}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateCode: code }), signal });
      const body = await response.json() as TemplateGenerationResult;
      if (!response.ok && response.status !== 202) return { ...body, templateCode: code, status: "ERROR", error: body.error ?? "GENERATION_FAILED" };
      if (!body.jobId && body.status !== "DONE") throw new Error("GENERATION_JOB_MISSING");
      return { ...body, templateCode: code };
    }, (result) => { if (!signal.aborted) updateResult(result); });
    if (signal.aborted) return;
    setNote("Semua template pilihan sudah diajukan. Hasil muncul satu per satu di bawah.");
    await pollResults(started, signal);
  });

  const exportResult = (row: TemplateGenerationResult) => run(`export:${row.templateCode}`, async (signal) => {
    const response = await fetch(`/api/workers/${register}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row.jobId ? { jobId: row.jobId } : {}), signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "EXPORT_FAILED");
    updateResult({ ...row, exportUrl: body.export?.webViewLink ?? null });
    setNote(`PNG ${row.templateCode} tersimpan di Google Drive.`);
  });

  const publishResult = (row: TemplateGenerationResult) => run(`publish:${row.templateCode}`, async (signal) => {
    const channel = channels[row.templateCode] ?? publishChannels[0]?.code;
    if (!channel) return;
    const response = await fetch(`/api/workers/${register}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, ...(row.jobId ? { jobId: row.jobId } : {}) }), signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "PUBLISH_FAILED");
    updateResult({ ...row, publishedChannel: channel }); setStatus("PUBLISHED");
  });

  return <section id="workflow" aria-labelledby="workflow-title" className="min-w-0 scroll-mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="workflow-title" className="text-sm font-bold text-brand-navy">Workflow Konten</h2><p className="mt-1 text-xs text-slate-500">Kesiapan data {readinessScore}%</p></div>
      <StatusBadge status={statusInfo(CONTENT_STATUS, pending.length ? "GENERATING" : status)} />
    </div>

    {missing.length > 0 && <Alert tone="warning" title="Data pekerja belum lengkap."><p>Belum ada: {missing.map(readinessFieldLabel).join(", ")}.</p><Link href={`/pekerja/${register}#data`} className="mt-1 inline-flex min-h-11 items-center font-bold underline">Lengkapi data pekerja</Link></Alert>}
    {missing.length === 0 && !approved && (isAdmin
      ? <><p className="text-xs text-slate-600">Periksa preview publik dan teks setiap template sebelum menyetujui konten.</p><Button className="w-full gap-2" onClick={approve} disabled={Boolean(busy)}><CheckCircle2 size={17} aria-hidden />{busy === "approve" ? "Menyetujui…" : "Setujui Konten"}</Button></>
      : <Alert tone="info" title="Menunggu persetujuan Admin.">Admin perlu memeriksa preview dan menyetujui sebelum desain dibuat.</Alert>)}
    {lockReason && <Alert tone="warning" title="Pembuatan desain belum siap.">{lockReason}</Alert>}

    {templateOptions.length > 0 && <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-brand-navy">Pilih template</h3><Button variant="secondary" className="min-h-11 px-3 text-xs" disabled={Boolean(busy)} onClick={() => setExcluded(allSelected ? templateOptions.map((item) => item.code) : [])}>{allSelected ? "Batalkan semua" : "Pilih semua"}</Button></div>
      <p className="text-xs leading-5 text-slate-500">Upload foto sekali. Semua template aktif dipilih secara otomatis, termasuk template baru yang sudah siap.</p>
      <fieldset disabled={Boolean(busy)} className="space-y-2"><legend className="sr-only">Template yang akan dibuat</legend>{templateOptions.map((template) => <div key={template.code} className="min-w-0 rounded-xl border border-slate-200 bg-white">
        <label className="flex min-h-12 cursor-pointer items-start gap-3 p-3"><input type="checkbox" checked={!excluded.includes(template.code)} onChange={(event) => setExcluded((previous) => event.target.checked ? previous.filter((code) => code !== template.code) : [...previous, template.code])} className="mt-1 h-5 w-5 shrink-0 accent-blue-800" /><span className="min-w-0"><span className="block break-words text-xs font-bold text-brand-navy">{template.name}</span><span className="block text-xs text-slate-500">{template.code} • {template.version}{template.code === recommendedTemplate ? " • disarankan" : ""}</span></span></label>
        {renderPreviews[template.code]?.length ? <details className="px-3 pb-2"><summary className="min-h-9 cursor-pointer text-xs font-semibold text-slate-600">Lihat teks untuk {template.code}</summary><dl className="space-y-2 pb-2 text-xs">{renderPreviews[template.code].map((item) => <div key={item.field} className="min-w-0"><dt className="text-slate-500">{item.label}</dt><dd className="break-words font-semibold text-brand-navy">{item.text || "(kosong)"}</dd></div>)}</dl></details> : null}
      </div>)}</fieldset>
      <Button className="w-full gap-2" onClick={() => generate(selected)} disabled={Boolean(busy) || !canStart || !selected.length}>{busy === "generate" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Sparkles size={17} aria-hidden />}{busy === "generate" ? "Membuat desain…" : allSelected ? `Buat Semua (${selected.length})` : `Buat ${selected.length} Template`}</Button>
    </div>}

    {rows.length > 0 && <div className="space-y-3" aria-label="Hasil per template">
      <h3 className="text-sm font-bold text-brand-navy">Hasil per template</h3>
      <p role="status" className="text-xs text-slate-600">{complete.length} selesai • {pending.length} diproses • {rows.filter((row) => row.status === "ERROR").length} gagal</p>
      {rows.map((row) => <article key={row.templateCode} aria-label={`Hasil ${row.templateCode}`} className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="break-words text-xs font-bold text-brand-navy">{templateOptions.find((template) => template.code === row.templateCode)?.name ?? row.templateCode}</h4><span className="text-xs font-semibold text-slate-500">{row.status === "DONE" ? row.publishedChannel ? "Dipublikasi" : row.exportUrl ? "Tersimpan di Drive" : "Selesai" : row.status === "ERROR" ? "Gagal" : row.status === "QUEUED" ? "Siap dicoba lagi" : "Diproses…"}</span></div>
        <p className="text-[11px] text-slate-500">{row.templateCode}{row.templateVersion ? ` • ${row.templateVersion}` : ""}{row.reused ? " • hasil sebelumnya digunakan" : ""}</p>
        <ErrorAlert code={row.error ?? null} />
        {row.missing?.length ? <p className="break-words text-xs text-amber-800">Periksa kolom: {row.missing.join(", ")}</p> : null}
        {row.status === "DONE" && row.designUrl && <a href={row.designUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 text-xs font-bold text-brand-navy"><ExternalLink size={15} aria-hidden />Buka {row.templateCode} di Canva</a>}
        {row.status === "DONE" && row.exportUrl && <a href={row.exportUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-800"><ExternalLink size={15} aria-hidden />Buka PNG {row.templateCode} di Drive</a>}
        {row.status === "DONE" && canGenerate && exportConfigured && !row.exportUrl && <Button variant="secondary" className="w-full gap-2 text-xs" disabled={Boolean(busy)} onClick={() => exportResult(row)}><Archive size={15} aria-hidden />{busy === `export:${row.templateCode}` ? "Mengekspor…" : `Export PNG ${row.templateCode}`}</Button>}
        {row.status === "DONE" && row.exportUrl && !row.publishedChannel && canPublish && publishChannels.length > 0 && <><Field label={`Channel untuk ${row.templateCode}`}><Select value={channels[row.templateCode] ?? publishChannels[0].code} disabled={Boolean(busy)} onChange={(event) => setChannels((previous) => ({ ...previous, [row.templateCode]: event.target.value }))}>{publishChannels.map((channel) => <option key={channel.code} value={channel.code}>{channel.name}</option>)}</Select></Field><Button className="w-full gap-2 text-xs" disabled={Boolean(busy)} onClick={() => publishResult(row)}><Send size={15} aria-hidden />Tandai {row.templateCode} Dipublikasi</Button></>}
        {row.publishedChannel && <p className="text-xs text-emerald-800">Channel: {publishChannels.find((channel) => channel.code === row.publishedChannel)?.name ?? row.publishedChannel}</p>}
      </article>)}
      {pending.length > 0 && <Button variant="secondary" className="w-full gap-2" disabled={Boolean(busy)} onClick={() => run("poll", (signal) => pollResults(pending, signal))}><RefreshCw size={16} aria-hidden />Cek lagi ({pending.length})</Button>}
      {failed.length > 0 && <Button variant="secondary" className="w-full gap-2" disabled={Boolean(busy) || !canStart} onClick={() => generate(failed.map((row) => row.templateCode))}><RefreshCw size={16} aria-hidden />Coba Lagi yang Gagal ({failed.length})</Button>}
      {complete.length > 0 && !exportConfigured && <Alert tone="warning" title="Folder export belum siap.">{isAdmin ? "Jalankan health check Google Drive di menu Integrasi." : "Hubungi Admin untuk menyiapkan folder export."}</Alert>}
    </div>}
    {note && <p role="status" className="rounded-xl bg-brand-sky p-3 text-xs font-semibold text-brand-navy">{note}</p>}
    <ErrorAlert code={error} />
  </section>;
}
