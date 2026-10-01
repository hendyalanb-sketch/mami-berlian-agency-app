"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Template = {
  id: string;
  code: string;
  name: string;
  canvaTemplateId: string;
  version: string;
  contentType: string;
  requiredFieldsJson: string[];
  isActive: boolean;
};

type Channel = { id: string; code: string; name: string; isActive: boolean };
type Cta = {
  id: string;
  name: string;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  website: string | null;
  ctaText: string | null;
  qrTarget: string | null;
  isDefault: boolean;
  isActive: boolean;
};

type DisplayKey = "display.ready_label" | "display.placement_label" | "display.salary_label" | "display.footer_text";
type Snapshot = {
  templates: Template[];
  channels: Channel[];
  ctas: Cta[];
  displayLabels: Record<DisplayKey, string>;
};

const labelNames: Record<DisplayKey, string> = {
  "display.ready_label": "Headline status",
  "display.placement_label": "Label penempatan",
  "display.salary_label": "Label rate/gaji",
  "display.footer_text": "Footer publik",
};

const emptyTemplate = { code: "MB-01", name: "Pekerja Ready", canvaTemplateId: "", version: "v1", contentType: "PEKERJA_READY" };
const emptyChannel = { code: "", name: "" };
const emptyCta = { id: "", name: "", primaryPhone: "", secondaryPhone: "", email: "", website: "", ctaText: "", qrTarget: "", isDefault: false };

