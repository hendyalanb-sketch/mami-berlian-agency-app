import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";

export async function createOrReuseGenerationJob(input: { workerRegister: string; templateCode: string; templateVersion: string; contentHash: string; requestedBy?: string }) {
  if (!db) throw new Error("Database is not configured");
  const existing = await db.select().from(generationJobs).where(and(
    eq(generationJobs.workerRegister, input.workerRegister),
    eq(generationJobs.templateVersion, input.templateVersion),
    eq(generationJobs.contentHash, input.contentHash),
  )).limit(1);
  if (existing[0]) return { job: existing[0], reused: true as const };
  const [job] = await db.insert(generationJobs).values({ ...input }).returning();
  return { job, reused: false as const };
}

export async function getGenerationJob(id: string) {
  if (!db) throw new Error("Database is not configured");
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
  return job ?? null;
}

export async function updateGenerationJob(id: string, values: Partial<typeof generationJobs.$inferInsert>) {
  if (!db) throw new Error("Database is not configured");
  const [job] = await db.update(generationJobs).set({ ...values, updatedAt: new Date() }).where(eq(generationJobs.id, id)).returning();
  return job;
}

export async function resetGenerationJob(id: string, requestedBy?: string) {
  return updateGenerationJob(id, {
    status: "QUEUED",
    providerJobId: null,
    canvaDesignId: null,
    errorCode: null,
    errorMessage: null,
    requestedBy,
    startedAt: null,
    completedAt: null,
  });
}
