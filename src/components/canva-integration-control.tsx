"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      const body = await response.json();
      setHealth(body);
    } catch {
      setHealth({ error: "CANVA_HEALTH_FAILED" });
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-bold text-[#0B1F3A]">Canva OAuth & Worker Templates</p><p className="mt-1 text-xs text-slate-500">MB-01A Personal + MB-01B Promo</p></div>
      <div className="flex gap-2">{configured && !connected && <a href="/api/integrations/canva/connect" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0B1F3A] px-3 text-xs font-bold text-white"><ExternalLink size={15}/>Hubungkan Canva</a>}{connected && <Button onClick={validate} disabled={busy} className="gap-2"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/>{busy ? "Memeriksa…" : "Validasi Template"}</Button>}</div>
    </div>

    {templates.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{templates.map((template) => <div key={template.code} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black text-[#0B1F3A]">{template.code}</p><p className="mt-1 text-xs text-slate-600">{template.name} • {template.version}</p><p className="mt-1 break-all text-[11px] text-slate-400">{template.designId}</p></div>)}</div>}
    {!configured && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Isi CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI, dan ENCRYPTION_KEY terlebih dahulu.</p>}
    {configured && connected && !health && <p className="text-xs text-emerald-700">Akun Canva user sudah tersambung. Validasi template untuk memastikan dataset autofill masih lengkap.</p>}
    {health?.valid && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16}/>Semua worker template yang terdaftar lolos dataset health check.</p>}
    {health?.templates && <div className="space-y-2">{health.templates.map((template) => <div key={template.code} className={`rounded-xl border p-3 text-xs ${template.valid ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}><p className="font-bold">{template.code} — {template.valid ? "Healthy" : "Perlu perbaikan"}</p>{!template.valid && <p className="mt-1">Missing: {template.missing.join(", ") || "—"} • Wrong type: {template.wrongType.join(", ") || "—"}</p>}</div>)}</div>}
    {health && health.valid === false && !health.templates?.length && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><TriangleAlert size={16} className="mt-0.5 shrink-0"/><span>Template belum sehat. Field: {health.missing?.join(", ") || "tidak diketahui"}.</span></p>}
    {health?.error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{health.error}</p>}
  </div>;
}
