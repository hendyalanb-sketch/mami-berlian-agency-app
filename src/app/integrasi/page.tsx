import { getServerSession } from "next-auth";
import { Check } from "lucide-react";
import { CanvaIntegrationControl } from "@/components/canva-integration-control";
import { GoogleIntegrationControl } from "@/components/google-integration-control";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getCanvaRuntimeState } from "@/modules/canva/runtime-state";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Integrasi" };
export const dynamic = "force-dynamic";

type Step = { key: string; title: string; detail: string; ready: boolean; reason?: string; control?: React.ReactNode };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ canva?: string }> }) {
  const params = await searchParams;
  const capabilities = getRuntimeCapabilities();
  const session = await getServerSession(authOptions);
  const canva = await getCanvaRuntimeState(session?.user.id);
  const googleConfigured = capabilities.registerRead.configured && capabilities.bridgeWrite.configured && capabilities.photoDrive.configured;

  const steps: Step[] = [
    { key: "neon", title: "Database Neon", detail: "Master Data, user, audit, dan riwayat generate.", ready: capabilities.database.configured, reason: capabilities.database.reason ?? "DATABASE_URL belum diisi." },
    { key: "google", title: "Google Sheets & Drive", detail: "Register (read-only), Content Bridge, folder foto, dan folder export.", ready: googleConfigured, reason: capabilities.bridgeWrite.reason ?? capabilities.registerRead.reason ?? capabilities.photoDrive.reason, control: <GoogleIntegrationControl configured={googleConfigured} /> },
    { key: "canva", title: "Canva & Template", detail: "Akun Canva Anda + template profil MB-01A/B dan flyer katalog MB-02A/B.", ready: canva.ready, reason: !canva.configured ? "Kredensial Canva belum lengkap." : !canva.connected ? "Akun Canva Anda belum dihubungkan." : !canva.templateActive ? "Belum ada template yang lolos pemeriksaan." : undefined, control: <CanvaIntegrationControl configured={canva.configured} connected={canva.connected} templates={canva.templates} /> },
  ];
  const readyCount = steps.filter((step) => step.ready).length;
  const firstPending = steps.find((step) => !step.ready)?.key;

  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold text-brand-navy">Integrasi</h1><p className="mt-1 text-sm text-slate-500">Selesaikan langkah berurutan dari atas. Status dibaca dari konfigurasi dan koneksi nyata.</p></header>

    {params.canva === "connected" && <Alert tone="success" title="Canva berhasil terhubung.">Lanjutkan dengan “Periksa Template” untuk mengaktifkan template.</Alert>}

    <Card><CardContent className="flex items-center justify-between gap-3 p-4">
      <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kesiapan aplikasi</p><p className="mt-1 text-xl font-black text-brand-navy">{readyCount}/{steps.length} siap</p></div>
      <StatusBadge status={readyCount === steps.length ? { label: "Siap dipakai", tone: "success" } : { label: "Perlu setup", tone: "warning" }} />
    </CardContent></Card>

    <ol className="space-y-3">
      {steps.map((step, index) => <li key={step.key}><Card className={cn(step.key === firstPending && "ring-2 ring-brand-navy/15")}><CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", step.ready ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600")} aria-hidden>{step.ready ? <Check size={16} /> : index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-brand-navy">{step.title}</h2><StatusBadge status={step.ready ? { label: "Siap", tone: "success" } : { label: "Belum siap", tone: "warning" }} /></div>
            <p className="mt-1 text-xs text-slate-500">{step.detail}</p>
            {!step.ready && step.reason && <p className="mt-1 text-xs font-semibold text-amber-700">{step.reason}</p>}
          </div>
        </div>
        {step.control && <div className="sm:pl-11">{step.control}</div>}
      </CardContent></Card></li>)}
    </ol>

    <p className="text-xs text-slate-500">Hosting: {process.env.VERCEL === "1" ? "berjalan di Vercel." : "belum berjalan di project Vercel Content Ops (mode lokal/dev)."}</p>
  </div>;
}
