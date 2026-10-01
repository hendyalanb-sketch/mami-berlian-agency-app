"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, CloudUpload, ImageUp, Loader2, RotateCw, X } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prepareImage } from "@/modules/photo/client-image";
import { buildPhotoFilename, validatePhotoInput, type PhotoType } from "@/modules/photo/validation";

const PHOTO_TYPE_OPTIONS: Array<{ value: PhotoType; label: string }> = [
  { value: "PROFILE", label: "Profil" },
  { value: "FULLBODY", label: "Seluruh badan" },
  { value: "TRAINING", label: "Pelatihan" },
  { value: "OTHER", label: "Lainnya" },
];

export function WorkerPhotoPrep({ workerRegister, workerName = "PEKERJA", driveEnabled = false, editable = true, hasProfilePhoto = false, onUploaded }: {
  workerRegister: string;
  workerName?: string;
  driveEnabled?: boolean;
  editable?: boolean;
  hasProfilePhoto?: boolean;
  onUploaded?: (photoType: PhotoType) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>("PROFILE");
  const [saving, setSaving] = useState(false);
  const [uploaded, setUploaded] = useState<{ fileName: string; width: number; height: number; kb: number } | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [currentPhotoFailed, setCurrentPhotoFailed] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const showCurrentProfile = photoType === "PROFILE" && hasProfilePhoto && !file && !currentPhotoFailed;

  function reset() {
    setFile(null);
    setRotation(0);
    setError(null);
  }

  function onSelect(selected: File | null) {
    reset();
    setUploaded(null);
    if (!selected) return;
    const validation = validatePhotoInput({ size: selected.size, mimeType: selected.type });
    if (!validation.valid) { setError(validation.message); return; }
    setFile(selected);
  }

  async function save() {
    if (!file || !driveEnabled) return;
    setSaving(true);
    setError(null);
    try {
      const prepared = await prepareImage(file, { rotation });
      const fileName = buildPhotoFilename({ workerRegister, workerName, type: photoType, mimeType: "image/jpeg" });
      const form = new FormData();
      form.append("photoType", photoType);
      form.append("file", new File([prepared.blob], fileName, { type: "image/jpeg" }));
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/photo`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error ?? "UPLOAD_FAILED");
      setUploaded({ fileName: body.fileName ?? fileName, width: prepared.width, height: prepared.height, kb: Math.max(1, Math.round(prepared.blob.size / 1024)) });
      reset();
      setCurrentPhotoFailed(false);
      setPhotoVersion((value) => value + 1);
      onUploaded?.(photoType);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UPLOAD_FAILED");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-4">
    <div role="radiogroup" aria-label="Jenis foto" className="flex gap-2 overflow-x-auto pb-1">
      {PHOTO_TYPE_OPTIONS.map((option) => <button key={option.value} type="button" role="radio" aria-checked={photoType === option.value} onClick={() => { setPhotoType(option.value); setUploaded(null); }} className={cn("min-h-11 shrink-0 rounded-xl border px-3 text-xs font-bold", photoType === option.value ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 bg-white text-slate-600")}>{option.label}</button>)}
    </div>

    {showCurrentProfile && <figure className="mx-auto w-full max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto privat dari API internal, bukan aset statis */}
      <img key={photoVersion} src={`/api/workers/${encodeURIComponent(workerRegister)}/photo?type=PROFILE&v=${photoVersion}`} alt="Foto profil tersimpan" onError={() => setCurrentPhotoFailed(true)} className="aspect-[4/5] w-full rounded-2xl bg-slate-100 object-cover" />
      <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} aria-hidden />Foto profil tersimpan di Drive</figcaption>
    </figure>}

    {editable && !file && <div>
      <p className="mb-2 text-center text-xs font-semibold text-slate-500">{showCurrentProfile ? "Ganti foto profil" : "Tambah foto"} • JPG, PNG, atau WebP, maks. 12 MB</p>
      <div className="grid grid-cols-2 gap-2">
        {/* capture memaksa kamera di HP; galeri dipisah agar foto lama tetap bisa dipilih */}
        <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <Camera size={22} aria-hidden /><span>Kamera</span>
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture={photoType === "PROFILE" ? "user" : "environment"} onChange={(event) => { onSelect(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        </label>
        <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <ImageUp size={22} aria-hidden /><span>Galeri</span>
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { onSelect(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        </label>
      </div>
    </div>}

    {previewUrl && <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL lokal untuk pratinjau */}
      <img src={previewUrl} alt="Pratinjau foto yang dipilih" className="h-full w-full object-cover transition" style={{ transform: `rotate(${rotation}deg) scale(${rotation % 180 === 0 ? 1 : 1.2})` }} />
      <div className="pointer-events-none absolute inset-[8%] rounded-[40%] border border-dashed border-white/80" aria-hidden />
      <button type="button" onClick={reset} aria-label="Batalkan foto" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"><X size={18} /></button>
    </div>}

    {file && <div className="flex gap-2">
      <Button variant="secondary" className="flex-1 gap-2" disabled={saving} onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={17} aria-hidden />Putar</Button>
      <Button className="flex-[2] gap-2" disabled={saving || !driveEnabled} onClick={save}>{saving ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <CloudUpload size={17} aria-hidden />}{saving ? "Menyimpan…" : "Simpan Foto"}</Button>
    </div>}

    {uploaded && <Alert tone="success" title="Foto tersimpan di Google Drive.">{uploaded.fileName} • {uploaded.width}×{uploaded.height}px • {uploaded.kb} KB</Alert>}
    <ErrorAlert code={error} />
    {!editable && !hasProfilePhoto && <Alert tone="info" title="Foto profil belum ada.">Role Anda hanya bisa melihat. Minta Staf atau Admin mengunggah foto.</Alert>}
    {editable && !driveEnabled && <Alert tone="warning" title="Upload ke Drive belum aktif.">Foto bisa dipilih dan diputar, tetapi belum bisa disimpan sampai koneksi Google Drive siap. Hubungi Admin.</Alert>}
  </div>;
}
