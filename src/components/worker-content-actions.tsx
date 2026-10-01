"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, CheckCircle2, ExternalLink, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { CONTENT_STATUS, readinessFieldLabel, statusInfo } from "@/lib/status-labels";

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
  initialExportUrl?: string | null;
  initialDesignUrl?: string | null;
  publishedChannel?: string | null;
  publishChannels: Array<{ code: string; name: string }>;
  templateOptions: TemplateOption[];
  /** Template yang disarankan untuk kategori pekerja (mis. MB-02B pink untuk ART Momong). */
  recommendedTemplate?: string | null;
};

type GenerationResponse = { jobId?: string; status?: string; designUrl?: string; error?: string; missing?: string[]; wrongType?: string[]; templateCode?: string };

const TEMPLATE_HINT: Record<string, string> = {
  "MB-01A": "Personal: profil lebih human, dengan kata-kata pekerja, usia, asal, spesialisasi.",
  "MB-01B": "Promo: nama, pengalaman, keahlian, ketersediaan, training, dan dokumen lebih menonjol.",
  "MB-02A": "Flyer katalog Ready To Interview warna biru: foto, nama, posisi, dan penempatan.",
  "MB-02B": "Flyer katalog Ready To Interview warna pink (biasa dipakai ART Momong/Babysitter).",
};

