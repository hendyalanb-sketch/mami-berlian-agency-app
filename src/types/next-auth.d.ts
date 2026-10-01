import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      canGenerate: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUserId?: string;
    role?: AppRole;
    canGenerate?: boolean;
  }
}
