export type LegacyCategoryResolution = {
  sourceCode: string | null;
  targetCode: "ART" | "BABYSITTER" | "SUSTER_LANSIA" | null;
  mapped: boolean;
  infalHint: boolean;
};

const EXPLICIT_CATEGORY_MAPPINGS = new Map([
  ["ART", "ART"],
  ["SUSBY", "BABYSITTER"],
  ["SUSL", "SUSTER_LANSIA"],
] as const);

export function canonicalizeWorkerRegister(value: string) {
  return value.trim().toUpperCase().replace(/\s*-\s*/g, "-");
}

export function extractLegacyCategoryCode(workerRegister: string) {
  const canonical = canonicalizeWorkerRegister(workerRegister);
  const parts = canonical.split("-").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "PMBA" || !/^\d+$/.test(parts[1])) return null;
  return parts.slice(2).join("-") || null;
}

export function resolveLegacyCategory(workerRegister: string): LegacyCategoryResolution {
  const sourceCode = extractLegacyCategoryCode(workerRegister);
  const targetCode = sourceCode ? EXPLICIT_CATEGORY_MAPPINGS.get(sourceCode as "ART" | "SUSBY" | "SUSL") ?? null : null;
  return {
    sourceCode,
    targetCode,
    mapped: Boolean(targetCode),
    infalHint: Boolean(sourceCode?.split("-").includes("INFAL")),
  };
}
