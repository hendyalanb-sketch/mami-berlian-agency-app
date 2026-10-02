import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { canvaTemplates } from "@/db/schema";
import { getCanvaConnectionStatus } from "@/modules/canva/oauth-token-service";
import { supportedTemplateFields } from "@/modules/canva/template-health";

export async function getCanvaRuntimeState(userId?: string | null) {
  const configured = Boolean(
    process.env.DATABASE_URL &&
    process.env.ENCRYPTION_KEY &&
    process.env.CANVA_CLIENT_ID &&
    process.env.CANVA_CLIENT_SECRET &&
    process.env.CANVA_REDIRECT_URI,
  );
  const connection = await getCanvaConnectionStatus(userId);
  if (!db) {
    return {
      configured,
      ...connection,
      templateActive: false,
      templateVersion: null,
      designId: "",
      templates: [],
      ready: false,
    };
  }

  const rows = await db.select({
    code: canvaTemplates.code,
    name: canvaTemplates.name,
    isActive: canvaTemplates.isActive,
    canvaTemplateId: canvaTemplates.canvaTemplateId,
    version: canvaTemplates.version,
    contentType: canvaTemplates.contentType,
    requiredFields: canvaTemplates.requiredFieldsJson,
  }).from(canvaTemplates).where(eq(canvaTemplates.isActive, true)).orderBy(asc(canvaTemplates.code));

  const templates = rows
    .filter((row) => row.canvaTemplateId && supportedTemplateFields(row.requiredFields))
    .map((row) => ({ code: row.code, name: row.name, version: row.version, designId: row.canvaTemplateId, contentType: row.contentType, requiredFields: row.requiredFields }));
  const first = templates[0];

  return {
    configured,
    ...connection,
    templateActive: templates.length > 0,
    templateVersion: first?.version ?? null,
    designId: first?.designId ?? "",
    templates,
    ready: configured && connection.connected && templates.length > 0,
  };
}
