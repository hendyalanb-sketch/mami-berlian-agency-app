import { describe, expect, it } from "vitest";
import { buildWorkerTemplateAutofill } from "./worker-template-render";

const view = {
  worker_register: "PMBA-018-ART",
  name: "Nilam Anggraini",
  age: "24 Tahun",
  origin: "Bojonegoro",
  category: "ART Momong",
  skills: ["Momong Anak", "Bersih Rumah", "Masak"],
  placement: "Surabaya",
  salary: "Rp2.700.000–Rp3.200.000",
};

const bridge = {
  worker_register: view.worker_register,
  public_title: "ART Momong siap interview",
  public_description: "Saya sabar, telaten, dan senang merawat anak.",
  worker_specialty: "ART Momong Anak",
  live_in_status: "Siap menginap",
  availability: "Siap mulai minggu ini",
  training_status: "Terlatih di LPK",
  document_status: "Dokumen lengkap",
};

describe("worker Canva render payload", () => {
  it("builds MB-01A from canonical worker data and bridge copy", () => {
    const result = buildWorkerTemplateAutofill({ templateCode: "MB-01A", assetId: "MA_TEST", view, bridge, experienceLabel: "Pengalaman" });
    expect(result.WORKER_PHOTO).toEqual({ type: "image", asset_id: "MA_TEST" });
    expect(result.WORKER_HEADLINE).toEqual({ type: "text", text: "Kenalan dengan Nilam" });
    expect(result.WORKER_SPECIALTY).toEqual({ type: "text", text: "ART Momong Anak" });
    expect(result.WORKER_INTRO_QUOTE).toEqual({ type: "text", text: bridge.public_description });
    expect(Object.keys(result)).toHaveLength(9);
  });

  it("builds MB-01B render-only profile line and first two skills", () => {
    const result = buildWorkerTemplateAutofill({ templateCode: "MB-01B", assetId: "MA_TEST", view, bridge, experienceLabel: "Pengalaman" });
    expect(result.WORKER_PROFILE_LINE).toEqual({ type: "text", text: "ART Momong • Pengalaman" });
    expect(result.WORKER_SKILL_1).toEqual({ type: "text", text: "Momong Anak" });
    expect(result.WORKER_SKILL_2).toEqual({ type: "text", text: "Bersih Rumah" });
    expect(result.WORKER_NAME).toEqual({ type: "text", text: "Nilam Anggraini" });
    expect(Object.keys(result)).toHaveLength(11);
  });

  it("limits free-copy fields to their Canva-safe lengths", () => {
    const result = buildWorkerTemplateAutofill({
      templateCode: "MB-01A",
      assetId: "MA_TEST",
      view,
      bridge: { ...bridge, worker_register: view.worker_register, public_description: "x".repeat(200) },
    });
    expect(result.WORKER_INTRO_QUOTE).toEqual({ type: "text", text: "x".repeat(120) });
  });

  it("builds the MB-02 Ready To Interview flyer in uppercase like the catalog design", () => {
    for (const templateCode of ["MB-02A", "MB-02B"] as const) {
      const result = buildWorkerTemplateAutofill({ templateCode, assetId: "MA_TEST", view, bridge });
      expect(result).toEqual({
        WORKER_PHOTO: { type: "image", asset_id: "MA_TEST" },
        WORKER_NAME: { type: "text", text: "NILAM ANGGRAINI" },
        WORKER_POSITION: { type: "text", text: "ART MOMONG ANAK" },
        WORKER_PLACEMENT: { type: "text", text: "Penempatan SURABAYA" },
      });
    }
  });

  it("falls back to the category and shortens long names word by word", () => {
    const result = buildWorkerTemplateAutofill({ templateCode: "MB-02B", assetId: "MA_TEST", view: { ...view, name: "Wiwik Erna Wati Kusumaningrum" }, bridge: { ...bridge, worker_specialty: "" } });
    expect(result.WORKER_NAME).toEqual({ type: "text", text: "WIWIK ERNA WATI" });
    expect(result.WORKER_POSITION).toEqual({ type: "text", text: "ART MOMONG" });
  });

  it("keeps flyer text within one-line limits measured in Canva", () => {
    const long = buildWorkerTemplateAutofill({
      templateCode: "MB-02A",
      assetId: "MA_TEST",
      view: { ...view, name: "Siti Nurhaliza Rahmawati", placement: "Seluruh Indonesia (Luar Jawa)" },
      bridge: { ...bridge, worker_specialty: "ART Momong Anak & Lansia Berpengalaman" },
    });
    expect(long.WORKER_NAME).toEqual({ type: "text", text: "SITI NURHALIZA" });
    expect(long.WORKER_POSITION).toEqual({ type: "text", text: "ART MOMONG ANAK & LANSIA" });
    expect(long.WORKER_PLACEMENT).toEqual({ type: "text", text: "SELURUH INDONESIA" });
    const known = buildWorkerTemplateAutofill({ templateCode: "MB-02B", assetId: "MA_TEST", view: { ...view, placement: "Seluruh Indonesia" }, bridge: { ...bridge, worker_specialty: "ART Momong (Anak & Lansia)" } });
    expect(known.WORKER_POSITION).toEqual({ type: "text", text: "ART MOMONG (ANAK & LANSIA)" });
    expect(known.WORKER_PLACEMENT).toEqual({ type: "text", text: "Penempatan SELURUH INDONESIA" });
  });
});
