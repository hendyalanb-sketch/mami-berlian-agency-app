export type WorkflowStepKey = "data" | "photo" | "approve" | "generate" | "export" | "publish";
/** todo = bisa dikerjakan tapi bukan langkah utama saat ini; locked = menunggu langkah sebelumnya. */
export type WorkflowStepState = "done" | "current" | "todo" | "locked" | "error";
export type WorkflowStep = { key: WorkflowStepKey; label: string; state: WorkflowStepState; hint: string };

export type WorkflowInput = {
  checks: Partial<Record<string, boolean>>;
  contentStatus: string;
  approved: boolean;
};

const DATA_FIELDS = ["category", "experience", "skills", "placement", "salary", "publication_consent"] as const;
const GENERATED = new Set(["GENERATED", "ARCHIVED", "PUBLISHED"]);
const ARCHIVED = new Set(["ARCHIVED", "PUBLISHED"]);

/**
 * Menghitung status tiap langkah alur konten dari readiness + content_status Bridge.
 * Hanya satu langkah yang "current": langkah pertama yang belum selesai.
 */
export function buildWorkflowSteps(input: WorkflowInput): WorkflowStep[] {
  const status = String(input.contentStatus ?? "").toUpperCase();
  const dataDone = DATA_FIELDS.every((field) => input.checks[field]);
  const photoDone = Boolean(input.checks.profile_photo);
  const approved = input.approved || ["APPROVED", "GENERATING", ...GENERATED].includes(status);
  const generated = GENERATED.has(status);
  const archived = ARCHIVED.has(status);
  const published = status === "PUBLISHED";

  const raw: Array<Omit<WorkflowStep, "state"> & { done: boolean; blocked: boolean; error?: boolean }> = [
    { key: "data", label: "Data", done: dataDone, blocked: false, hint: dataDone ? "Data lengkap" : "Lengkapi data wajib & izin publikasi" },
    { key: "photo", label: "Foto", done: photoDone, blocked: false, hint: photoDone ? "Foto profil tersimpan" : "Unggah foto profil" },
    { key: "approve", label: "Setujui", done: approved, blocked: !dataDone || !photoDone, hint: approved ? "Konten disetujui" : !dataDone || !photoDone ? "Terkunci: lengkapi data dan foto dulu" : "Periksa preview lalu minta Admin menyetujui" },
    { key: "generate", label: "Generate", done: generated, blocked: !approved, error: status === "ERROR", hint: generated ? "Desain Canva jadi" : !approved ? "Terkunci: konten belum disetujui" : status === "GENERATING" ? "Canva sedang membuat desain" : status === "ERROR" ? "Generate gagal, coba ulang" : "Buat desain di Canva" },
    { key: "export", label: "Export", done: archived, blocked: !generated, hint: archived ? "PNG tersimpan di Drive" : !generated ? "Terkunci: desain belum dibuat" : "Export PNG ke Google Drive" },
    { key: "publish", label: "Publikasi", done: published, blocked: !archived, hint: published ? "Sudah dipublikasi" : !archived ? "Terkunci: PNG belum diarsipkan" : "Tandai channel publikasi" },
  ];

  let currentAssigned = false;
  return raw.map(({ done, blocked, error, ...step }) => {
    if (done) return { ...step, state: "done" };
    if (!currentAssigned && !blocked) {
      currentAssigned = true;
      return { ...step, state: error ? "error" : "current" };
    }
    return { ...step, state: blocked ? "locked" : "todo" };
  });
}

export function currentWorkflowStep(steps: WorkflowStep[]) {
  return steps.find((step) => step.state === "current" || step.state === "error") ?? null;
}
