"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Check = { status: "HEALTHY" | "UNHEALTHY" | "NOT_CONFIGURED"; message: string };
type Health = { healthy?: boolean; checks?: Record<string, Check>; error?: string };

const labels: Record<string, string> = {
  register: "Register Pekerja",
  bridge: "Content Bridge",
  photoFolder: "Folder Foto Drive",
};

export function GoogleIntegrationControl({ configured }: { configured: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);

  async function validate() {
    setBusy(true);
    setHealth(null);
    try {
      const response = await fetch("/api/integrations/google/health", { cache: "no-store" });
      const body = await response.json() as Health;
      setHealth(body);
    } catch {
      setHealth({ error: "GOOGLE_HEALTH_FAILED" });
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-bold text-[#0B1F3A]">Google Runtime Health</p><p className="mt-1 text-xs text-slate-500">Tes read-only untuk Register, Content Bridge, dan folder foto.</p></div>
      <Button onClick={validate} disabled={busy || !configured} className="gap-2"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/>{busy ? "Memeriksa…" : "Periksa Google"}</Button>
    </div>
    {!configured && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Google OAuth/resource ID belum lengkap.</p>}
    {health?.healthy && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16}/>Semua resource Google yang dibutuhkan sehat.</p>}
    {health?.checks && <div className="grid gap-2 sm:grid-cols-3">{Object.entries(health.checks).map(([key, check]) => <div key={key} className={`rounded-xl border p-3 text-xs ${check.status === "HEALTHY" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}><p className="font-bold">{labels[key] ?? key}</p><p className="mt-1 leading-5">{check.message}</p></div>)}</div>}
    {health?.error && <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"><TriangleAlert size={16} className="mt-0.5 shrink-0"/>{health.error}</p>}
  </div>;
}
