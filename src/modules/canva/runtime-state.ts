import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { canvaTemplates } from "@/db/schema";
import { getCanvaConnectionStatus } from "@/modules/canva/oauth-token-service";

export async function getCanvaRuntimeState(userId?: string | null) {
  const configured = Boolean(
    process.env.DATABASE_URL &&
    process.env.ENCRYPTION_KEY &&
    process.env.CANVA_CLIENT_ID &&
    process.env.CANVA_CLIENT_SECRET &&
    process.env.CANVA_REDIRECT_URI,
  );
  const connection = await getCanvaConnectionStatus(userId);
  if (!db) return { configured, ...connection, templateActive: false, designId: process.env.CANVA_MB01_WORKING_DESIGN_ID ?? "", ready: false };
  const [template] = await db.select({ isActive: canvaTemplates.isActive, canvaTemplateId: canvaTemplates.canvaTemplateId, version: canvaTemplates.version }).from(canvaTemplates).where(eq(canvaTemplates.code, "MB-01")).limit(1);
  const designId = process.env.CANVA_MB01_WORKING_DESIGN_ID ?? template?.canvaTemplateId ?? "";
  return {
    configured,
    ...connection,
    templateActive: template?.isActive === true,
    templateVersion: template?.version ?? null,
    designId,
    ready: configured && connection.connected && template?.isActive === true && Boolean(designId),
  };
}
