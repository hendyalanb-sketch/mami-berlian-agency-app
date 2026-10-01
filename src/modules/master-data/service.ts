import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { experienceLevels, placementOptions, publishChannels, salaryRates, salaryZones, skills, workerCategories } from "@/db/schema";
import { formatSalaryRange, resolveSalaryRate } from "@/modules/rules/salary";

export class MasterDataUnavailableError extends Error {
  constructor() { super("MASTER_DATA_UNAVAILABLE"); }
}

export async function getWorkerMasterOptions() {
  if (!db) throw new MasterDataUnavailableError();
  const [categories, skillRows, experiences, placements, zones] = await Promise.all([
    db.select().from(workerCategories).where(eq(workerCategories.isActive, true)),
    db.select().from(skills).where(eq(skills.isActive, true)),
    db.select().from(experienceLevels).where(eq(experienceLevels.isActive, true)),
    db.select().from(placementOptions).where(eq(placementOptions.isActive, true)),
    db.select().from(salaryZones).where(eq(salaryZones.isActive, true)),
  ]);
  const zoneById = new Map(zones.map((row) => [row.id, row]));
  return {
    categories: categories.sort((a,b)=>a.sortOrder-b.sortOrder).map(({ id, code, name }) => ({ id, code, name })),
    skills: skillRows.sort((a,b)=>a.sortOrder-b.sortOrder).map(({ id, code, name }) => ({ id, code, name })),
    experiences: experiences.sort((a,b)=>a.sortOrder-b.sortOrder).map(({ id, code, name }) => ({ id, code, name })),
    placements: placements.sort((a,b)=>a.sortOrder-b.sortOrder).map((row) => ({
      id: row.id, code: row.code, name: row.name,
      salaryZoneId: row.salaryZoneId,
      salaryZoneCode: row.salaryZoneId ? zoneById.get(row.salaryZoneId)?.code ?? null : null,
    })),
  };
}

export async function getActivePublishChannels() {
  if (!db) throw new MasterDataUnavailableError();
  const rows = await db.select({ code: publishChannels.code, name: publishChannels.name })
    .from(publishChannels)
    .where(eq(publishChannels.isActive, true));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function validateSkillCodes(codes: string[]) {
  const options = await getWorkerMasterOptions();
  const allowed = new Set(options.skills.map((row) => row.code));
  return codes.every((code) => allowed.has(code));
}

export async function resolveSalaryForSelection(input: { categoryCode: string; experienceCode: string; placementCode: string; effectiveDate?: string }) {
  if (!db) throw new MasterDataUnavailableError();
  const options = await getWorkerMasterOptions();
  const category = options.categories.find((row) => row.code === input.categoryCode);
  const experience = options.experiences.find((row) => row.code === input.experienceCode);
  const placement = options.placements.find((row) => row.code === input.placementCode);
  if (!category || !experience || !placement?.salaryZoneId || !placement.salaryZoneCode) return null;

  const rows = await db.select().from(salaryRates).where(eq(salaryRates.isActive, true));
  const candidates = rows
    .filter((row) => row.categoryId === category.id && row.experienceLevelId === experience.id && row.salaryZoneId === placement.salaryZoneId)
    .map((row) => ({
      category: category.code,
      experience: experience.code,
      zone: placement.salaryZoneCode!,
      min: Number(row.salaryMin),
      max: Number(row.salaryMax),
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    }));
  const effectiveDate = input.effectiveDate ?? new Date().toISOString().slice(0,10);
  const rate = resolveSalaryRate(candidates, { category: category.code, experience: experience.code, zone: placement.salaryZoneCode, effectiveDate });
  if (!rate) return null;
  return {
    category,
    experience,
    placement,
    salaryZoneCode: placement.salaryZoneCode,
    rate,
    salaryDisplay: formatSalaryRange(rate.min, rate.max),
  };
}
