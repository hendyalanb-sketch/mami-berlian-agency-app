import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { oauthConnections } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export class CanvaConnectionError extends Error {
  constructor(public readonly code: "CANVA_NOT_CONNECTED" | "CANVA_RECONNECT_REQUIRED" | "CANVA_REFRESH_FAILED" | "CANVA_TOKEN_EXCHANGE_FAILED") {
    super(code);
  }
}

type CanvaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

function clientCredentials() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new CanvaConnectionError("CANVA_RECONNECT_REQUIRED");
  return { clientId, clientSecret, authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` };
}

async function requestToken(body: URLSearchParams) {
  const { authorization } = clientCredentials();
  const response = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new CanvaConnectionError("CANVA_TOKEN_EXCHANGE_FAILED");
  return response.json() as Promise<CanvaTokenResponse>;
}

export async function exchangeCanvaAuthorizationCode(input: { code: string; codeVerifier: string; redirectUri: string }) {
  return requestToken(new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: input.redirectUri,
  }));
}

export async function storeCanvaOAuthConnection(userId: string, token: CanvaTokenResponse) {
  if (!db) throw new CanvaConnectionError("CANVA_NOT_CONNECTED");
  if (!token.access_token || !token.refresh_token) throw new CanvaConnectionError("CANVA_TOKEN_EXCHANGE_FAILED");
  const [current] = await db.select().from(oauthConnections).where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, "canva"))).limit(1);
  const values = {
    encryptedAccessToken: encryptSecret(token.access_token),
    encryptedRefreshToken: encryptSecret(token.refresh_token),
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
    scope: token.scope ?? null,
    updatedAt: new Date(),
  };
  if (current) await db.update(oauthConnections).set(values).where(eq(oauthConnections.id, current.id));
  else await db.insert(oauthConnections).values({ userId, provider: "canva", ...values });
}

export async function getCanvaConnectionStatus(userId?: string | null) {
  if (!db || !userId) return { connected: false, scope: null as string | null, expiresAt: null as Date | null };
  const [connection] = await db.select({
    encryptedAccessToken: oauthConnections.encryptedAccessToken,
    encryptedRefreshToken: oauthConnections.encryptedRefreshToken,
    scope: oauthConnections.scope,
    expiresAt: oauthConnections.expiresAt,
  }).from(oauthConnections).where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, "canva"))).limit(1);
  return {
    connected: Boolean(connection?.encryptedAccessToken && connection?.encryptedRefreshToken),
    scope: connection?.scope ?? null,
    expiresAt: connection?.expiresAt ?? null,
  };
}

export async function getCanvaAccessToken(userId: string) {
  if (!db) throw new CanvaConnectionError("CANVA_NOT_CONNECTED");
  const [connection] = await db.select().from(oauthConnections).where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, "canva"))).limit(1);
  if (!connection?.encryptedAccessToken) throw new CanvaConnectionError("CANVA_NOT_CONNECTED");
  if (connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 120_000) return decryptSecret(connection.encryptedAccessToken);
  if (!connection.encryptedRefreshToken) throw new CanvaConnectionError("CANVA_RECONNECT_REQUIRED");

  const { authorization } = clientCredentials();
  const response = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: decryptSecret(connection.encryptedRefreshToken) }),
    cache: "no-store",
  });
  if (!response.ok) throw new CanvaConnectionError("CANVA_REFRESH_FAILED");
  const refreshed = await response.json() as CanvaTokenResponse;
  if (!refreshed.access_token || !refreshed.refresh_token) throw new CanvaConnectionError("CANVA_REFRESH_FAILED");

  await db.update(oauthConnections).set({
    encryptedAccessToken: encryptSecret(refreshed.access_token),
    encryptedRefreshToken: encryptSecret(refreshed.refresh_token),
    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    scope: refreshed.scope ?? connection.scope,
    updatedAt: new Date(),
  }).where(eq(oauthConnections.id, connection.id));
  return refreshed.access_token;
}
