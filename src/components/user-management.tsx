"use client";

import { useState } from "react";
import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ACTIVE_STATUS } from "@/lib/status-labels";

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

  const roleOptions = <><option value="ADMIN">Admin</option><option value="STAFF">Staf</option><option value="VIEWER">Viewer (lihat saja)</option></>;

  return <div className="space-y-5">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus size={18} aria-hidden />Tambah / aktifkan user</CardTitle><p className="mt-1 text-xs text-slate-500">Hanya email di daftar ini yang bisa login dengan Google.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_160px_170px_auto] xl:items-end">
      <Field label="Email Google"><Input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nama@gmail.com" /></Field>
      <Field label="Nama"><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nama staf" /></Field>
      <Field label="Role"><Select value={role} onChange={(e)=>setRole(e.target.value as AppUser["role"])}>{roleOptions}</Select></Field>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-brand-navy" checked={canGenerate} onChange={(e)=>setCanGenerate(e.target.checked)}/>Boleh Generate</label>
      <Button disabled={busy||!email.trim()} onClick={async()=>{if(await mutate("POST",{email,name,role,canGenerate})){setEmail("");setName("");setRole("STAFF");setCanGenerate(false);}}}>Simpan</Button>
    </CardContent></Card>

    {error && <ErrorAlert code={error} />}

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCog size={18} aria-hidden />Daftar user & role</CardTitle><p className="mt-1 text-xs text-slate-500">Admin: semua menu. Staf: data pekerja & konten (Generate bila diizinkan). Viewer: lihat saja.</p></CardHeader><CardContent><ul className="space-y-3">{users.map((user)=>{const self=user.id===currentUserId;return <li key={user.id} className={`rounded-2xl border border-slate-100 p-4 ${user.isActive?"":"bg-slate-50"}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-brand-navy">{user.name || user.email}</p>{self&&<Badge className="border-pink-100 bg-pink-50 text-brand-pink-dark">Anda</Badge>}<StatusBadge status={ACTIVE_STATUS[String(user.isActive) as "true" | "false"]} /></div><p className="mt-1 break-all text-xs text-slate-500">{user.email}{user.lastLoginAt?` • login terakhir ${new Date(user.lastLoginAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})}`:" • belum pernah login"}</p></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
        <Select aria-label={`Role ${user.email}`} value={user.role} disabled={busy||self} onChange={(e)=>mutate("PATCH",{id:user.id,role:e.target.value})} className="min-h-10 font-semibold lg:w-40">{roleOptions}</Select>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-navy" checked={user.canGenerate} disabled={busy||user.role==="VIEWER"} onChange={()=>mutate("PATCH",{id:user.id,canGenerate:!user.canGenerate})}/>Boleh Generate</label>
        <button type="button" disabled={busy||self} title={self?"Anda tidak bisa menonaktifkan akun sendiri":undefined} onClick={()=>{if(user.isActive&&!window.confirm(`Nonaktifkan ${user.email}? User ini tidak bisa login lagi sampai diaktifkan kembali.`))return;mutate("PATCH",{id:user.id,isActive:!user.isActive});}} className={`min-h-10 rounded-xl border px-3 text-xs font-bold disabled:opacity-50 ${user.isActive?"border-slate-200 bg-white text-slate-700 hover:bg-slate-50":"border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{user.isActive?"Nonaktifkan":"Aktifkan"}</button>
      </div></div></li>;})}</ul></CardContent></Card>
    <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} aria-hidden />Login Google hanya diterima untuk email aktif di daftar ini. Semua perubahan tercatat di Audit.</p>
  </div>;
}
