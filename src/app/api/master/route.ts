import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import {
  createPlacement,
  createRegisterMapping,
  createSalaryRate,
  createSimpleMaster,
  getMasterAdminSnapshot,
  MasterAdminError,
  setMasterActive,
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
const createSchema = z.union([simpleSchema, placementSchema, mappingSchema, rateSchema]);
const toggleSchema = z.object({ resource: z.enum(["category", "skill", "experience", "zone", "placement", "mapping", "rate"]), id: z.string().uuid(), isActive: z.boolean() });

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
    else await createSimpleMaster(payload.resource, payload);
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
    return NextResponse.json({ ok: true, snapshot: await getMasterAdminSnapshot() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MasterAdminError ? error.code : "MASTER_WRITE_FAILED" }, { status: 422 });
  }
}
