import { getServerSession } from "next-auth";
import { db } from "@/db/client";
import { appUsers } from "@/db/schema";
import { Alert } from "@/components/ui/alert";
import { UserManagement } from "@/components/user-management";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const users = db ? await db.select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, role: appUsers.role, canGenerate: appUsers.canGenerate, isActive: appUsers.isActive, lastLoginAt: appUsers.lastLoginAt, updatedAt: appUsers.updatedAt }).from(appUsers) : [];
  return <div className="space-y-5"><header><h1 className="text-2xl font-bold text-brand-navy">Pengaturan</h1><p className="mt-1 text-sm text-slate-500">Siapa yang boleh login, role-nya, dan izin Generate.</p></header>{db&&session?.user.id?<UserManagement initialUsers={users} currentUserId={session.user.id}/>:<Alert tone="warning" title="Pengaturan user belum tersedia.">Database Neon belum terhubung.</Alert>}</div>;
}
