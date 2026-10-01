import { MasterDataManager } from "@/components/master-data-manager";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Master Data" };
export const dynamic = "force-dynamic";

export default function MasterPage() {
  const capabilities = getRuntimeCapabilities();
  return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Master Data</h2><p className="mt-1 text-sm text-slate-500">Satu sumber pilihan operasional untuk kategori, skill, pengalaman, penempatan, mapping Register, dan rate gaji.</p></header><MasterDataManager enabled={capabilities.database.configured}/></div>;
}
