"use client";

import { useState } from "react";
import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppUser = { id: string; email: string; name: string | null; role: "ADMIN" | "STAFF" | "VIEWER"; canGenerate: boolean; isActive: boolean; lastLoginAt: string | Date | null; updatedAt: string | Date };

export function UserManagement({ initialUsers, currentUserId }: { initialUsers: AppUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppUser["role"]>("STAFF");
  const [canGenerate, setCanGenerate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(method: "POST" | "PATCH", body: unknown) {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/admin/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "USER_UPDATE_FAILED");
      setUsers(result.users);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "USER_UPDATE_FAILED");
      return false;
    } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus size={18}/>Tambah/aktifkan user</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_140px_150px_auto]">
      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email Google" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nama" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <select value={role} onChange={(e)=>setRole(e.target.value as AppUser["role"])} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option>ADMIN</option><option>STAFF</option><option>VIEWER</option></select>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold"><input type="checkbox" checked={canGenerate} onChange={(e)=>setCanGenerate(e.target.checked)}/>Can Generate</label>
      <Button disabled={busy||!email.trim()} onClick={async()=>{if(await mutate("POST",{email,name,role,canGenerate})){setEmail("");setName("");setRole("STAFF");setCanGenerate(false);}}}>Simpan</Button>
    </CardContent></Card>

    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCog size={18}/>Whitelist & Role</CardTitle></CardHeader><CardContent className="space-y-3">{users.map((user)=><div key={user.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-brand-navy">{user.name || user.email}</p>{user.id===currentUserId&&<Badge>ANDA</Badge>}<Badge>{user.isActive?"ACTIVE":"DISABLED"}</Badge></div><p className="mt-1 text-xs text-slate-500">{user.email}{user.lastLoginAt?` • login ${new Date(user.lastLoginAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})}`:" • belum login"}</p></div><div className="grid grid-cols-2 gap-2 sm:flex"><select value={user.role} disabled={busy||user.id===currentUserId} onChange={(e)=>mutate("PATCH",{id:user.id,role:e.target.value})} className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"><option>ADMIN</option><option>STAFF</option><option>VIEWER</option></select><button disabled={busy} onClick={()=>mutate("PATCH",{id:user.id,canGenerate:!user.canGenerate})} className={`min-h-10 rounded-xl px-3 text-xs font-bold ${user.canGenerate?"bg-pink-50 text-pink-700":"bg-slate-100 text-slate-600"}`}>{user.canGenerate?"Generate: ON":"Generate: OFF"}</button><button disabled={busy||user.id===currentUserId} onClick={()=>mutate("PATCH",{id:user.id,isActive:!user.isActive})} className={`min-h-10 rounded-xl px-3 text-xs font-bold ${user.isActive?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{user.isActive?"Aktif":"Nonaktif"}</button></div></div></div>)}</CardContent></Card>
    <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14}/>Login Google hanya diterima untuk email aktif dalam whitelist ini.</p>
  </div>;
}
