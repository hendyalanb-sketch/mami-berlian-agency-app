import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { integrationHealth } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getDriveFileMetadata } from "@/modules/google/drive-rest";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { readValues } from "@/modules/google/sheets-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDER_MIME = "application/vnd.google-apps.folder";

type Check = {
  status: "HEALTHY" | "UNHEALTHY" | "NOT_CONFIGURED";
  message: string;
  metadata?: Record<string, unknown>;
};

function missing(value?: string) {
  return !value?.trim();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const registerId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  const photoFolderId = process.env.GOOGLE_PHOTO_FOLDER_ID;
  if (missing(registerId) || missing(bridgeId) || missing(photoFolderId)) {
    return NextResponse.json({ error: "GOOGLE_RESOURCE_IDS_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const accessToken = await getGoogleAccessToken(session.user.id);
    const checks: Record<string, Check> = {};

    try {
      const result = await readValues({ spreadsheetId: registerId!, range: "'Register Pekerja'!A1:B2", accessToken });
      checks.register = { status: "HEALTHY", message: "Register dapat dibaca.", metadata: { range: result.range ?? null } };
    } catch (error) {
      checks.register = { status: "UNHEALTHY", message: error instanceof Error ? error.message : "REGISTER_READ_FAILED" };
    }

    try {
      const result = await readValues({ spreadsheetId: bridgeId!, range: "'Content Bridge'!A1:B2", accessToken });
      checks.bridge = { status: "HEALTHY", message: "Content Bridge dapat dibaca.", metadata: { range: result.range ?? null } };
    } catch (error) {
      checks.bridge = { status: "UNHEALTHY", message: error instanceof Error ? error.message : "BRIDGE_READ_FAILED" };
    }

    try {
      const folder = await getDriveFileMetadata({ accessToken, fileId: photoFolderId! });
      const isFolder = folder.mimeType === FOLDER_MIME && folder.trashed !== true;
      const canAddChildren = folder.capabilities?.canAddChildren === true;
      checks.photoFolder = {
        status: isFolder && canAddChildren ? "HEALTHY" : "UNHEALTHY",
        message: !isFolder
          ? "Target foto bukan folder Drive aktif."
          : canAddChildren
            ? "Folder foto dapat dibaca dan menerima file baru."
            : "Folder foto terbaca, tetapi aplikasi belum diizinkan menambahkan file.",
        metadata: { id: folder.id, name: folder.name, mimeType: folder.mimeType, canAddChildren, canEdit: folder.capabilities?.canEdit ?? false },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "DRIVE_FOLDER_CHECK_FAILED";
      checks.photoFolder = {
        status: "UNHEALTHY",
        message: message.startsWith("DRIVE_METADATA_FAILED:403") || message.startsWith("DRIVE_METADATA_FAILED:404")
          ? "Folder foto belum dapat diakses oleh OAuth aplikasi. Hubungkan/pilih folder melalui akses aplikasi tanpa memperluas scope seluruh Drive."
          : message,
      };
    }

    const healthy = Object.values(checks).every((check) => check.status === "HEALTHY");
    if (db) {
      await db.insert(integrationHealth).values({
        provider: "GOOGLE_RUNTIME",
        status: healthy ? "HEALTHY" : "UNHEALTHY",
        message: healthy ? "Google Sheets dan folder foto sehat" : "Satu atau lebih resource Google belum sehat",
        metadataJson: checks,
      });
    }

    return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 409 });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "GOOGLE_HEALTH_FAILED" }, { status: 502 });
  }
}
