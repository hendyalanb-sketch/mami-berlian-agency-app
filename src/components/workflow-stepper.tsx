import Link from "next/link";
import { Check, Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentWorkflowStep, type WorkflowStep, type WorkflowStepKey } from "@/modules/workflow/steps";

function stepHref(workerRegister: string, key: WorkflowStepKey) {
  const register = encodeURIComponent(workerRegister);
  if (key === "data") return `/pekerja/${register}#data`;
  if (key === "photo") return `/pekerja/${register}#foto`;
  return `/preview/${register}#workflow`;
}

const dotClass: Record<WorkflowStep["state"], string> = {
  done: "border-emerald-600 bg-emerald-600 text-white",
  current: "border-brand-navy bg-brand-navy text-white",
  error: "border-red-600 bg-red-600 text-white",
  todo: "border-slate-300 bg-white text-slate-500",
  locked: "border-slate-200 bg-slate-50 text-slate-400",
};

function StepDot({ step, index }: { step: WorkflowStep; index: number }) {
  return <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", dotClass[step.state])} aria-hidden>
    {step.state === "done" ? <Check size={14} /> : step.state === "locked" ? <Lock size={12} /> : step.state === "error" ? <TriangleAlert size={13} /> : index + 1}
  </span>;
}

const stateText: Record<WorkflowStep["state"], string> = { done: "selesai", current: "langkah sekarang", error: "gagal", todo: "belum", locked: "terkunci" };

export function WorkflowStepper({ workerRegister, steps }: { workerRegister: string; steps: WorkflowStep[] }) {
  const current = currentWorkflowStep(steps);
  const currentIndex = current ? steps.indexOf(current) : steps.length - 1;
  const doneCount = steps.filter((step) => step.state === "done").length;

  return <nav aria-label="Alur konten pekerja" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    {/* Mobile: ringkas */}
    <div className="lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{current ? `Langkah ${currentIndex + 1} dari ${steps.length}` : "Semua langkah selesai"}</p>
        <p className="text-xs font-semibold text-slate-500">{doneCount}/{steps.length} selesai</p>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>{steps.map((step) => <span key={step.key} className={cn("h-1.5 flex-1 rounded-full", step.state === "done" ? "bg-emerald-500" : step.state === "current" ? "bg-brand-navy" : step.state === "error" ? "bg-red-500" : "bg-slate-200")} />)}</div>
      {current && <Link href={stepHref(workerRegister, current.key)} className="mt-3 flex min-h-11 items-center gap-3">
        <StepDot step={current} index={currentIndex} />
        <span className="min-w-0"><span className="block text-sm font-bold text-brand-navy">{current.label}</span><span className="block text-xs text-slate-500">{current.hint}</span></span>
      </Link>}
    </div>

    {/* Desktop: semua langkah */}
    <ol className="hidden items-start gap-2 lg:flex">
      {steps.map((step, index) => <li key={step.key} className="flex flex-1 items-start gap-2">
        <Link href={stepHref(workerRegister, step.key)} aria-current={step.state === "current" ? "step" : undefined} className="group flex min-w-0 flex-1 items-start gap-2 rounded-xl p-1 hover:bg-slate-50">
          <StepDot step={step} index={index} />
          <span className="min-w-0"><span className={cn("block text-sm font-bold", step.state === "locked" ? "text-slate-400" : "text-brand-navy")}>{step.label}<span className="sr-only"> ({stateText[step.state]})</span></span><span className="block text-xs leading-4 text-slate-500">{step.hint}</span></span>
        </Link>
        {index < steps.length - 1 && <span className="mt-4 h-px w-4 shrink-0 bg-slate-200" aria-hidden />}
      </li>)}
    </ol>
  </nav>;
}
