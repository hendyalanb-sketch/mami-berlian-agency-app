import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/db/client";
import { appUsers } from "@/db/schema";
import { storeGoogleOAuthConnection } from "@/modules/google/oauth-token-service";

export async function findActiveAppUser(email?: string | null) {
  if (!db || !email) return null;
  const normalized = email.trim().toLowerCase();
  const rows = await db.select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, role: appUsers.role, canGenerate: appUsers.canGenerate, isActive: appUsers.isActive })
    .from(appUsers).where(eq(appUsers.email, normalized)).limit(1);
  const user = rows[0];
  return user?.isActive ? user : null;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      },
    },
  })],
  callbacks: {
    async signIn({ user }) {
      if (!process.env.ENCRYPTION_KEY) return false;
      const appUser = await findActiveAppUser(user.email);
      if (!appUser) return false;
      if (db) await db.update(appUsers).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(appUsers.id, appUser.id));
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const appUser = await findActiveAppUser(user.email);
        if (appUser) {
          token.appUserId = appUser.id;
          token.role = appUser.role;
          token.canGenerate = appUser.canGenerate;
          if (account?.provider === "google") await storeGoogleOAuthConnection(appUser.id, account);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.appUserId === "string" ? token.appUserId : "";
        session.user.role = token.role === "ADMIN" || token.role === "STAFF" || token.role === "VIEWER" ? token.role : "VIEWER";
        session.user.canGenerate = token.canGenerate === true;
      }
      return session;
    },
  },
};
