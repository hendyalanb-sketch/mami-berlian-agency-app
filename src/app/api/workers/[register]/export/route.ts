import { z } from "zod";
import { getGenerationJob, updateGenerationOutputs } from "@/modules/generation/job-service";
import { completedJobTarget } from "@/modules/generation/job-target";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { canGenerateContent } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/service";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { getCanvaAccessToken, CanvaConnectionError } from "@/modules/canva/oauth-token-service";
import { createCanvaDesignExport, waitForCanvaExport, CanvaApiError } from "@/modules/canva/rest";
import { uploadImageToDrive } from "@/modules/google/drive-rest";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { getGoogleStorageSettings } from "@/modules/settings/service";
import { canonicalizeWorkerRegister } from "@/modules/workers/register-normalization";
import { WorkerSourceService } from "@/modules/workers/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileSegment(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, " ").toUpperCase();
}

export async function POST(request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canGenerateContent({ role: session.user.role, canGenerate: session.user.canGenerate })) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const parsed = z.object({ jobId: z.string().uuid().optional() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const registerId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!registerId || !bridgeId) return NextResponse.json({ error: "GOOGLE_SHEETS_NOT_CONFIGURED" }, { status: 503 });

  try {
    const storage = await getGoogleStorageSettings();
    if (!storage.exportFolderId) return NextResponse.json({ error: "EXPORT_FOLDER_NOT_CONFIGURED" }, { status: 503 });

    const { register } = await params;
    const workerRegister = canonicalizeWorkerRegister(decodeURIComponent(register));
    const [googleAccessToken, canvaAccessToken] = await Promise.all([
      getGoogleAccessToken(session.user.id),
      getCanvaAccessToken(session.user.id),
    ]);
    const source = new WorkerSourceService({ spreadsheetId: registerId, accessToken: googleAccessToken });
    const worker = await source.getByRegister(workerRegister);
    if (!worker) return NextResponse.json({ error: "WORKER_NOT_FOUND" }, { status: 404 });

    const bridge = new ContentBridgeService({ spreadsheetId: bridgeId, accessToken: googleAccessToken });
    const before = await bridge.get(worker.workerRegister);
    const job = parsed.data.jobId ? await getGenerationJob(parsed.data.jobId) : null;
    if (parsed.data.jobId) {
      const target = completedJobTarget(job, worker.workerRegister, session.user.id);
      if ("error" in target) return NextResponse.json({ error: target.error }, { status: target.status });
      if (target.job.resultJson.exportDriveId && target.job.resultJson.exportUrl) return NextResponse.json({ ok: true, jobId: parsed.data.jobId, reused: true, export: { id: target.job.resultJson.exportDriveId, webViewLink: target.job.resultJson.exportUrl } });
    }
    const designId = job?.canvaDesignId ?? before?.canva_design_id;
    if (!designId) return NextResponse.json({ error: "CANVA_DESIGN_NOT_FOUND" }, { status: 409 });
    const currentStatus = job ? "GENERATED" : String(before?.content_status ?? "");
    if (!["GENERATED", "ARCHIVED", "PUBLISHED"].includes(currentStatus)) {
      return NextResponse.json({ error: "CONTENT_NOT_GENERATED", contentStatus: currentStatus || "INCOMPLETE" }, { status: 409 });
    }

    const exportJob = await createCanvaDesignExport({ accessToken: canvaAccessToken, designId: String(designId) });
    let downloadUrl: string;
    if (exportJob.job.status === "success" && exportJob.job.urls?.[0]) downloadUrl = exportJob.job.urls[0];
    else if (exportJob.job.status === "failed") throw new CanvaApiError(422, exportJob.job.error?.code ?? "CANVA_EXPORT_FAILED", exportJob.job.error?.message);
    else downloadUrl = await waitForCanvaExport({ accessToken: canvaAccessToken, jobId: exportJob.job.id });

    const download = await fetch(downloadUrl, { cache: "no-store" });
    if (!download.ok) throw new Error(`CANVA_EXPORT_DOWNLOAD_FAILED:${download.status}`);
    const templateCode = safeFileSegment(String(job?.templateCode ?? before?.canva_template_key ?? "MB-01"));
    const fileName = `${safeFileSegment(worker.workerRegister)} - ${safeFileSegment(worker.name || "PEKERJA")} - ${templateCode}.png`;
    const archived = await uploadImageToDrive({
      accessToken: googleAccessToken,
      folderId: storage.exportFolderId,
      fileName,
      contentType: download.headers.get("content-type") ?? "image/png",
      bytes: await download.arrayBuffer(),
    });
    const archivedAt = new Date().toISOString();
    const nextStatus = currentStatus === "PUBLISHED" ? "PUBLISHED" : "ARCHIVED";
    if (job) await updateGenerationOutputs(job.id, { exportDriveId: archived.id, exportUrl: archived.webViewLink });
    if (!job || before?.canva_design_id === designId) await bridge.upsert({
      worker_register: worker.workerRegister,
      export_drive_id: archived.id,
      export_drive_url: archived.webViewLink,
      content_status: nextStatus,
      last_updated_by: session.user.email ?? session.user.id,
      last_updated_at: archivedAt,
    });
    await writeAudit({
      workerRegister: worker.workerRegister,
      userId: session.user.id,
      action: "EXPORT_CANVA_TO_DRIVE",
      entityType: "DRIVE_FILE",
      entityId: archived.id,
      before: { contentStatus: currentStatus, exportDriveId: before?.export_drive_id ?? null },
      after: { contentStatus: nextStatus, exportDriveId: archived.id, fileName },
      metadata: { jobId: job?.id, canvaDesignId: designId, canvaTemplateKey: templateCode, canvaExportJobId: exportJob.job.id },
    });

    return NextResponse.json({ ok: true, contentStatus: nextStatus, export: archived, fileName, jobId: job?.id, templateCode });
  } catch (error) {
    const code = error instanceof CanvaConnectionError || error instanceof GoogleConnectionError
      ? error.code
      : error instanceof CanvaApiError
        ? error.code
        : error instanceof Error
          ? error.message.split(":")[0]
          : "EXPORT_FAILED";
    const status = error instanceof CanvaConnectionError || error instanceof GoogleConnectionError ? 409 : error instanceof CanvaApiError ? error.status : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
