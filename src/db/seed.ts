import { and, eq } from "drizzle-orm";
import { db } from "./client";
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
} from "./schema";

if (!db) throw new Error("DATABASE_URL is required for seed");

const categories = [
  ["ART", "ART"],
  ["ART_MOMONG", "ART Momong"],
  ["BABYSITTER", "Babysitter"],
  ["SUSTER_LANSIA", "Suster Lansia"],
  ["SUSTER_PASIEN", "Suster Pasien"],
  ["INFAL", "Infal"],
  ["OTHER", "Lainnya"],
] as const;

const skillRows = [
  ["BERSIH_RUMAH", "Bersih Rumah"], ["CUCI_SETRIKA", "Cuci & Setrika"], ["MASAK", "Masak"],
  ["MOMONG_ANAK", "Momong Anak"], ["RAWAT_BAYI", "Rawat Bayi"], ["RAWAT_LANSIA", "Rawat Lansia"],
  ["RAWAT_PASIEN", "Rawat Pasien"], ["EX_TKW", "Ex TKW"], ["BERSERTIFIKAT", "Bersertifikat"],
  ["LPK_MAMI_BERLIAN", "LPK Mami Berlian"], ["MENGEMUDI", "Mengemudi"],
  ["HEWAN_PELIHARAAN", "Hewan Peliharaan"], ["LAINNYA", "Lainnya"],
] as const;

const experiences = [
  ["PEMULA", "Pemula"], ["PENGALAMAN", "Pengalaman"], ["EX_TKW", "Ex TKW"],
  ["BERSERTIFIKAT", "Bersertifikat"], ["BERSERTIFIKAT_LPK_MBA", "Bersertifikat LPK Mami Berlian"],
] as const;

const zones = [
  ["ZONE_JATIM", "Jawa Timur"],
  ["ZONE_JATENG_JABAR_DKI", "Jawa Tengah / Jawa Barat / DKI"],
  ["ZONE_LUAR_JAWA", "Luar Jawa"],
] as const;

const channels = ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "KATALOG", "WEBSITE", "OTHER"];

async function upsertMasters() {
  for (const [code, name] of categories) {
    await db!.insert(workerCategories).values({ code, name }).onConflictDoUpdate({ target: workerCategories.code, set: { name, isActive: true } });
  }
  for (const [code, name] of skillRows) {
    await db!.insert(skills).values({ code, name }).onConflictDoUpdate({ target: skills.code, set: { name, isActive: true } });
  }
  for (const [code, name] of experiences) {
    await db!.insert(experienceLevels).values({ code, name }).onConflictDoUpdate({ target: experienceLevels.code, set: { name, isActive: true } });
  }
  for (const [code, name] of zones) {
    await db!.insert(salaryZones).values({ code, name }).onConflictDoUpdate({ target: salaryZones.code, set: { name, isActive: true } });
  }
  for (const code of channels) {
    await db!.insert(publishChannels).values({ code, name: code.replaceAll("_", " ") }).onConflictDoUpdate({ target: publishChannels.code, set: { isActive: true } });
  }

  const zoneList = await db!.select().from(salaryZones);
  const zoneId = Object.fromEntries(zoneList.map((row) => [row.code, row.id]));
  const placements = [
    ["SURABAYA", "Surabaya", "ZONE_JATIM"], ["JAWA_TIMUR", "Jawa Timur", "ZONE_JATIM"],
    ["JAWA_TENGAH", "Jawa Tengah", "ZONE_JATENG_JABAR_DKI"], ["JAWA_BARAT", "Jawa Barat", "ZONE_JATENG_JABAR_DKI"],
    ["DKI_JAKARTA", "DKI Jakarta", "ZONE_JATENG_JABAR_DKI"], ["BALI", "Bali", "ZONE_JATIM"],
    ["PULAU_JAWA", "Pulau Jawa", "ZONE_JATENG_JABAR_DKI"], ["JAWA_BALI", "Jawa & Bali", "ZONE_JATENG_JABAR_DKI"],
    ["LUAR_JAWA", "Luar Jawa", "ZONE_LUAR_JAWA"], ["SELURUH_INDONESIA", "Seluruh Indonesia", "ZONE_LUAR_JAWA"],
    ["CUSTOM", "Custom", "ZONE_JATIM"],
  ] as const;
  for (const [code, name, zone] of placements) {
    await db!.insert(placementOptions).values({ code, name, salaryZoneId: zoneId[zone] }).onConflictDoUpdate({ target: placementOptions.code, set: { name, salaryZoneId: zoneId[zone], isActive: true } });
  }

  await db!.insert(ctaProfiles).values({
    name: "Default Mami Berlian",
    primaryPhone: "085600619534",
    secondaryPhone: "081252981527",
    email: "sales@mamiberlianagency.com",
    website: "https://mamiberlianagency.com",
    ctaText: "Hubungi Mami Berlian untuk informasi penempatan.",
    qrTarget: "https://wa.me/6285600619534",
    isDefault: true,
    isActive: true,
  });

  await db!.insert(canvaTemplates).values({
    code: "MB-01",
    name: "Pekerja Ready",
    canvaTemplateId: process.env.CANVA_MB01_SOURCE_DESIGN_ID ?? "DAHWsPb3Osk",
    version: "v1",
    contentType: "PEKERJA_READY",
    requiredFieldsJson: ["WORKER_PHOTO","WORKER_NAME","WORKER_AGE","WORKER_ORIGIN","WORKER_CATEGORY","WORKER_SKILLS","WORKER_PLACEMENT","WORKER_SALARY","CTA_TEXT"],
    isActive: false,
  }).onConflictDoUpdate({ target: canvaTemplates.code, set: { isActive: false } });

  const mappings = [
    ["CATEGORY", "ART", "ART"],
    ["CATEGORY", "SUSBY", "BABYSITTER"],
    ["CATEGORY", "SUSL", "SUSTER_LANSIA"],
    ["EXPERIENCE", "Tidak Pernah Bekerja", "PEMULA"],
    ["EXPERIENCE", "Tidak Pernah Pekerja", "PEMULA"],
    ["EXPERIENCE", "Belum Pernah Kerja", "PEMULA"],
  ] as const;
  for (const [mappingType, sourceValue, targetCode] of mappings) {
    const existing = await db!.select({ id: registerMappings.id }).from(registerMappings).where(and(eq(registerMappings.mappingType, mappingType), eq(registerMappings.sourceValue, sourceValue))).limit(1);
    if (!existing.length) await db!.insert(registerMappings).values({ mappingType, sourceValue, targetCode });
  }
}

