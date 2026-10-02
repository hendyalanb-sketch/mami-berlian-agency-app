export type GenerationOutputs = {
  designUrl?: string;
  photoDriveId?: string;
  photoAssetId?: string;
  exportDriveId?: string;
  exportUrl?: string;
  publishedChannel?: string;
  publishedAt?: string;
};

export type TemplateGenerationResult = {
  jobId?: string;
  templateCode: string;
  templateVersion?: string;
  status: string;
  designId?: string | null;
  designUrl?: string | null;
  exportUrl?: string | null;
  publishedChannel?: string;
  error?: string | null;
  missing?: string[];
  wrongType?: string[];
  reused?: boolean;
};

export function generationResult(job: {
  id: string;
  templateCode: string;
  templateVersion: string;
  status: string;
  canvaDesignId: string | null;
  errorCode: string | null;
  resultJson: GenerationOutputs;
}): TemplateGenerationResult {
  return {
    jobId: job.id,
    templateCode: job.templateCode,
    templateVersion: job.templateVersion,
    status: job.status,
    designId: job.canvaDesignId,
    designUrl: job.resultJson.designUrl || (job.canvaDesignId ? `https://www.canva.com/design/${encodeURIComponent(job.canvaDesignId)}/edit` : null),
    exportUrl: job.resultJson.exportUrl ?? null,
    publishedChannel: job.resultJson.publishedChannel,
    error: job.errorCode,
  };
}

// Start every selection before polling, so a slow Canva job cannot block later templates.
// Keep starts sequential to reuse one uploaded photo and avoid provider rate bursts.
export async function startTemplateBatch(
  codes: string[],
  start: (code: string) => Promise<TemplateGenerationResult>,
  onResult: (result: TemplateGenerationResult) => void,
) {
  const results: TemplateGenerationResult[] = [];
  for (const code of [...new Set(codes)]) {
    onResult({ templateCode: code, status: "PREPARING" });
    try {
      const result = await start(code);
      results.push(result);
      onResult(result);
    } catch (error) {
      const result = { templateCode: code, status: "ERROR", error: error instanceof Error ? error.message : "GENERATION_FAILED" };
      results.push(result);
      onResult(result);
    }
  }
  return results;
}

export function pendingGeneration(result: TemplateGenerationResult) {
  return Boolean(result.jobId && !["DONE", "ERROR", "QUEUED"].includes(result.status));
}
