import { STATUS_LABEL, type DayStatus } from "@/lib/goals";
import { cn } from "@/lib/utils";

const STYLE: Record<DayStatus, string> = {
  short: "bg-warning/15 text-warning",
  met: "bg-success/15 text-success",
  over: "bg-primary/15 text-primary",
};

/** "Chưa đạt" / "Đạt" / "Vượt" against a project's minimum per day. */
export function StatusChip({ status, className }: { status: DayStatus; className?: string }) {
  return (
    <span className={cn("rounded px-1.5 py-px text-xs font-medium whitespace-nowrap", STYLE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
