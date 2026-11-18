import { asc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { appUsers } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]),
  canGenerate: z.boolean().default(false),
});
const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200).nullable().optional(),
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]).optional(),
  canGenerate: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) } as const;
  if (!isAdmin(session.user.role)) return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) } as const;
  if (!db) return { error: NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 }) } as const;
  return { session } as const;
}

async function listUsers() {
  return db!.select({
    id: appUsers.id,
    email: appUsers.email,
    name: appUsers.name,
    role: appUsers.role,
    canGenerate: appUsers.canGenerate,
    isActive: appUsers.isActive,
    lastLoginAt: appUsers.lastLoginAt,
    updatedAt: appUsers.updatedAt,
  }).from(appUsers).orderBy(asc(appUsers.email));
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db!.insert(appUsers).values({
    email,
    name: parsed.data.name?.trim() || null,
    role: parsed.data.role,
    canGenerate: parsed.data.canGenerate,
    isActive: true,
  }).onConflictDoUpdate({
    target: appUsers.email,
    set: { name: parsed.data.name?.trim() || null, role: parsed.data.role, canGenerate: parsed.data.canGenerate, isActive: true, updatedAt: new Date() },
  }).returning();
  await writeAudit({ userId: auth.session.user.id, action: "UPSERT_APP_USER", entityType: "APP_USER", entityId: user.id, after: { email: user.email, role: user.role, canGenerate: user.canGenerate, isActive: user.isActive } });
  return NextResponse.json({ ok: true, users: await listUsers() });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 400 });
  const [before] = await db!.select().from(appUsers).where(eq(appUsers.id, parsed.data.id)).limit(1);
  if (!before) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  if (before.id === auth.session.user.id && (parsed.data.isActive === false || parsed.data.role && parsed.data.role !== "ADMIN")) {
    return NextResponse.json({ error: "SELF_ADMIN_PROTECTION" }, { status: 409 });
  }

  const values = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name?.trim() || null } : {}),
    ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
    ...(parsed.data.canGenerate !== undefined ? { canGenerate: parsed.data.canGenerate } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    updatedAt: new Date(),
  };
  const [after] = await db!.update(appUsers).set(values).where(eq(appUsers.id, before.id)).returning();
  await writeAudit({ userId: auth.session.user.id, action: "UPDATE_APP_USER", entityType: "APP_USER", entityId: before.id, before: { role: before.role, canGenerate: before.canGenerate, isActive: before.isActive }, after: { role: after.role, canGenerate: after.canGenerate, isActive: after.isActive } });
  return NextResponse.json({ ok: true, users: await listUsers() });
}
