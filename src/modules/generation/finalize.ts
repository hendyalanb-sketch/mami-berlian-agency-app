import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { writeAudit } from "@/modules/audit/service";
import { getGenerationJob, updateGenerationJob, updateGenerationOutputs } from "@/modules/generation/job-service";

export async function finalizeGeneratedContent(input: {
  jobId: string;
  workerRegister: string;
  templateCode: string;
  templateVersion: string;
  designId: string;
  designUrl?: string;
  bridge: ContentBridgeService;
  actorUserId: string;
  actorLabel: string;
}) {
  const before = await input.bridge.get(input.workerRegister);
  const generatedAt = new Date().toISOString();
  const after = {
    worker_register: input.workerRegister,
    canva_template_key: input.templateCode,
    canva_template_version: input.templateVersion,
    canva_design_id: input.designId,
    canva_design_url: input.designUrl ?? "",
    generated_at: generatedAt,
    content_status: "GENERATED",
    last_updated_by: input.actorLabel,
    last_updated_at: generatedAt,
  } as const;
  const job = await getGenerationJob(input.jobId);
  if (job?.status === "DONE") return { contentStatus: "GENERATED" as const, generatedAt, designId: job.canvaDesignId, designUrl: job.resultJson.designUrl ?? input.designUrl ?? "" };
  await input.bridge.upsert({ ...after, export_drive_id: "", export_drive_url: "", published_channel: "", published_at: "" });
  await updateGenerationOutputs(input.jobId, { designUrl: input.designUrl ?? `https://www.canva.com/design/${encodeURIComponent(input.designId)}/edit` });
  await updateGenerationJob(input.jobId, { status: "DONE", canvaDesignId: input.designId, completedAt: new Date(), errorCode: null, errorMessage: null });
  await writeAudit({
    workerRegister: input.workerRegister,
    userId: input.actorUserId,
    action: "GENERATE_CANVA_DONE",
    entityType: "GENERATION_JOB",
    entityId: input.jobId,
    before,
    after: { ...after, jobId: input.jobId },
  });
  return { contentStatus: "GENERATED" as const, generatedAt, designId: input.designId, designUrl: input.designUrl ?? "" };
}

export async function failGeneration(input: { jobId: string; workerRegister: string; bridge?: ContentBridgeService; code: string; message: string; actorLabel?: string }) {
  await updateGenerationJob(input.jobId, { status: "ERROR", errorCode: input.code, errorMessage: input.message, completedAt: new Date() });
  const job = await getGenerationJob(input.jobId);
  await writeAudit({ workerRegister: input.workerRegister, userId: job?.requestedBy ?? undefined, action: "GENERATE_CANVA_ERROR", entityType: "GENERATION_JOB", entityId: input.jobId, after: { error: input.code }, metadata: { templateCode: job?.templateCode } });
  // Failure belongs to this template; do not erase another template's successful Bridge result.
}
