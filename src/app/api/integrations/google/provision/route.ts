import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { createDriveFolder, getDriveFileMetadata } from "@/modules/google/drive-rest";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { APP_SETTING_KEYS, getGoogleStorageSettings, setAppSetting } from "@/modules/settings/service";
import { writeAudit } from "@/modules/audit/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function usableFolder(accessToken: string, folderId?: string | null) {
  if (!folderId) return null;
  try {
    const folder = await getDriveFileMetadata({ accessToken, fileId: folderId });
    if (folder.mimeType !== FOLDER_MIME || folder.trashed || folder.capabilities?.canAddChildren !== true) return null;
    return folder;
  } catch {
    return null;
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const accessToken = await getGoogleAccessToken(session.user.id);
    const current = await getGoogleStorageSettings();

    let root = await usableFolder(accessToken, current.contentRootFolderId);
    if (!root) {
      root = await createDriveFolder({ accessToken, name: "Mami Berlian - Content Operations" });
      await setAppSetting(APP_SETTING_KEYS.googleContentRootFolderId, root.id, session.user.id);
    }

    let photo = await usableFolder(accessToken, current.photoFolderId);
    if (!photo) {
      photo = await createDriveFolder({ accessToken, parentId: root.id, name: "Foto Pekerja" });
      await setAppSetting(APP_SETTING_KEYS.googlePhotoFolderId, photo.id, session.user.id);
    } else if (current.source.photo !== "APP_SETTING") {
      await setAppSetting(APP_SETTING_KEYS.googlePhotoFolderId, photo.id, session.user.id);
    }

    let exportFolder = await usableFolder(accessToken, current.exportFolderId);
    if (!exportFolder) {
      exportFolder = await createDriveFolder({ accessToken, parentId: root.id, name: "Content Exports" });
      await setAppSetting(APP_SETTING_KEYS.googleExportFolderId, exportFolder.id, session.user.id);
    } else if (current.source.export !== "APP_SETTING") {
      await setAppSetting(APP_SETTING_KEYS.googleExportFolderId, exportFolder.id, session.user.id);
    }

    await writeAudit({
      userId: session.user.id,
      action: "PROVISION_GOOGLE_STORAGE",
      entityType: "APP_SETTINGS",
      entityId: "google-storage",
      after: { rootFolderId: root.id, photoFolderId: photo.id, exportFolderId: exportFolder.id },
    });

    return NextResponse.json({
      ok: true,
      folders: {
        root: { id: root.id, name: root.name },
        photo: { id: photo.id, name: photo.name },
        export: { id: exportFolder.id, name: exportFolder.name },
      },
    });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "GOOGLE_PROVISION_FAILED" }, { status: 502 });
  }
}
