import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import * as React from "react";
import { getErrorInfo } from "@/lib/error-messages";
import { cn } from "@/lib/utils";

const tones = {
  info: { className: "bg-brand-sky text-brand-navy", icon: Info },
  success: { className: "bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  warning: { className: "bg-amber-50 text-amber-800", icon: TriangleAlert },
  error: { className: "bg-red-50 text-red-700", icon: AlertCircle },
} as const;

export type AlertTone = keyof typeof tones;

export function Alert({ tone = "info", title, children, className }: { tone?: AlertTone; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const { className: toneClass, icon: Icon } = tones[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-xl p-3 text-sm", toneClass, className)}>
    <Icon size={17} className="mt-0.5 shrink-0" aria-hidden />
    <div className="min-w-0 space-y-1">
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className="text-xs leading-5">{children}</div>}
    </div>
  </div>;
}

/** Menampilkan kode error API sebagai pesan yang bisa ditindaklanjuti. */
export function ErrorAlert({ code, className, tone = "error" }: { code: string | null | undefined; className?: string; tone?: AlertTone }) {
  if (!code) return null;
  const info = getErrorInfo(code);
  return <Alert tone={tone} title={info.title} className={className}>
    <p>{info.action}</p>
    {info.href && <Link href={info.href} className="mt-1 inline-flex min-h-8 items-center font-bold underline underline-offset-2">{info.hrefLabel ?? "Buka"}</Link>}
  </Alert>;
}
