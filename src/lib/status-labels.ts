export type StatusTone = "neutral" | "info" | "progress" | "success" | "danger" | "warning";
export type StatusInfo = { label: string; tone: StatusTone };

/** Status konten pekerja (content_status di Content Bridge). */
export const CONTENT_STATUS: Record<string, StatusInfo> = {
  INCOMPLETE: { label: "Belum lengkap", tone: "neutral" },
  READY: { label: "Siap disetujui", tone: "info" },
  APPROVED: { label: "Disetujui", tone: "info" },
  GENERATING: { label: "Sedang dibuat", tone: "progress" },
  GENERATED: { label: "Desain jadi", tone: "info" },
  ARCHIVED: { label: "Tersimpan di Drive", tone: "success" },
  PUBLISHED: { label: "Terpublikasi", tone: "success" },
  ERROR: { label: "Gagal", tone: "danger" },
};

/** Status job generate Canva (generation_jobs.status). */
export const JOB_STATUS: Record<string, StatusInfo> = {
  QUEUED: { label: "Antre", tone: "neutral" },
  PREPARING: { label: "Menyiapkan", tone: "progress" },
  UPLOADING_PHOTO: { label: "Unggah foto", tone: "progress" },
  CREATING_CANVA_DESIGN: { label: "Membuat desain", tone: "progress" },
  FINALIZING: { label: "Menyelesaikan", tone: "progress" },
  DONE: { label: "Selesai", tone: "success" },
  ERROR: { label: "Gagal", tone: "danger" },
};

export const ACTIVE_STATUS = {
  true: { label: "Aktif", tone: "success" },
  false: { label: "Nonaktif", tone: "neutral" },
} as const satisfies Record<"true" | "false", StatusInfo>;

export const TEMPLATE_STATUS = {
  true: { label: "Siap dipakai", tone: "success" },
  false: { label: "Terkunci", tone: "warning" },
} as const satisfies Record<"true" | "false", StatusInfo>;

export function statusInfo(map: Record<string, StatusInfo>, value: string | null | undefined): StatusInfo {
  const key = String(value ?? "").trim().toUpperCase();
  return map[key] ?? { label: key ? key.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "—", tone: "neutral" };
}

/** Nama field readiness yang tampil ke staf. */
export const READINESS_FIELD_LABELS: Record<string, string> = {
  category: "Kategori",
  experience: "Pengalaman",
  skills: "Keahlian",
  placement: "Penempatan",
  salary: "Rate gaji",
  profile_photo: "Foto profil",
  publication_consent: "Izin publikasi",
};

export function readinessFieldLabel(field: string) {
  return READINESS_FIELD_LABELS[field] ?? field;
}
