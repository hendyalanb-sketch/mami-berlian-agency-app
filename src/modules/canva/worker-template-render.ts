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

/** Teks Autofill dipotong per kata pada batas yang sudah diuji dengan Autofill nyata di Canva. */
function text(value: unknown, max: number): CanvaAutofillValue {
  return { type: "text", text: fitWords(String(value ?? ""), max) };
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

/**
 * Batas karakter per field Autofill, diukur dengan Autofill nyata di Canva (teks terpanjang tetap
 * satu/dua baris tanpa menabrak elemen lain). Ubah bersama desain template + versi template di seed.
 */
export const CANVA_TEXT_LIMITS = {
  code: 24,
  "MB-01A": { headline: 21, origin: 26, specialty: 26, liveIn: 26, quote: 72, age: 10, ready: 24 },
  "MB-01B": { profileLine: 30, skill: 32, headline: 48, name: 16, availability: 32, liveIn: 26, training: 24, document: 24 },
  "MB-02": { name: 16, position: 26, placement: 28 },
} as const;

const FLYER_LIMITS = CANVA_TEXT_LIMITS["MB-02"];

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

/** Headline MB-01A satu baris: versi terpendek yang masih memuat nama depan. */
export function personalHeadline(name: string) {
  const first = firstName(name);
  const max = CANVA_TEXT_LIMITS["MB-01A"].headline;
  return [`Kenalan dengan ${first}`, `Kenalan, ${first}`, first].find((candidate) => candidate.length <= max) ?? first.slice(0, max);
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
    WORKER_CODE: text(view.worker_register, CANVA_TEXT_LIMITS.code),
  };

  if (templateCode === "MB-02A" || templateCode === "MB-02B") {
    // Flyer katalog "Ready To Interview": nama, posisi, dan penempatan dalam huruf kapital seperti desain asli,
    // plus kode pekerja agar calon majikan bisa menyebut pekerja yang dimaksud saat chat WA.
    return {
      ...common,
      WORKER_NAME: text(flyerName(view.name), FLYER_LIMITS.name),
      WORKER_POSITION: text((specialty || view.category).toUpperCase(), FLYER_LIMITS.position),
      WORKER_PLACEMENT: text(flyerPlacement(view.placement), FLYER_LIMITS.placement),
    };
  }

  if (templateCode === "MB-01A") {
    const limits = CANVA_TEXT_LIMITS["MB-01A"];
    return {
      ...common,
      WORKER_HEADLINE: text(personalHeadline(view.name), limits.headline),
      WORKER_ORIGIN: text(view.origin, limits.origin),
      WORKER_SPECIALTY: text(specialty, limits.specialty),
      WORKER_LIVE_IN_STATUS: text(liveInStatus, limits.liveIn),
      WORKER_INTRO_QUOTE: text(workerQuote, limits.quote),
      WORKER_AGE: text(view.age, limits.age),
      WORKER_READY_STATUS: text(readyStatus, limits.ready),
    };
  }

  const limits = CANVA_TEXT_LIMITS["MB-01B"];
  return {
    ...common,
    WORKER_PROFILE_LINE: text(profileLine, limits.profileLine),
    WORKER_SKILL_1: text(view.skills[0] ?? "", limits.skill),
    WORKER_HEADLINE: text(publicTitle || `${view.category} siap interview`, limits.headline),
    WORKER_NAME: text(view.name, limits.name),
    WORKER_AVAILABILITY: text(availability, limits.availability),
    WORKER_LIVE_IN_STATUS: text(liveInStatus, limits.liveIn),
    WORKER_TRAINING_STATUS: text(trainingStatus, limits.training),
    WORKER_SKILL_2: text(view.skills[1] ?? "", limits.skill),
    WORKER_DOCUMENT_STATUS: text(documentStatus, limits.document),
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
