import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
const integrations=[
  ["Google Sheets","Aset Register & Bridge terverifikasi","OAuth runtime belum dikonfigurasi"],
  ["Google Drive","Folder foto terverifikasi","OAuth runtime belum dikonfigurasi"],
  ["Canva","Folder dan source design MB-01 terverifikasi","Autofill fields belum tersedia"],
  ["Neon","Schema aplikasi sudah didefinisikan di Drizzle","Project target belum terhubung"],
  ["Vercel","Team terverifikasi","Project Content Ops belum dibuat"],
];
export const metadata={title:"Integrasi"};
export default function IntegrationsPage(){return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Integrasi</h2><p className="mt-1 text-sm text-slate-500">Status aset eksternal dan konfigurasi runtime.</p></header><div className="grid gap-3">{integrations.map(([name,verified,next])=><Card key={name}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-semibold">{name}</p><Badge className="border-emerald-100 bg-emerald-50 text-emerald-700">Asset checked</Badge></div><p className="mt-1 text-xs text-slate-500">{verified}</p></div><p className="text-xs font-medium text-amber-700">{next}</p></CardContent></Card>)}</div></div>}
