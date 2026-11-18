"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, Pencil, Power, X } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ACTIVE_STATUS } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

type BaseItem = { id: string; code: string; name: string; isActive: boolean };
type Placement = BaseItem & { salaryZoneCode: string | null; salaryZoneName: string | null };
type Mapping = { id: string; mappingType: string; sourceValue: string; targetCode: string; notes: string | null; isActive: boolean };
type Rate = { id: string; categoryCode: string; categoryName: string; experienceCode: string; experienceName: string; salaryZoneCode: string; salaryZoneName: string; salaryMin: string; salaryMax: string; effectiveFrom: string; effectiveTo: string | null; version: string; isActive: boolean };
export type MasterSnapshot = { categories: BaseItem[]; skills: BaseItem[]; experiences: BaseItem[]; zones: BaseItem[]; placements: Placement[]; mappings: Mapping[]; rates: Rate[] };

type SimpleResource = "category" | "skill" | "experience" | "zone";
export type MasterSection = "pekerja" | "gaji" | "mapping";
type Mutate = (method: "POST" | "PATCH", body: unknown) => Promise<boolean>;

const rupiah = (value: string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
const codeify = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+/, "");

function ToggleButton({ item, label, busy, onToggle }: { item: { isActive: boolean }; label: string; busy: boolean; onToggle: () => void }) {
  return <button type="button" disabled={busy} onClick={() => {
    if (item.isActive && !window.confirm(`Nonaktifkan “${label}”? Pilihan ini tidak akan muncul lagi untuk staf. Data lama tetap tersimpan dan bisa diaktifkan kembali.`)) return;
    onToggle();
  }} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold", item.isActive ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}>
    <Power size={14} aria-hidden />{item.isActive ? "Nonaktifkan" : "Aktifkan"}
  </button>;
}

function ItemRow({ title, code, meta, isActive, actions }: { title: string; code?: string; meta?: React.ReactNode; isActive: boolean; actions: React.ReactNode }) {
  return <li className={cn("flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between", !isActive && "bg-slate-50")}>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><p className={cn("text-sm font-semibold", !isActive && "text-slate-500")}>{title}</p>{code && <Badge>{code}</Badge>}<StatusBadge status={ACTIVE_STATUS[String(isActive) as "true" | "false"]} /></div>
      {meta && <p className="mt-1 text-xs text-slate-500">{meta}</p>}
    </div>
    <div className="flex shrink-0 gap-2">{actions}</div>
  </li>;
}

function SimpleSection({ resource, title, description, codeExample, items, busy, mutate, extra }: {
  resource: SimpleResource | "placement";
  title: string;
  description: string;
  codeExample: string;
  items: Array<BaseItem | Placement>;
  busy: boolean;
  mutate: Mutate;
  extra?: { zones: BaseItem[] };
}) {
  const empty = { code: "", name: "", salaryZoneCode: "" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const needsZone = resource === "placement";
  const valid = form.code.trim() && form.name.trim() && (!needsZone || form.salaryZoneCode);

  async function submit() {
    const ok = await mutate("POST", needsZone ? { resource, ...form } : { resource, code: form.code, name: form.name });
    if (ok) { setForm(empty); setEditing(false); }
  }

  return <Card><CardHeader><CardTitle>{title}</CardTitle><p className="mt-1 text-xs text-slate-500">{description}</p></CardHeader><CardContent className="space-y-4">
    <div className={cn("grid gap-3 rounded-xl bg-slate-50 p-3", needsZone ? "sm:grid-cols-[1fr_1.4fr_1fr_auto]" : "sm:grid-cols-[1fr_1.6fr_auto]", "sm:items-end")}>
      <Field label="Kode" hint={editing ? "tidak bisa diubah" : undefined}><Input value={form.code} readOnly={editing} onChange={(event) => setForm({ ...form, code: codeify(event.target.value) })} placeholder={codeExample} autoCapitalize="characters" /></Field>
      <Field label="Nama tampil"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nama yang dilihat staf" /></Field>
      {needsZone && <Field label="Zona gaji"><Select value={form.salaryZoneCode} onChange={(event) => setForm({ ...form, salaryZoneCode: event.target.value })}><option value="">Pilih zona</option>{extra?.zones.filter((zone) => zone.isActive).map((zone) => <option key={zone.code} value={zone.code}>{zone.name}</option>)}</Select></Field>}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy || !valid} onClick={submit}>{editing ? "Simpan" : "Tambah"}</Button>
        {editing && <Button variant="secondary" aria-label="Batal edit" onClick={() => { setForm(empty); setEditing(false); }}><X size={16} /></Button>}
      </div>
    </div>
    {items.length === 0 ? <p className="text-sm text-slate-500">Belum ada data.</p> : <ul className="space-y-2">{items.map((item) => <ItemRow key={item.id} title={item.name} code={item.code} isActive={item.isActive}
      meta={"salaryZoneName" in item ? `Zona: ${item.salaryZoneName ?? "belum diatur"}` : undefined}
      actions={<>
        {item.isActive && <Button variant="secondary" className="min-h-10 gap-1.5 px-3 text-xs" disabled={busy} onClick={() => { setForm({ code: item.code, name: item.name, salaryZoneCode: "salaryZoneCode" in item ? item.salaryZoneCode ?? "" : "" }); setEditing(true); }}><Pencil size={14} aria-hidden />Edit</Button>}
        <ToggleButton item={item} label={item.name} busy={busy} onToggle={() => mutate("PATCH", { resource, id: item.id, isActive: !item.isActive })} />
      </>} />)}</ul>}
  </CardContent></Card>;
}

