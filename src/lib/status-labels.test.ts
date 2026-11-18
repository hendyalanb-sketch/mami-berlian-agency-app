import { describe, expect, it } from "vitest";
import { mandatoryReadinessFields } from "@/modules/rules/readiness";
import { CONTENT_STATUS, JOB_STATUS, READINESS_FIELD_LABELS, statusInfo } from "@/lib/status-labels";

describe("status labels", () => {
  it("labels every content status written by the app", () => {
    for (const status of ["INCOMPLETE", "READY", "APPROVED", "GENERATING", "GENERATED", "ARCHIVED", "PUBLISHED", "ERROR"]) expect(CONTENT_STATUS[status]).toBeDefined();
  });
  it("labels every generation job status", () => {
    for (const status of ["QUEUED", "PREPARING", "UPLOADING_PHOTO", "CREATING_CANVA_DESIGN", "FINALIZING", "DONE", "ERROR"]) expect(JOB_STATUS[status]).toBeDefined();
  });
  it("labels every readiness field", () => {
    for (const field of mandatoryReadinessFields) expect(READINESS_FIELD_LABELS[field]).toBeTruthy();
  });
  it("falls back to a readable label for unknown values", () => {
    expect(statusInfo(CONTENT_STATUS, "published").label).toBe("Terpublikasi");
    expect(statusInfo(CONTENT_STATUS, "SOME_NEW").label).toBe("Some new");
    expect(statusInfo(CONTENT_STATUS, "").label).toBe("—");
  });
});
