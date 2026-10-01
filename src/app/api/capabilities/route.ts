import { NextResponse } from "next/server";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ capabilities: getRuntimeCapabilities(), timestamp: new Date().toISOString() }); }
