import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/service";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { readinessFromBridge } from "@/modules/enrichment/serialization";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { canonicalizeWorkerRegister } from "@/modules/workers/register-normalization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!bridgeId) return NextResponse.json({ error: "BRIDGE_NOT_CONFIGURED" }, { status: 503 });

  try {
    const { register } = await params;
    const workerRegister = canonicalizeWorkerRegister(decodeURIComponent(register));
    const accessToken = await getGoogleAccessToken(session.user.id);
    const bridge = new ContentBridgeService({ spreadsheetId: bridgeId, accessToken });
    const before = await bridge.get(workerRegister);
    if (!before) return NextResponse.json({ error: "ENRICHMENT_NOT_FOUND" }, { status: 404 });

    const readiness = readinessFromBridge(before, true);
    if (readiness.missing.length > 0) {
      return NextResponse.json({ error: "READINESS_INCOMPLETE", readiness }, { status: 422 });
    }

    const approvedAt = new Date().toISOString();
    const after = {
      worker_register: workerRegister,
      approved_by: session.user.email ?? session.user.id,
      approved_at: approvedAt,
      content_status: "APPROVED",
      last_updated_by: session.user.email ?? session.user.id,
      last_updated_at: approvedAt,
    } as const;
    await bridge.upsert(after);
    await writeAudit({
      workerRegister,
      userId: session.user.id,
      action: "APPROVE_CONTENT",
      entityType: "CONTENT_BRIDGE",
      entityId: workerRegister,
      before,
      after,
    });

    return NextResponse.json({ ok: true, contentStatus: "APPROVED", approvedAt });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "APPROVAL_FAILED" }, { status: 502 });
  }
}
