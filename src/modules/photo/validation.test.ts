import { describe, expect, it } from "vitest";
import { buildPhotoFilename, validatePhotoInput } from "./validation";
describe("photo validation", () => {
  it("rejects unsupported uploads", () => { expect(validatePhotoInput({ size:1000, mimeType:"application/pdf" }).valid).toBe(false); });
  it("uses the v3 Drive filename convention", () => { expect(buildPhotoFilename({ workerRegister:"PMBA-0617-ART", workerName:"Sumin", type:"PROFILE", mimeType:"image/jpeg" })).toBe("PMBA-0617-ART - SUMIN - PROFILE.jpg"); });
});
