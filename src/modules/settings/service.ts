import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSettings } from "@/db/schema";

export const APP_SETTING_KEYS = {
  googleContentRootFolderId: "google.content_root_folder_id",
  googlePhotoFolderId: "google.photo_folder_id",
  googleExportFolderId: "google.export_folder_id",
} as const;

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
