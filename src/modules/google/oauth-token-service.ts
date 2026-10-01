import { and, eq } from "drizzle-orm";
import type { Account } from "next-auth";
import { db } from "@/db/client";
import { oauthConnections } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export class GoogleConnectionError extends Error {
  constructor(public readonly code: "GOOGLE_NOT_CONNECTED" | "GOOGLE_RECONNECT_REQUIRED" | "GOOGLE_REFRESH_FAILED") {
    super(code);
  }
}

export async function storeGoogleOAuthConnection(userId: string, account: Account) {
  if (!db || account.provider !== "google" || !account.access_token) return false;
  const existing = await db.select().from(oauthConnections).where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, "google"))).limit(1);
  const current = existing[0];
  const values = {
    encryptedAccessToken: encryptSecret(account.access_token),
    encryptedRefreshToken: account.refresh_token ? encryptSecret(account.refresh_token) : current?.encryptedRefreshToken ?? null,
    expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
    scope: account.scope ?? null,
    updatedAt: new Date(),
  };
  if (current) {
    await db.update(oauthConnections).set(values).where(eq(oauthConnections.id, current.id));
  } else {
    await db.insert(oauthConnections).values({ userId, provider: "google", ...values });
  }
  return true;
}

export async function getGoogleAccessToken(userId: string) {
  if (!db) throw new GoogleConnectionError("GOOGLE_NOT_CONNECTED");
  const rows = await db.select().from(oauthConnections).where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, "google"))).limit(1);
  const connection = rows[0];
  if (!connection?.encryptedAccessToken) throw new GoogleConnectionError("GOOGLE_NOT_CONNECTED");

  const stillValid = connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 120_000;
  if (stillValid) return decryptSecret(connection.encryptedAccessToken);
  if (!connection.encryptedRefreshToken) throw new GoogleConnectionError("GOOGLE_RECONNECT_REQUIRED");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new GoogleConnectionError("GOOGLE_RECONNECT_REQUIRED");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptSecret(connection.encryptedRefreshToken),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new GoogleConnectionError("GOOGLE_REFRESH_FAILED");
  const refreshed = await response.json() as { access_token?: string; expires_in?: number; scope?: string };
  if (!refreshed.access_token) throw new GoogleConnectionError("GOOGLE_REFRESH_FAILED");
  const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000);
  await db.update(oauthConnections).set({
    encryptedAccessToken: encryptSecret(refreshed.access_token),
    expiresAt,
    scope: refreshed.scope ?? connection.scope,
    updatedAt: new Date(),
  }).where(eq(oauthConnections.id, connection.id));
  return refreshed.access_token;
}
