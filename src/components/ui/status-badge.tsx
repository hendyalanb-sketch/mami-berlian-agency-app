import { Badge } from "@/components/ui/badge";
import type { StatusInfo, StatusTone } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  info: "border-sky-100 bg-sky-50 text-sky-800",
  progress: "border-amber-100 bg-amber-50 text-amber-800",
  warning: "border-amber-100 bg-amber-50 text-amber-800",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  danger: "border-red-100 bg-red-50 text-red-700",
};

export function StatusBadge({ status, className }: { status: StatusInfo; className?: string }) {
  return <Badge className={cn("font-semibold", toneClass[status.tone], className)}>{status.label}</Badge>;
}
