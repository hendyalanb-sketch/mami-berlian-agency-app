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

export function evaluateTemplateHealth(availableFields: string[]) {
  const available = new Set(availableFields);
  const missing = MB01_REQUIRED_FIELDS.filter((field) => !available.has(field));
  return { valid: missing.length === 0, missing };
}
