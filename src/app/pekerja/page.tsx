import { WorkerSearch } from "@/components/worker-search";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Pekerja" };
export const dynamic = "force-dynamic";

export default function WorkerPage() {
  const capabilities = getRuntimeCapabilities();
  return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Pekerja</h2><p className="mt-1 text-sm text-slate-500">Sumber identitas: REGISTER PEKERJA MAJIKAN (read-only). Pencarian dilakukan server-side dan dibatasi maksimal 20 hasil.</p></header><WorkerSearch enabled={capabilities.registerRead.configured}/></div>;
}
