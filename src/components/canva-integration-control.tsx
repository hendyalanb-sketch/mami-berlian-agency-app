"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Template = { code: string; name: string; version: string; designId: string };
type HealthTemplate = { code: string; name: string; designId: string; valid: boolean; missing: string[]; wrongType: string[]; active: boolean };
type Health = { valid?: boolean; missing?: string[]; wrongType?: string[]; templates?: HealthTemplate[]; error?: string };

export function CanvaIntegrationControl({ configured, connected, templates }: { configured: boolean; connected: boolean; templates: Template[] }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);

  async function validate() {
    setBusy(true);
    setHealth(null);
    try {
      const response = await fetch("/api/integrations/canva/health", { method: "POST", cache: "no-store" });
      setHealth(await response.json());
    } catch {
      setHealth({ error: "CANVA_HEALTH_FAILED" });
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {configured && <a href="/api/integrations/canva/connect" className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold", connected ? "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "bg-brand-navy text-white hover:bg-brand-navy-hover")}><ExternalLink size={15} aria-hidden />{connected ? "Hubungkan ulang Canva" : "Hubungkan Canva"}</a>}
      {connected && <Button onClick={validate} disabled={busy} className="gap-2"><RefreshCw size={15} className={busy ? "animate-spin" : ""} aria-hidden />{busy ? "Memeriksa…" : "Periksa Template"}</Button>}
    </div>

    {!configured && <Alert tone="warning" title="Kredensial Canva belum lengkap.">Isi CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI, dan ENCRYPTION_KEY di environment Vercel.</Alert>}
    {configured && !connected && <p className="text-xs text-slate-500">Setiap user yang akan Generate perlu menghubungkan akun Canva-nya sendiri.</p>}
    {connected && !health && <p className="text-xs text-slate-500">Akun Canva Anda sudah terhubung. Periksa template untuk memastikan field Autofill masih lengkap; template yang lolos otomatis diaktifkan.</p>}

    {templates.length > 0 && !health?.templates && <ul className="grid gap-2 sm:grid-cols-2">{templates.map((template) => <li key={template.code} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800"><p className="font-bold">{template.name} — aktif</p><p className="mt-1">Versi {template.version}</p><p className="mt-1 break-all text-emerald-700/70">{template.designId}</p></li>)}</ul>}
    {health?.valid && <Alert tone="success" title="Semua template lolos pemeriksaan dan siap dipakai." />}
    {health?.templates && <ul className="grid gap-2 sm:grid-cols-2">{health.templates.map((template) => <li key={template.code} className={cn("rounded-xl border p-3 text-xs", template.valid ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800")}>
      <p className="font-bold">{template.name || template.code} — {template.valid ? "siap dipakai" : "perlu diperbaiki di Canva"}</p>
      {template.missing.length > 0 && <p className="mt-1 leading-5">Field belum ada: {template.missing.join(", ")}</p>}
      {template.wrongType.length > 0 && <p className="mt-1 leading-5">Tipe field salah: {template.wrongType.join(", ")}</p>}
    </li>)}</ul>}
    {health && health.valid === false && !health.templates?.length && <Alert tone="warning" title="Template belum lolos pemeriksaan.">Field belum ada: {health.missing?.join(", ") || "tidak diketahui"}.</Alert>}
    <ErrorAlert code={health?.error} />
  </div>;
}
