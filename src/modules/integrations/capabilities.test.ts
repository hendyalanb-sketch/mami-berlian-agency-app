import { describe, expect, it } from "vitest";
import { getRuntimeCapabilities } from "./capabilities";

const completeEnv = {
  DATABASE_URL: "postgres://example",
  ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GOOGLE_REDIRECT_URI: "https://app.example/api/auth/google/callback",
  GOOGLE_REGISTER_SPREADSHEET_ID: "register",
  GOOGLE_BRIDGE_SPREADSHEET_ID: "bridge",
  GOOGLE_PHOTO_FOLDER_ID: "photos",
  CANVA_CLIENT_ID: "canva-client",
  CANVA_CLIENT_SECRET: "canva-secret",
  CANVA_REDIRECT_URI: "https://app.example/api/auth/canva/callback",
  CANVA_MB01_SOURCE_DESIGN_ID: "mb01",
};

describe("runtime capabilities", () => {
  it("activates core workflows only when dependencies exist", () => {
    const capabilities = getRuntimeCapabilities(completeEnv);
    expect(capabilities.enrichment.configured).toBe(true);
    expect(capabilities.generation.configured).toBe(true);
    expect(capabilities.photoDrive.configured).toBe(true);
  });

  it("fails closed when secrets are missing", () => {
    const capabilities = getRuntimeCapabilities({ GOOGLE_REGISTER_SPREADSHEET_ID: "register" });
    expect(capabilities.registerRead.configured).toBe(false);
    expect(capabilities.enrichment.configured).toBe(false);
    expect(capabilities.generation.configured).toBe(false);
  });
});
