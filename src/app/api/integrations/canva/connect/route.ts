import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = process.env.CANVA_REDIRECT_URI;
  if (!clientId || !process.env.CANVA_CLIENT_SECRET || !redirectUri || !process.env.ENCRYPTION_KEY) {
    return NextResponse.json({ error: "CANVA_OAUTH_NOT_CONFIGURED" }, { status: 503 });
  }

  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(48).toString("base64url");
  const cookieStore = await cookies();
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 600, path: "/" };
  cookieStore.set("mba_canva_oauth_state", state, cookieOptions);
  cookieStore.set("mba_canva_pkce_verifier", verifier, cookieOptions);

  const authorizationUrl = new URL("https://www.canva.com/api/oauth/authorize");
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("scope", "asset:read asset:write design:content:read design:content:write design:meta:read");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  return NextResponse.redirect(authorizationUrl);
}
