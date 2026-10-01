import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft,Camera,Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { WorkerEnrichmentFlow } from "@/components/worker-enrichment-flow";
import { WorkerPhotoPrep } from "@/components/worker-photo-prep";
import { authOptions } from "@/lib/auth";
import { canEditWorkers } from "@/lib/permissions";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";
export const dynamic="force-dynamic";
export default async function WorkerDetailPage({params}:{params:Promise<{register:string}>}){const{register}=await params;const decoded=decodeURIComponent(register);const capabilities=getRuntimeCapabilities();const session=await getServerSession(authOptions);const editable=canEditWorkers(session?.user.role);return <div className="space-y-5"><header><Link href="/pekerja" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={18}/>Pekerja</Link><div className="mt-2 flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-[#0B1F3A]">Detail Pekerja</h2><Badge>{decoded}</Badge></div><p className="mt-1 text-sm text-slate-500">Identitas dari Register read-only; enrichment disimpan terpisah ke Content Bridge.</p></header><div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><Card><CardHeader><CardTitle>1–3 Enrichment</CardTitle></CardHeader><CardContent><WorkerEnrichmentFlow workerRegister={decoded} enabled={capabilities.enrichment.configured} editable={editable}/></CardContent></Card><div className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Camera size={18}/>4 Foto</CardTitle></CardHeader><CardContent><WorkerPhotoPrep workerRegister={decoded} driveEnabled={capabilities.photoDrive.configured}/></CardContent></Card><Link href={`/preview/${encodeURIComponent(decoded)}`} className="flex min-h-14 items-center justify-between rounded-2xl bg-[#0B1F3A] px-4 text-sm font-bold text-white"><span>5 Preview Publik</span><Eye size={18}/></Link></div></div></div>;}
