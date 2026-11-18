"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power, ShieldCheck } from "lucide-react";
import { CopyPresetsEditor } from "@/components/copy-presets-editor";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ACTIVE_STATUS, TEMPLATE_STATUS } from "@/lib/status-labels";
import type { CopyPresets } from "@/modules/content/copy-presets";

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
  categories: Array<{ code: string; name: string; isActive: boolean }>;
  copyPresets: CopyPresets;
};

const labelNames: Record<DisplayKey, string> = {
  "display.ready_label": "Label status siap",
  "display.placement_label": "Label penempatan",
  "display.salary_label": "Label rate/gaji",
  "display.footer_text": "Footer publik",
};

const emptyTemplate = { code: "", name: "", canvaTemplateId: "", version: "v1", contentType: "PEKERJA_READY", requiredFields: "" };
const emptyChannel = { code: "", name: "" };
const emptyCta = {
  id: "",
  name: "",
  primaryPhone: "",
  secondaryPhone: "",
  email: "",
  website: "",
  ctaText: "",
  qrTarget: "",
  isDefault: false,
};

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

  if (!enabled)
    return (
      <Alert tone="warning" title="Master Konten belum aktif.">
        Neon harus terhubung dan migration + seed sudah dijalankan.
      </Alert>
    );
  if (loading)
    return (
      <div className="flex min-h-32 items-center justify-center" role="status" aria-label="Memuat Master Konten">
        <Loader2 className="animate-spin text-slate-400" aria-hidden />
      </div>
    );
  if (!data || !labels) return <ErrorAlert code={error} />;

  const confirmToggle = (isActive: boolean, label: string) =>
    !isActive ||
    window.confirm(
      `Nonaktifkan “${label}”? Pilihan ini tidak akan muncul lagi untuk staf. Data lama tetap tersimpan dan bisa diaktifkan kembali.`,
    );
  const toggleClass = (isActive: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${isActive ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`;

  return (
    <div className="space-y-4">
      {error && (
        <div className="sticky top-2 z-10">
          <ErrorAlert code={error} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Template Canva</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Template tidak bisa diaktifkan manual. Setiap perubahan mengunci template sampai health check Canva di menu Integrasi berhasil.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Kode">
              <Input
                value={template.code}
                onChange={(e) => setTemplate({ ...template, code: e.target.value.toUpperCase() })}
                placeholder="MB-01A"
              />
            </Field>
            <Field label="Nama template">
              <Input
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                placeholder="MB-01A — Personal"
              />
            </Field>
            <Field label="Canva design ID">
              <Input
                value={template.canvaTemplateId}
                onChange={(e) => setTemplate({ ...template, canvaTemplateId: e.target.value.trim() })}
                placeholder="DAH..."
              />
            </Field>
            <Field label="Versi">
              <Input value={template.version} onChange={(e) => setTemplate({ ...template, version: e.target.value })} placeholder="v1" />
            </Field>
            <Field label="Jenis konten">
              <Input
                value={template.contentType}
                onChange={(e) => setTemplate({ ...template, contentType: e.target.value.toUpperCase() })}
                placeholder="PEKERJA_READY"
              />
            </Field>
          </div>
          <Field label="Kolom isian Canva (pisahkan dengan koma)">
            <Input value={template.requiredFields} onChange={(event) => setTemplate({ ...template, requiredFields: event.target.value.toUpperCase() })} placeholder="WORKER_PHOTO, WORKER_NAME, WORKER_POSITION, WORKER_PLACEMENT" />
          </Field>
          <p className="text-xs text-slate-500">Kosongkan untuk memakai kolom standar jenis konten. Template baru otomatis tersedia untuk Buat Semua setelah health check berhasil.</p>
          <Button
            disabled={busy || !template.code || !template.name || !template.canvaTemplateId || !template.version || !template.contentType}
            onClick={() => mutate("POST", { resource: "template", ...template, ...(template.requiredFields.trim() ? { requiredFieldsJson: template.requiredFields.split(",").map((field) => field.trim()).filter(Boolean) } : {}) })}
            className="gap-2"
          >
            <ShieldCheck size={16} aria-hidden />
            Simpan (wajib health check ulang)
          </Button>
          <ul className="grid gap-2 lg:grid-cols-2">
            {data.templates.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">{item.name}</p>
                      <Badge>{item.code}</Badge>
                      <StatusBadge status={TEMPLATE_STATUS[String(item.isActive) as "true" | "false"]} />
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {item.canvaTemplateId} • {item.version} • {item.contentType}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{item.requiredFieldsJson.length} field Autofill wajib</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="min-h-10 gap-1.5 px-3 text-xs"
                    onClick={() =>
                      setTemplate({
                        code: item.code,
                        name: item.name,
                        canvaTemplateId: item.canvaTemplateId,
                        version: item.version,
                        contentType: item.contentType,
                        requiredFields: item.requiredFieldsJson.join(", "),
                      })
                    }
                  >
                    <Pencil size={14} aria-hidden />
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Channel Publikasi</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Pilihan channel saat staf menandai konten sudah dipublikasi.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Kode">
                <Input
                  value={channel.code}
                  onChange={(e) => setChannel({ ...channel, code: e.target.value.toUpperCase() })}
                  placeholder="TIKTOK"
                />
              </Field>
              <Field label="Nama tampil">
                <Input value={channel.name} onChange={(e) => setChannel({ ...channel, name: e.target.value })} placeholder="TikTok" />
              </Field>
              <Button
                disabled={busy || !channel.code || !channel.name}
                onClick={async () => {
                  if (await mutate("POST", { resource: "channel", ...channel })) setChannel(emptyChannel);
                }}
                className="gap-1.5"
              >
                <Plus size={16} aria-hidden />
                Tambah
              </Button>
            </div>
            <ul className="space-y-2">
              {data.channels.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <StatusBadge status={ACTIVE_STATUS[String(item.isActive) as "true" | "false"]} />
                    </div>
                    <p className="text-xs text-slate-400">{item.code}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirmToggle(item.isActive, item.name))
                        mutate("PATCH", { resource: "channel", id: item.id, isActive: !item.isActive });
                    }}
                    className={toggleClass(item.isActive)}
                  >
                    <Power size={14} aria-hidden />
                    {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Label Tampilan Publik</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Teks yang muncul di Preview Publik.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(labelNames) as DisplayKey[]).map((key) => (
              <div key={key} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label={labelNames[key]}>
                  <Input value={labels[key]} onChange={(e) => setLabels({ ...labels, [key]: e.target.value })} />
                </Field>
                <Button
                  variant="secondary"
                  disabled={busy || !labels[key].trim() || labels[key] === data.displayLabels[key]}
                  onClick={() => mutate("POST", { resource: "display", key, value: labels[key] })}
                >
                  Simpan
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <CopyPresetsEditor presets={data.copyPresets} categories={data.categories} busy={busy} onSave={(value) => mutate("POST", { resource: "copyPresets", value })} />

      <Card>
        <CardHeader>
          <CardTitle>CTA & Kontak</CardTitle>
          <p className="mt-1 text-xs text-slate-500">CTA default dipakai sebagai teks ajakan di desain Canva.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Nama profil CTA">
              <Input value={cta.name} onChange={(e) => setCta({ ...cta, name: e.target.value })} placeholder="CTA Utama" />
            </Field>
            <Field label="WhatsApp utama">
              <Input
                type="tel"
                inputMode="tel"
                value={cta.primaryPhone}
                onChange={(e) => setCta({ ...cta, primaryPhone: e.target.value })}
                placeholder="0812..."
              />
            </Field>
            <Field label="Nomor kedua">
              <Input
                type="tel"
                inputMode="tel"
                value={cta.secondaryPhone}
                onChange={(e) => setCta({ ...cta, secondaryPhone: e.target.value })}
                placeholder="Opsional"
              />
            </Field>
            <Field label="Email">
              <Input type="email" value={cta.email} onChange={(e) => setCta({ ...cta, email: e.target.value })} placeholder="Opsional" />
            </Field>
            <Field label="Website">
              <Input
                type="url"
                inputMode="url"
                value={cta.website}
                onChange={(e) => setCta({ ...cta, website: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field label="Tautan QR">
              <Input
                type="url"
                inputMode="url"
                value={cta.qrTarget}
                onChange={(e) => setCta({ ...cta, qrTarget: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field label="Teks CTA" className="xl:col-span-2">
              <Input
                value={cta.ctaText}
                onChange={(e) => setCta({ ...cta, ctaText: e.target.value })}
                placeholder="Hubungi kami untuk interview"
              />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-navy"
              checked={cta.isDefault}
              onChange={(e) => setCta({ ...cta, isDefault: e.target.checked })}
            />
            Jadikan CTA default
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !cta.name}
              onClick={async () => {
                if (await mutate("POST", { resource: "cta", ...cta, id: cta.id || undefined })) setCta(emptyCta);
              }}
            >
              {cta.id ? "Perbarui CTA" : "Tambah CTA"}
            </Button>
            {cta.id && (
              <Button variant="secondary" onClick={() => setCta(emptyCta)}>
                Batal Edit
              </Button>
            )}
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.ctas.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">{item.name}</p>
                      {item.isDefault && <Badge className="border-pink-100 bg-pink-50 text-brand-pink-dark">Default</Badge>}
                      <StatusBadge status={ACTIVE_STATUS[String(item.isActive) as "true" | "false"]} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.primaryPhone || "—"} • {item.email || "—"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.ctaText || "Belum ada teks CTA"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-10 gap-1.5 px-3 text-xs"
                      onClick={() =>
                        setCta({
                          id: item.id,
                          name: item.name,
                          primaryPhone: item.primaryPhone ?? "",
                          secondaryPhone: item.secondaryPhone ?? "",
                          email: item.email ?? "",
                          website: item.website ?? "",
                          ctaText: item.ctaText ?? "",
                          qrTarget: item.qrTarget ?? "",
                          isDefault: item.isDefault,
                        })
                      }
                    >
                      <Pencil size={14} aria-hidden />
                      Edit
                    </Button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (confirmToggle(item.isActive, item.name))
                          mutate("PATCH", { resource: "cta", id: item.id, isActive: !item.isActive });
                      }}
                      className={toggleClass(item.isActive)}
                    >
                      <Power size={14} aria-hidden />
                      {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
