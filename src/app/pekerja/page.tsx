import { getServerSession } from "next-auth";
import { WorkerSearch } from "@/components/worker-search";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Pekerja" };
export const dynamic = "force-dynamic";

export default async function WorkerPage() {
  const capabilities = getRuntimeCapabilities();
  const session = await getServerSession(authOptions);
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold text-brand-navy">Pekerja</h1><p className="mt-1 text-sm text-slate-500">Cari pekerja dari Register, lalu lengkapi data dan fotonya untuk konten.</p></header>
    <WorkerSearch enabled={capabilities.registerRead.configured} isAdmin={isAdmin(session?.user.role)} />
  </div>;
}
