import type { GenerationOutputs } from "./results";

export function completedJobTarget(job: { workerRegister: string; requestedBy: string | null; status: string; canvaDesignId: string | null; resultJson: GenerationOutputs } | null, workerRegister: string, userId: string) {
  if (!job) return { error: "JOB_NOT_FOUND", status: 404 } as const;
  if (job.workerRegister !== workerRegister || job.requestedBy !== userId) return { error: "FORBIDDEN", status: 403 } as const;
  if (job.status !== "DONE" || !job.canvaDesignId) return { error: "CONTENT_NOT_GENERATED", status: 409 } as const;
  return { job } as const;
}
