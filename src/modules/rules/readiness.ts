export const mandatoryReadinessFields = [
  "category",
  "experience",
  "skills",
  "placement",
  "salary",
  "profile_photo",
  "publication_consent",
] as const;

export type ReadinessInput = Record<(typeof mandatoryReadinessFields)[number], unknown> & {
  approved?: boolean;
  approvalRequired?: boolean;
};

function present(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function evaluateReadiness(input: ReadinessInput) {
  const checks = Object.fromEntries(
    mandatoryReadinessFields.map((field) => [field, present(input[field])]),
  ) as Record<(typeof mandatoryReadinessFields)[number], boolean>;
  const missing = mandatoryReadinessFields.filter((field) => !checks[field]);
  const score = Math.round(((mandatoryReadinessFields.length - missing.length) / mandatoryReadinessFields.length) * 100);

  if (missing.length > 0) return { status: "INCOMPLETE" as const, score, missing, checks };
  if (input.approvalRequired && !input.approved) return { status: "READY" as const, score, missing, checks };
  if (input.approvalRequired && input.approved) return { status: "APPROVED" as const, score, missing, checks };
  return { status: "READY" as const, score, missing, checks };
}
