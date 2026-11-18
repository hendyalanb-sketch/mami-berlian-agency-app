import { notFound } from "next/navigation";
import { WorkerContentActions } from "@/components/worker-content-actions";

export default async function BatchGallery({ searchParams }: { searchParams: Promise<{ restored?: string; incomplete?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { restored, incomplete } = await searchParams;
  const codes = ["MB-01A", "MB-01B", "MB-02A", "MB-02B", "MB-NEW"];
  return <div className="mx-auto max-w-md space-y-3 p-3"><h1 className="text-xl font-bold">Buat Semua — galeri pengujian</h1><WorkerContentActions
    workerRegister="PMBA-TEST-ART" contentStatus="APPROVED" readinessScore={incomplete ? 86 : 100}
    missing={incomplete ? ["publication_consent"] : []} approved={!incomplete}
    isAdmin canGenerate canPublish generationConfigured exportConfigured
    publishChannels={[{ code: "INSTAGRAM", name: "Instagram" }]}
    templateOptions={codes.map((code) => ({ code, name: code === "MB-NEW" ? "Template baru dengan nama panjang untuk profil pekerja" : `Template ${code}`, version: "v1", designId: `DA${code}` }))}
    initialResults={restored ? [{ templateCode: "MB-01A", templateVersion: "v1", jobId: "10000000-0000-4000-8000-000000000001", status: "DONE", designUrl: "https://www.canva.com/design/DARESTORED/edit", exportUrl: "https://drive.google.com/file/d/RESTORED" }] : []}
    renderPreviews={Object.fromEntries(codes.map((code) => [code, [{ field: "WORKER_NAME", label: "Nama", text: "Pekerja Contoh" }]]))}
  /></div>;
}
