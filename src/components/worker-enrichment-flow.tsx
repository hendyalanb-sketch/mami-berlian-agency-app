"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { readinessFieldLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import { buildCopySuggestions, COPY_FIELDS, COPY_PRESETS_DEFAULTS, type CopyContext, type CopyFieldKey, type CopyPresets } from "@/modules/content/copy-presets";

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
  copyPresets?: CopyPresets;
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

const COPY_FIELD_IDS: Record<CopyFieldKey, string> = {
  publicTitle: "field-public-title",
  workerQuote: "field-quote",
  specialty: "field-specialty",
  liveInStatus: "field-live-in",
  availability: "field-availability",
  trainingStatus: "field-training",
  documentStatus: "field-document",
};

function CopyField({ id, label, value, maxLength, factual, multiline, suggestions, disabled, onChange }: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  factual: boolean;
  multiline: boolean;
  suggestions: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const placeholder = suggestions.length ? "Atau ketik sendiri…" : "Ketik sendiri…";
  return <div>
    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-600"><label htmlFor={id}>{label}</label><span className="font-medium text-slate-400">{value.length}/{maxLength}</span></div>
    {suggestions.length > 0 && <div role="group" aria-label={`Rekomendasi ${label}`} className="mb-2 flex flex-wrap gap-1.5">
      {suggestions.map((suggestion) => {
        const selected = value.trim() === suggestion;
        return <button key={suggestion} type="button" disabled={disabled} aria-pressed={selected} onClick={() => onChange(selected ? "" : suggestion)} className={cn("inline-flex min-h-9 max-w-full items-center gap-1 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold leading-snug", selected ? "border-brand-navy bg-brand-navy text-white" : "border-pink-200 bg-white text-slate-700 hover:border-pink-300")}>
          {selected && <Check size={13} className="shrink-0" aria-hidden />}<span>{suggestion}</span>
        </button>;
      })}
    </div>}
    {multiline
      ? <Textarea id={id} disabled={disabled} value={value} maxLength={maxLength} rows={3} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      : <Input id={id} disabled={disabled} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
    {factual && <p className="mt-1 text-[11px] text-slate-500">Pilih hanya jika benar untuk pekerja ini — tampil sebagai fakta di konten publik.</p>}
  </div>;
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
  const presets = data.copyPresets ?? COPY_PRESETS_DEFAULTS;
  const nameOf = (options: Option[], code: string) => options.find((option) => option.code === code)?.name ?? "";
  const copyContext: CopyContext = {
    categoryCode: form.category,
    categoryName: nameOf(data.master.categories, form.category),
    experienceName: nameOf(data.master.experiences, form.experience),
    skillNames: form.skills.map((code) => nameOf(data.master.skills, code)).filter(Boolean),
    firstName: data.worker.name.trim().split(/\s+/)[0] ?? "",
  };
  const suggestions = Object.fromEntries(COPY_FIELDS.map((field) => [field.key, buildCopySuggestions(presets, field.key, copyContext)])) as Record<CopyFieldKey, string[]>;
  const promoFields = COPY_FIELDS.filter((field) => !field.factual).map((field) => field.key);
  const promoFillable = promoFields.some((key) => !form[key].trim() && suggestions[key].length > 0);

  function autofillPromo() {
    // Hanya teks promosi; field fakta (menginap, ketersediaan, training, dokumen) wajib dipilih manual.
    setForm((current) => {
      const next = { ...current };
      for (const key of promoFields) if (!next[key].trim() && suggestions[key][0]) next[key] = suggestions[key][0];
      return next;
    });
    setSavedAt(null);
  }
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

    <section aria-labelledby="enrichment-public" className="space-y-5 rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
      <div>
        <h3 id="enrichment-public" className="text-sm font-black text-brand-navy">Profil publik & Canva</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Teks ini tampil di desain MB-01A/MB-01B untuk calon majikan. Ketuk rekomendasi untuk memakai, lalu sesuaikan bila perlu — atau ketik sendiri.</p>
        {!form.category && <p className="mt-2 text-xs font-semibold text-amber-700">Pilih kategori dulu agar rekomendasinya lebih pas.</p>}
        {editable && <Button type="button" variant="secondary" className="mt-3 min-h-10 gap-2 text-xs" onClick={autofillPromo} disabled={!promoFillable}><Sparkles size={15} aria-hidden />Isi otomatis teks promosi</Button>}
      </div>
      {COPY_FIELDS.map((field) => <CopyField
        key={field.key}
        id={COPY_FIELD_IDS[field.key]}
        label={field.label}
        value={form[field.key]}
        maxLength={field.maxLength}
        factual={field.factual}
        multiline={field.key === "workerQuote"}
        suggestions={suggestions[field.key]}
        disabled={!editable}
        onChange={(value) => update(field.key, value)}
      />)}
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
