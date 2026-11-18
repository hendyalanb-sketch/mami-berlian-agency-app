import { describe, expect, it } from "vitest";
import { canEditWorkers, canGenerateContent, isAdmin } from "./permissions";

describe("role permissions", () => {
  it("keeps Master/Integration administration admin-only", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("STAFF")).toBe(false);
    expect(isAdmin("VIEWER")).toBe(false);
  });

  it("allows staff enrichment but not viewer edits", () => {
    expect(canEditWorkers("STAFF")).toBe(true);
    expect(canEditWorkers("VIEWER")).toBe(false);
  });

  it("requires explicit staff generation permission", () => {
    expect(canGenerateContent({ role: "ADMIN", canGenerate: false })).toBe(true);
    expect(canGenerateContent({ role: "STAFF", canGenerate: true })).toBe(true);
    expect(canGenerateContent({ role: "STAFF", canGenerate: false })).toBe(false);
  });
});
