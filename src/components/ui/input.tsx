import * as React from "react";
import { cn } from "@/lib/utils";

// text-base (16px) di mobile mencegah auto-zoom iOS Safari saat fokus; sm:text-sm di layar lebar.
export const fieldClassName = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-400 sm:text-sm";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldClassName, className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(fieldClassName, className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldClassName, "py-2", className)} {...props} />;
});

export function Field({ label, hint, error, required, children, className }: { label: string; hint?: React.ReactNode; error?: string | null; required?: boolean; children: React.ReactNode; className?: string }) {
  return <label className={cn("block", className)}>
    <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
      <span>{label}{required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}</span>
      {hint && <span className="font-medium text-slate-400">{hint}</span>}
    </span>
    {children}
    {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
  </label>;
}
