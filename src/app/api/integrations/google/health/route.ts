import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { integrationHealth } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getDriveFileMetadata } from "@/modules/google/drive-rest";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { readValues } from "@/modules/google/sheets-rest";
import { getGoogleStorageSettings } from "@/modules/settings/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDER_MIME = "application/vnd.google-apps.folder";
type Check = { status: "HEALTHY" | "UNHEALTHY" | "NOT_CONFIGURED"; message: string; metadata?: Record<string, unknown> };

async function checkFolder(accessToken: string, folderId: string | null, label: string, source: string): Promise<Check> {
  if (!folderId) return { status: "NOT_CONFIGURED", message: `${label} belum dikonfigurasi.`, metadata: { source } };
  try {
    const folder = await getDriveFileMetadata({ accessToken, fileId: folderId });
    const isFolder = folder.mimeType === FOLDER_MIME && folder.trashed !== true;
    const canAddChildren = folder.capabilities?.canAddChildren === true;
    return {
      status: isFolder && canAddChildren ? "HEALTHY" : "UNHEALTHY",
      message: !isFolder
        ? `${label} bukan folder Drive aktif.`
        : canAddChildren
          ? `${label} dapat dibaca dan menerima file baru.`
          : `${label} terbaca, tetapi aplikasi belum diizinkan menambahkan file.`,
      metadata: { id: folder.id, name: folder.name, mimeType: folder.mimeType, canAddChildren, canEdit: folder.capabilities?.canEdit ?? false, source },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DRIVE_FOLDER_CHECK_FAILED";
    return {
      status: "UNHEALTHY",
      message: message.startsWith("DRIVE_METADATA_FAILED:403") || message.startsWith("DRIVE_METADATA_FAILED:404")
        ? `${label} belum dapat diakses oleh OAuth aplikasi. Gunakan Provision Safe Folders atau otorisasi folder tanpa memperluas akses seluruh Drive.`
        : message,
      metadata: { source },
    };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const registerId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!registerId?.trim() || !bridgeId?.trim()) return NextResponse.json({ error: "GOOGLE_SHEETS_IDS_NOT_CONFIGURED" }, { status: 503 });

  try {
    const accessToken = await getGoogleAccessToken(session.user.id);
    const storage = await getGoogleStorageSettings();
    const checks: Record<string, Check> = {};

    try {
      const result = await readValues({ spreadsheetId: registerId, range: "'Register Pekerja'!A1:B2", accessToken });
      checks.register = { status: "HEALTHY", message: "Register dapat dibaca.", metadata: { range: result.range ?? null } };
    } catch (error) {
      checks.register = { status: "UNHEALTHY", message: error instanceof Error ? error.message : "REGISTER_READ_FAILED" };
    }

    try {
      const result = await readValues({ spreadsheetId: bridgeId, range: "'Content Bridge'!A1:B2", accessToken });
      checks.bridge = { status: "HEALTHY", message: "Content Bridge dapat dibaca.", metadata: { range: result.range ?? null } };
    } catch (error) {
      checks.bridge = { status: "UNHEALTHY", message: error instanceof Error ? error.message : "BRIDGE_READ_FAILED" };
    }

    checks.photoFolder = await checkFolder(accessToken, storage.photoFolderId, "Folder foto", storage.source.photo);
    checks.exportFolder = await checkFolder(accessToken, storage.exportFolderId, "Folder export", storage.source.export);

    const healthy = Object.values(checks).every((check) => check.status === "HEALTHY");
    if (db) {
      await db.insert(integrationHealth).values({
        provider: "GOOGLE_RUNTIME",
        status: healthy ? "HEALTHY" : "UNHEALTHY",
        message: healthy ? "Google Sheets, foto, dan export sehat" : "Satu atau lebih resource Google belum sehat",
        metadataJson: checks,
      });
    }

    return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 409 });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "GOOGLE_HEALTH_FAILED" }, { status: 502 });
  }
}
