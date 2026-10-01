export const CANVA_WORKER_TEMPLATE_CODES = ["MB-01A", "MB-01B"] as const;
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
};

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
