import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { configured: boolean; healthy?: boolean; message?: string }> = {
    neon: { configured: Boolean(process.env.DATABASE_URL) },
    google: { configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
    canva: { configured: Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET) },
    register: { configured: Boolean(process.env.GOOGLE_REGISTER_SPREADSHEET_ID) },
    bridge: { configured: Boolean(process.env.GOOGLE_BRIDGE_SPREADSHEET_ID) },
    drive: { configured: Boolean(process.env.GOOGLE_PHOTO_FOLDER_ID) },
  };

  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await sql`select 1 as ok`;
      checks.neon.healthy = true;
    } catch (error) {
      checks.neon.healthy = false;
      checks.neon.message = error instanceof Error ? error.message : "Database health check failed";
    }
  }

  const healthy = Object.values(checks).every((item) => item.configured && item.healthy !== false);
  return NextResponse.json(
    {
      service: "mami-berlian-content-ops",
      revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      healthy,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
