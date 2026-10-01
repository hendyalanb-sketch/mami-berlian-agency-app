import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, getErrorInfo, normalizeErrorCode } from "@/lib/error-messages";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

function literalErrorCodes() {
  const codes = new Set<string>();
  const patterns = [
    /error:\s*"([A-Z][A-Z0-9_]{3,})"/g,
    /MasterAdminError\("([A-Z][A-Z0-9_]{3,})"/g,
    /ConnectionError\("([A-Z][A-Z0-9_]{3,})"/g,
  ];
  for (const file of [...files("src/app/api"), ...files("src/modules")]) {
    const source = readFileSync(file, "utf8");
    for (const pattern of patterns) for (const match of source.matchAll(pattern)) codes.add(match[1]);
  }
  return [...codes];
}

describe("error messages", () => {
  it("covers every literal error code returned by API routes and services", () => {
    const missing = literalErrorCodes().filter((code) => !ERROR_MESSAGES[code]);
    expect(missing).toEqual([]);
  });

  it("normalizes codes with suffixes", () => {
    expect(normalizeErrorCode("DRIVE_UPLOAD_FAILED:403")).toBe("DRIVE_UPLOAD_FAILED");
    expect(getErrorInfo("TEMPLATE_UNHEALTHY — WORKER_PHOTO").title).toContain("Template Canva");
  });

  it("keeps human messages and gives a fallback for unknown codes", () => {
    expect(getErrorInfo("Gunakan foto JPG, PNG, atau WebP.").title).toBe("Gunakan foto JPG, PNG, atau WebP.");
    expect(getErrorInfo("SOMETHING_NEW").title).toContain("SOMETHING_NEW");
    expect(getErrorInfo(undefined).action).toBeTruthy();
  });
});
