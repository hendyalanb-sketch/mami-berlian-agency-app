import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import type { GenerationOutputs } from "./results";

function database() {
  if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  return db;
}

export async function createOrReuseGenerationJob(input: { workerRegister: string; templateCode: string; templateVersion: string; contentHash: string; requestedBy?: string }) {
  const store = database();
  const [created] = await store.insert(generationJobs).values(input).onConflictDoNothing().returning();
  if (created) return { job: created, reused: false as const };
  const [existing] = await store.select().from(generationJobs).where(and(eq(generationJobs.workerRegister, input.workerRegister), eq(generationJobs.templateVersion, input.templateVersion), eq(generationJobs.contentHash, input.contentHash))).limit(1);
  if (!existing) throw new Error("GENERATION_JOB_MISSING");
  return { job: existing, reused: true as const };
}

export async function getGenerationJob(id: string) {
  const [job] = await database().select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
  return job ?? null;
}

/** One request may start a queued/failed job, even after a double click or retry. */
export async function claimGenerationJob(id: string, requestedBy: string) {
  const [job] = await database().update(generationJobs).set({
    status: "PREPARING", requestedBy, startedAt: new Date(), completedAt: null,
    providerJobId: null, canvaDesignId: null, errorCode: null, errorMessage: null, updatedAt: new Date(),
  }).where(and(eq(generationJobs.id, id), inArray(generationJobs.status, ["QUEUED", "ERROR"]))).returning();
  return job ?? null;
}

export async function updateGenerationJob(id: string, values: Partial<typeof generationJobs.$inferInsert>) {
  const [job] = await database().update(generationJobs).set({ ...values, updatedAt: new Date() }).where(eq(generationJobs.id, id)).returning();
  return job;
}

export async function updateGenerationOutputs(id: string, outputs: GenerationOutputs) {
  const [job] = await database().update(generationJobs).set({
    resultJson: sql`${generationJobs.resultJson} || ${JSON.stringify(outputs)}::jsonb`, updatedAt: new Date(),
  }).where(eq(generationJobs.id, id)).returning();
  return job;
}

export async function listWorkerGenerationJobs(workerRegister: string, requestedBy: string) {
  const rows = await database().select().from(generationJobs).where(and(eq(generationJobs.workerRegister, workerRegister), eq(generationJobs.requestedBy, requestedBy))).orderBy(desc(generationJobs.createdAt));
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.templateCode)) return false;
    seen.add(row.templateCode);
    return true;
  });
}

export async function findUploadedWorkerPhoto(workerRegister: string, requestedBy: string, photoDriveId: string) {
  const [job] = await database().select({ result: generationJobs.resultJson }).from(generationJobs).where(and(
    eq(generationJobs.workerRegister, workerRegister), eq(generationJobs.requestedBy, requestedBy),
    sql`${generationJobs.resultJson}->>'photoDriveId' = ${photoDriveId}`,
    sql`${generationJobs.resultJson}->>'photoAssetId' IS NOT NULL`,
  )).orderBy(desc(generationJobs.updatedAt)).limit(1);
  return job?.result.photoAssetId || null;
}

export async function resetGenerationJob(id: string, requestedBy?: string) {
  return updateGenerationJob(id, { status: "QUEUED", providerJobId: null, canvaDesignId: null, errorCode: null, errorMessage: null, requestedBy, startedAt: null, completedAt: null });
}
