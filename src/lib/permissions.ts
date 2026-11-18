export type AppRole = "ADMIN" | "STAFF" | "VIEWER";

export function isAdmin(role?: string | null): role is "ADMIN" {
  return role === "ADMIN";
}

export function canEditWorkers(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

export function canGenerateContent(input: { role?: string | null; canGenerate?: boolean }) {
  return input.role === "ADMIN" || (input.role === "STAFF" && input.canGenerate === true);
}
