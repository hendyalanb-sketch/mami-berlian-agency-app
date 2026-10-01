"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Loader2, Plus, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BaseItem = { id: string; code: string; name: string; isActive: boolean };
type Placement = BaseItem & { salaryZoneCode: string | null; salaryZoneName: string | null };
type Mapping = { id: string; mappingType: string; sourceValue: string; targetCode: string; notes: string | null; isActive: boolean };
type Rate = { id: string; categoryCode: string; categoryName: string; experienceCode: string; experienceName: string; salaryZoneCode: string; salaryZoneName: string; salaryMin: string; salaryMax: string; effectiveFrom: string; effectiveTo: string | null; version: string; isActive: boolean };
type Snapshot = { categories: BaseItem[]; skills: BaseItem[]; experiences: BaseItem[]; zones: BaseItem[]; placements: Placement[]; mappings: Mapping[]; rates: Rate[] };

type SimpleResource = "category" | "skill" | "experience" | "zone";
const resourceLabel: Record<SimpleResource, string> = { category: "Kategori", skill: "Keahlian", experience: "Pengalaman", zone: "Zona Gaji" };
const rupiah = (value: string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));

export function MasterDataManager({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resource, setResource] = useState<SimpleResource>("category");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState({ code: "", name: "", salaryZoneCode: "" });
  const [mapping, setMapping] = useState({ mappingType: "CATEGORY", sourceValue: "", targetCode: "" });
  const [rate, setRate] = useState({ categoryCode: "", experienceCode: "", salaryZoneCode: "", salaryMin: "", salaryMax: "", effectiveFrom: new Date().toISOString().slice(0, 10), version: "" });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    fetch("/api/master", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "MASTER_READ_FAILED");
        return body as Snapshot;
      })
      .then((snapshot) => {
        if (!controller.signal.aborted) setData(snapshot);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "MASTER_READ_FAILED");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [enabled]);

  const count = useMemo(() => data ? data.categories.length + data.skills.length + data.experiences.length + data.zones.length + data.placements.length : 0, [data]);

  async function mutate(method: "POST" | "PATCH", body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/master", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "MASTER_WRITE_FAILED");
      setData(result.snapshot);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "MASTER_WRITE_FAILED");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Master Data aktif setelah Neon terhubung dan migration + seed selesai.</p>;
  if (loading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!data) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Master Data belum dapat dibaca: {error}</p>;

  const sections: Array<{ resource: "category" | "skill" | "experience" | "zone" | "placement"; title: string; items: (BaseItem | Placement)[] }> = [
    { resource: "category", title: "Kategori Pekerja", items: data.categories },
    { resource: "skill", title: "Keahlian", items: data.skills },
    { resource: "experience", title: "Level Pengalaman", items: data.experiences },
    { resource: "zone", title: "Zona Gaji", items: data.zones },
    { resource: "placement", title: "Penempatan", items: data.placements },
  ];

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Master option</p><p className="mt-1 text-2xl font-black text-brand-navy">{count}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mapping Register</p><p className="mt-1 text-2xl font-black text-brand-navy">{data.mappings.length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rate Gaji</p><p className="mt-1 text-2xl font-black text-brand-navy">{data.rates.length}</p></CardContent></Card>
    </div>

    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus size={18}/>Tambah master option</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto]">
      <select value={resource} onChange={(e)=>setResource(e.target.value as SimpleResource)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">{Object.entries(resourceLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Kode, mis. ART_MOMONG" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nama tampil" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <Button disabled={busy||!code.trim()||!name.trim()} onClick={async()=>{if(await mutate("POST",{resource,code,name})){setCode("");setName("");}}}>Tambah</Button>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Tambah Penempatan</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <input value={placement.code} onChange={(e)=>setPlacement({...placement,code:e.target.value})} placeholder="Kode" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input value={placement.name} onChange={(e)=>setPlacement({...placement,name:e.target.value})} placeholder="Nama penempatan" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <select value={placement.salaryZoneCode} onChange={(e)=>setPlacement({...placement,salaryZoneCode:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Pilih zona</option>{data.zones.filter((z)=>z.isActive).map((z)=><option key={z.code} value={z.code}>{z.name}</option>)}</select>
      <Button disabled={busy||!placement.code||!placement.name||!placement.salaryZoneCode} onClick={async()=>{if(await mutate("POST",{resource:"placement",...placement}))setPlacement({code:"",name:"",salaryZoneCode:""});}}>Tambah</Button>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Mapping Register Legacy</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[150px_1fr_1fr_auto]">
      <select value={mapping.mappingType} onChange={(e)=>setMapping({...mapping,mappingType:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="CATEGORY">CATEGORY</option><option value="EXPERIENCE">EXPERIENCE</option></select>
      <input value={mapping.sourceValue} onChange={(e)=>setMapping({...mapping,sourceValue:e.target.value})} placeholder="Nilai sumber, mis. SUSBL" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input value={mapping.targetCode} onChange={(e)=>setMapping({...mapping,targetCode:e.target.value})} placeholder="Kode target" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <Button disabled={busy||!mapping.sourceValue||!mapping.targetCode} onClick={async()=>{if(await mutate("POST",{resource:"mapping",...mapping}))setMapping({...mapping,sourceValue:"",targetCode:""});}}>Simpan</Button>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Tambah Rate Gaji</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">
      <select value={rate.categoryCode} onChange={(e)=>setRate({...rate,categoryCode:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Kategori</option>{data.categories.filter((x)=>x.isActive).map((x)=><option key={x.code} value={x.code}>{x.name}</option>)}</select>
      <select value={rate.experienceCode} onChange={(e)=>setRate({...rate,experienceCode:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Pengalaman</option>{data.experiences.filter((x)=>x.isActive).map((x)=><option key={x.code} value={x.code}>{x.name}</option>)}</select>
      <select value={rate.salaryZoneCode} onChange={(e)=>setRate({...rate,salaryZoneCode:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Zona</option>{data.zones.filter((x)=>x.isActive).map((x)=><option key={x.code} value={x.code}>{x.name}</option>)}</select>
      <input inputMode="numeric" value={rate.salaryMin} onChange={(e)=>setRate({...rate,salaryMin:e.target.value.replace(/\D/g,"")})} placeholder="Gaji minimum" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input inputMode="numeric" value={rate.salaryMax} onChange={(e)=>setRate({...rate,salaryMax:e.target.value.replace(/\D/g,"")})} placeholder="Gaji maksimum" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input type="date" value={rate.effectiveFrom} onChange={(e)=>setRate({...rate,effectiveFrom:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <input value={rate.version} onChange={(e)=>setRate({...rate,version:e.target.value})} placeholder="Versi, mis. 2026-10" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
      <Button className="md:col-span-2" disabled={busy||!rate.categoryCode||!rate.experienceCode||!rate.salaryZoneCode||!rate.salaryMin||!rate.salaryMax||!rate.version} onClick={async()=>{const ok=await mutate("POST",{resource:"rate",...rate,salaryMin:Number(rate.salaryMin),salaryMax:Number(rate.salaryMax)});if(ok)setRate({...rate,salaryMin:"",salaryMax:""});}}>Simpan Rate</Button>
    </CardContent></Card>

    <div className="grid gap-4 xl:grid-cols-2">{sections.map((section)=><Card key={section.resource}><CardHeader><CardTitle>{section.title}</CardTitle></CardHeader><CardContent className="space-y-2">{section.items.map((item)=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.name}</p><Badge>{item.code}</Badge></div>{"salaryZoneName" in item&&item.salaryZoneName&&<p className="mt-1 text-xs text-slate-500">Zona: {item.salaryZoneName}</p>}</div><button disabled={busy} onClick={()=>mutate("PATCH",{resource:section.resource,id:item.id,isActive:!item.isActive})} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold ${item.isActive?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}><Power size={14}/>{item.isActive?"Aktif":"Nonaktif"}</button></div>)}</CardContent></Card>)}</div>

    <Card><CardHeader><CardTitle>Mapping & Rate Aktif</CardTitle></CardHeader><CardContent className="space-y-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Mapping</p><div className="grid gap-2 md:grid-cols-2">{data.mappings.map((item)=><div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm"><span><strong>{item.sourceValue}</strong> → {item.targetCode}</span><button onClick={()=>mutate("PATCH",{resource:"mapping",id:item.id,isActive:!item.isActive})}><Badge>{item.isActive?"Aktif":"Nonaktif"}</Badge></button></div>)}</div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Rate</p><div className="space-y-2">{data.rates.map((item)=><div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{item.categoryName} • {item.experienceName} • {item.salaryZoneName}</p><p className="mt-1 text-xs text-slate-500">{rupiah(item.salaryMin)} – {rupiah(item.salaryMax)} • {item.version} • berlaku {item.effectiveFrom}</p></div><button onClick={()=>mutate("PATCH",{resource:"rate",id:item.id,isActive:!item.isActive})}><Badge>{item.isActive?"Aktif":"Nonaktif"}</Badge></button></div>)}</div></div></CardContent></Card>

    <p className="flex items-center gap-2 text-xs text-slate-500"><Database size={14}/>Semua perubahan tersimpan di Neon. Register sumber tidak pernah diubah oleh menu ini.</p>
  </div>;
}
