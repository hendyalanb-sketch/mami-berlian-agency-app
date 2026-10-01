import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSettings } from "@/db/schema";
import { COPY_PRESETS_SETTING_KEY, normalizeCopyPresets, type CopyPresets } from "@/modules/content/copy-presets";

export const APP_SETTING_KEYS = {
  googleContentRootFolderId: "google.content_root_folder_id",
  googlePhotoFolderId: "google.photo_folder_id",
  googleExportFolderId: "google.export_folder_id",
  displayReadyLabel: "display.ready_label",
  displayPlacementLabel: "display.placement_label",
  displaySalaryLabel: "display.salary_label",
  displayFooterText: "display.footer_text",
} as const;

export type DisplaySettingKey =
  | typeof APP_SETTING_KEYS.displayReadyLabel
  | typeof APP_SETTING_KEYS.displayPlacementLabel
  | typeof APP_SETTING_KEYS.displaySalaryLabel
  | typeof APP_SETTING_KEYS.displayFooterText;

export const DISPLAY_DEFAULTS: Record<DisplaySettingKey, string> = {
  [APP_SETTING_KEYS.displayReadyLabel]: "Pekerja Ready",
  [APP_SETTING_KEYS.displayPlacementLabel]: "Penempatan",
  [APP_SETTING_KEYS.displaySalaryLabel]: "Rate",
  [APP_SETTING_KEYS.displayFooterText]: "Mami Berlian Agency • Konsultasi penempatan",
};

export async function getAppSetting<T = unknown>(key: string): Promise<T | null> {
  if (!db) return null;
  const [row] = await db.select({ valueJson: appSettings.valueJson }).from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return (row?.valueJson as T | undefined) ?? null;
}

export async function getAppSettingString(key: string) {
  const value = await getAppSetting<unknown>(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function setAppSetting(key: string, value: unknown, updatedBy?: string) {
  if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  await db.insert(appSettings).values({ key, valueJson: value, updatedBy }).onConflictDoUpdate({
    target: appSettings.key,
    set: { valueJson: value, updatedBy, updatedAt: new Date() },
  });
}

export async function getDisplayLabels() {
  const keys = Object.keys(DISPLAY_DEFAULTS) as DisplaySettingKey[];
  const values = await Promise.all(keys.map(async (key) => [key, await getAppSettingString(key)] as const));
  return Object.fromEntries(values.map(([key, value]) => [key, value ?? DISPLAY_DEFAULTS[key]])) as Record<DisplaySettingKey, string>;
}

export async function setDisplayLabel(key: DisplaySettingKey, value: string, updatedBy?: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error("DISPLAY_LABEL_REQUIRED");
  await setAppSetting(key, normalized, updatedBy);
}

export async function getGoogleStorageSettings() {
  const [root, photo, exportFolder] = await Promise.all([
    getAppSettingString(APP_SETTING_KEYS.googleContentRootFolderId),
    getAppSettingString(APP_SETTING_KEYS.googlePhotoFolderId),
    getAppSettingString(APP_SETTING_KEYS.googleExportFolderId),
  ]);
  return {
    contentRootFolderId: root,
    photoFolderId: photo ?? process.env.GOOGLE_PHOTO_FOLDER_ID?.trim() ?? null,
    exportFolderId: exportFolder ?? process.env.GOOGLE_EXPORT_FOLDER_ID?.trim() ?? null,
    source: {
      photo: photo ? "APP_SETTING" as const : process.env.GOOGLE_PHOTO_FOLDER_ID ? "ENV" as const : "NONE" as const,
      export: exportFolder ? "APP_SETTING" as const : process.env.GOOGLE_EXPORT_FOLDER_ID ? "ENV" as const : "NONE" as const,
    },
  };
}

export async function getCopyPresets() {
  return normalizeCopyPresets(await getAppSetting<unknown>(COPY_PRESETS_SETTING_KEY));
}

export async function setCopyPresets(value: CopyPresets, updatedBy?: string) {
  await setAppSetting(COPY_PRESETS_SETTING_KEY, value, updatedBy);
}
