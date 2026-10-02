export const CANVA_WORKER_TEMPLATE_CODES = ["MB-01A", "MB-01B", "MB-02A", "MB-02B"] as const;
export type CanvaWorkerTemplateCode = (typeof CANVA_WORKER_TEMPLATE_CODES)[number];

type FieldType = "image" | "text";
type TemplateContract = {
  name: string;
  requiredFields: readonly string[];
  expectedTypes: Record<string, FieldType>;
};

export const MB01A_REQUIRED_FIELDS = [
  "WORKER_HEADLINE",
  "WORKER_ORIGIN",
  "WORKER_SPECIALTY",
  "WORKER_CODE",
  "WORKER_LIVE_IN_STATUS",
  "WORKER_INTRO_QUOTE",
  "WORKER_PHOTO",
  "WORKER_AGE",
  "WORKER_READY_STATUS",
] as const;

export const MB01B_REQUIRED_FIELDS = [
  "WORKER_PHOTO",
  "WORKER_PROFILE_LINE",
  "WORKER_CODE",
  "WORKER_SKILL_1",
  "WORKER_HEADLINE",
  "WORKER_NAME",
  "WORKER_AVAILABILITY",
  "WORKER_LIVE_IN_STATUS",
  "WORKER_TRAINING_STATUS",
  "WORKER_SKILL_2",
  "WORKER_DOCUMENT_STATUS",
] as const;

/** Flyer katalog "Ready To Interview" (MB-02A biru, MB-02B pink) — turunan desain SAMPUL PEKERJA. */
export const MB02_REQUIRED_FIELDS = [
  "WORKER_PHOTO",
  "WORKER_NAME",
  "WORKER_POSITION",
  "WORKER_PLACEMENT",
  "WORKER_CODE",
] as const;

/**
 * WORKER_CODE tetap terdaftar karena label Autofill-nya tersimpan permanen di dataset desain Canva (tidak bisa dihapus
 * lewat API) dan health check menolak field yang tidak dipetakan. Nilainya selalu kosong: kode pekerja tidak tampil publik.
 */
export const BLANK_PUBLIC_FIELDS = ["WORKER_CODE"] as const;

function expectedTypes(fields: readonly string[]) {
  return Object.fromEntries(fields.map((field) => [field, field === "WORKER_PHOTO" ? "image" : "text"])) as Record<string, FieldType>;
}

export const WORKER_TEMPLATE_CONTRACTS: Record<CanvaWorkerTemplateCode, TemplateContract> = {
  "MB-01A": {
    name: "MB-01A — Personal",
    requiredFields: MB01A_REQUIRED_FIELDS,
    expectedTypes: expectedTypes(MB01A_REQUIRED_FIELDS),
  },
  "MB-01B": {
    name: "MB-01B — Promo",
    requiredFields: MB01B_REQUIRED_FIELDS,
    expectedTypes: expectedTypes(MB01B_REQUIRED_FIELDS),
  },
  "MB-02A": {
    name: "MB-02A — Ready To Interview (Biru)",
    requiredFields: MB02_REQUIRED_FIELDS,
    expectedTypes: expectedTypes(MB02_REQUIRED_FIELDS),
  },
  "MB-02B": {
    name: "MB-02B — Ready To Interview (Pink)",
    requiredFields: MB02_REQUIRED_FIELDS,
    expectedTypes: expectedTypes(MB02_REQUIRED_FIELDS),
  },
};

/** Kategori yang memakai flyer pink (MB-02B); lainnya biru (MB-02A) — mengikuti pola katalog yang sudah ada. */
const PINK_FLYER_CATEGORIES = new Set(["ART_MOMONG", "BABYSITTER"]);

export function recommendedWorkerTemplateCode(categoryCode: string | null | undefined): CanvaWorkerTemplateCode {
  return PINK_FLYER_CATEGORIES.has(String(categoryCode ?? "").toUpperCase()) ? "MB-02B" : "MB-02A";
}