async function seedRates() {
  const cats = await db!.select().from(workerCategories);
  const exps = await db!.select().from(experienceLevels);
  const zoneList = await db!.select().from(salaryZones);
  const catId = Object.fromEntries(cats.map((r) => [r.code, r.id]));
  const expId = Object.fromEntries(exps.map((r) => [r.code, r.id]));
  const zoneId = Object.fromEntries(zoneList.map((r) => [r.code, r.id]));

  const baseline = [
    ["ZONE_JATIM","ART","PEMULA",2200000,2500000], ["ZONE_JATIM","ART","PENGALAMAN",2500000,2700000], ["ZONE_JATIM","ART","EX_TKW",2700000,3200000],
    ["ZONE_JATIM","ART_MOMONG","PEMULA",2500000,2700000], ["ZONE_JATIM","ART_MOMONG","PENGALAMAN",2700000,3200000],
    ["ZONE_JATENG_JABAR_DKI","ART","PEMULA",2200000,2700000], ["ZONE_JATENG_JABAR_DKI","ART","PENGALAMAN",2700000,2900000], ["ZONE_JATENG_JABAR_DKI","ART","EX_TKW",2900000,3500000],
    ["ZONE_JATENG_JABAR_DKI","ART_MOMONG","PEMULA",2700000,2900000], ["ZONE_JATENG_JABAR_DKI","ART_MOMONG","PENGALAMAN",2900000,3400000],
    ["ZONE_LUAR_JAWA","ART","PEMULA",2600000,2900000], ["ZONE_LUAR_JAWA","ART","PENGALAMAN",2900000,3200000], ["ZONE_LUAR_JAWA","ART","EX_TKW",3200000,3800000],
    ["ZONE_LUAR_JAWA","ART_MOMONG","PEMULA",2900000,3200000], ["ZONE_LUAR_JAWA","ART_MOMONG","PENGALAMAN",3200000,4000000],
  ] as const;

  for (const [zone, category, experience, salaryMin, salaryMax] of baseline) {
    if (!catId[category] || !expId[experience] || !zoneId[zone]) continue;
    const existing = await db!.select({ id: salaryRates.id }).from(salaryRates).where(and(
      eq(salaryRates.categoryId, catId[category]), eq(salaryRates.experienceLevelId, expId[experience]),
      eq(salaryRates.salaryZoneId, zoneId[zone]), eq(salaryRates.version, "2025-09"),
    )).limit(1);
    if (!existing.length) await db!.insert(salaryRates).values({ categoryId: catId[category], experienceLevelId: expId[experience], salaryZoneId: zoneId[zone], salaryMin: String(salaryMin), salaryMax: String(salaryMax), effectiveFrom: "2025-09-01", version: "2025-09", isActive: true });
  }
}

await upsertMasters();
await seedRates();
console.log("Baseline master seed completed.");