function RateSection({ data, busy, mutate }: { data: MasterSnapshot; busy: boolean; mutate: Mutate }) {
  const [rate, setRate] = useState({ categoryCode: "", experienceCode: "", salaryZoneCode: "", salaryMin: "", salaryMax: "", effectiveFrom: new Date().toISOString().slice(0, 10), version: "" });
  const rangeInvalid = Boolean(rate.salaryMin && rate.salaryMax && Number(rate.salaryMin) > Number(rate.salaryMax));
  const valid = rate.categoryCode && rate.experienceCode && rate.salaryZoneCode && rate.salaryMin && rate.salaryMax && rate.version && !rangeInvalid;
  const active = (items: BaseItem[]) => items.filter((item) => item.isActive);

  return <Card><CardHeader><CardTitle>Rate Gaji</CardTitle><p className="mt-1 text-xs text-slate-500">Rate dipilih otomatis dari kombinasi kategori + pengalaman + zona penempatan.</p></CardHeader><CardContent className="space-y-4">
    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Kategori"><Select value={rate.categoryCode} onChange={(event) => setRate({ ...rate, categoryCode: event.target.value })}><option value="">Pilih kategori</option>{active(data.categories).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field>
      <Field label="Pengalaman"><Select value={rate.experienceCode} onChange={(event) => setRate({ ...rate, experienceCode: event.target.value })}><option value="">Pilih pengalaman</option>{active(data.experiences).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field>
      <Field label="Zona gaji"><Select value={rate.salaryZoneCode} onChange={(event) => setRate({ ...rate, salaryZoneCode: event.target.value })}><option value="">Pilih zona</option>{active(data.zones).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field>
      <Field label="Gaji minimum (Rp)" hint={rate.salaryMin ? rupiah(rate.salaryMin) : undefined}><Input inputMode="numeric" value={rate.salaryMin} onChange={(event) => setRate({ ...rate, salaryMin: event.target.value.replace(/\D/g, "") })} placeholder="3500000" /></Field>
      <Field label="Gaji maksimum (Rp)" hint={rate.salaryMax ? rupiah(rate.salaryMax) : undefined} error={rangeInvalid ? "Harus ≥ gaji minimum." : null}><Input inputMode="numeric" value={rate.salaryMax} aria-invalid={rangeInvalid} onChange={(event) => setRate({ ...rate, salaryMax: event.target.value.replace(/\D/g, "") })} placeholder="4500000" /></Field>
      <Field label="Berlaku mulai"><Input type="date" value={rate.effectiveFrom} onChange={(event) => setRate({ ...rate, effectiveFrom: event.target.value })} /></Field>
      <Field label="Versi rate"><Input value={rate.version} onChange={(event) => setRate({ ...rate, version: event.target.value })} placeholder="2026-10" /></Field>
      <div className="flex items-end lg:col-span-2"><Button className="w-full" disabled={busy || !valid} onClick={async () => { if (await mutate("POST", { resource: "rate", ...rate, salaryMin: Number(rate.salaryMin), salaryMax: Number(rate.salaryMax) })) setRate({ ...rate, salaryMin: "", salaryMax: "" }); }}>Simpan Rate</Button></div>
    </div>
    {data.rates.length === 0 ? <p className="text-sm text-slate-500">Belum ada rate.</p> : <ul className="space-y-2">{data.rates.map((item) => <ItemRow key={item.id} title={`${item.categoryName} • ${item.experienceName} • ${item.salaryZoneName}`} isActive={item.isActive}
      meta={`${rupiah(item.salaryMin)} – ${rupiah(item.salaryMax)} • versi ${item.version} • berlaku ${item.effectiveFrom}`}
      actions={<ToggleButton item={item} label={`${item.categoryName} • ${item.experienceName} • ${item.salaryZoneName}`} busy={busy} onToggle={() => mutate("PATCH", { resource: "rate", id: item.id, isActive: !item.isActive })} />} />)}</ul>}
  </CardContent></Card>;
}

function MappingSection({ data, busy, mutate }: { data: MasterSnapshot; busy: boolean; mutate: Mutate }) {
  const [mapping, setMapping] = useState({ mappingType: "CATEGORY", sourceValue: "", targetCode: "" });
  const targets = (mapping.mappingType === "CATEGORY" ? data.categories : data.experiences).filter((item) => item.isActive);
  const nameFor = (type: string, code: string) => (type === "CATEGORY" ? data.categories : data.experiences).find((item) => item.code === code)?.name ?? code;

  return <Card><CardHeader><CardTitle>Mapping Register Lama</CardTitle><p className="mt-1 text-xs text-slate-500">Menerjemahkan kode lama di Register (mis. SUSBL) ke kategori/pengalaman di aplikasi. Register sendiri tidak diubah.</p></CardHeader><CardContent className="space-y-4">
    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[150px_1fr_1fr_auto] sm:items-end">
      <Field label="Jenis"><Select value={mapping.mappingType} onChange={(event) => setMapping({ ...mapping, mappingType: event.target.value, targetCode: "" })}><option value="CATEGORY">Kategori</option><option value="EXPERIENCE">Pengalaman</option></Select></Field>
      <Field label="Kode di Register"><Input value={mapping.sourceValue} onChange={(event) => setMapping({ ...mapping, sourceValue: event.target.value.toUpperCase() })} placeholder="SUSBL" autoCapitalize="characters" /></Field>
      <Field label="Dipetakan ke"><Select value={mapping.targetCode} onChange={(event) => setMapping({ ...mapping, targetCode: event.target.value })}><option value="">Pilih {mapping.mappingType === "CATEGORY" ? "kategori" : "pengalaman"}</option>{targets.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field>
      <Button disabled={busy || !mapping.sourceValue.trim() || !mapping.targetCode} onClick={async () => { if (await mutate("POST", { resource: "mapping", ...mapping })) setMapping({ ...mapping, sourceValue: "", targetCode: "" }); }}>Simpan</Button>
    </div>
    {data.mappings.length === 0 ? <p className="text-sm text-slate-500">Belum ada mapping.</p> : <ul className="space-y-2">{data.mappings.map((item) => <ItemRow key={item.id} title={`${item.sourceValue} → ${nameFor(item.mappingType, item.targetCode)}`} isActive={item.isActive}
      meta={item.mappingType === "CATEGORY" ? "Kategori" : "Pengalaman"}
      actions={<ToggleButton item={item} label={`${item.sourceValue} → ${item.targetCode}`} busy={busy} onToggle={() => mutate("PATCH", { resource: "mapping", id: item.id, isActive: !item.isActive })} />} />)}</ul>}
  </CardContent></Card>;
}

export function MasterDataManager({ enabled, section }: { enabled: boolean; section: MasterSection }) {
  const [data, setData] = useState<MasterSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/master", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "MASTER_READ_FAILED");
        return body as MasterSnapshot;
      })
      .then((snapshot) => { if (!controller.signal.aborted) setData(snapshot); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "MASTER_READ_FAILED"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled]);

  const mutate: Mutate = async (method, body) => {
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
  };

  if (!enabled) return <Alert tone="warning" title="Master Data belum aktif.">Neon harus terhubung dan migration + seed sudah dijalankan.</Alert>;
  if (loading) return <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Memuat Master Data"><Loader2 className="animate-spin text-slate-400" aria-hidden /></div>;
  if (!data) return <ErrorAlert code={error} />;

  const toggleProps = { busy, mutate };
  return <div className="space-y-4">
    {error && <div className="sticky top-2 z-10"><ErrorAlert code={error} /></div>}
    {section === "pekerja" && <>
      <SimpleSection resource="category" title="Kategori Pekerja" description="Muncul di pilihan Kategori pada data pekerja." codeExample="ART_MOMONG" items={data.categories} {...toggleProps} />
      <SimpleSection resource="skill" title="Keahlian" description="Muncul sebagai pilihan keahlian (bisa lebih dari satu)." codeExample="MASAK" items={data.skills} {...toggleProps} />
      <SimpleSection resource="experience" title="Level Pengalaman" description="Dipakai untuk menentukan rate gaji." codeExample="PENGALAMAN" items={data.experiences} {...toggleProps} />
    </>}
    {section === "gaji" && <>
      <SimpleSection resource="zone" title="Zona Gaji" description="Kelompok wilayah dengan rate gaji yang sama." codeExample="SURABAYA" items={data.zones} {...toggleProps} />
      <SimpleSection resource="placement" title="Penempatan" description="Lokasi penempatan; tiap penempatan masuk satu zona gaji." codeExample="SIDOARJO" items={data.placements} extra={{ zones: data.zones }} {...toggleProps} />
      <RateSection data={data} {...toggleProps} />
    </>}
    {section === "mapping" && <MappingSection data={data} {...toggleProps} />}
    <p className="flex items-center gap-2 text-xs text-slate-500"><Database size={14} aria-hidden />Semua perubahan tersimpan di Neon dan tercatat di Audit. Register sumber tidak pernah diubah.</p>
  </div>;
}
