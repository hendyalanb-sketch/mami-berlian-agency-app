import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MasterTabs } from "@/components/master-tabs";
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
      <h1 className="text-2xl font-bold text-brand-navy">Master Data</h1>
      <p className="mt-1 text-sm text-slate-500">Sumber semua pilihan yang dilihat staf. Gunakan Nonaktifkan, bukan hapus, agar data lama tetap konsisten.</p>
    </header>
    <MasterTabs enabled={capabilities.database.configured} />
  </div>;
}
