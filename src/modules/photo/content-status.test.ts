import { describe, expect, it } from "vitest";
import { contentStatusAfterPhotoUpload } from "@/modules/photo/content-status";

describe("contentStatusAfterPhotoUpload", () => {
  it("keeps a published status when a non-profile photo is uploaded", () => {
    for (const photoType of ["FULLBODY", "TRAINING", "OTHER"] as const) {
      expect(contentStatusAfterPhotoUpload({ photoType, currentStatus: "PUBLISHED", readinessStatus: "APPROVED" })).toBe("PUBLISHED");
    }
  });

  it("recalculates status when the profile photo changes", () => {
    expect(contentStatusAfterPhotoUpload({ photoType: "PROFILE", currentStatus: "PUBLISHED", readinessStatus: "APPROVED" })).toBe("APPROVED");
    expect(contentStatusAfterPhotoUpload({ photoType: "PROFILE", currentStatus: "INCOMPLETE", readinessStatus: "READY" })).toBe("READY");
  });

  it("falls back to readiness when there is no status yet", () => {
    expect(contentStatusAfterPhotoUpload({ photoType: "TRAINING", currentStatus: "", readinessStatus: "INCOMPLETE" })).toBe("INCOMPLETE");
    expect(contentStatusAfterPhotoUpload({ photoType: "OTHER", currentStatus: undefined, readinessStatus: "INCOMPLETE" })).toBe("INCOMPLETE");
  });
});
