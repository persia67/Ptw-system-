import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/ptw/defaults";
import type { PermitStatus } from "@/lib/ptw/types";

const CLASS: Record<PermitStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
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
