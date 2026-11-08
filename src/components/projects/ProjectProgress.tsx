import { AlertTriangle, Check } from "lucide-react";
import { localDateMs } from "@/lib/chart";
import { forecastProject, type Forecast } from "@/lib/forecast";
import { formatMinutes } from "@/lib/goals";
import type { ProjectTotals } from "@/lib/stats";
import { formatDate, formatDuration, formatHours, localDayDiff } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

function Bar({ percent, color, className }: { percent: number; color: string; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <span
        className="block h-full rounded-full transition-[width]"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }}
      />
    </span>
  );
}

/** Today vs. the project's daily minimum. */
export function DailyGoalLine({ todaySec, targetMin, color }: { todaySec: number; targetMin: number; color: string }) {
  const met = todaySec / 60 >= targetMin;
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Chỉ tiêu hôm nay</span>
        <span className="flex items-center gap-1 tabular-nums">
          {formatDuration(todaySec)}
          <span className="text-muted-foreground">/ {formatMinutes(targetMin)}</span>
          {met && <Check className="size-3 text-green-400" aria-label="Đã đạt" />}
        </span>
      </div>
      <Bar percent={(todaySec / 60 / targetMin) * 100} color={color} />
    </div>
  );
}

/** Total hours vs. target, forecast and deadline status. */
export function TargetProgress({
  project,
  totals,
  nowMs,
  color,
}: {
  project: Project;
  totals: ProjectTotals;
  nowMs: number;
  color: string;
}) {
  const doneHours = totals.totalSec / 3600;
  const target = project.targetHours;
  const forecast = forecastProject(target, totals, nowMs);

  if (!target) {
    return (
      <p className="text-xs text-muted-foreground tabular-nums">
        Tổng {formatHours(doneHours)} · <span className="opacity-70">chưa đặt mục tiêu giờ</span>
      </p>
    );
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
        <span className="text-muted-foreground">
          {formatHours(doneHours)} / {formatHours(target)}{" "}
          <span className="text-foreground">{Math.floor((doneHours / target) * 100)}%</span>
        </span>
        <ForecastLabel forecast={forecast} />
      </div>
      <Bar percent={(doneHours / target) * 100} color={color} className="h-1 opacity-70" />
      <DeadlineLine
        endDate={project.endDate}
        forecast={forecast}
        remainingHours={target - doneHours}
        nowMs={nowMs}
      />
    </div>
  );
}

function ForecastLabel({ forecast }: { forecast: Forecast }) {
  switch (forecast.kind) {
    case "no-target":
      return null;
    case "reached":
      return <span className="font-medium text-green-400">Đã đạt mục tiêu 🎉</span>;
    case "insufficient-data":
      return (
        <span className="text-muted-foreground" title="Cần ít nhất 7 ngày dữ liệu và tốc độ lớn hơn 0">
          chưa đủ dữ liệu dự báo
        </span>
      );
    case "eta":
      return (
        <span
          className="text-muted-foreground"
          title={`Tốc độ ${formatHours(forecast.velocityHoursPerDay)}/ngày (14 ngày gần nhất) · còn ${formatHours(forecast.remainingHours)}`}
        >
          xong ~<span className="text-foreground">{formatDate(forecast.etaMs)}</span>
        </span>
      );
  }
}

/** Deadline vs. forecast: on track, late by N days, or overdue. */
function DeadlineLine({
  endDate,
  forecast,
  remainingHours,
  nowMs,
}: {
  endDate: string | null;
  forecast: Forecast;
  remainingHours: number;
  nowMs: number;
}) {
  if (!endDate || forecast.kind === "reached" || forecast.kind === "no-target") return null;
  const deadlineMs = localDateMs(endDate);
  const daysToDeadline = localDayDiff(nowMs, deadlineMs) + 1; // today included
  const needed = daysToDeadline > 0 ? remainingHours / daysToDeadline : null;

  let late: string | null = null;
  if (daysToDeadline <= 0) late = "đã quá hạn";
  else if (forecast.kind === "eta" && forecast.etaMs > deadlineMs) {
    late = `dự kiến trễ ${localDayDiff(deadlineMs, forecast.etaMs)} ngày`;
  }

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
      {late && <AlertTriangle className="size-3 shrink-0 text-amber-400" aria-hidden="true" />}
      <span className="truncate">
        Hạn {formatDate(deadlineMs)}
        {late ? <span className="text-amber-400"> · {late}</span> : forecast.kind === "eta" ? " · kịp hạn" : ""}
      </span>
      {needed !== null && <span className="ml-auto shrink-0">cần {formatHours(needed)}/ngày</span>}
    </p>
  );
}
