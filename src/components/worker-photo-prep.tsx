"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, CloudUpload, ImageUp, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { removeBackground } from "@/modules/photo/background-removal";
import { prepareImage } from "@/modules/photo/client-image";
import { buildPhotoFilename, validatePhotoInput, type PhotoType } from "@/modules/photo/validation";

const PHOTO_TYPE_OPTIONS: Array<{ value: PhotoType; label: string }> = [
  { value: "PROFILE", label: "Profil" },
  { value: "FULLBODY", label: "Seluruh badan" },
  { value: "TRAINING", label: "Pelatihan" },
  { value: "OTHER", label: "Lainnya" },
];

/** Foto yang dipakai di desain/katalog otomatis dihapus latarnya; foto pelatihan/lainnya dibiarkan apa adanya. */
const CUTOUT_TYPES: readonly PhotoType[] = ["PROFILE", "FULLBODY"];

type Cutout =
  | { status: "working" }
  | { status: "ready"; blob: Blob; url: string; width: number; height: number }
  | { status: "failed"; title: string; detail: string };

const CUTOUT_FAILURE: Record<"NO_PERSON" | "NO_BACKGROUND" | "ERROR", { title: string; detail: string }> = {
  NO_PERSON: { title: "Wajah/badan pekerja tidak terdeteksi.", detail: "Gunakan foto setengah badan yang menghadap kamera dengan cahaya cukup, atau simpan foto asli." },
  NO_BACKGROUND: { title: "Latar tidak bisa dipisahkan dari badan.", detail: "Foto ulang dengan latar polos/terang dan jarak 1–2 meter dari dinding, atau simpan foto asli." },
  ERROR: { title: "Latar belum bisa dihapus otomatis.", detail: "Periksa koneksi internet lalu tekan Coba lagi. Foto asli tetap bisa disimpan." },
};

