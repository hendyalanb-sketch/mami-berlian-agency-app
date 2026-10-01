import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { writeAudit } from "@/modules/audit/service";
export async function markWorkerPublished(input: {
  bridge: ContentBridgeService;
  workerRegister: string;
  channel: string;
  actorUserId?: string;
  actorLabel?: string;
  publishedAt?: string;
}) {
  const publishedAt = input.publishedAt ?? new Date().toISOString();
  await input.bridge.upsert({
    worker_register: input.workerRegister,
    content_status: "PUBLISHED",
    published_channel: input.channel,
    published_at: publishedAt,
    last_updated_by: input.actorLabel ?? input.actorUserId ?? "SYSTEM",
  });
  try {
    await writeAudit({
      workerRegister: input.workerRegister,
      userId: input.actorUserId,
      action: "MARK_PUBLISHED",
      entityType: "WORKER_CONTENT",
      entityId: input.workerRegister,
      after: { channel: input.channel, publishedAt },
    });
  } catch (error) {
    if (process.env.DATABASE_URL) throw error;
  }
  return { workerRegister: input.workerRegister, channel: input.channel, publishedAt };
}
