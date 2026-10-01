import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Integrasi" };
export const dynamic = "force-dynamic";

type IntegrationRow = {
  name: string;
  detail: string;
  configured: boolean;
  reason?: string;
};

export default function IntegrationsPage() {
  const capabilities = getRuntimeCapabilities();
  const rows: IntegrationRow[] = [
    {
      name: "Google Sheets",
      detail: "Register read-only + MBA - CONTENT BRIDGE",
      configured: capabilities.registerRead.configured && capabilities.bridgeWrite.configured,
      reason: capabilities.bridgeWrite.reason ?? capabilities.registerRead.reason,
    },
    {
      name: "Google Drive",
      detail: "Folder foto pekerja dan arsip export",
      configured: capabilities.photoDrive.configured,
      reason: capabilities.photoDrive.reason,
    },
    {
      name: "Canva",
      detail: "MB-01 Pekerja Ready • source 1080×1350",
      configured: capabilities.canvaOAuth.configured,
      reason: capabilities.canvaOAuth.reason ?? "Template autofill tetap harus lolos health check.",
    },
    {
      name: "Neon",
      detail: "Technical DB, Master Data, audit, generation job",
      configured: capabilities.database.configured,
      reason: capabilities.database.reason,
    },
    {
      name: "Vercel",
      detail: "Next.js hosting, Preview, Staging, Production",
      configured: process.env.VERCEL === "1",
      reason: process.env.VERCEL === "1" ? undefined : "Project Vercel Content Ops belum terhubung.",
    },
  ];

  const readyCount = rows.filter((row) => row.configured).length;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-[#0B1F3A]">Integrasi</h2>
        <p className="mt-1 text-sm text-slate-500">Status ini berasal dari konfigurasi runtime, bukan status dekoratif.</p>
      </header>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Runtime readiness</p>
            <p className="mt-1 text-xl font-black text-[#0B1F3A]">{readyCount}/{rows.length} terkonfigurasi</p>
          </div>
          <Badge className={readyCount === rows.length ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}>
            {readyCount === rows.length ? "Ready" : "Setup"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.name}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{row.name}</p>
                  <Badge className={row.configured ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                    {row.configured ? "Configured" : "Not configured"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{row.detail}</p>
              </div>
              <p className={`text-xs font-medium ${row.configured ? "text-emerald-700" : "text-amber-700"}`}>
                {row.configured ? "Siap dipakai setelah health check." : row.reason}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
