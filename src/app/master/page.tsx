import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ContentMasterManager } from "@/components/content-master-manager";
import { MasterDataManager } from "@/components/master-data-manager";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Master Data" };
export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/");

  const capabilities = getRuntimeCapabilities();
  return <div className="space-y-5">
    <header>
      <h2 className="text-2xl font-bold text-[#0B1F3A]">Master Data</h2>
      <p className="mt-1 text-sm text-slate-500">Sumber pilihan operasional dan publikasi: kategori, skill, pengalaman, penempatan, rate, mapping Register, template Canva, channel, CTA, dan label tampilan.</p>
    </header>
    <MasterDataManager enabled={capabilities.database.configured}/>
    <ContentMasterManager enabled={capabilities.database.configured}/>
  </div>;
}
