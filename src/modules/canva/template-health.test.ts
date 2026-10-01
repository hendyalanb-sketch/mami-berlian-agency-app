import { describe, expect, it } from "vitest";
import { evaluateTemplateDataset, MB01_REQUIRED_FIELDS } from "./template-health";

describe("MB-01 template health", () => {
  it("requires all fields with the correct data types", () => {
    const dataset = Object.fromEntries(MB01_REQUIRED_FIELDS.map((field) => [field, { type: field === "WORKER_PHOTO" ? "image" : "text" }]));
    expect(evaluateTemplateDataset(dataset).valid).toBe(true);
  });

  it("rejects missing and mistyped fields", () => {
    const health = evaluateTemplateDataset({ WORKER_PHOTO: { type: "text" }, WORKER_NAME: { type: "text" } });
    expect(health.valid).toBe(false);
    expect(health.wrongType).toContain("WORKER_PHOTO");
    expect(health.missing).toContain("CTA_TEXT");
  });
});
