import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, parseEncryptionKey } from "./crypto";

const key = Buffer.alloc(32, 7).toString("base64");

describe("OAuth secret encryption", () => {
  it("round-trips AES-256-GCM encrypted values", () => {
    const encrypted = encryptSecret("refresh-token-value", key);
    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptSecret(encrypted, key)).toBe("refresh-token-value");
  });

  it("rejects invalid key length", () => {
    expect(() => parseEncryptionKey(Buffer.from("short").toString("base64"))).toThrow(/32-byte/);
  });
});
