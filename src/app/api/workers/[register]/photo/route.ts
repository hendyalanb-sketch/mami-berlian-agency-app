import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { canEditWorkers } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/service";
import { ContentBridgeService, type BridgeRecord } from "@/modules/bridge/content-bridge-service";
import { readinessFromBridge } from "@/modules/enrichment/serialization";
import { downloadDriveFile, uploadImageToDrive } from "@/modules/google/drive-rest";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { buildPhotoFilename, PHOTO_TYPES, validatePhotoInput, type PhotoType } from "@/modules/photo/validation";
import { WorkerSourceService } from "@/modules/workers/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_PREPARED_BYTES = 5 * 1024 * 1024;

async function context(userId: string) {
  const registerId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  const folderId = process.env.GOOGLE_PHOTO_FOLDER_ID;
  if (!registerId || !bridgeId || !folderId) throw new Error("PHOTO_NOT_CONFIGURED");
  const accessToken = await getGoogleAccessToken(userId);
  return {
    accessToken,
    folderId,
    source: new WorkerSourceService({ spreadsheetId: registerId, accessToken }),
    bridge: new ContentBridgeService({ spreadsheetId: bridgeId, accessToken }),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canEditWorkers(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const photoTypeValue = String(form.get("photoType") ?? "").toUpperCase();
    if (!(file instanceof File) || !PHOTO_TYPES.includes(photoTypeValue as PhotoType)) {
      return NextResponse.json({ error: "INVALID_PHOTO" }, { status: 400 });
    }

    const validation = validatePhotoInput({ size: file.size, mimeType: file.type });
    if (!validation.valid) return NextResponse.json({ error: validation.code, message: validation.message }, { status: 400 });
    if (file.size > MAX_PREPARED_BYTES) return NextResponse.json({ error: "PREPARED_IMAGE_TOO_LARGE" }, { status: 413 });

    const { register } = await params;
    const ctx = await context(session.user.id);
    const worker = await ctx.source.getByRegister(decodeURIComponent(register));
    if (!worker) return NextResponse.json({ error: "WORKER_NOT_FOUND" }, { status: 404 });

    const photoType = photoTypeValue as PhotoType;
    const fileName = buildPhotoFilename({ workerRegister: worker.workerRegister, workerName: worker.name, type: photoType, mimeType: file.type });
    const uploaded = await uploadImageToDrive({
      accessToken: ctx.accessToken,
      folderId: ctx.folderId,
      fileName,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
    });

    const before = await ctx.bridge.get(worker.workerRegister);
    const patch: Partial<BridgeRecord> = photoType === "PROFILE"
      ? { profile_photo_drive_id: uploaded.id, profile_photo_url: uploaded.webViewLink }
      : photoType === "FULLBODY"
        ? { fullbody_photo_drive_id: uploaded.id, fullbody_photo_url: uploaded.webViewLink }
        : {};
    const merged: BridgeRecord = {
      ...(before ?? {}),
      ...patch,
      worker_register: worker.workerRegister,
    };
    const readiness = readinessFromBridge(merged);

    await ctx.bridge.upsert({
      worker_register: worker.workerRegister,
      ...patch,
      content_status: readiness.status,
      last_updated_by: session.user.email ?? session.user.id,
      last_updated_at: new Date().toISOString(),
    });
    await writeAudit({
      workerRegister: worker.workerRegister,
      userId: session.user.id,
      action: "UPLOAD_WORKER_PHOTO",
      entityType: "DRIVE_FILE",
      entityId: uploaded.id,
      after: { photoType, fileName, contentStatus: readiness.status },
    });

    return NextResponse.json({ ok: true, file: uploaded, photoType, fileName, readiness });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    const message = error instanceof Error ? error.message : "PHOTO_UPLOAD_FAILED";
    return NextResponse.json({ error: message.startsWith("DRIVE_UPLOAD_FAILED") ? message : "PHOTO_UPLOAD_FAILED" }, { status: 502 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const { register } = await params;
    const type = new URL(request.url).searchParams.get("type") === "FULLBODY" ? "FULLBODY" : "PROFILE";
    const ctx = await context(session.user.id);
    const bridge = await ctx.bridge.get(decodeURIComponent(register));
    const fileId = type === "FULLBODY" ? bridge?.fullbody_photo_drive_id : bridge?.profile_photo_drive_id;
    if (!fileId) return NextResponse.json({ error: "PHOTO_NOT_FOUND" }, { status: 404 });
    const response = await downloadDriveFile({ accessToken: ctx.accessToken, fileId: String(fileId) });
    if (!response.ok) return NextResponse.json({ error: "DRIVE_READ_FAILED" }, { status: response.status });
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "PHOTO_READ_FAILED" }, { status: 502 });
  }
}
