import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  experienceLevels,
  placementOptions,
  registerMappings,
  salaryRates,
  salaryZones,
  skills,
  workerCategories,
} from "@/db/schema";

export class MasterAdminError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function requireDb() {
  if (!db) throw new MasterAdminError("DATABASE_NOT_CONFIGURED");
  return db;
}

export function normalizeMasterCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function getMasterAdminSnapshot() {
  const database = requireDb();
  const [categories, skillRows, experiences, zones, placements, mappings, rates] = await Promise.all([
    database.select().from(workerCategories),
    database.select().from(skills),
    database.select().from(experienceLevels),
    database.select().from(salaryZones),
    database.select().from(placementOptions),
    database.select().from(registerMappings),
    database.select().from(salaryRates),
  ]);

  const zoneById = new Map(zones.map((row) => [row.id, row]));
  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const experienceById = new Map(experiences.map((row) => [row.id, row]));

  return {
    categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
    skills: skillRows.sort((a, b) => a.sortOrder - b.sortOrder),
    experiences: experiences.sort((a, b) => a.sortOrder - b.sortOrder),
    zones: zones.sort((a, b) => a.sortOrder - b.sortOrder),
    placements: placements.sort((a, b) => a.sortOrder - b.sortOrder).map((row) => ({
      ...row,
      salaryZoneCode: row.salaryZoneId ? zoneById.get(row.salaryZoneId)?.code ?? null : null,
      salaryZoneName: row.salaryZoneId ? zoneById.get(row.salaryZoneId)?.name ?? null : null,
    })),
    mappings: mappings.sort((a, b) => a.mappingType.localeCompare(b.mappingType) || a.sourceValue.localeCompare(b.sourceValue)),
    rates: rates.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map((row) => ({
      ...row,
      categoryCode: categoryById.get(row.categoryId)?.code ?? "UNKNOWN",
      categoryName: categoryById.get(row.categoryId)?.name ?? "Unknown",
      experienceCode: experienceById.get(row.experienceLevelId)?.code ?? "UNKNOWN",
      experienceName: experienceById.get(row.experienceLevelId)?.name ?? "Unknown",
      salaryZoneCode: zoneById.get(row.salaryZoneId)?.code ?? "UNKNOWN",
      salaryZoneName: zoneById.get(row.salaryZoneId)?.name ?? "Unknown",
    })),
  };
}

type SimpleResource = "category" | "skill" | "experience" | "zone";

export async function createSimpleMaster(resource: SimpleResource, input: { code: string; name: string }) {
  const database = requireDb();
  const code = normalizeMasterCode(input.code);
  const name = input.name.trim();
  if (!code || !name) throw new MasterAdminError("INVALID_MASTER_INPUT");
  if (resource === "category") return database.insert(workerCategories).values({ code, name }).onConflictDoUpdate({ target: workerCategories.code, set: { name, isActive: true, updatedAt: new Date() } }).returning();
  if (resource === "skill") return database.insert(skills).values({ code, name }).onConflictDoUpdate({ target: skills.code, set: { name, isActive: true, updatedAt: new Date() } }).returning();
  if (resource === "experience") return database.insert(experienceLevels).values({ code, name }).onConflictDoUpdate({ target: experienceLevels.code, set: { name, isActive: true, updatedAt: new Date() } }).returning();
  return database.insert(salaryZones).values({ code, name }).onConflictDoUpdate({ target: salaryZones.code, set: { name, isActive: true, updatedAt: new Date() } }).returning();
}

export async function createPlacement(input: { code: string; name: string; salaryZoneCode: string }) {
  const database = requireDb();
  const zoneCode = normalizeMasterCode(input.salaryZoneCode);
  const [zone] = await database.select().from(salaryZones).where(eq(salaryZones.code, zoneCode)).limit(1);
  if (!zone) throw new MasterAdminError("SALARY_ZONE_NOT_FOUND");
  const code = normalizeMasterCode(input.code);
  const name = input.name.trim();
  if (!code || !name) throw new MasterAdminError("INVALID_MASTER_INPUT");
  return database.insert(placementOptions).values({ code, name, salaryZoneId: zone.id }).onConflictDoUpdate({ target: placementOptions.code, set: { name, salaryZoneId: zone.id, isActive: true, updatedAt: new Date() } }).returning();
}

export async function createRegisterMapping(input: { mappingType: string; sourceValue: string; targetCode: string; notes?: string }) {
  const database = requireDb();
  const mappingType = normalizeMasterCode(input.mappingType);
  const sourceValue = input.sourceValue.trim();
  const targetCode = normalizeMasterCode(input.targetCode);
  if (!mappingType || !sourceValue || !targetCode) throw new MasterAdminError("INVALID_MAPPING_INPUT");
  const existing = await database.select().from(registerMappings).where(eq(registerMappings.sourceValue, sourceValue));
  const same = existing.find((row) => row.mappingType === mappingType);
  if (same) {
    return database.update(registerMappings).set({ targetCode, notes: input.notes?.trim() || null, isActive: true, updatedAt: new Date() }).where(eq(registerMappings.id, same.id)).returning();
  }
  return database.insert(registerMappings).values({ mappingType, sourceValue, targetCode, notes: input.notes?.trim() || null }).returning();
}

export async function createSalaryRate(input: {
  categoryCode: string;
  experienceCode: string;
  salaryZoneCode: string;
  salaryMin: number;
  salaryMax: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: string;
  createdBy?: string;
}) {
  const database = requireDb();
  if (input.salaryMin < 0 || input.salaryMax < input.salaryMin) throw new MasterAdminError("INVALID_RATE_RANGE");
  const [category] = await database.select().from(workerCategories).where(eq(workerCategories.code, normalizeMasterCode(input.categoryCode))).limit(1);
  const [experience] = await database.select().from(experienceLevels).where(eq(experienceLevels.code, normalizeMasterCode(input.experienceCode))).limit(1);
  const [zone] = await database.select().from(salaryZones).where(eq(salaryZones.code, normalizeMasterCode(input.salaryZoneCode))).limit(1);
  if (!category || !experience || !zone) throw new MasterAdminError("RATE_REFERENCE_NOT_FOUND");
  return database.insert(salaryRates).values({
    categoryId: category.id,
    experienceLevelId: experience.id,
    salaryZoneId: zone.id,
    salaryMin: String(Math.round(input.salaryMin)),
    salaryMax: String(Math.round(input.salaryMax)),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo || null,
    version: input.version.trim(),
    isActive: true,
    createdBy: input.createdBy,
  }).returning();
}

export async function setMasterActive(input: { resource: "category" | "skill" | "experience" | "zone" | "placement" | "mapping" | "rate"; id: string; isActive: boolean }) {
  const database = requireDb();
  const values = { isActive: input.isActive, updatedAt: new Date() };
  if (input.resource === "category") return database.update(workerCategories).set(values).where(eq(workerCategories.id, input.id)).returning();
  if (input.resource === "skill") return database.update(skills).set(values).where(eq(skills.id, input.id)).returning();
  if (input.resource === "experience") return database.update(experienceLevels).set(values).where(eq(experienceLevels.id, input.id)).returning();
  if (input.resource === "zone") return database.update(salaryZones).set(values).where(eq(salaryZones.id, input.id)).returning();
  if (input.resource === "placement") return database.update(placementOptions).set(values).where(eq(placementOptions.id, input.id)).returning();
  if (input.resource === "mapping") return database.update(registerMappings).set(values).where(eq(registerMappings.id, input.id)).returning();
  return database.update(salaryRates).set(values).where(eq(salaryRates.id, input.id)).returning();
}
