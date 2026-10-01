"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/input";
import { buildCopySuggestions, COPY_FIELDS, COPY_PRESETS_DEFAULTS, type CopyFieldKey, type CopyPresets } from "@/modules/content/copy-presets";

const GENERAL = "__default";

function toLines(list: string[] | undefined) {
  return (list ?? []).join("\n");
}

function fromLines(text: string) {
  return [...new Set(text.split("\n").map((line) => line.trim()).filter(Boolean))].slice(0, 20);
}

/** Editor rekomendasi teks profil publik: satu baris = satu rekomendasi, per field dan per kategori. */
export function CopyPresetsEditor({ presets, categories, busy, onSave }: {
  presets: CopyPresets;
  categories: Array<{ code: string; name: string; isActive: boolean }>;
  busy: boolean;
  onSave: (value: CopyPresets) => Promise<boolean>;
}) {
  const [field, setField] = useState<CopyFieldKey>("publicTitle");
  const [scope, setScope] = useState<string>(GENERAL);
  const current = scope === GENERAL ? presets[field].default : presets[field].byCategory[scope];
  const [draft, setDraft] = useState(toLines(current));
  const [draftKey, setDraftKey] = useState(`${field}:${scope}`);

  // Muat ulang draf saat field/kategori berganti atau data tersimpan berubah.
  const key = `${field}:${scope}`;
  if (key !== draftKey) {
    setDraftKey(key);
    setDraft(toLines(current));
  }

  const meta = COPY_FIELDS.find((item) => item.key === field)!;
  const dirty = toLines(fromLines(draft)) !== toLines(current);
  const category = categories.find((item) => item.code === scope);
  const preview = buildCopySuggestions(
    { ...presets, [field]: scope === GENERAL ? { ...presets[field], default: fromLines(draft) } : { ...presets[field], byCategory: { ...presets[field].byCategory, [scope]: fromLines(draft) } } },
    field,
    { categoryCode: scope === GENERAL ? "" : scope, categoryName: category?.name ?? "ART", experienceName: "Pengalaman", skillNames: ["Masak", "Momong Anak"], firstName: "Siti" },
    20,
  );

  async function save(lines: string[]) {
    const next: CopyPresets = {
      ...presets,
      [field]: scope === GENERAL
        ? { ...presets[field], default: lines }
        : { ...presets[field], byCategory: Object.fromEntries(Object.entries({ ...presets[field].byCategory, [scope]: lines }).filter(([, list]) => list.length > 0)) },
    };
    if (await onSave(next)) setDraft(toLines(lines));
  }

  const defaultLines = scope === GENERAL ? COPY_PRESETS_DEFAULTS[field].default : COPY_PRESETS_DEFAULTS[field].byCategory[scope] ?? [];

  return <Card>
    <CardHeader>
      <CardTitle>Rekomendasi teks profil publik</CardTitle>
      <p className="mt-1 text-xs leading-5 text-slate-500">Pilihan yang muncul sebagai chip di form pekerja. Satu baris = satu rekomendasi. Penanda otomatis: <code>{"{kategori}"}</code> <code>{"{pengalaman}"}</code> <code>{"{keahlian1}"}</code> <code>{"{keahlian2}"}</code> <code>{"{nama}"}</code> (nama depan). Rekomendasi khusus kategori tampil lebih dulu.</p>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Field"><Select value={field} onChange={(event) => setField(event.target.value as CopyFieldKey)}>{COPY_FIELDS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></Field>
        <Field label="Berlaku untuk"><Select value={scope} onChange={(event) => setScope(event.target.value)}><option value={GENERAL}>Semua kategori (umum)</option>{categories.filter((item) => item.isActive).map((item) => <option key={item.code} value={item.code}>Khusus {item.name}</option>)}</Select></Field>
      </div>
      <Field label={`Rekomendasi (maks. ${meta.maxLength} karakter setelah penanda diisi)`}>
        <Textarea rows={6} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={scope === GENERAL ? "Satu rekomendasi per baris" : "Kosongkan jika kategori ini cukup memakai rekomendasi umum"} />
      </Field>
      {meta.factual && <p className="text-xs text-amber-700">Field fakta: tulis hanya pernyataan yang bisa dipilih staf sesuai kondisi nyata pekerja.</p>}
      {preview.length > 0 && <div className="rounded-xl bg-slate-50 p-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Contoh hasil (Siti, {category?.name ?? "ART"}, Pengalaman, Masak & Momong Anak)</p><div className="flex flex-wrap gap-1.5">{preview.map((text) => <span key={text} className="rounded-xl border border-pink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">{text}</span>)}</div></div>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !dirty} onClick={() => save(fromLines(draft))}>Simpan rekomendasi</Button>
        <Button variant="secondary" className="gap-1.5" disabled={busy || toLines(defaultLines) === toLines(current)} onClick={() => { if (window.confirm("Kembalikan rekomendasi ini ke bawaan aplikasi?")) void save(defaultLines); }}><RotateCcw size={15} aria-hidden />Kembalikan bawaan</Button>
      </div>
    </CardContent>
  </Card>;
}
