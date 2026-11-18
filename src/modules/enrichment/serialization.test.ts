import { describe, expect, it } from "vitest";
import { decodeStringList, encodeStringList, parseBridgeBoolean, readinessFromBridge } from "./serialization";

describe("enrichment serialization", () => {
  it("round-trips list values in one Bridge cell", () => {
    expect(decodeStringList(encodeStringList(["MASAK","BERSIH_RUMAH","MASAK"]))).toEqual(["MASAK","BERSIH_RUMAH"]);
  });
  it("supports legacy comma separated values", () => {
    expect(decodeStringList("MASAK, MOMONG_ANAK")).toEqual(["MASAK","MOMONG_ANAK"]);
  });
  it("parses consent safely", () => {
    expect(parseBridgeBoolean("TRUE")).toBe(true);
    expect(parseBridgeBoolean("FALSE")).toBe(false);
  });
  it("keeps worker incomplete until mandatory photo is present", () => {
    const readiness = readinessFromBridge({ worker_register:"PMBA-001-ART", category:"ART", experience_level:"PEMULA", skills:'["MASAK"]', placement_preferences:'["SURABAYA"]', salary_display:"Rp2,2–2,5 juta", publication_consent:"TRUE" });
    expect(readiness.status).toBe("INCOMPLETE");
    expect(readiness.missing).toContain("profile_photo");
  });
});