/** Kotak-kotak abu untuk menandai area transparan pada pratinjau. */
const CHECKERBOARD = { backgroundColor: "#fff", backgroundImage: "conic-gradient(#e2e8f0 25%, transparent 0 50%, #e2e8f0 0 75%, transparent 0)", backgroundSize: "20px 20px" } as const;

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
  const [uploaded, setUploaded] = useState<{ fileName: string; width: number; height: number; kb: number; backgroundRemoved: boolean } | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [currentPhotoFailed, setCurrentPhotoFailed] = useState(false);
  const [cutout, setCutoutState] = useState<Cutout | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  // Menandai permintaan hapus latar terbaru; hasil permintaan lama (foto/rotasi sudah berganti) dibuang.
  const cutoutRequest = useRef(0);
  const cutoutUrl = useRef<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (cutoutUrl.current) URL.revokeObjectURL(cutoutUrl.current); }, []);

  const showCurrentProfile = photoType === "PROFILE" && hasProfilePhoto && !file && !currentPhotoFailed;
  const cutoutSupported = CUTOUT_TYPES.includes(photoType);
  const cutoutReady = cutoutSupported && cutout?.status === "ready" ? cutout : null;
  const cutoutWorking = cutoutSupported && cutout?.status === "working";
  const showCutout = Boolean(cutoutReady && useCutout);
  // Pilihan versi tetap terlihat saat "Foto asli" dipilih lalu foto diputar (hasil lama sudah dibuang).
  const showVersionToggle = Boolean(file && cutoutSupported && (cutoutReady || (!cutout && !useCutout)));

  function setCutout(next: Cutout | null) {
    if (cutoutUrl.current) URL.revokeObjectURL(cutoutUrl.current);
    cutoutUrl.current = next?.status === "ready" ? next.url : null;
    setCutoutState(next);
  }

  function startCutout(source: File, nextRotation: number) {
    const request = ++cutoutRequest.current;
    setCutout({ status: "working" });
    removeBackground(source, { rotation: nextRotation })
      .then((result) => {
        if (request !== cutoutRequest.current) return;
        if (!result.assessment.ok) { setCutout({ status: "failed", ...CUTOUT_FAILURE[result.assessment.reason] }); setUseCutout(false); return; }
        setCutout({ status: "ready", blob: result.blob, url: URL.createObjectURL(result.blob), width: result.width, height: result.height });
      })
      .catch((cause: unknown) => {
        if (request !== cutoutRequest.current) return;
        console.error("Background removal failed", cause);
        setCutout({ status: "failed", ...CUTOUT_FAILURE.ERROR });
        setUseCutout(false);
      });
  }

  function reset() {
    cutoutRequest.current += 1;
    setCutout(null);
    setUseCutout(true);
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
    if (CUTOUT_TYPES.includes(photoType)) startCutout(selected, 0);
  }

  function rotate() {
    const next = (rotation + 90) % 360;
    setRotation(next);
    if (file && cutoutSupported && useCutout) startCutout(file, next);
    else if (cutout) { cutoutRequest.current += 1; setCutout(null); }
  }

  function selectType(next: PhotoType) {
    setPhotoType(next);
    setUploaded(null);
    if (file && CUTOUT_TYPES.includes(next) && !cutout) startCutout(file, rotation);
  }

  function chooseCutout(value: boolean) {
    setUseCutout(value);
    // Rotasi yang diubah saat "Foto asli" dipilih membuat hasil lama tidak berlaku; proses ulang bila perlu.
    if (value && file && !cutout) startCutout(file, rotation);
  }

  function retryCutout() {
    if (!file) return;
    setUseCutout(true);
    startCutout(file, rotation);
  }

  async function save() {
    if (!file || !driveEnabled) return;
    setSaving(true);
    setError(null);
    try {
      const prepared = await prepareImage(file, { rotation });
      const backgroundRemoved = Boolean(showCutout && cutoutReady);
      const form = new FormData();
      form.append("photoType", photoType);
      let fileName: string;
      let summary: { width: number; height: number; bytes: number };
      if (backgroundRemoved && cutoutReady) {
        fileName = buildPhotoFilename({ workerRegister, workerName, type: photoType, mimeType: "image/png" });
        form.append("file", new File([cutoutReady.blob], fileName, { type: "image/png" }));
        form.append("original", new File([prepared.blob], buildPhotoFilename({ workerRegister, workerName, type: photoType, mimeType: "image/jpeg", original: true }), { type: "image/jpeg" }));
        form.append("backgroundRemoved", "1");
        summary = { width: cutoutReady.width, height: cutoutReady.height, bytes: cutoutReady.blob.size };
      } else {
        fileName = buildPhotoFilename({ workerRegister, workerName, type: photoType, mimeType: "image/jpeg" });
        form.append("file", new File([prepared.blob], fileName, { type: "image/jpeg" }));
        summary = { width: prepared.width, height: prepared.height, bytes: prepared.blob.size };
      }
      const response = await fetch(`/api/workers/${encodeURIComponent(workerRegister)}/photo`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error ?? "UPLOAD_FAILED");
      setUploaded({ fileName: body.fileName ?? fileName, width: summary.width, height: summary.height, kb: Math.max(1, Math.round(summary.bytes / 1024)), backgroundRemoved });
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
    <div role="radiogroup" aria-label="Jenis foto" className="grid grid-cols-4 gap-1.5">
      {PHOTO_TYPE_OPTIONS.map((option) => <button key={option.value} type="button" role="radio" aria-checked={photoType === option.value} disabled={saving} onClick={() => selectType(option.value)} className={cn("min-h-11 rounded-xl border px-1 text-center text-xs font-bold leading-tight", photoType === option.value ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 bg-white text-slate-600")}>{option.label}</button>)}
    </div>

    {showCurrentProfile && <figure className="mx-auto w-full max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto privat dari API internal, bukan aset statis */}
      <img key={photoVersion} src={`/api/workers/${encodeURIComponent(workerRegister)}/photo?type=PROFILE&v=${photoVersion}`} alt="Foto profil tersimpan" onError={() => setCurrentPhotoFailed(true)} className="aspect-[4/5] w-full rounded-2xl object-cover" style={CHECKERBOARD} />
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
      {cutoutSupported && <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500"><Sparkles size={14} className="shrink-0 text-brand-pink" aria-hidden />Latar foto dihapus otomatis di HP Anda, tidak dikirim ke layanan lain.</p>}
    </div>}

    {previewUrl && <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl bg-slate-100" style={showCutout ? CHECKERBOARD : undefined}>
      {showCutout && cutoutReady
        // eslint-disable-next-line @next/next/no-img-element -- blob URL lokal hasil hapus latar (rotasi sudah diterapkan)
        ? <img src={cutoutReady.url} alt="Pratinjau foto tanpa latar" className="h-full w-full object-contain" />
        // eslint-disable-next-line @next/next/no-img-element -- blob URL lokal untuk pratinjau
        : <img src={previewUrl} alt="Pratinjau foto yang dipilih" className="h-full w-full object-cover transition" style={{ transform: `rotate(${rotation}deg) scale(${rotation % 180 === 0 ? 1 : 1.2})` }} />}
      {!showCutout && <div className="pointer-events-none absolute inset-[8%] rounded-[40%] border border-dashed border-white/80" aria-hidden />}
      {cutoutWorking && useCutout && <div role="status" className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-black/65 px-3 py-2 text-xs font-semibold text-white"><Loader2 size={16} className="shrink-0 animate-spin" aria-hidden /><span>Menghapus latar… <span className="font-normal text-white/80">Pertama kali bisa ±30 detik.</span></span></div>}
      <button type="button" onClick={reset} disabled={saving} aria-label="Batalkan foto" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"><X size={18} /></button>
    </div>}

    {showVersionToggle && <div role="radiogroup" aria-label="Versi foto yang disimpan" className="mx-auto grid max-w-xs grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {[{ value: true, label: "Tanpa latar" }, { value: false, label: "Foto asli" }].map((option) => <button key={option.label} type="button" role="radio" aria-checked={useCutout === option.value} disabled={saving} onClick={() => chooseCutout(option.value)} className={cn("min-h-10 rounded-lg text-xs font-bold", useCutout === option.value ? "bg-white text-brand-navy shadow-sm" : "text-slate-500")}>{option.label}</button>)}
    </div>}

    {file && cutoutSupported && cutout?.status === "failed" && <Alert tone="warning" title={cutout.title}>
      <p>{cutout.detail}</p>
      <button type="button" onClick={retryCutout} disabled={saving} className="mt-1 inline-flex min-h-8 items-center font-bold underline underline-offset-2">Coba lagi</button>
    </Alert>}

    {file && <div className="flex gap-2">
      <Button variant="secondary" className="flex-1 gap-2" disabled={saving} onClick={rotate}><RotateCw size={17} aria-hidden />Putar</Button>
      <Button className="flex-[2] gap-2" disabled={saving || !driveEnabled || Boolean(cutoutWorking && useCutout)} onClick={save}>{saving ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <CloudUpload size={17} aria-hidden />}{saving ? "Menyimpan…" : cutoutWorking && useCutout ? "Memproses…" : "Simpan Foto"}</Button>
    </div>}

    {uploaded && <Alert tone="success" title="Foto tersimpan di Google Drive.">{uploaded.backgroundRemoved ? "Latar dihapus; foto asli disimpan sebagai cadangan. " : ""}{uploaded.fileName} • {uploaded.width}×{uploaded.height}px • {uploaded.kb} KB</Alert>}
    <ErrorAlert code={error} />
    {!editable && !hasProfilePhoto && <Alert tone="info" title="Foto profil belum ada.">Role Anda hanya bisa melihat. Minta Staf atau Admin mengunggah foto.</Alert>}
    {editable && !driveEnabled && <Alert tone="warning" title="Upload ke Drive belum aktif.">Foto bisa dipilih dan diputar, tetapi belum bisa disimpan sampai koneksi Google Drive siap. Hubungi Admin.</Alert>}
  </div>;
}
