import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { getCanvaAccessToken, CanvaConnectionError } from "@/modules/canva/oauth-token-service";
import { getCanvaDesignAutofillJob, CanvaApiError } from "@/modules/canva/rest";
import { failGeneration, finalizeGeneratedContent } from "@/modules/generation/finalize";
import { getGenerationJob, updateGenerationJob } from "@/modules/generation/job-service";
import { generationResult } from "@/modules/generation/results";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { jobId } = await params;
  const job = await getGenerationJob(jobId).catch(() => null);
  if (!job) return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  if (job.requestedBy !== session.user.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (job.status === "DONE") return NextResponse.json(generationResult(job));
  if (job.status === "ERROR") return NextResponse.json({ jobId: job.id, status: "ERROR", error: job.errorCode, message: job.errorMessage });
  if (!job.providerJobId && job.startedAt && Date.now() - job.startedAt.getTime() > 5 * 60 * 1000) {
    await updateGenerationJob(job.id, { status: "ERROR", errorCode: "GENERATION_INTERRUPTED", completedAt: new Date() });
    return NextResponse.json({ jobId: job.id, status: "ERROR", error: "GENERATION_INTERRUPTED" });
  }
  if (!job.providerJobId) return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });

  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!bridgeId) return NextResponse.json({ error: "BRIDGE_NOT_CONFIGURED" }, { status: 503 });

  try {
    const [canvaAccessToken, googleAccessToken] = await Promise.all([getCanvaAccessToken(session.user.id), getGoogleAccessToken(session.user.id)]);
    const result = await getCanvaDesignAutofillJob({ accessToken: canvaAccessToken, jobId: job.providerJobId });
    if (result.job.status === "in_progress") return NextResponse.json({ jobId: job.id, status: "GENERATING" }, { status: 202 });
    const bridge = new ContentBridgeService({ spreadsheetId: bridgeId, accessToken: googleAccessToken });
    if (result.job.status === "failed") {
      const code = result.job.error?.code ?? "CANVA_AUTOFILL_FAILED";
      await failGeneration({ jobId: job.id, workerRegister: job.workerRegister, bridge, code, message: result.job.error?.message ?? code, actorLabel: session.user.email ?? session.user.id });
      return NextResponse.json({ jobId: job.id, status: "ERROR", error: code }, { status: 422 });
    }
    const design = result.job.result?.design;
    if (!design?.id) return NextResponse.json({ jobId: job.id, status: "GENERATING" }, { status: 202 });
    await updateGenerationJob(job.id, { status: "FINALIZING" });
    const finalized = await finalizeGeneratedContent({
      jobId: job.id,
      workerRegister: job.workerRegister,
      templateCode: job.templateCode,
      templateVersion: job.templateVersion,
      designId: design.id,
      designUrl: design.urls?.edit_url ?? design.urls?.view_url,
      bridge,
      actorUserId: session.user.id,
      actorLabel: session.user.email ?? session.user.id,
    });
    return NextResponse.json({ jobId: job.id, status: "DONE", ...finalized });
  } catch (error) {
    const code = error instanceof CanvaConnectionError || error instanceof GoogleConnectionError ? error.code : error instanceof CanvaApiError ? error.code : "GENERATION_STATUS_FAILED";
    return NextResponse.json({ error: code, jobId: job.id }, { status: 502 });
  }
}
