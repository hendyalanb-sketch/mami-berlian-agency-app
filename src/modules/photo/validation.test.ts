import { describe, expect, it } from "vitest";
import { buildPhotoFilename, MAX_UPLOAD_REQUEST_BYTES, pickBackupWithinBudget, validatePhotoInput } from "./validation";
describe("photo validation", () => {
  it("rejects unsupported uploads", () => { expect(validatePhotoInput({ size:1000, mimeType:"application/pdf" }).valid).toBe(false); });
  it("uses the v3 Drive filename convention", () => { expect(buildPhotoFilename({ workerRegister:"PMBA-0617-ART", workerName:"Sumin", type:"PROFILE", mimeType:"image/jpeg" })).toBe("PMBA-0617-ART - SUMIN - PROFILE.jpg"); });
  it("names background-removed PNGs and their original backup distinctly", () => {
    expect(buildPhotoFilename({ workerRegister:"PMBA-0617-ART", workerName:"Sumin", type:"PROFILE", mimeType:"image/png" })).toBe("PMBA-0617-ART - SUMIN - PROFILE.png");
    expect(buildPhotoFilename({ workerRegister:"PMBA-0617-ART", workerName:"Sumin", type:"PROFILE", mimeType:"image/jpeg", original:true })).toBe("PMBA-0617-ART - SUMIN - PROFILE - ASLI.jpg");
  });
  it("keeps cutout + original backup under the single-request upload budget", () => {
    const MB = 1024 * 1024;
    expect(MAX_UPLOAD_REQUEST_BYTES).toBeLessThan(4.5 * 1000 * 1000);
    expect(pickBackupWithinBudget(1 * MB, [1 * MB, 0.3 * MB])).toEqual({ ok: true, backupIndex: 0 });
    expect(pickBackupWithinBudget(3.5 * MB, [1 * MB, 0.3 * MB])).toEqual({ ok: true, backupIndex: 1 });
    expect(pickBackupWithinBudget(3.9 * MB, [1 * MB, 0.3 * MB])).toEqual({ ok: true, backupIndex: null });
    expect(pickBackupWithinBudget(4.1 * MB, [0.1 * MB])).toEqual({ ok: false });
  });
});
