export type CanvaDataset = Record<string, { type: "text" | "image" | "video" | "chart" | "sheet" }>;
export type CanvaAutofillValue = { type: "text"; text: string } | { type: "image"; asset_id: string };
type AsyncStatus = "in_progress" | "success" | "failed";

export class CanvaApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message?: string) {
    super(message ?? code);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new CanvaApiError(response.status, String(body.code ?? `CANVA_HTTP_${response.status}`), String(body.message ?? "Canva API request failed"));
  }
  return body as T;
}

export async function getCanvaDesignDataset(input: { accessToken: string; designId: string }) {
  const response = await fetch(`https://api.canva.com/rest/v1/designs/${encodeURIComponent(input.designId)}/dataset`, { headers: { Authorization: `Bearer ${input.accessToken}` }, cache: "no-store" });
  const body = await parseResponse<{ dataset?: CanvaDataset }>(response);
  return body.dataset ?? {};
}

export async function createCanvaAssetUpload(input: { accessToken: string; name: string; bytes: ArrayBuffer }) {
  const safeName = input.name.slice(0, 50);
  const response = await fetch("https://api.canva.com/rest/v1/asset-uploads", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/octet-stream", "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(safeName, "utf8").toString("base64") }) },
    body: Buffer.from(input.bytes),
    cache: "no-store",
  });
  return parseResponse<{ job: { id: string; status: AsyncStatus; asset?: { id: string }; error?: { code?: string; message?: string } } }>(response);
}

export async function getCanvaAssetUploadJob(input: { accessToken: string; jobId: string }) {
  const response = await fetch(`https://api.canva.com/rest/v1/asset-uploads/${encodeURIComponent(input.jobId)}`, { headers: { Authorization: `Bearer ${input.accessToken}` }, cache: "no-store" });
  return parseResponse<{ job: { id: string; status: AsyncStatus; asset?: { id: string }; error?: { code?: string; message?: string } } }>(response);
}

export async function waitForCanvaAsset(input: { accessToken: string; jobId: string; attempts?: number; intervalMs?: number }) {
  const attempts = input.attempts ?? 12;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await getCanvaAssetUploadJob(input);
    if (result.job.status === "success" && result.job.asset?.id) return result.job.asset.id;
    if (result.job.status === "failed") throw new CanvaApiError(422, result.job.error?.code ?? "CANVA_ASSET_UPLOAD_FAILED", result.job.error?.message);
    await new Promise((resolve) => setTimeout(resolve, input.intervalMs ?? 500));
  }
  throw new CanvaApiError(504, "CANVA_ASSET_UPLOAD_TIMEOUT");
}

export async function createCanvaDesignAutofill(input: { accessToken: string; designId: string; title: string; data: Record<string, CanvaAutofillValue> }) {
  const response = await fetch("https://api.canva.com/rest/v1/autofills", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "create_from_design", design_id: input.designId, title: input.title.slice(0, 255), data: input.data }),
    cache: "no-store",
  });
  return parseResponse<{ job: { id: string; status: AsyncStatus; result?: { type: string; design?: { id: string; urls?: { edit_url?: string; view_url?: string } } }; error?: { code?: string; message?: string } } }>(response);
}

export async function getCanvaDesignAutofillJob(input: { accessToken: string; jobId: string }) {
  const response = await fetch(`https://api.canva.com/rest/v1/autofills/${encodeURIComponent(input.jobId)}`, { headers: { Authorization: `Bearer ${input.accessToken}` }, cache: "no-store" });
  return parseResponse<{ job: { id: string; status: AsyncStatus; result?: { type: string; design?: { id: string; urls?: { edit_url?: string; view_url?: string } } }; error?: { code?: string; message?: string } } }>(response);
}

export async function createCanvaDesignExport(input: { accessToken: string; designId: string }) {
  const response = await fetch("https://api.canva.com/rest/v1/exports", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      design_id: input.designId,
      format: { type: "png", export_quality: "regular", width: 1080, height: 1350, lossless: true, transparent_background: false, pages: [1] },
    }),
    cache: "no-store",
  });
  return parseResponse<{ job: { id: string; status: AsyncStatus; urls?: string[]; error?: { code?: string; message?: string } } }>(response);
}

export async function getCanvaDesignExportJob(input: { accessToken: string; jobId: string }) {
  const response = await fetch(`https://api.canva.com/rest/v1/exports/${encodeURIComponent(input.jobId)}`, { headers: { Authorization: `Bearer ${input.accessToken}` }, cache: "no-store" });
  return parseResponse<{ job: { id: string; status: AsyncStatus; urls?: string[]; error?: { code?: string; message?: string } } }>(response);
}

export async function waitForCanvaExport(input: { accessToken: string; jobId: string; attempts?: number; intervalMs?: number }) {
  const attempts = input.attempts ?? 24;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await getCanvaDesignExportJob(input);
    if (result.job.status === "success" && result.job.urls?.[0]) return result.job.urls[0];
    if (result.job.status === "failed") throw new CanvaApiError(422, result.job.error?.code ?? "CANVA_EXPORT_FAILED", result.job.error?.message);
    await new Promise((resolve) => setTimeout(resolve, input.intervalMs ?? 500));
  }
  throw new CanvaApiError(504, "CANVA_EXPORT_TIMEOUT");
}
