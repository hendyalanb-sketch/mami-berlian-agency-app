import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { WorkerSourceService } from "@/modules/workers/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ items: [] });
  const spreadsheetId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  if (!spreadsheetId) return NextResponse.json({ error: "REGISTER_NOT_CONFIGURED" }, { status: 503 });
  try {
    const accessToken = await getGoogleAccessToken(session.user.id);
    const source = new WorkerSourceService({ spreadsheetId, accessToken, sheetName: "Register Pekerja" });
    const items = await source.search(query, 20);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "REGISTER_READ_FAILED" }, { status: 502 });
  }
}
