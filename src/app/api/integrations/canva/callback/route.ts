import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { exchangeCanvaAuthorizationCode, storeCanvaOAuthConnection } from "@/modules/canva/oauth-token-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.redirect(new URL("/login?error=CanvaSession", request.url));
  const redirectUri = process.env.CANVA_REDIRECT_URI;
  if (!redirectUri) return NextResponse.redirect(new URL("/integrasi?canva=not-configured", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("mba_canva_oauth_state")?.value;
  const verifier = cookieStore.get("mba_canva_pkce_verifier")?.value;
  cookieStore.delete("mba_canva_oauth_state");
  cookieStore.delete("mba_canva_pkce_verifier");

  if (oauthError || !code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.redirect(new URL("/integrasi?canva=oauth-error", request.url));
  }

  try {
    const token = await exchangeCanvaAuthorizationCode({ code, codeVerifier: verifier, redirectUri });
    await storeCanvaOAuthConnection(session.user.id, token);
    return NextResponse.redirect(new URL("/canva-connected", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/integrasi?canva=token-error", request.url));
  }
}
