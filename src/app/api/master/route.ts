import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/service";
import {
  createPlacement,
  createRegisterMapping,
  createSalaryRate,
  createSimpleMaster,
  getMasterAdminSnapshot,
  MasterAdminError,
  setMasterActive,
  updateCopyPresets,
  updateDisplayLabel,
  upsertCanvaTemplate,
  upsertCtaProfile,
  upsertPublishChannel,
} from "@/modules/master-data/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const simpleSchema = z.object({ resource: z.enum(["category", "skill", "experience", "zone"]), code: z.string().min(1).max(60), name: z.string().min(1).max(160) });
const placementSchema = z.object({ resource: z.literal("placement"), code: z.string().min(1).max(60), name: z.string().min(1).max(160), salaryZoneCode: z.string().min(1).max(60) });
const mappingSchema = z.object({ resource: z.literal("mapping"), mappingType: z.string().min(1).max(40), sourceValue: z.string().min(1).max(200), targetCode: z.string().min(1).max(80), notes: z.string().max(500).optional() });
const rateSchema = z.object({
  resource: z.literal("rate"),
  categoryCode: z.string().min(1).max(60),
  experienceCode: z.string().min(1).max(60),
  salaryZoneCode: z.string().min(1).max(60),
  salaryMin: z.number().nonnegative(),
  salaryMax: z.number().nonnegative(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  version: z.string().min(1).max(30),
});
const channelSchema = z.object({ resource: z.literal("channel"), code: z.string().min(1).max(40), name: z.string().min(1).max(100) });
const templateSchema = z.object({
  resource: z.literal("template"),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  canvaTemplateId: z.string().min(1).max(100),
  version: z.string().min(1).max(30),
  contentType: z.string().min(1).max(60),
  requiredFieldsJson: z.array(z.string().min(1).max(80)).min(1).max(40).optional(),
});
const ctaSchema = z.object({
  resource: z.literal("cta"),
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  primaryPhone: z.string().max(30).optional(),
  secondaryPhone: z.string().max(30).optional(),
  email: z.string().email().max(320).or(z.literal("")).optional(),
  website: z.string().url().max(320).or(z.literal("")).optional(),
  ctaText: z.string().max(500).optional(),
  qrTarget: z.string().url().max(500).or(z.literal("")).optional(),
  isDefault: z.boolean().optional(),
});
const displaySchema = z.object({
  resource: z.literal("display"),
  key: z.enum(["display.ready_label", "display.placement_label", "display.salary_label", "display.footer_text"]),
  value: z.string().min(1).max(240),
});
const copyPresetsSchema = z.object({ resource: z.literal("copyPresets"), value: z.unknown() });
const createSchema = z.union([simpleSchema, placementSchema, mappingSchema, rateSchema, channelSchema, templateSchema, ctaSchema, displaySchema, copyPresetsSchema]);
const toggleSchema = z.object({ resource: z.enum(["category", "skill", "experience", "zone", "placement", "mapping", "rate", "channel", "cta"]), id: z.string().uuid(), isActive: z.boolean() });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) } as const;
  if (!isAdmin(session.user.role)) return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) } as const;
  return { session } as const;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json(await getMasterAdminSnapshot());
  } catch (error) {
    return NextResponse.json({ error: error instanceof MasterAdminError ? error.code : "MASTER_READ_FAILED" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const payload = parsed.data;
    if (payload.resource === "placement") await createPlacement(payload);
    else if (payload.resource === "mapping") await createRegisterMapping(payload);
    else if (payload.resource === "rate") await createSalaryRate({ ...payload, createdBy: auth.session.user.id });
    else if (payload.resource === "channel") await upsertPublishChannel(payload);
    else if (payload.resource === "template") await upsertCanvaTemplate(payload);
    else if (payload.resource === "cta") await upsertCtaProfile(payload);
    else if (payload.resource === "display") await updateDisplayLabel({ ...payload, updatedBy: auth.session.user.id });
    else if (payload.resource === "copyPresets") await updateCopyPresets({ value: payload.value, updatedBy: auth.session.user.id });
    else await createSimpleMaster(payload.resource, payload);

    await writeAudit({
      userId: auth.session.user.id,
      action: "MASTER_UPSERT",
      entityType: `MASTER_${payload.resource.toUpperCase()}`,
      entityId: "id" in payload && payload.id ? payload.id : "code" in payload ? payload.code : "key" in payload ? payload.key : payload.resource === "copyPresets" ? "content.copy_presets" : undefined,
      after: payload,
    });
    return NextResponse.json({ ok: true, snapshot: await getMasterAdminSnapshot() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MasterAdminError ? error.code : "MASTER_WRITE_FAILED" }, { status: 422 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 400 });

  try {
    await setMasterActive(parsed.data);
    await writeAudit({
      userId: auth.session.user.id,
      action: "MASTER_SET_ACTIVE",
      entityType: `MASTER_${parsed.data.resource.toUpperCase()}`,
      entityId: parsed.data.id,
      after: { isActive: parsed.data.isActive },
    });
    return NextResponse.json({ ok: true, snapshot: await getMasterAdminSnapshot() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MasterAdminError ? error.code : "MASTER_WRITE_FAILED" }, { status: 422 });
  }
}
