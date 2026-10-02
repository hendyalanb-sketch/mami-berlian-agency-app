import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { publishChannels } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { canEditWorkers } from "@/lib/permissions";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { getGenerationJob, updateGenerationOutputs } from "@/modules/generation/job-service";
import { completedJobTarget } from "@/modules/generation/job-target";
import { markWorkerPublished } from "@/modules/publish/service";
import { canonicalizeWorkerRegister } from "@/modules/workers/register-normalization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ channel: z.string().min(1).max(40), jobId: z.string().uuid().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canEditWorkers(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!db) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!bridgeId) return NextResponse.json({ error: "BRIDGE_NOT_CONFIGURED" }, { status: 503 });

  try {
    const channelCode = parsed.data.channel.trim().toUpperCase();
    const [channel] = await db.select().from(publishChannels).where(eq(publishChannels.code, channelCode)).limit(1);
    if (!channel?.isActive) return NextResponse.json({ error: "INVALID_PUBLISH_CHANNEL" }, { status: 422 });

    const { register } = await params;
    const workerRegister = canonicalizeWorkerRegister(decodeURIComponent(register));
    const accessToken = await getGoogleAccessToken(session.user.id);
    const bridge = new ContentBridgeService({ spreadsheetId: bridgeId, accessToken });
    const current = await bridge.get(workerRegister);
    if (!current) return NextResponse.json({ error: "CONTENT_NOT_FOUND" }, { status: 404 });
    const job = parsed.data.jobId ? await getGenerationJob(parsed.data.jobId) : null;
    if (parsed.data.jobId) {
      const target = completedJobTarget(job, workerRegister, session.user.id);
      if ("error" in target) return NextResponse.json({ error: target.error }, { status: target.status });
      if (!target.job.resultJson.exportDriveId) return NextResponse.json({ error: "EXPORT_REQUIRED_BEFORE_PUBLISH" }, { status: 409 });
      await bridge.upsert({ worker_register: workerRegister, canva_template_key: job!.templateCode, canva_template_version: job!.templateVersion, canva_design_id: job!.canvaDesignId!, canva_design_url: job!.resultJson.designUrl ?? "", export_drive_id: job!.resultJson.exportDriveId!, export_drive_url: job!.resultJson.exportUrl ?? "", content_status: "ARCHIVED" });
    }
    if (!job && (!["ARCHIVED", "PUBLISHED"].includes(String(current.content_status ?? "")) || !current.export_drive_id)) {
      return NextResponse.json({ error: "EXPORT_REQUIRED_BEFORE_PUBLISH", contentStatus: current.content_status ?? "INCOMPLETE" }, { status: 409 });
    }

    const result = await markWorkerPublished({ bridge, workerRegister, channel: channelCode, actorUserId: session.user.id, actorLabel: session.user.email ?? session.user.id });
    if (job) await updateGenerationOutputs(job.id, { publishedChannel: result.channel, publishedAt: result.publishedAt });
    return NextResponse.json({ ok: true, contentStatus: "PUBLISHED", jobId: job?.id, ...result });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 502 });
  }
}
