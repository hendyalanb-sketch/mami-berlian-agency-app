import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { canvaTemplates, integrationHealth } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getCanvaAccessToken, CanvaConnectionError } from "@/modules/canva/oauth-token-service";
import { getCanvaDesignDataset, CanvaApiError } from "@/modules/canva/rest";
import { evaluateTemplateHealth } from "@/modules/canva/template-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runHealth(userId: string, activate: boolean) {
  if (!db) return { status: 503, body: { error: "DATABASE_NOT_CONFIGURED" } };
  const [template] = await db.select().from(canvaTemplates).where(eq(canvaTemplates.code, "MB-01")).limit(1);
  const designId = process.env.CANVA_MB01_WORKING_DESIGN_ID ?? template?.canvaTemplateId;
  if (!template || !designId) return { status: 503, body: { error: "MB01_NOT_CONFIGURED" } };

  try {
    const accessToken = await getCanvaAccessToken(userId);
    const dataset = await getCanvaDesignDataset({ accessToken, designId });
    const health = evaluateTemplateHealth(Object.keys(dataset));
    await db.insert(integrationHealth).values({
      provider: "CANVA_MB01",
      status: health.valid ? "HEALTHY" : "UNHEALTHY",
      message: health.valid ? "MB-01 dataset lengkap" : `Missing: ${health.missing.join(", ")}`,
      metadataJson: { designId, fields: Object.keys(dataset), missing: health.missing },
    });
    if (activate) {
      await db.update(canvaTemplates).set({ canvaTemplateId: designId, isActive: health.valid, updatedAt: new Date() }).where(eq(canvaTemplates.id, template.id));
    }
    return { status: health.valid ? 200 : 409, body: { designId, dataset, ...health, active: activate ? health.valid : template.isActive } };
  } catch (error) {
    const code = error instanceof CanvaConnectionError ? error.code : error instanceof CanvaApiError ? error.code : "CANVA_HEALTH_FAILED";
    return { status: error instanceof CanvaConnectionError ? 409 : 502, body: { error: code } };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await runHealth(session.user.id, false);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const result = await runHealth(session.user.id, true);
  return NextResponse.json(result.body, { status: result.status });
}
