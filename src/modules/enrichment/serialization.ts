import type { BridgeRecord } from "@/modules/bridge/content-bridge-service";
import { evaluateReadiness } from "@/modules/rules/readiness";

export function encodeStringList(values: string[]) {
  return JSON.stringify([...new Set(values.map((value) => value.trim()).filter(Boolean))]);
}

export function decodeStringList(value: unknown): string[] {
  if (!value) return [];
  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String).map((item)=>item.trim()).filter(Boolean);
  } catch {}
  return text.split(",").map((item)=>item.trim()).filter(Boolean);
}

export function parseBridgeBoolean(value: unknown) {
  return value === true || ["true","1","yes","ya"].includes(String(value ?? "").trim().toLowerCase());
}

export function readinessFromBridge(bridge: BridgeRecord | null, approvalRequired = true) {
  const placement = decodeStringList(bridge?.placement_preferences)[0] ?? "";
  return evaluateReadiness({
    category: bridge?.category ?? "",
    experience: bridge?.experience_level ?? "",
    skills: decodeStringList(bridge?.skills),
    placement,
    salary: bridge?.salary_display ?? "",
    profile_photo: bridge?.profile_photo_drive_id ?? "",
    publication_consent: parseBridgeBoolean(bridge?.publication_consent),
    approvalRequired,
    approved: Boolean(bridge?.approved_at),
  });
}
