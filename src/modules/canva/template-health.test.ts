import { describe, expect, it } from "vitest";
import { evaluateTemplateDatasetForCode, MB01A_REQUIRED_FIELDS, MB01B_REQUIRED_FIELDS, recommendedWorkerTemplateCode } from "./template-health";

function dataset(fields: readonly string[]) {
  return Object.fromEntries(fields.map((field) => [field, { type: field === "WORKER_PHOTO" ? "image" : "text" }]));
}

describe("worker Canva template health", () => {
  it("accepts MB-01A when every mapped field exists with the correct type", () => {
    expect(evaluateTemplateDatasetForCode("MB-01A", dataset(MB01A_REQUIRED_FIELDS)).valid).toBe(true);
  });

  it("accepts MB-01B when every mapped field exists with the correct type", () => {
    expect(evaluateTemplateDatasetForCode("MB-01B", dataset(MB01B_REQUIRED_FIELDS)).valid).toBe(true);
  });

  it("rejects missing and mistyped MB-01A fields", () => {
    const health = evaluateTemplateDatasetForCode("MB-01A", { WORKER_PHOTO: { type: "text" }, WORKER_HEADLINE: { type: "text" } });
    expect(health.valid).toBe(false);
    expect(health.wrongType).toContain("WORKER_PHOTO");
    expect(health.missing).toContain("WORKER_INTRO_QUOTE");
  });

  it("rejects missing and mistyped MB-01B fields", () => {
    const health = evaluateTemplateDatasetForCode("MB-01B", { WORKER_PHOTO: { type: "image" }, WORKER_NAME: { type: "image" } });
    expect(health.valid).toBe(false);
    expect(health.wrongType).toContain("WORKER_NAME");
    expect(health.missing).toContain("WORKER_PROFILE_LINE");
  });
});

describe("recommendedWorkerTemplateCode", () => {
  it("uses the pink flyer for momong/babysitter and blue for the rest", () => {
    expect(recommendedWorkerTemplateCode("ART_MOMONG")).toBe("MB-02B");
    expect(recommendedWorkerTemplateCode("BABYSITTER")).toBe("MB-02B");
    expect(recommendedWorkerTemplateCode("ART")).toBe("MB-02A");
    expect(recommendedWorkerTemplateCode("SUSTER_LANSIA")).toBe("MB-02A");
    expect(recommendedWorkerTemplateCode(undefined)).toBe("MB-02A");
  });
});
