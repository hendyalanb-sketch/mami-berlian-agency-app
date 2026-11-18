import { getServerSession } from "next-auth";
import { WorkerWorkspace } from "@/components/worker-workspace";
import { authOptions } from "@/lib/auth";
import { canEditWorkers, isAdmin } from "@/lib/permissions";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const metadata = { title: "Detail Pekerja" };
export const dynamic = "force-dynamic";

export default async function WorkerDetailPage({ params }: { params: Promise<{ register: string }> }) {
  const { register } = await params;
  const capabilities = getRuntimeCapabilities();
  const session = await getServerSession(authOptions);
  return <WorkerWorkspace
    workerRegister={decodeURIComponent(register)}
    enabled={capabilities.enrichment.configured}
    editable={canEditWorkers(session?.user.role)}
    driveEnabled={capabilities.photoDrive.configured}
    isAdmin={isAdmin(session?.user.role)}
  />;
}
