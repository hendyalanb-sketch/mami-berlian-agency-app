import { describe, expect, it } from "vitest";
import { getRuntimeCapabilities } from "./capabilities";
const completeEnv = { DATABASE_URL:"postgres://example", GOOGLE_CLIENT_ID:"google-client", GOOGLE_CLIENT_SECRET:"google-secret", GOOGLE_REDIRECT_URI:"https://app.example/api/auth/google/callback", GOOGLE_REGISTER_SPREADSHEET_ID:"register", GOOGLE_BRIDGE_SPREADSHEET_ID:"bridge", GOOGLE_PHOTO_FOLDER_ID:"photos", CANVA_CLIENT_ID:"canva-client", CANVA_CLIENT_SECRET:"canva-secret", CANVA_REDIRECT_URI:"https://app.example/api/auth/canva/callback", CANVA_MB01_SOURCE_DESIGN_ID:"mb01" };
describe("runtime capabilities", () => {
  it("activates core workflows only when dependencies exist", () => { const c = getRuntimeCapabilities(completeEnv); expect(c.enrichment.configured).toBe(true); expect(c.generation.configured).toBe(true); expect(c.photoDrive.configured).toBe(true); });
  it("fails closed when secrets are missing", () => { const c = getRuntimeCapabilities({ GOOGLE_REGISTER_SPREADSHEET_ID:"register" }); expect(c.registerRead.configured).toBe(false); expect(c.enrichment.configured).toBe(false); expect(c.generation.configured).toBe(false); });
});
