import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export async function writeAudit(input: {
  workerRegister?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  if (!db) throw new Error("Database is not configured");
  await db.insert(auditLogs).values({
    workerRegister: input.workerRegister,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeJson: input.before,
    afterJson: input.after,
    metadataJson: input.metadata,
  });
}
