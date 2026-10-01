"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Option = { code: string; name: string };
type FormState = {
  category: string;
  experience: string;
  skills: string[];
  placement: string;
  publicationConsent: boolean;
  publicTitle: string;
  workerQuote: string;
  specialty: string;
  liveInStatus: string;
  availability: string;
  trainingStatus: string;
  documentStatus: string;
};
type Payload = {
  worker: { name: string; workerRegister: string; origin: string; age: string; status: string; categoryMappingRequired: boolean; legacyCategoryCode: string | null };
  master: { categories: Option[]; skills: Option[]; experiences: Option[]; placements: Option[] };
  form: FormState;
  salaryDisplay: string;
  contentStatus: string;
  readiness: { status: string; score: number; missing: string[]; checks: Record<string, boolean> };
};

const EMPTY_FORM: FormState = {
  category: "",
  experience: "",
  skills: [],
  placement: "",
  publicationConsent: false,
  publicTitle: "",
  workerQuote: "",
  specialty: "",
  liveInStatus: "",
  availability: "",
  trainingStatus: "",
  documentStatus: "",
};

function TextField({ label, value, maxLength, placeholder, disabled, multiline = false, onChange }: {
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  disabled: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const className = "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#0B1F3A]/10 disabled:bg-slate-50";
  return <label className="block">
    <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-600"><span>{label}</span><span className="font-medium text-slate-400">{value.length}/{maxLength}</span></span>
    {multiline
      ? <textarea disabled={disabled} value={value} maxLength={maxLength} rows={3} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={className}/>
      : <input disabled={disabled} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={className}/>} 
  </label>;
}

export function WorkerEnrichmentFlow({ workerRegister, enabled, editable }: { workerRegister: string; enabled: boolean; editable: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/enrichment`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "LOAD_FAILED");
        setData(body);
        setForm({ ...EMPTY_FORM, ...body.form });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "LOAD_FAILED");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [workerRegister, enabled]);

  function toggleSkill(code: string) {
    setForm((current) => ({ ...current, skills: current.skills.includes(code) ? current.skills.filter((item) => item !== code) : [...current.skills, code] }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/enrichment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "SAVE_FAILED");
      setData((current) => current ? { ...current, ...body, form: body.form } : current);
      setForm((current) => ({ ...current, ...body.form }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  if (!enabled) return <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Enrichment aktif setelah Neon, Google OAuth, Content Bridge, dan token encryption siap.</p>;
  if (loading) return <div className="flex min-h-40 items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;
  if (error && !data) return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Gagal memuat enrichment: {error}</div>;
  if (!data) return null;

  return <div className="space-y-5">
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0B1F3A]">{data.worker.name}</p><p className="text-xs text-slate-500">{data.worker.origin}{data.worker.age ? ` • ${data.worker.age} tahun` : ""}{data.worker.status ? ` • ${data.worker.status}` : ""}</p></div><Badge>{data.contentStatus}</Badge></div>
      {data.worker.categoryMappingRequired && <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800"><TriangleAlert size={15}/>Legacy code {data.worker.legacyCategoryCode} perlu Mapping Register.</p>}
    </div>

    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
      <div><p className="text-sm font-black text-[#0B1F3A]">Data penempatan & rate</p><p className="mt-1 text-xs text-slate-500">Data inti untuk kategori, pengalaman, keahlian, dan perhitungan rate.</p></div>
      <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Kategori</span><select disabled={!editable} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Pilih kategori</option>{data.master.categories.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Pengalaman</span><select disabled={!editable} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Pilih pengalaman</option>{data.master.experiences.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
      <div><span className="mb-2 block text-xs font-bold text-slate-600">Keahlian</span><div className="flex flex-wrap gap-2">{data.master.skills.map((option) => { const active = form.skills.includes(option.code); return <button type="button" disabled={!editable} key={option.code} onClick={() => toggleSkill(option.code)} className={`min-h-10 rounded-full border px-3 text-xs font-semibold ${active ? "border-[#0B1F3A] bg-[#0B1F3A] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{active && <CheckCircle2 className="mr-1 inline" size={13}/>} {option.name}</button>; })}</div></div>
      <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Penempatan utama untuk rate</span><select disabled={!editable} value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Pilih penempatan</option>{data.master.placements.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
    </div>

    <div className="space-y-4 rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
      <div><p className="text-sm font-black text-[#0B1F3A]">Profil publik & Canva</p><p className="mt-1 text-xs leading-5 text-slate-500">Opsional. Isian ini dipakai untuk MB-01A Personal dan MB-01B Promo. Kosongkan jika belum terverifikasi.</p></div>
      <TextField label="Headline promosi" value={form.publicTitle} maxLength={72} placeholder="Contoh: Suster bayi siap interview" disabled={!editable} onChange={(value) => setForm({ ...form, publicTitle: value })}/>
      <TextField label="Kata-kata pekerja" value={form.workerQuote} maxLength={120} placeholder="Contoh: Saya sabar, telaten, dan senang merawat anak." disabled={!editable} multiline onChange={(value) => setForm({ ...form, workerQuote: value })}/>
      <TextField label="Spesialisasi singkat" value={form.specialty} maxLength={40} placeholder="Contoh: ART Momong / Suster Bayi" disabled={!editable} onChange={(value) => setForm({ ...form, specialty: value })}/>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Status menginap" value={form.liveInStatus} maxLength={32} placeholder="Contoh: Siap menginap" disabled={!editable} onChange={(value) => setForm({ ...form, liveInStatus: value })}/>
        <TextField label="Ketersediaan mulai" value={form.availability} maxLength={54} placeholder="Contoh: Siap mulai minggu ini" disabled={!editable} onChange={(value) => setForm({ ...form, availability: value })}/>
        <TextField label="Status training" value={form.trainingStatus} maxLength={42} placeholder="Contoh: Terlatih di LPK" disabled={!editable} onChange={(value) => setForm({ ...form, trainingStatus: value })}/>
        <TextField label="Status dokumen" value={form.documentStatus} maxLength={42} placeholder="Contoh: Dokumen lengkap" disabled={!editable} onChange={(value) => setForm({ ...form, documentStatus: value })}/>
      </div>
    </div>

    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm"><input type="checkbox" disabled={!editable} checked={form.publicationConsent} onChange={(event) => setForm({ ...form, publicationConsent: event.target.checked })}/><span>Izin publikasi telah dikonfirmasi</span></label>
    <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Kesiapan konten</span><Badge>{data.readiness.score}% • {data.readiness.status}</Badge></div><p className="mt-1 text-xs text-slate-500">Rate: {data.salaryDisplay || "dihitung saat disimpan"} • Kurang: {data.readiness.missing.length ? data.readiness.missing.join(", ") : "tidak ada"}</p></div>
    {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    {editable && <Button onClick={save} disabled={saving || !form.category || !form.experience || !form.skills.length || !form.placement} className="w-full gap-2"><Save size={17}/>{saving ? "Menyimpan…" : "Simpan & Hitung Rate"}</Button>}
  </div>;
}
