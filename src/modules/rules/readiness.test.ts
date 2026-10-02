import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./readiness";

const complete = { category:"ART", experience:"PENGALAMAN", skills:["MASAK"], placement:"SELURUH_INDONESIA", salary:"Rp2,9–3,2 juta", profile_photo:"drive-id", publication_consent:true };
describe("readiness",()=>{
  it("blocks missing mandatory field",()=>{expect(evaluateReadiness({...complete, profile_photo:""}).status).toBe("INCOMPLETE")});
  it("returns READY when complete",()=>{expect(evaluateReadiness(complete).status).toBe("READY")});
  it("returns APPROVED when approval is required and granted",()=>{expect(evaluateReadiness({...complete, approvalRequired:true, approved:true}).status).toBe("APPROVED")});
});
