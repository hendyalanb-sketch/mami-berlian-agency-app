export const PHOTO_TYPES = ["PROFILE", "FULLBODY", "TRAINING", "OTHER"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
/** Total semua file dalam satu upload. Batas body Vercel Function 4,5 MB; sisakan ruang untuk overhead multipart. */
export const MAX_UPLOAD_REQUEST_BYTES = 4 * 1024 * 1024;

/**
 * Memilih cadangan foto asli pertama yang masih muat bersama file utama dalam satu request.
 * `backupIndex: null` = cadangan dilewati (file utama tetap disimpan); `ok: false` = file utama sendiri terlalu besar.
 */
export function pickBackupWithinBudget(mainBytes: number, backupBytes: number[], budget = MAX_UPLOAD_REQUEST_BYTES) {
  if (mainBytes > budget) return { ok: false as const };
  const index = backupBytes.findIndex((bytes) => mainBytes + bytes <= budget);
  return { ok: true as const, backupIndex: index === -1 ? null : index };
}
export function validatePhotoInput(input: { size: number; mimeType: string }) {
  if (!ALLOWED_IMAGE_MIME.includes(input.mimeType as (typeof ALLOWED_IMAGE_MIME)[number]))
    return { valid: false as const, code: "UNSUPPORTED_TYPE", message: "Gunakan foto JPG, PNG, atau WebP." };
  if (input.size <= 0 || input.size > MAX_SOURCE_IMAGE_BYTES)
    return { valid: false as const, code: "INVALID_SIZE", message: "Ukuran foto maksimal 12 MB." };
  return { valid: true as const };
}
function cleanSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}
/** `original: true` = cadangan foto asli sebelum latar dihapus (tidak dipakai Canva). */
export function buildPhotoFilename(input: { workerRegister: string; workerName: string; type: PhotoType; mimeType: string; original?: boolean }) {
  const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
  return `${cleanSegment(input.workerRegister)} - ${cleanSegment(input.workerName)} - ${input.type}${input.original ? " - ASLI" : ""}.${extension}`;
}
