import type { PhotoType } from "@/modules/photo/validation";

/**
 * content_status setelah upload foto.
 * Hanya foto PROFILE yang memengaruhi readiness dan desain Canva, sehingga hanya foto itu yang
 * menghitung ulang status (sama seperti simpan enrichment: konten berubah → perlu generate ulang).
 * Foto lain (seluruh badan, pelatihan, lainnya) tidak boleh mereset status, mis. dari PUBLISHED.
 */
export function contentStatusAfterPhotoUpload(input: { photoType: PhotoType; currentStatus: unknown; readinessStatus: string }) {
  if (input.photoType === "PROFILE") return input.readinessStatus;
  const current = String(input.currentStatus ?? "").trim();
  return current || input.readinessStatus;
}