// Total ±3 menit: 10× tiap 2 detik, lalu tiap 5 detik.
const POLL_DELAYS = [...Array(10).fill(2000), ...Array(32).fill(5000)] as number[];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function WorkerContentActions({ workerRegister, contentStatus: initialStatus, readinessScore, missing, approved: initialApproved, isAdmin, canGenerate, canPublish, generationConfigured, exportConfigured, initialExportUrl, initialDesignUrl, publishedChannel, publishChannels, templateOptions, recommendedTemplate }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [approved, setApproved] = useState(initialApproved);
  const [busy, setBusy] = useState<null | "approve" | "generate" | "export" | "publish" | "poll">(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState(publishChannels[0]?.code ?? "");
  const [templateCode, setTemplateCode] = useState(templateOptions.find((item) => item.code === recommendedTemplate)?.code ?? templateOptions[0]?.code ?? "");
  const [designUrl, setDesignUrl] = useState<string | null>(initialDesignUrl || null);
  const [exportUrl, setExportUrl] = useState<string | null>(initialExportUrl ?? null);
  const [note, setNote] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const register = encodeURIComponent(workerRegister);
  const generated = ["GENERATED", "ARCHIVED", "PUBLISHED"].includes(status);
  const archived = ["ARCHIVED", "PUBLISHED"].includes(status);
  const published = status === "PUBLISHED";
  const isApproved = approved || ["APPROVED", "GENERATING", "GENERATED", "ARCHIVED", "PUBLISHED"].includes(status);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "GENERATION_FAILED"); }
    finally { setBusy(null); }
  }

  const approve = () => run("approve", async () => {
    const response = await fetch(`/api/workers/${register}/approve`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "APPROVAL_FAILED");
    setApproved(true);
    setStatus("APPROVED");
    setNote("Konten disetujui. Langkah berikutnya: Generate desain di Canva.");
  });

  async function pollJob(jobId: string) {
    for (let attempt = 0; attempt < POLL_DELAYS.length; attempt += 1) {
      await sleep(POLL_DELAYS[attempt]);
      const response = await fetch(`/api/generation/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const body = await response.json() as GenerationResponse;
      if (body.status === "DONE") return body;
      if (body.status === "ERROR" || (!response.ok && response.status !== 202)) throw new Error(body.error ?? "GENERATION_FAILED");
      setNote(attempt < 10 ? `Canva sedang membuat desain ${templateCode}…` : "Canva masih memproses. Halaman ini akan terus mengecek, mohon tunggu.");
    }
    return null;
  }

  async function finishPolling(jobId: string) {
    setStatus("GENERATING");
    const result = await pollJob(jobId);
    if (!result) {
      // Job tetap berjalan di Canva; pengecekan ulang lewat endpoint yang sama akan menyelesaikannya.
      setPendingJobId(jobId);
      setNote(null);
      return;
    }
    setPendingJobId(null);
    setStatus("GENERATED");
    setDesignUrl(result.designUrl || null);
    setExportUrl(null);
    setShowRegenerate(false);
    setNote("Desain berhasil dibuat. Periksa di Canva, lalu Export PNG ke Drive.");
  }

  const generate = () => run("generate", async () => {
    setNote(`Menyiapkan ${templateCode}…`);
    const response = await fetch(`/api/workers/${register}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateCode }) });
    const body = await response.json() as GenerationResponse;
    if (!response.ok && response.status !== 202) {
      setNote(null);
      if (body.error === "TEMPLATE_UNHEALTHY") {
        const issues = [...(body.missing ?? []), ...(body.wrongType ?? []).map((field) => `${field} (tipe salah)`)];
        throw new Error(`TEMPLATE_UNHEALTHY${issues.length ? ` — ${issues.join(", ")}` : ""}`);
      }
      throw new Error(body.error ?? "GENERATION_FAILED");
    }
    if (body.status === "DONE") {
      setStatus("GENERATED");
      setDesignUrl(body.designUrl || null);
      setExportUrl(null);
      setShowRegenerate(false);
      setNote((body as { reused?: boolean }).reused ? "Desain dengan data yang sama sudah ada, jadi tidak dibuat ulang." : "Desain berhasil dibuat. Periksa di Canva, lalu Export PNG ke Drive.");
      return;
    }
    if (!body.jobId) throw new Error("GENERATION_JOB_MISSING");
    await finishPolling(body.jobId);
  });

  const checkPending = () => run("poll", async () => { if (pendingJobId) await finishPolling(pendingJobId); });

  const exportToDrive = () => run("export", async () => {
    setNote("Mengekspor PNG dari Canva ke Google Drive…");
    const response = await fetch(`/api/workers/${register}/export`, { method: "POST" });
    const body = await response.json() as { error?: string; contentStatus?: string; export?: { webViewLink?: string } };
    if (!response.ok) { setNote(null); throw new Error(body.error ?? "EXPORT_FAILED"); }
    setStatus(body.contentStatus ?? "ARCHIVED");
    setExportUrl(body.export?.webViewLink ?? null);
    setNote("PNG final tersimpan di Google Drive. Langkah berikutnya: tandai publikasi.");
  });

  const publish = () => run("publish", async () => {
    if (!channel) return;
    const response = await fetch(`/api/workers/${register}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "PUBLISH_FAILED");
    setStatus("PUBLISHED");
    setNote(`Ditandai sudah dipublikasi di ${publishChannels.find((item) => item.code === channel)?.name ?? channel}.`);
  });

  const generateLockReason = !canGenerate
    ? "Akun Anda belum diberi izin Generate. Minta Admin mengaktifkan “Boleh Generate” di Pengaturan."
    : !generationConfigured || templateOptions.length === 0
      ? isAdmin ? "Hubungkan Canva dan pastikan minimal satu template lolos health check di menu Integrasi." : "Canva atau template belum siap. Hubungi Admin."
      : null;

  const templatePicker = <div className="space-y-2">
    <Field label="Template Canva">
      <Select value={templateCode} disabled={Boolean(busy) || templateOptions.length === 0} onChange={(event) => setTemplateCode(event.target.value)}>{templateOptions.map((item) => <option key={item.code} value={item.code}>{item.name} • {item.version}{item.code === recommendedTemplate ? " (disarankan)" : ""}</option>)}</Select>
    </Field>
    {TEMPLATE_HINT[templateCode] && <p className="text-xs leading-5 text-slate-500">{TEMPLATE_HINT[templateCode]}</p>}
  </div>;

  const generateButton = (variant: "primary" | "secondary") => <Button className="w-full gap-2" variant={variant} onClick={generate} disabled={Boolean(busy) || !templateCode}>
    {busy === "generate" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : variant === "primary" ? <Sparkles size={17} aria-hidden /> : <RefreshCw size={17} aria-hidden />}
    {busy === "generate" ? "Memproses…" : variant === "primary" ? `Generate ${templateCode}` : `Buat ulang dengan ${templateCode}`}
  </Button>;

  return <section id="workflow" aria-labelledby="workflow-title" className="scroll-mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><h2 id="workflow-title" className="text-sm font-bold text-brand-navy">Workflow Konten</h2><p className="mt-1 text-xs text-slate-500">Kesiapan data {readinessScore}%</p></div>
      <StatusBadge status={statusInfo(CONTENT_STATUS, status)} />
    </div>

    {/* 1. Data belum lengkap */}
    {missing.length > 0 && <Alert tone="warning" title="Data pekerja belum lengkap.">
      <p>Belum ada: {missing.map(readinessFieldLabel).join(", ")}.</p>
      <Link href={`/pekerja/${register}#data`} className="mt-1 inline-flex min-h-8 items-center font-bold underline underline-offset-2">Lengkapi data pekerja</Link>
    </Alert>}

    {/* 2. Persetujuan */}
    {missing.length === 0 && !isApproved && (isAdmin
      ? <><p className="text-xs text-slate-600">Periksa preview di atas. Pastikan tidak ada data sensitif dan isinya sudah benar.</p><Button className="w-full gap-2" onClick={approve} disabled={Boolean(busy)}>{busy === "approve" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <CheckCircle2 size={17} aria-hidden />}Setujui Konten</Button></>
      : <Alert tone="info" title="Menunggu persetujuan Admin.">Data sudah lengkap. Admin perlu memeriksa preview dan menyetujui sebelum desain dibuat.</Alert>)}

    {/* 3. Generate */}
    {isApproved && !generated && !pendingJobId && (generateLockReason
      ? <Alert tone="warning" title="Generate belum bisa dijalankan.">{generateLockReason}</Alert>
      : <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">{templatePicker}{generateButton("primary")}</div>)}

    {pendingJobId && <Alert tone="info" title="Canva masih memproses desain.">
      <p>Proses tetap berjalan. Tekan “Cek lagi” dalam beberapa saat.</p>
      <Button variant="secondary" className="mt-2 min-h-9 gap-2" onClick={checkPending} disabled={Boolean(busy)}>{busy === "poll" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />}Cek lagi</Button>
    </Alert>}

    {/* 4. Export */}
    {generated && !archived && <>
      {designUrl && <a href={designUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-brand-navy"><ExternalLink size={16} aria-hidden />Periksa desain di Canva</a>}
      {canGenerate && exportConfigured && <Button className="w-full gap-2" onClick={exportToDrive} disabled={Boolean(busy)}>{busy === "export" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Archive size={17} aria-hidden />}Export PNG ke Drive</Button>}
      {!canGenerate && <Alert tone="info" title="Menunggu export.">Export PNG dilakukan oleh user yang punya izin Generate.</Alert>}
      {canGenerate && !exportConfigured && <Alert tone="warning" title="Export belum bisa dijalankan.">{isAdmin ? "Folder arsip export di Google Drive belum disiapkan. Jalankan health check di menu Integrasi." : "Folder arsip Drive belum siap. Hubungi Admin."}</Alert>}
    </>}

    {/* 5. Publikasi */}
    {archived && <>
      {exportUrl && <a href={exportUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800"><ExternalLink size={16} aria-hidden />Buka PNG di Google Drive</a>}
      {!published && publishChannels.length > 0 && canPublish && <div className="space-y-2">
        <Field label="Dipublikasi di channel"><Select value={channel} onChange={(event) => setChannel(event.target.value)}>{publishChannels.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field>
        <Button onClick={publish} disabled={Boolean(busy) || !channel} className="w-full gap-2">{busy === "publish" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Send size={17} aria-hidden />}Tandai Sudah Dipublikasi</Button>
      </div>}
      {!published && publishChannels.length === 0 && <Alert tone="warning" title="Belum ada channel publikasi aktif.">{isAdmin ? "Aktifkan minimal satu channel di Master Data → Konten." : "Hubungi Admin untuk mengaktifkan channel publikasi."}</Alert>}
      {published && <Alert tone="success" title="Konten sudah dipublikasi.">{publishedChannel ? `Channel: ${publishChannels.find((item) => item.code === publishedChannel)?.name ?? publishedChannel}.` : null}</Alert>}
    </>}

    {note && <p role="status" className="rounded-xl bg-brand-sky p-2 text-xs font-semibold text-brand-navy">{note}</p>}
    <ErrorAlert code={error} />

    {/* Opsi lanjutan: buat ulang / export ulang */}
    {generated && canGenerate && !generateLockReason && <details open={showRegenerate} onToggle={(event) => setShowRegenerate((event.target as HTMLDetailsElement).open)} className="rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-xs font-bold text-slate-600">Opsi lain</summary>
      <div className="mt-3 space-y-3">
        {templatePicker}
        {generateButton("secondary")}
        {archived && exportConfigured && <Button variant="secondary" className="w-full gap-2" onClick={exportToDrive} disabled={Boolean(busy)}><Archive size={17} aria-hidden />Export ulang ke Drive</Button>}
      </div>
    </details>}
  </section>;
}
