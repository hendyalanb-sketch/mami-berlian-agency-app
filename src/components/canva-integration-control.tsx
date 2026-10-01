"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CanvaIntegrationControl({ configured, connected, designId }: { configured: boolean; connected: boolean; designId: string }) {
  const [health, setHealth] = useState<{ valid?: boolean; missing?: string[]; error?: string } | null>(null);
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#0B1F3A]">Canva OAuth & MB-01</p><p className="mt-1 text-xs text-slate-500">Working design: {designId || "belum diset"}</p></div><div className="flex gap-2">{configured && !connected && <a href="/api/integrations/canva/connect" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0B1F3A] px-3 text-xs font-bold text-white"><ExternalLink size={15}/>Hubungkan Canva</a>}{connected && <Button onClick={validate} disabled={busy} className="gap-2"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/>{busy ? "Memeriksa…" : "Validasi MB-01"}</Button>}</div></div>
    {!configured && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Isi CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI, dan ENCRYPTION_KEY terlebih dahulu.</p>}
    {configured && connected && !health && <p className="text-xs text-emerald-700">Akun Canva user ini sudah tersambung. Jalankan validasi dataset sebelum Generate dibuka.</p>}
    {health?.valid && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16}/>Dataset MB-01 lengkap dan template diaktifkan.</p>}
    {health && health.valid === false && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><TriangleAlert size={16} className="mt-0.5 shrink-0"/><span>Template belum sehat. Field belum ada: {health.missing?.join(", ") || "tidak diketahui"}.</span></p>}
    {health?.error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{health.error}</p>}
  </div>;
}
