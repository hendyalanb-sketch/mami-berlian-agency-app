import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { canvaTemplates, ctaProfiles } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { canGenerateContent } from "@/lib/permissions";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { getCanvaAccessToken, CanvaConnectionError } from "@/modules/canva/oauth-token-service";
import { createCanvaAssetUpload, createCanvaDesignAutofill, getCanvaDesignDataset, waitForCanvaAsset, CanvaApiError, type CanvaAutofillValue } from "@/modules/canva/rest";
import { evaluateTemplateDataset } from "@/modules/canva/template-health";
import { contentHash } from "@/modules/generation/content-hash";
import { failGeneration, finalizeGeneratedContent } from "@/modules/generation/finalize";
import { createOrReuseGenerationJob, resetGenerationJob, updateGenerationJob } from "@/modules/generation/job-service";
import { downloadDriveFile } from "@/modules/google/drive-rest";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { getWorkerMasterOptions } from "@/modules/master-data/service";
import { buildPublicWorkerView } from "@/modules/workers/public-view";
import { canonicalizeWorkerRegister } from "@/modules/workers/register-normalization";
import { WorkerSourceService } from "@/modules/workers/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canGenerateContent({ role: session.user.role, canGenerate: session.user.canGenerate })) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!db) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });

  const registerId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!registerId || !bridgeId) return NextResponse.json({ error: "GOOGLE_SHEETS_NOT_CONFIGURED" }, { status: 503 });

  let jobId: string | undefined;
  let workerRegister = "";
  let bridge: ContentBridgeService | undefined;

  try {
    const { register } = await params;
    workerRegister = canonicalizeWorkerRegister(decodeURIComponent(register));
    const [template] = await db.select().from(canvaTemplates).where(eq(canvaTemplates.code, "MB-01")).limit(1);
    const designId = process.env.CANVA_MB01_WORKING_DESIGN_ID ?? template?.canvaTemplateId;
    if (!template || !template.isActive || !designId) return NextResponse.json({ error: "MB01_NOT_ACTIVE" }, { status: 409 });

    const googleAccessToken = await getGoogleAccessToken(session.user.id);
    const canvaAccessToken = await getCanvaAccessToken(session.user.id);
    const source = new WorkerSourceService({ spreadsheetId: registerId, accessToken: googleAccessToken });
    bridge = new ContentBridgeService({ spreadsheetId: bridgeId, accessToken: googleAccessToken });
    const worker = await source.getByRegister(workerRegister);
    if (!worker) return NextResponse.json({ error: "WORKER_NOT_FOUND" }, { status: 404 });
    const bridgeRecord = await bridge.get(worker.workerRegister);
    if (!bridgeRecord?.approved_at) return NextResponse.json({ error: "CONTENT_NOT_APPROVED" }, { status: 409 });
    if (!bridgeRecord.profile_photo_drive_id) return NextResponse.json({ error: "PROFILE_PHOTO_REQUIRED" }, { status: 422 });

    const dataset = await getCanvaDesignDataset({ accessToken: canvaAccessToken, designId });
    const templateHealth = evaluateTemplateDataset(dataset);
    if (!templateHealth.valid) {
      await db.update(canvaTemplates).set({ isActive: false, updatedAt: new Date() }).where(eq(canvaTemplates.id, template.id));
      return NextResponse.json({ error: "TEMPLATE_UNHEALTHY", ...templateHealth }, { status: 409 });
    }

    const master = await getWorkerMasterOptions();
    const view = buildPublicWorkerView(worker, bridgeRecord, master);
    const [cta] = await db.select().from(ctaProfiles).where(and(eq(ctaProfiles.isDefault, true), eq(ctaProfiles.isActive, true))).limit(1);
    const ctaText = cta?.ctaText ?? "Hubungi Mami Berlian untuk informasi penempatan.";
    const hash = contentHash({ templateCode: template.code, templateVersion: template.version, designId, view, ctaText });
    let jobResult = await createOrReuseGenerationJob({ workerRegister: worker.workerRegister, templateCode: template.code, templateVersion: template.version, contentHash: hash, requestedBy: session.user.id });
    if (jobResult.reused && jobResult.job.status === "DONE") {
      return NextResponse.json({ ok: true, reused: true, jobId: jobResult.job.id, status: "DONE", designId: jobResult.job.canvaDesignId });
    }
    if (jobResult.reused && !["ERROR", "QUEUED"].includes(jobResult.job.status)) {
      return NextResponse.json({ ok: true, reused: true, jobId: jobResult.job.id, status: jobResult.job.status }, { status: 202 });
    }
    if (jobResult.reused && jobResult.job.status === "ERROR") {
      jobResult = { job: await resetGenerationJob(jobResult.job.id, session.user.id), reused: true };
    }
    jobId = jobResult.job.id;

    await updateGenerationJob(jobId, { status: "PREPARING", startedAt: new Date(), errorCode: null, errorMessage: null });
    await bridge.upsert({ worker_register: worker.workerRegister, content_status: "GENERATING", last_updated_by: session.user.email ?? session.user.id, last_updated_at: new Date().toISOString() });

    const driveResponse = await downloadDriveFile({ accessToken: googleAccessToken, fileId: String(bridgeRecord.profile_photo_drive_id) });
    if (!driveResponse.ok) throw new Error(`DRIVE_PHOTO_DOWNLOAD_FAILED:${driveResponse.status}`);
    const photoBytes = await driveResponse.arrayBuffer();
    await updateGenerationJob(jobId, { status: "UPLOADING_PHOTO" });
    const upload = await createCanvaAssetUpload({ accessToken: canvaAccessToken, name: `${worker.workerRegister} ${worker.name}`.slice(0, 50), bytes: photoBytes });
    const assetId = upload.job.status === "success" && upload.job.asset?.id
      ? upload.job.asset.id
      : await waitForCanvaAsset({ accessToken: canvaAccessToken, jobId: upload.job.id });

    const data: Record<string, CanvaAutofillValue> = {
      WORKER_PHOTO: { type: "image", asset_id: assetId },
      WORKER_NAME: { type: "text", text: view.name },
      WORKER_AGE: { type: "text", text: view.age },
      WORKER_ORIGIN: { type: "text", text: view.origin },
      WORKER_CATEGORY: { type: "text", text: view.category },
      WORKER_SKILLS: { type: "text", text: view.skills.join(" • ") },
      WORKER_PLACEMENT: { type: "text", text: view.placement },
      WORKER_SALARY: { type: "text", text: view.salary },
      CTA_TEXT: { type: "text", text: ctaText },
    };

    await updateGenerationJob(jobId, { status: "CREATING_CANVA_DESIGN" });
    const autofill = await createCanvaDesignAutofill({ accessToken: canvaAccessToken, designId, title: `MB-01 ${worker.name} ${worker.workerRegister}`, data });
    if (autofill.job.status === "failed") throw new CanvaApiError(422, autofill.job.error?.code ?? "CANVA_AUTOFILL_FAILED", autofill.job.error?.message);
    if (autofill.job.status === "success" && autofill.job.result?.design?.id) {
      const result = await finalizeGeneratedContent({
        jobId,
        workerRegister: worker.workerRegister,
        templateCode: template.code,
        templateVersion: template.version,
        designId: autofill.job.result.design.id,
        designUrl: autofill.job.result.design.urls?.edit_url ?? autofill.job.result.design.urls?.view_url,
        bridge,
        actorUserId: session.user.id,
        actorLabel: session.user.email ?? session.user.id,
      });
      return NextResponse.json({ ok: true, jobId, status: "DONE", ...result });
    }

    await updateGenerationJob(jobId, { providerJobId: autofill.job.id, status: "CREATING_CANVA_DESIGN" });
    return NextResponse.json({ ok: true, jobId, status: "GENERATING" }, { status: 202 });
  } catch (error) {
    const code = error instanceof CanvaConnectionError || error instanceof GoogleConnectionError ? error.code : error instanceof CanvaApiError ? error.code : error instanceof Error ? error.message.split(":")[0] : "GENERATION_FAILED";
    if (jobId && workerRegister) {
      await failGeneration({ jobId, workerRegister, bridge, code, message: error instanceof Error ? error.message : "Generation failed", actorLabel: session.user.email ?? session.user.id }).catch(() => undefined);
    }
    const status = error instanceof CanvaConnectionError || error instanceof GoogleConnectionError ? 409 : error instanceof CanvaApiError ? error.status : 502;
    return NextResponse.json({ error: code, jobId }, { status });
  }
}
