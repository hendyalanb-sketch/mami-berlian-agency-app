import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  canvaTemplates,
  ctaProfiles,
  experienceLevels,
  placementOptions,
  publishChannels,
  registerMappings,
  salaryRates,
  salaryZones,
  skills,
  workerCategories,
} from "@/db/schema";
import { MB01_REQUIRED_FIELDS } from "@/modules/canva/template-health";
import {
  APP_SETTING_KEYS,
  getDisplayLabels,
  setDisplayLabel,
  type DisplaySettingKey,
} from "@/modules/settings/service";

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
  const [categories, skillRows, experiences, zones, placements, mappings, rates, templates, channels, ctas, displayLabels] = await Promise.all([
    database.select().from(workerCategories),
    database.select().from(skills),
    database.select().from(experienceLevels),
    database.select().from(salaryZones),
    database.select().from(placementOptions),
    database.select().from(registerMappings),
    database.select().from(salaryRates),
    database.select().from(canvaTemplates),
    database.select().from(publishChannels),
    database.select().from(ctaProfiles),
    getDisplayLabels(),
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
    templates: templates.sort((a, b) => a.code.localeCompare(b.code)),
    channels: channels.sort((a, b) => a.code.localeCompare(b.code)),
    ctas: ctas.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)),
    displayLabels,
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

export async function upsertPublishChannel(input: { code: string; name: string }) {
  const database = requireDb();
  const code = normalizeMasterCode(input.code);
  const name = input.name.trim();
  if (!code || !name) throw new MasterAdminError("INVALID_CHANNEL_INPUT");
  return database.insert(publishChannels).values({ code, name, isActive: true }).onConflictDoUpdate({
    target: publishChannels.code,
    set: { name, isActive: true, updatedAt: new Date() },
  }).returning();
}

export async function upsertCanvaTemplate(input: { code: string; name: string; canvaTemplateId: string; version: string; contentType: string }) {
  const database = requireDb();
  const code = normalizeMasterCode(input.code);
  const name = input.name.trim();
  const canvaTemplateId = input.canvaTemplateId.trim();
  const version = input.version.trim();
  const contentType = normalizeMasterCode(input.contentType);
  if (!code || !name || !canvaTemplateId || !version || !contentType) throw new MasterAdminError("INVALID_TEMPLATE_INPUT");
  const requiredFieldsJson = code === "MB_01" || code === "MB-01" ? [...MB01_REQUIRED_FIELDS] : [];
  const normalizedCode = code === "MB_01" ? "MB-01" : code;
  return database.insert(canvaTemplates).values({ normalizedCode } as never).catch(async () => {
    const [existing] = await database.select().from(canvaTemplates).where(eq(canvaTemplates.code, normalizedCode)).limit(1);
    if (existing) {
      return database.update(canvaTemplates).set({ name, canvaTemplateId, version, contentType, requiredFieldsJson: requiredFieldsJson.length ? requiredFieldsJson : existing.requiredFieldsJson, isActive: false, updatedAt: new Date() }).where(eq(canvaTemplates.id, existing.id)).returning();
    }
    return database.insert(canvaTemplates).values({ code: normalizedCode, name, canvaTemplateId, version, contentType, requiredFieldsJson, isActive: false }).returning();
  });
}

export async function upsertCtaProfile(input: {
  id?: string;
  name: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  website?: string;
  ctaText?: string;
  qrTarget?: string;
  isDefault?: boolean;
}) {
  const database = requireDb();
  const name = input.name.trim();
  if (!name) throw new MasterAdminError("INVALID_CTA_INPUT");
  if (input.isDefault) await database.update(ctaProfiles).set({ isDefault: false, updatedAt: new Date() });
  const values = {
    name,
    primaryPhone: input.primaryPhone?.trim() || null,
    secondaryPhone: input.secondaryPhone?.trim() || null,
    email: input.email?.trim() || null,
    website: input.website?.trim() || null,
    ctaText: input.ctaText?.trim() || null,
    qrTarget: input.qrTarget?.trim() || null,
    isDefault: input.isDefault === true,
    isActive: true,
    updatedAt: new Date(),
  };
  if (input.id) {
    const [existing] = await database.select().from(ctaProfiles).where(eq(ctaProfiles.id, input.id)).limit(1);
    if (!existing) throw new MasterAdminError("CTA_NOT_FOUND");
    return database.update(ctaProfiles).set(values).where(eq(ctaProfiles.id, input.id)).returning();
  }
  return database.insert(ctaProfiles).values(values).returning();
}

export async function updateDisplayLabel(input: { key: DisplaySettingKey; value: string; updatedBy?: string }) {
  const allowed = new Set<string>([
    APP_SETTING_KEYS.displayReadyLabel,
    APP_SETTING_KEYS.displayPlacementLabel,
    APP_SETTING_KEYS.displaySalaryLabel,
    APP_SETTING_KEYS.displayFooterText,
  ]);
  if (!allowed.has(input.key)) throw new MasterAdminError("INVALID_DISPLAY_KEY");
  try {
    await setDisplayLabel(input.key, input.value, input.updatedBy);
  } catch {
    throw new MasterAdminError("INVALID_DISPLAY_VALUE");
  }
}

export async function setMasterActive(input: { resource: "category" | "skill" | "experience" | "zone" | "placement" | "mapping" | "rate" | "channel" | "cta"; id: string; isActive: boolean }) {
  const database = requireDb();
  const values = { isActive: input.isActive, updatedAt: new Date() };
  if (input.resource === "category") return database.update(workerCategories).set(values).where(eq(workerCategories.id, input.id)).returning();
  if (input.resource === "skill") return database.update(skills).set(values).where(eq(skills.id, input.id)).returning();
  if (input.resource === "experience") return database.update(experienceLevels).set(values).where(eq(experienceLevels.id, input.id)).returning();
  if (input.resource === "zone") return database.update(salaryZones).set(values).where(eq(salaryZones.id, input.id)).returning();
  if (input.resource === "placement") return database.update(placementOptions).set(values).where(eq(placementOptions.id, input.id)).returning();
  if (input.resource === "mapping") return database.update(registerMappings).set(values).where(eq(registerMappings.id, input.id)).returning();
  if (input.resource === "channel") return database.update(publishChannels).set(values).where(eq(publishChannels.id, input.id)).returning();
  if (input.resource === "cta") return database.update(ctaProfiles).set(values).where(eq(ctaProfiles.id, input.id)).returning();
  return database.update(salaryRates).set(values).where(eq(salaryRates.id, input.id)).returning();
}
