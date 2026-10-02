import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { canvaTemplates, integrationHealth } from "@/db/schema";
import { writeAudit } from "@/modules/audit/service";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getCanvaAccessToken, CanvaConnectionError } from "@/modules/canva/oauth-token-service";
import { getCanvaDesignDataset, CanvaApiError } from "@/modules/canva/rest";
import { evaluateWorkerTemplateDataset } from "@/modules/canva/template-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runHealth(userId: string, activate: boolean) {
  if (!db) return { status: 503, body: { error: "DATABASE_NOT_CONFIGURED" } };

  const templates = await db.select().from(canvaTemplates);
  const missingTemplates: string[] = [];
  if (!templates.length) return { status: 503, body: { error: "WORKER_TEMPLATES_NOT_CONFIGURED", missingTemplates } };

  try {
    const accessToken = await getCanvaAccessToken(userId);
    const results = [] as Array<{
      code: string;
      name: string;
      designId: string;
      valid: boolean;
      missing: string[];
      wrongType: string[];
      fields: string[];
      active: boolean;
    }>;

    for (const template of templates) {
      const designId = template.canvaTemplateId;
      let dataset: Record<string, { type: string }> = {};
      let providerError: string | null = null;
      try { dataset = await getCanvaDesignDataset({ accessToken, designId }); }
      catch (error) { providerError = error instanceof CanvaApiError ? error.code : "CANVA_HEALTH_FAILED"; }
      const evaluated = evaluateWorkerTemplateDataset(template.requiredFieldsJson, dataset);
      const health = providerError ? { valid: false, missing: [providerError], wrongType: [] as string[] } : evaluated;
      const issues = [...health.missing, ...health.wrongType.map((field) => `${field}:TYPE`)];

      await db.insert(integrationHealth).values({
        provider: `CANVA_${template.code.replaceAll("-", "")}`,
        status: health.valid ? "HEALTHY" : "UNHEALTHY",
        message: health.valid ? `${template.code} dataset lengkap` : `Issues: ${issues.join(", ")}`,
        metadataJson: { templateCode: template.code, designId, fields: Object.keys(dataset), missing: health.missing, wrongType: health.wrongType },
      });

      if (activate) {
        await db.update(canvaTemplates).set({ isActive: health.valid, updatedAt: new Date() }).where(eq(canvaTemplates.id, template.id));
        await writeAudit({ userId, action: "CANVA_TEMPLATE_HEALTH", entityType: "CANVA_TEMPLATE", entityId: template.id, before: { isActive: template.isActive }, after: { isActive: health.valid }, metadata: { templateCode: template.code, designId, ...health } });
      }

      results.push({
        code: template.code,
        name: template.name,
        designId,
        fields: Object.keys(dataset),
        ...health,
        active: activate ? health.valid : template.isActive,
      });
    }

    const valid = results.length > 0 && results.every((item) => item.valid);
    const missing = [
      ...missingTemplates.map((code) => `${code}:TEMPLATE_NOT_CONFIGURED`),
      ...results.flatMap((item) => item.missing.map((field) => `${item.code}:${field}`)),
    ];
    const wrongType = results.flatMap((item) => item.wrongType.map((field) => `${item.code}:${field}`));
    return { status: valid ? 200 : 409, body: { valid, missing, wrongType, missingTemplates, templates: results } };
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
