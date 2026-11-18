import { describe, expect, it } from "vitest";
import { canonicalizeWorkerRegister, extractLegacyCategoryCode, resolveLegacyCategory } from "./register-normalization";

describe("Register normalization", () => {
  it("normalizes trailing spaces and mixed case without mutating the source Sheet", () => {
    expect(canonicalizeWorkerRegister(" PMBA-0035-SUSBl-INFAL ")).toBe("PMBA-0035-SUSBL-INFAL");
    expect(canonicalizeWorkerRegister("PMBA-0287-ART ")).toBe("PMBA-0287-ART");
  });

  it("extracts the legacy suffix after the numeric register", () => {
    expect(extractLegacyCategoryCode("PMBA-001-SUSBY")).toBe("SUSBY");
    expect(extractLegacyCategoryCode("PMBA-031-ART-INFAL")).toBe("ART-INFAL");
  });

  it("only auto-maps codes explicitly supported by the v3 source plan", () => {
    expect(resolveLegacyCategory("PMBA-001-ART").targetCode).toBe("ART");
    expect(resolveLegacyCategory("PMBA-002-SUSBY").targetCode).toBe("BABYSITTER");
    expect(resolveLegacyCategory("PMBA-003-SUSL").targetCode).toBe("SUSTER_LANSIA");
    expect(resolveLegacyCategory("PMBA-004-SUSBL").targetCode).toBeNull();
    expect(resolveLegacyCategory("PMBA-005-SUSPP").targetCode).toBeNull();
    expect(resolveLegacyCategory("PMBA-006-PRT").targetCode).toBeNull();
  });

  it("detects INFAL as a review hint without guessing a target category", () => {
    const resolution = resolveLegacyCategory("PMBA-031-SUSBL-INFAL");
    expect(resolution.mapped).toBe(false);
    expect(resolution.infalHint).toBe(true);
  });
});
