import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

export function parseEncryptionKey(value = process.env.ENCRYPTION_KEY) {
  if (!value) throw new Error("ENCRYPTION_KEY is required");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function encryptSecret(plaintext: string, encodedKey?: string) {
  const key = parseEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, encodedKey?: string) {
  const [version, ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) throw new Error("Invalid encrypted secret payload");
  const key = parseEncryptionKey(encodedKey);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}
