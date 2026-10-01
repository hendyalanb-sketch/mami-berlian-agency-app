"use client";

import { useState } from "react";
import { FolderPlus, RefreshCw } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Check = { status: "HEALTHY" | "UNHEALTHY" | "NOT_CONFIGURED"; message: string };
type Health = { healthy?: boolean; checks?: Record<string, Check>; error?: string };

const labels: Record<string, string> = {
  register: "Register Pekerja",
  bridge: "Content Bridge",
  photoFolder: "Folder Foto Drive",
  exportFolder: "Folder Export Drive",
};

export function GoogleIntegrationControl({ configured }: { configured: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState<null | "check" | "provision">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchHealth() {
    const response = await fetch("/api/integrations/google/health", { cache: "no-store" });
    const body = await response.json() as Health;
    setHealth(body);
    if (body.error) setError(body.error);
  }

  async function validate() {
    setBusy("check"); setHealth(null); setMessage(null); setError(null);
    try { await fetchHealth(); } catch { setError("GOOGLE_HEALTH_FAILED"); } finally { setBusy(null); }
  }

  async function provision() {
    setBusy("provision"); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/integrations/google/provision", { method: "POST" });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "GOOGLE_PROVISION_FAILED");
      setMessage("Folder sudah disiapkan. Pemeriksaan dijalankan ulang.");
      await fetchHealth();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "GOOGLE_PROVISION_FAILED");
    } finally { setBusy(null); }
  }

  const needsStorageProvision = health?.checks && [health.checks.photoFolder, health.checks.exportFolder].some((check) => check && check.status !== "HEALTHY");

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <Button onClick={validate} disabled={Boolean(busy) || !configured} className="gap-2"><RefreshCw size={15} className={busy === "check" ? "animate-spin" : ""} aria-hidden />{busy === "check" ? "Memeriksa…" : "Periksa Google"}</Button>
      {needsStorageProvision && <Button variant="secondary" onClick={provision} disabled={Boolean(busy) || !configured} className="gap-2"><FolderPlus size={15} aria-hidden />{busy === "provision" ? "Menyiapkan…" : "Siapkan Folder Drive"}</Button>}
    </div>
    {!configured && <Alert tone="warning" title="Konfigurasi Google belum lengkap.">Isi Google OAuth client, ID spreadsheet Register & Content Bridge, dan folder foto di environment Vercel.</Alert>}
    {health?.healthy && <Alert tone="success" title="Semua resource Google bisa diakses." />}
    {health?.checks && <ul className="grid gap-2 sm:grid-cols-2">{Object.entries(health.checks).map(([key, check]) => <li key={key} className={cn("rounded-xl border p-3 text-xs", check.status === "HEALTHY" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800")}><p className="font-bold">{labels[key] ?? key} — {check.status === "HEALTHY" ? "OK" : check.status === "NOT_CONFIGURED" ? "Belum diatur" : "Bermasalah"}</p><p className="mt-1 leading-5">{check.message}</p></li>)}</ul>}
    {message && <Alert tone="info" title={message} />}
    <ErrorAlert code={error} />
    {needsStorageProvision && <p className="text-[11px] leading-5 text-slate-500">“Siapkan Folder Drive” hanya membuat folder baru bila folder yang ada tidak bisa dipakai. Folder lama tidak dihapus, dipindah, atau diubah.</p>}
  </div>;
}
