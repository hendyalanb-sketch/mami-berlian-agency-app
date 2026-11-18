import { describe, expect, it } from "vitest";
import { isNavActive } from "@/lib/navigation";

describe("isNavActive", () => {
  it("matches nested routes by prefix", () => {
    expect(isNavActive("/pekerja/ABC-001", { match: ["/pekerja", "/preview"] })).toBe(true);
    expect(isNavActive("/preview/ABC-001", { match: ["/pekerja", "/preview"] })).toBe(true);
  });
  it("does not treat home as a prefix of everything", () => {
    expect(isNavActive("/konten", { match: ["/"] })).toBe(false);
    expect(isNavActive("/", { match: ["/"] })).toBe(true);
  });
  it("does not match partial segment names", () => {
    expect(isNavActive("/pekerjaan", { match: ["/pekerja"] })).toBe(false);
  });
});
