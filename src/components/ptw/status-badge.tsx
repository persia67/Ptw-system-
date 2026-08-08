import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/ptw/defaults";
import type { PermitStatus } from "@/lib/ptw/types";

const CLASS: Record<PermitStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending_supervisor:
    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 font-bold",
  pending_hse: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40 font-bold",
  pending_area_owner:
    "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40 font-bold",
  approved:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40 font-bold",
  expired: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/40",
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  active: "bg-success/15 text-success border-success/40",
  suspended: "bg-info/15 text-info border-info/40",
  cancelled: "bg-destructive/15 text-destructive border-destructive/40",
  closed: "bg-secondary text-secondary-foreground border-border",
};

export function StatusBadge({ status, className }: { status: PermitStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
