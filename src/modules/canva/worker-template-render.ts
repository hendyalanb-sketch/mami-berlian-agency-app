import type { BridgeRecord } from "@/modules/bridge/content-bridge-service";
import type { CanvaAutofillValue } from "@/modules/canva/rest";
import type { CanvaWorkerTemplateCode } from "@/modules/canva/template-health";

type PublicWorkerView = {
  worker_register: string;
  name: string;
  age: string;
  origin: string;
  category: string;
  skills: string[];
  placement: string;
  salary: string;
};

function text(text: unknown, max = 120): CanvaAutofillValue {
  return { type: "text", text: String(text ?? "").trim().slice(0, max) };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

/** Potong per kata (bukan di tengah kata) agar teks muat satu baris di pita desain. */
export function fitWords(value: string, max: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  for (let count = words.length; count > 0; count -= 1) {
    let candidate = words.slice(0, count).join(" ");
    if (candidate.length > max) continue;
    // Jangan sisakan kurung yang tidak ditutup, mis. "SELURUH INDONESIA (LUAR".
    const open = candidate.lastIndexOf("(");
    if (open > 0 && !candidate.includes(")", open)) candidate = candidate.slice(0, open).trim();
    return candidate;
  }
  return (words[0] ?? "").slice(0, max);
}

// Batas satu baris pada flyer MB-02 (diuji dengan Autofill nyata di Canva).
const FLYER_LIMITS = { name: 16, position: 26, placement: 28 } as const;

/** Nama di flyer: huruf kapital, dipendekkan per kata agar muat di pita nama. */
export function flyerName(name: string) {
  return fitWords(name.toUpperCase(), FLYER_LIMITS.name);
}

export function flyerPlacement(placement: string) {
  const value = placement.trim().toUpperCase();
  if (!value) return "";
  const withPrefix = `Penempatan ${value}`;
  return withPrefix.length <= FLYER_LIMITS.placement ? withPrefix : fitWords(value, FLYER_LIMITS.placement);
}

export function buildWorkerTemplateAutofill(input: {
  templateCode: CanvaWorkerTemplateCode;
  assetId: string;
  view: PublicWorkerView;
  bridge: BridgeRecord;
  experienceLabel?: string;
}): Record<string, CanvaAutofillValue> {
  const { templateCode, assetId, view, bridge } = input;
  const experienceLabel = String(input.experienceLabel ?? "").trim();
  const readyStatus = "Siap Interview";
  const specialty = String(bridge.worker_specialty ?? view.category ?? "").trim();
  const liveInStatus = String(bridge.live_in_status ?? "").trim();
  const workerQuote = String(bridge.public_description ?? "").trim();
  const publicTitle = String(bridge.public_title ?? "").trim();
  const availability = String(bridge.availability ?? "").trim();
  const trainingStatus = String(bridge.training_status ?? "").trim();
  const documentStatus = String(bridge.document_status ?? "").trim();
  const profileLine = [view.category, experienceLabel].filter(Boolean).join(" • ");

  const common: Record<string, CanvaAutofillValue> = {
    WORKER_PHOTO: { type: "image", asset_id: assetId },
    WORKER_CODE: text(view.worker_register, 30),
  };

  if (templateCode === "MB-02A" || templateCode === "MB-02B") {
    // Flyer katalog "Ready To Interview": nama, posisi, dan penempatan dalam huruf kapital seperti desain asli.
    return {
      WORKER_PHOTO: common.WORKER_PHOTO,
      WORKER_NAME: text(flyerName(view.name)),
      WORKER_POSITION: text(fitWords((specialty || view.category).toUpperCase(), FLYER_LIMITS.position)),
      WORKER_PLACEMENT: text(flyerPlacement(view.placement)),
    };
  }

  if (templateCode === "MB-01A") {
    return {
      ...common,
      WORKER_HEADLINE: text(`Kenalan dengan ${firstName(view.name)}`, 45),
      WORKER_ORIGIN: text(view.origin, 30),
      WORKER_SPECIALTY: text(specialty, 32),
      WORKER_LIVE_IN_STATUS: text(liveInStatus, 28),
      WORKER_INTRO_QUOTE: text(workerQuote, 120),
      WORKER_AGE: text(view.age, 18),
      WORKER_READY_STATUS: text(readyStatus, 24),
    };
  }

  return {
    ...common,
    WORKER_PROFILE_LINE: text(profileLine, 55),
    WORKER_SKILL_1: text(view.skills[0] ?? "", 48),
    WORKER_HEADLINE: text(publicTitle || `${view.category} siap interview`, 72),
    WORKER_NAME: text(view.name, 36),
    WORKER_AVAILABILITY: text(availability, 54),
    WORKER_LIVE_IN_STATUS: text(liveInStatus, 32),
    WORKER_TRAINING_STATUS: text(trainingStatus, 42),
    WORKER_SKILL_2: text(view.skills[1] ?? "", 48),
    WORKER_DOCUMENT_STATUS: text(documentStatus, 42),
  };
}

/** Label field Autofill untuk pratinjau teks di layar staf. */
export const AUTOFILL_FIELD_LABELS: Record<string, string> = {
  WORKER_NAME: "Nama",
  WORKER_POSITION: "Posisi",
  WORKER_PLACEMENT: "Penempatan",
  WORKER_HEADLINE: "Headline",
  WORKER_ORIGIN: "Asal",
  WORKER_SPECIALTY: "Spesialisasi",
  WORKER_CODE: "Kode",
  WORKER_LIVE_IN_STATUS: "Status menginap",
  WORKER_INTRO_QUOTE: "Kata-kata pekerja",
  WORKER_AGE: "Usia",
  WORKER_READY_STATUS: "Status siap",
  WORKER_PROFILE_LINE: "Baris profil",
  WORKER_SKILL_1: "Keahlian 1",
  WORKER_SKILL_2: "Keahlian 2",
  WORKER_AVAILABILITY: "Ketersediaan",
  WORKER_TRAINING_STATUS: "Training",
  WORKER_DOCUMENT_STATUS: "Dokumen",
};

export type RenderTextPreview = Array<{ field: string; label: string; text: string }>;

/**
 * Teks persis yang akan dikirim ke Canva untuk satu template (tanpa foto), memakai fungsi render yang sama
 * dengan route generate — agar staf melihat hasil akhir (kapital/dipendekkan) sebelum Generate (AGENTS.md #10).
 */
export function buildWorkerTemplateTextPreview(input: Omit<Parameters<typeof buildWorkerTemplateAutofill>[0], "assetId">): RenderTextPreview {
  const payload = buildWorkerTemplateAutofill({ ...input, assetId: "PREVIEW" });
  return Object.entries(payload).flatMap(([field, value]) => value.type === "text" ? [{ field, label: AUTOFILL_FIELD_LABELS[field] ?? field, text: value.text }] : []);
}
