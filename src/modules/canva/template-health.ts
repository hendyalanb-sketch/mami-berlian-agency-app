export const MB01_REQUIRED_FIELDS = [
  "WORKER_PHOTO",
  "WORKER_NAME",
  "WORKER_AGE",
  "WORKER_ORIGIN",
  "WORKER_CATEGORY",
  "WORKER_SKILLS",
  "WORKER_PLACEMENT",
  "WORKER_SALARY",
  "CTA_TEXT",
] as const;

export const MB01_EXPECTED_TYPES: Record<(typeof MB01_REQUIRED_FIELDS)[number], "image" | "text"> = {
  WORKER_PHOTO: "image",
  WORKER_NAME: "text",
  WORKER_AGE: "text",
  WORKER_ORIGIN: "text",
  WORKER_CATEGORY: "text",
  WORKER_SKILLS: "text",
  WORKER_PLACEMENT: "text",
  WORKER_SALARY: "text",
  CTA_TEXT: "text",
};

export function evaluateTemplateHealth(availableFields: string[]) {
  const available = new Set(availableFields);
  const missing = MB01_REQUIRED_FIELDS.filter((field) => !available.has(field));
  return { valid: missing.length === 0, missing };
}

export function evaluateTemplateDataset(dataset: Record<string, { type: string }>) {
  const base = evaluateTemplateHealth(Object.keys(dataset));
  const wrongType = MB01_REQUIRED_FIELDS.filter((field) => dataset[field] && dataset[field].type !== MB01_EXPECTED_TYPES[field]);
  return { valid: base.valid && wrongType.length === 0, missing: base.missing, wrongType };
}
