import { describe, expect, it, vi } from "vitest";
import { generationResult, pendingGeneration, startTemplateBatch } from "./results";
import { completedJobTarget } from "./job-target";

describe("multi-template generation", () => {
  it("starts the next template despite an earlier failure, and does not submit duplicates", async () => {
    const start = vi.fn(async (code: string) => {
      if (code === "MB-01B") throw new Error("CANVA_AUTOFILL_FAILED");
      return { templateCode: code, jobId: code, status: code === "MB-01A" ? "GENERATING" : "DONE" };
    });
    const results = await startTemplateBatch(["MB-01A", "MB-01B", "MB-NEW", "MB-NEW"], start, vi.fn());
    expect(start.mock.calls.map(([code]) => code)).toEqual(["MB-01A", "MB-01B", "MB-NEW"]);
    expect(results.map((result) => result.status)).toEqual(["GENERATING", "ERROR", "DONE"]);
    expect(results.filter(pendingGeneration).map((result) => result.templateCode)).toEqual(["MB-01A"]);
  });

  it("restores distinct design, export and publication links from saved job outputs", () => {
    const result = generationResult({ id: "job", templateCode: "MB-NEW", templateVersion: "v2", status: "DONE", canvaDesignId: "DANEW", errorCode: null, resultJson: { designUrl: "https://www.canva.com/d/example", exportUrl: "https://drive.google.com/file/d/export", publishedChannel: "INSTAGRAM" } });
    expect(result).toMatchObject({ jobId: "job", templateCode: "MB-NEW", designUrl: "https://www.canva.com/d/example", exportUrl: "https://drive.google.com/file/d/export", publishedChannel: "INSTAGRAM" });
    expect(pendingGeneration(result)).toBe(false);
    expect(generationResult({ id: "old", templateCode: "MB-01A", templateVersion: "v1", status: "DONE", canvaDesignId: "DAOLD", errorCode: null, resultJson: {} }).designUrl).toBe("https://www.canva.com/design/DAOLD/edit");
  });
});

describe("per-template export/publish target", () => {
  const job = { workerRegister: "PMBA-001-ART", requestedBy: "user", status: "DONE", canvaDesignId: "DASPECIFIC", resultJson: {} };
  it("rejects a job from another worker or account, and unfinished jobs", () => {
    expect(completedJobTarget(job, "PMBA-002-ART", "user")).toMatchObject({ error: "FORBIDDEN" });
    expect(completedJobTarget(job, job.workerRegister, "other")).toMatchObject({ error: "FORBIDDEN" });
    expect(completedJobTarget({ ...job, status: "GENERATING" }, job.workerRegister, "user")).toMatchObject({ error: "CONTENT_NOT_GENERATED" });
    expect(completedJobTarget(job, job.workerRegister, "user")).toEqual({ job });
  });
});
