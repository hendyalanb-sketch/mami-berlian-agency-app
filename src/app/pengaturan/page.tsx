import { getServerSession } from "next-auth";
import { db } from "@/db/client";
import { appUsers } from "@/db/schema";
import { UserManagement } from "@/components/user-management";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const users = db ? await db.select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, role: appUsers.role, canGenerate: appUsers.canGenerate, isActive: appUsers.isActive, lastLoginAt: appUsers.lastLoginAt, updatedAt: appUsers.updatedAt }).from(appUsers) : [];
  return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Pengaturan</h2><p className="mt-1 text-sm text-slate-500">Whitelist user, role, dan izin Generate.</p></header>{db&&session?.user.id?<UserManagement initialUsers={users} currentUserId={session.user.id}/>:<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Pengaturan user aktif setelah Neon terhubung.</p>}</div>;
}
