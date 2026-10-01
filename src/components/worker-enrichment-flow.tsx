"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { readinessFieldLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

type Option = { code: string; name: string };
export type EnrichmentFormState = {
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
export type EnrichmentPayload = {
  worker: { name: string; workerRegister: string; origin: string; age: string; status: string; categoryMappingRequired: boolean; legacyCategoryCode: string | null };
  master: { categories: Option[]; skills: Option[]; experiences: Option[]; placements: Option[] };
  form: EnrichmentFormState;
  salaryDisplay: string;
  contentStatus: string;
  readiness: { status: string; score: number; missing: string[]; checks: Record<string, boolean> };
};
export type EnrichmentSaveResult = Pick<EnrichmentPayload, "salaryDisplay" | "contentStatus" | "readiness" | "form">;

export const EMPTY_FORM: EnrichmentFormState = {
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

type RequiredKey = "category" | "experience" | "skills" | "placement";
const REQUIRED: Array<{ key: RequiredKey; message: string }> = [
  { key: "category", message: "Pilih kategori." },
  { key: "experience", message: "Pilih pengalaman." },
  { key: "skills", message: "Pilih minimal satu keahlian." },
  { key: "placement", message: "Pilih penempatan." },
];

/** id elemen form untuk tiap field readiness, dipakai agar daftar "kurang" bisa diklik. */
export const READINESS_FIELD_TARGET: Record<string, string> = {
  category: "field-category",
  experience: "field-experience",
  skills: "field-skills",
  placement: "field-placement",
  salary: "field-placement",
  publication_consent: "field-consent",
  profile_photo: "foto",
};

export function focusField(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = element.matches("input,select,textarea,button") ? element : element.querySelector<HTMLElement>("input,select,textarea,button");
  focusable?.focus({ preventScroll: true });
}

function missingRequired(form: EnrichmentFormState) {
  return REQUIRED.filter(({ key }) => (key === "skills" ? form.skills.length === 0 : !form[key]));
}

function TextField({ id, label, value, maxLength, placeholder, disabled, multiline = false, onChange }: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  disabled: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return <Field label={label} hint={`${value.length}/${maxLength}`}>
    {multiline
      ? <Textarea id={id} disabled={disabled} value={value} maxLength={maxLength} rows={3} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      : <Input id={id} disabled={disabled} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
  </Field>;
}

export function WorkerEnrichmentForm({ workerRegister, data, editable, onSaved }: {
  workerRegister: string;
  data: EnrichmentPayload;
  editable: boolean;
  onSaved: (result: EnrichmentSaveResult) => void;
}) {
  const [form, setForm] = useState<EnrichmentFormState>({ ...EMPTY_FORM, ...data.form });
  const [savedForm, setSavedForm] = useState<EnrichmentFormState>({ ...EMPTY_FORM, ...data.form });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimer = useRef<number | undefined>(undefined);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);
  const missing = missingRequired(form);
  const fieldError = (key: RequiredKey) => (showErrors ? missing.find((item) => item.key === key)?.message ?? null : null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  function update<K extends keyof EnrichmentFormState>(key: K, value: EnrichmentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedAt(null);
  }

  function toggleSkill(code: string) {
    update("skills", form.skills.includes(code) ? form.skills.filter((item) => item !== code) : [...form.skills, code]);
  }

  async function save() {
    if (missing.length > 0) {
      setShowErrors(true);
      focusField(`field-${missing[0].key}`);
      return;
    }
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
      const next = { ...form, ...body.form };
      setForm(next);
      setSavedForm(next);
      setShowErrors(false);
      setSavedAt(Date.now());
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSavedAt(null), 4000);
      onSaved(body as EnrichmentSaveResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  const readinessMissing = data.readiness.missing;

  return <div className="space-y-5">
    <section aria-labelledby="enrichment-core" className="space-y-4 rounded-2xl border border-slate-200 p-4">
      <div><h3 id="enrichment-core" className="text-sm font-black text-brand-navy">Data penempatan & rate</h3><p className="mt-1 text-xs text-slate-500">Wajib diisi. Dipakai untuk kategori, keahlian, dan perhitungan rate gaji.</p></div>
      <Field label="Kategori" required error={fieldError("category")}>
        <Select id="field-category" disabled={!editable} value={form.category} aria-invalid={Boolean(fieldError("category"))} onChange={(event) => update("category", event.target.value)}><option value="">Pilih kategori</option>{data.master.categories.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</Select>
      </Field>
      <Field label="Pengalaman" required error={fieldError("experience")}>
        <Select id="field-experience" disabled={!editable} value={form.experience} aria-invalid={Boolean(fieldError("experience"))} onChange={(event) => update("experience", event.target.value)}><option value="">Pilih pengalaman</option>{data.master.experiences.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</Select>
      </Field>
      <fieldset id="field-skills">
        <legend className="mb-2 text-xs font-bold text-slate-600">Keahlian<span className="ml-0.5 text-red-600" aria-hidden>*</span> <span className="font-medium text-slate-400">({form.skills.length} dipilih)</span></legend>
        <div className="flex flex-wrap gap-2">{data.master.skills.map((option) => {
          const active = form.skills.includes(option.code);
          return <button type="button" aria-pressed={active} disabled={!editable} key={option.code} onClick={() => toggleSkill(option.code)} className={cn("inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-xs font-semibold", active ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 bg-white text-slate-600")}>{active && <CheckCircle2 size={13} aria-hidden />}{option.name}</button>;
        })}</div>
        {fieldError("skills") && <p className="mt-1 text-xs font-semibold text-red-600">{fieldError("skills")}</p>}
      </fieldset>
      <Field label="Penempatan utama (untuk rate)" required error={fieldError("placement")}>
        <Select id="field-placement" disabled={!editable} value={form.placement} aria-invalid={Boolean(fieldError("placement"))} onChange={(event) => update("placement", event.target.value)}><option value="">Pilih penempatan</option>{data.master.placements.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</Select>
      </Field>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Rate gaji: <strong className="text-brand-navy">{data.salaryDisplay || "dihitung otomatis setelah disimpan"}</strong></p>
    </section>

    <section aria-labelledby="enrichment-public" className="space-y-4 rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
      <div><h3 id="enrichment-public" className="text-sm font-black text-brand-navy">Profil publik & Canva</h3><p className="mt-1 text-xs leading-5 text-slate-500">Opsional. Dipakai di template MB-01A Personal dan MB-01B Promo. Kosongkan jika belum terverifikasi.</p></div>
      <TextField id="field-public-title" label="Headline promosi" value={form.publicTitle} maxLength={72} placeholder="Contoh: Suster bayi siap interview" disabled={!editable} onChange={(value) => update("publicTitle", value)} />
      <TextField id="field-quote" label="Kata-kata pekerja" value={form.workerQuote} maxLength={120} placeholder="Contoh: Saya sabar, telaten, dan senang merawat anak." disabled={!editable} multiline onChange={(value) => update("workerQuote", value)} />
      <TextField id="field-specialty" label="Spesialisasi singkat" value={form.specialty} maxLength={40} placeholder="Contoh: ART Momong / Suster Bayi" disabled={!editable} onChange={(value) => update("specialty", value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="field-live-in" label="Status menginap" value={form.liveInStatus} maxLength={32} placeholder="Contoh: Siap menginap" disabled={!editable} onChange={(value) => update("liveInStatus", value)} />
        <TextField id="field-availability" label="Ketersediaan mulai" value={form.availability} maxLength={54} placeholder="Contoh: Siap mulai minggu ini" disabled={!editable} onChange={(value) => update("availability", value)} />
        <TextField id="field-training" label="Status training" value={form.trainingStatus} maxLength={42} placeholder="Contoh: Terlatih di LPK" disabled={!editable} onChange={(value) => update("trainingStatus", value)} />
        <TextField id="field-document" label="Status dokumen" value={form.documentStatus} maxLength={42} placeholder="Contoh: Dokumen lengkap" disabled={!editable} onChange={(value) => update("documentStatus", value)} />
      </div>
    </section>

    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm">
      <input id="field-consent" type="checkbox" className="h-5 w-5 shrink-0 accent-brand-navy" disabled={!editable} checked={form.publicationConsent} onChange={(event) => update("publicationConsent", event.target.checked)} />
      <span>Pekerja sudah memberi <strong>izin publikasi</strong> foto & profilnya</span>
    </label>

    <section aria-label="Kesiapan konten" className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Kesiapan konten</span><Badge className={data.readiness.missing.length === 0 ? "border-emerald-100 bg-emerald-50 text-emerald-700" : undefined}>{data.readiness.score}%</Badge></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden><div className={cn("h-full rounded-full", data.readiness.missing.length === 0 ? "bg-emerald-500" : "bg-brand-navy")} style={{ width: `${data.readiness.score}%` }} /></div>
      {readinessMissing.length > 0
        ? <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">Belum ada:{readinessMissing.map((field) => <button key={field} type="button" onClick={() => focusField(READINESS_FIELD_TARGET[field] ?? "data")} className="min-h-8 rounded-full bg-amber-50 px-2.5 font-semibold text-amber-800 underline-offset-2 hover:underline">{readinessFieldLabel(field)}</button>)}</div>
        : <p className="mt-2 text-xs font-semibold text-emerald-700">Semua data wajib lengkap.</p>}
      {dirty && <p className="mt-2 text-xs text-slate-500">Kesiapan diperbarui setelah perubahan disimpan.</p>}
    </section>

    <ErrorAlert code={error} />
    {!editable && <Alert tone="info" title="Mode lihat saja.">Role Anda tidak bisa mengubah data pekerja.</Alert>}

    {editable && <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 -mx-1 rounded-2xl bg-white/95 p-1 backdrop-blur lg:bottom-4">
      {savedAt && !dirty && <p role="status" className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} aria-hidden />Tersimpan ke Content Bridge</p>}
      <Button onClick={save} disabled={saving} className="w-full gap-2">{saving ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Save size={17} aria-hidden />}{saving ? "Menyimpan…" : "Simpan & Hitung Rate"}</Button>
    </div>}
  </div>;
}