export function isWorkerTemplateCode(value: string): value is CanvaWorkerTemplateCode {
  return (CANVA_WORKER_TEMPLATE_CODES as readonly string[]).includes(value);
}

export function getTemplateContract(code: CanvaWorkerTemplateCode) {
  return WORKER_TEMPLATE_CONTRACTS[code];
}

export function evaluateTemplateHealthForCode(code: CanvaWorkerTemplateCode, availableFields: string[]) {
  const contract = getTemplateContract(code);
  const available = new Set(availableFields);
  const missing = contract.requiredFields.filter((field) => !available.has(field));
  return { valid: missing.length === 0, missing };
}

export function evaluateTemplateDatasetForCode(code: CanvaWorkerTemplateCode, dataset: Record<string, { type: string }>) {
  const contract = getTemplateContract(code);
  const base = evaluateTemplateHealthForCode(code, Object.keys(dataset));
  const wrongType = contract.requiredFields.filter((field) => dataset[field] && dataset[field].type !== contract.expectedTypes[field]);
  return { valid: base.valid && wrongType.length === 0, missing: base.missing, wrongType };
}

// Backward-compatible aliases for older callers/tests while migration to template-specific checks completes.
export const MB01_REQUIRED_FIELDS = MB01A_REQUIRED_FIELDS;
export function evaluateTemplateHealth(availableFields: string[]) {
  return evaluateTemplateHealthForCode("MB-01A", availableFields);
}
export function evaluateTemplateDataset(dataset: Record<string, { type: string }>) {
  return evaluateTemplateDatasetForCode("MB-01A", dataset);
}


export const LEGACY_REQUIRED_FIELDS = ["WORKER_PHOTO", "WORKER_NAME", "WORKER_AGE", "WORKER_ORIGIN", "WORKER_CATEGORY", "WORKER_SKILLS", "WORKER_PLACEMENT", "WORKER_SALARY", "CTA_TEXT"] as const;
export const SUPPORTED_WORKER_FIELDS: string[] = [...new Set([...MB01A_REQUIRED_FIELDS, ...MB01B_REQUIRED_FIELDS, ...MB02_REQUIRED_FIELDS, ...LEGACY_REQUIRED_FIELDS])];

export function defaultTemplateFields(contentType: string): readonly string[] {
  if (contentType === "WORKER_PROFILE_PERSONAL") return MB01A_REQUIRED_FIELDS;
  if (contentType === "WORKER_PROFILE_PROMO") return MB01B_REQUIRED_FIELDS;
  if (contentType === "WORKER_CATALOG_FLYER") return MB02_REQUIRED_FIELDS;
  if (contentType === "PEKERJA_READY") return LEGACY_REQUIRED_FIELDS;
  return [];
}

export function supportedTemplateFields(fields: readonly string[]) {
  return fields.length > 0 && fields.every((field) => SUPPORTED_WORKER_FIELDS.includes(field));
}

/** Master data is authoritative for both new and existing template codes. */
export function evaluateWorkerTemplateDataset(fields: readonly string[], dataset: Record<string, { type: string }>) {
  const unsupported = fields.filter((field) => !SUPPORTED_WORKER_FIELDS.includes(field));
  const missing = fields.filter((field) => !dataset[field]);
  const wrongType = fields.filter((field) => dataset[field] && dataset[field].type !== (field === "WORKER_PHOTO" ? "image" : "text"));
  const unmapped = Object.keys(dataset).filter((field) => !fields.includes(field));
  return { valid: fields.length > 0 && !unsupported.length && !missing.length && !wrongType.length && !unmapped.length, missing: [...missing, ...unsupported, ...unmapped.map((field) => `${field}:UNMAPPED`), ...(fields.length ? [] : ["AUTOFILL_FIELDS_NOT_CONFIGURED"])], wrongType };
}
