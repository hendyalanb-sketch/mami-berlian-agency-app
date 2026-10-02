import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: vi.fn(), bridge: {} as Record<string, unknown>,
  template: {} as Record<string, unknown>, job: {} as Record<string, unknown>,
  create: vi.fn(), claim: vi.fn(), cachedPhoto: vi.fn(), update: vi.fn(), outputs: vi.fn(),
  download: vi.fn(), upload: vi.fn(), autofill: vi.fn(), fail: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: h.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/db/client", () => ({ db: {
  select: () => ({ from: () => ({ where: () => ({ limit: async () => [h.template] }) }) }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
} }));
vi.mock("@/modules/google/oauth-token-service", () => ({ getGoogleAccessToken: async () => "google", GoogleConnectionError: class extends Error {} }));
vi.mock("@/modules/canva/oauth-token-service", () => ({ getCanvaAccessToken: async () => "canva", CanvaConnectionError: class extends Error {} }));
vi.mock("@/modules/workers/source-service", () => ({ WorkerSourceService: class { async getByRegister() { return { workerRegister: "PMBA-001-ART", name: "Pekerja Contoh" }; } } }));
vi.mock("@/modules/bridge/content-bridge-service", () => ({ ContentBridgeService: class { async get() { return h.bridge; } async upsert() {} } }));
vi.mock("@/modules/master-data/service", () => ({ getDefaultCtaText: async () => "Kontak agency", getWorkerMasterOptions: async () => ({ experiences: [] }) }));
vi.mock("@/modules/workers/public-view", () => ({ buildPublicWorkerView: () => ({ worker_register: "PMBA-001-ART", name: "Pekerja Contoh", age: "30 Tahun", origin: "Jawa Timur", category: "ART", skills: ["Masak"], placement: "Surabaya", salary: "Rp3.000.000" }) }));
vi.mock("@/modules/generation/job-service", () => ({ createOrReuseGenerationJob: h.create, claimGenerationJob: h.claim, findUploadedWorkerPhoto: h.cachedPhoto, updateGenerationJob: h.update, updateGenerationOutputs: h.outputs, getGenerationJob: async () => h.job }));
vi.mock("@/modules/generation/finalize", () => ({ failGeneration: h.fail, finalizeGeneratedContent: async () => ({ designId: "DARESULT", designUrl: "https://www.canva.com/design/DARESULT/edit" }) }));
vi.mock("@/modules/google/drive-rest", () => ({ downloadDriveFile: h.download }));
vi.mock("@/modules/canva/rest", () => ({
  CanvaApiError: class extends Error { status = 422; code = "CANVA_AUTOFILL_FAILED"; },
  getCanvaDesignDataset: async () => ({ WORKER_PHOTO: { type: "image" }, WORKER_NAME: { type: "text" } }),
  createCanvaAssetUpload: h.upload, waitForCanvaAsset: async () => "PHOTO", createCanvaDesignAutofill: h.autofill,
}));

import { POST } from "./route";
const request = (code = "MB-NEW") => new Request("http://localhost/api/workers/PMBA-001-ART/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateCode: code }) });
const context = { params: Promise.resolve({ register: "PMBA-001-ART" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_REGISTER_SPREADSHEET_ID", "register"); vi.stubEnv("GOOGLE_BRIDGE_SPREADSHEET_ID", "bridge");
  h.session.mockResolvedValue({ user: { id: "user", role: "ADMIN", canGenerate: true } });
  h.bridge = { worker_register: "PMBA-001-ART", approved_at: "2026-10-02", profile_photo_drive_id: "photo-v1", publication_consent: "TRUE", category: "ART", experience_level: "PENGALAMAN", skills: '["MASAK"]', placement_preferences: '["SURABAYA"]', salary_display: "Rp3.000.000" };
  h.template = { id: "template", code: "MB-NEW", isActive: true, canvaTemplateId: "DANEW", version: "v1", contentType: "PEKERJA_READY", requiredFieldsJson: ["WORKER_PHOTO", "WORKER_NAME"] };
  h.job = { id: "job", templateCode: "MB-NEW", templateVersion: "v1", status: "QUEUED", requestedBy: "user", canvaDesignId: null, resultJson: {}, errorCode: null };
  h.create.mockImplementation(async () => ({ job: h.job, reused: false }));
  h.claim.mockImplementation(async () => h.job);
  h.cachedPhoto.mockResolvedValue("SHARED_PHOTO");
  h.autofill.mockResolvedValue({ job: { status: "success", result: { design: { id: "DARESULT", urls: { edit_url: "https://www.canva.com/design/DARESULT/edit" } } } } });
  h.download.mockResolvedValue(new Response("photo"));
  h.upload.mockResolvedValue({ job: { status: "success", asset: { id: "NEW_PHOTO" } } });
});

describe("generation API for registered templates", () => {
  it("accepts a new active code and reuses the uploaded photo", async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ templateCode: "MB-NEW", status: "DONE", designId: "DARESULT" });
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.download).not.toHaveBeenCalled();
    expect(h.autofill.mock.calls[0][0].data.WORKER_PHOTO).toEqual({ type: "image", asset_id: "SHARED_PHOTO" });
  });
  it("uploads once when no matching photo exists, using the current Drive file identity", async () => {
    h.bridge.profile_photo_drive_id = "photo-v2";
    h.cachedPhoto.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(200);
    expect(h.cachedPhoto).toHaveBeenCalledWith("PMBA-001-ART", "user", "photo-v2");
    expect(h.upload).toHaveBeenCalledTimes(1);
    expect(h.outputs).toHaveBeenCalledWith("job", { photoDriveId: "photo-v2", photoAssetId: "NEW_PHOTO" });
  });
  it("requires approval, complete data and publication consent before starting a job", async () => {
    h.bridge.approved_at = "";
    expect((await POST(request(), context)).status).toBe(409);
    h.bridge.approved_at = "approved"; h.bridge.publication_consent = "FALSE";
    expect((await POST(request(), context)).status).toBe(422);
    expect(h.create).not.toHaveBeenCalled(); expect(h.upload).not.toHaveBeenCalled();
  });
  it("returns a reused completed job with its own link instead of creating another design", async () => {
    h.job = { ...h.job, status: "DONE", canvaDesignId: "DAOLD", resultJson: { designUrl: "https://www.canva.com/d/old" } };
    h.create.mockImplementation(async () => ({ job: h.job, reused: true }));
    expect(await (await POST(request(), context)).json()).toMatchObject({ reused: true, designUrl: "https://www.canva.com/d/old" });
    expect(h.autofill).not.toHaveBeenCalled();
  });
  it("does not create a second provider job when another request already claimed it", async () => {
    h.claim.mockResolvedValue(null); h.job.status = "CREATING_CANVA_DESIGN";
    expect((await POST(request(), context)).status).toBe(202);
    expect(h.autofill).not.toHaveBeenCalled();
  });
  it("rejects an invalid code instead of silently generating a different template", async () => {
    expect((await POST(request("not valid"), context)).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });
});