export function ContentMasterManager({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState(emptyTemplate);
  const [channel, setChannel] = useState(emptyChannel);
  const [cta, setCta] = useState(emptyCta);
  const [labels, setLabels] = useState<Record<DisplayKey, string> | null>(null);

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
        if (controller.signal.aborted) return;
        setData(snapshot);
        setLabels(snapshot.displayLabels);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "MASTER_READ_FAILED");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled]);

  async function mutate(method: "POST" | "PATCH", body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/master", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "MASTER_WRITE_FAILED");
      const snapshot = result.snapshot as Snapshot;
      setData(snapshot);
      setLabels(snapshot.displayLabels);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "MASTER_WRITE_FAILED");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;
  if (loading) return <div className="flex min-h-32 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!data || !labels) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Master konten belum dapat dibaca: {error}</p>;

  return <div className="space-y-5 border-t border-slate-200 pt-6">
    <header>
      <p className="text-xs font-black uppercase tracking-[.18em] text-brand-pink">Master Konten & Publikasi</p>
      <h3 className="mt-1 text-xl font-black text-brand-navy">Kontrol tampilan dan distribusi konten</h3>
      <p className="mt-1 text-sm text-slate-500">Template Canva tidak dapat diaktifkan manual. Perubahan metadata selalu mengunci template sampai health check Canva berhasil.</p>
    </header>

    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

    <Card>
      <CardHeader><CardTitle>Template Canva</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={template.code} onChange={(e)=>setTemplate({...template,code:e.target.value})} placeholder="Kode" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input value={template.name} onChange={(e)=>setTemplate({...template,name:e.target.value})} placeholder="Nama template" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input value={template.canvaTemplateId} onChange={(e)=>setTemplate({...template,canvaTemplateId:e.target.value})} placeholder="Canva design ID" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input value={template.version} onChange={(e)=>setTemplate({...template,version:e.target.value})} placeholder="Versi" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input value={template.contentType} onChange={(e)=>setTemplate({...template,contentType:e.target.value})} placeholder="Content type" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" />
        </div>
        <Button disabled={busy||!template.code||!template.name||!template.canvaTemplateId||!template.version||!template.contentType} onClick={()=>mutate("POST",{resource:"template",...template})} className="gap-2"><ShieldCheck size={16}/>Simpan & Wajibkan Health Check</Button>
        <div className="grid gap-2 lg:grid-cols-2">{data.templates.map((item)=><div key={item.id} className="rounded-xl border border-slate-100 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{item.name}</p><Badge>{item.code}</Badge><Badge className={item.isActive?"border-emerald-100 bg-emerald-50 text-emerald-700":"border-amber-100 bg-amber-50 text-amber-700"}>{item.isActive?"Health OK":"Terkunci"}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.canvaTemplateId} • {item.version} • {item.contentType}</p><p className="mt-1 text-xs text-slate-400">{item.requiredFieldsJson.length} field autofill wajib</p></div><button onClick={()=>setTemplate({code:item.code,name:item.name,canvaTemplateId:item.canvaTemplateId,version:item.version,contentType:item.contentType})} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold text-slate-700"><Pencil size={14}/>Edit</button></div></div>)}</div>
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Channel Publikasi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={channel.code} onChange={(e)=>setChannel({...channel,code:e.target.value})} placeholder="Kode, mis. TIKTOK" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/><input value={channel.name} onChange={(e)=>setChannel({...channel,name:e.target.value})} placeholder="Nama tampil" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/><Button disabled={busy||!channel.code||!channel.name} onClick={async()=>{if(await mutate("POST",{resource:"channel",...channel}))setChannel(emptyChannel);}}><Plus size={16}/></Button></div>
          <div className="space-y-2">{data.channels.map((item)=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-slate-400">{item.code}</p></div><button disabled={busy} onClick={()=>mutate("PATCH",{resource:"channel",id:item.id,isActive:!item.isActive})} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold ${item.isActive?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}><Power size={14}/>{item.isActive?"Aktif":"Nonaktif"}</button></div>)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Label / Display Text</CardTitle></CardHeader>
        <CardContent className="space-y-3">{(Object.keys(labelNames) as DisplayKey[]).map((key)=><div key={key}><label className="mb-1 block text-xs font-bold text-slate-500">{labelNames[key]}</label><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input value={labels[key]} onChange={(e)=>setLabels({...labels,[key]:e.target.value})} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/><Button variant="secondary" disabled={busy||!labels[key].trim()} onClick={()=>mutate("POST",{resource:"display",key,value:labels[key]})}>Simpan</Button></div></div>)}</CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader><CardTitle>CTA & Kontak</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={cta.name} onChange={(e)=>setCta({...cta,name:e.target.value})} placeholder="Nama profil CTA" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
          <input value={cta.primaryPhone} onChange={(e)=>setCta({...cta,primaryPhone:e.target.value})} placeholder="WhatsApp utama" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
          <input value={cta.secondaryPhone} onChange={(e)=>setCta({...cta,secondaryPhone:e.target.value})} placeholder="Nomor kedua" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
          <input value={cta.email} onChange={(e)=>setCta({...cta,email:e.target.value})} placeholder="Email" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
          <input value={cta.website} onChange={(e)=>setCta({...cta,website:e.target.value})} placeholder="https://..." className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
          <input value={cta.qrTarget} onChange={(e)=>setCta({...cta,qrTarget:e.target.value})} placeholder="QR target URL" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
          <input value={cta.ctaText} onChange={(e)=>setCta({...cta,ctaText:e.target.value})} placeholder="Teks CTA" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm xl:col-span-2"/>
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-semibold"><input type="checkbox" checked={cta.isDefault} onChange={(e)=>setCta({...cta,isDefault:e.target.checked})}/>Jadikan CTA default</label>
        <div className="flex flex-wrap gap-2"><Button disabled={busy||!cta.name} onClick={async()=>{if(await mutate("POST",{resource:"cta",...cta,id:cta.id||undefined}))setCta(emptyCta);}}>{cta.id?"Perbarui CTA":"Tambah CTA"}</Button>{cta.id&&<Button variant="secondary" onClick={()=>setCta(emptyCta)}>Batal Edit</Button>}</div>
        <div className="grid gap-3 lg:grid-cols-2">{data.ctas.map((item)=><div key={item.id} className="rounded-xl border border-slate-100 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{item.name}</p>{item.isDefault&&<Badge>Default</Badge>}</div><p className="mt-1 text-xs text-slate-500">{item.primaryPhone||"—"} • {item.email||"—"}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.ctaText||"Belum ada teks CTA"}</p></div><div className="flex gap-1"><button onClick={()=>setCta({id:item.id,name:item.name,primaryPhone:item.primaryPhone??"",secondaryPhone:item.secondaryPhone??"",email:item.email??"",website:item.website??"",ctaText:item.ctaText??"",qrTarget:item.qrTarget??"",isDefault:item.isDefault})} className="inline-flex min-h-10 items-center rounded-xl bg-slate-50 px-3 text-slate-700"><Pencil size={14}/></button><button disabled={busy} onClick={()=>mutate("PATCH",{resource:"cta",id:item.id,isActive:!item.isActive})} className={`inline-flex min-h-10 items-center rounded-xl px-3 ${item.isActive?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}><Power size={14}/></button></div></div></div>)}</div>
      </CardContent>
    </Card>
  </div>;
}
