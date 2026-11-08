import { useMemo } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { useNow } from "@/hooks/useNow";
import { goalOn, indexGoals, MAX_DAY_HOURS } from "@/lib/goals";
import { dailyTotals } from "@/lib/stats";
import { addLocalDays, dayKey, formatDuration, formatHours, startOfLocalDay } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { WorkChart } from "./WorkChart";

/** Part 1: work time today and the stacked-column report. */
export function ReportSection() {
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const running = useAppStore((s) => s.running);
  // Minute resolution is enough; refresh faster while a timer runs.
  const nowMs = useNow(running ? 15_000 : 60_000);

  const daily = useMemo(() => dailyTotals(spans, nowMs), [spans, nowMs]);
  const today = dayKey(nowMs);
  const todaySec = daily.get(today) ?? 0;
  const targetH = Math.min(MAX_DAY_HOURS, goalOn(indexGoals(goals).day, today) / 60);
  const percent = targetH > 0 ? Math.min(100, (todaySec / 3600 / targetH) * 100) : 0;
  let weekSec = 0;
  for (let i = 0; i < 7; i++) weekSec += daily.get(dayKey(addLocalDays(startOfLocalDay(nowMs), -i))) ?? 0;

  return (
    <section className="flex h-[300px] shrink-0 gap-5 border-b px-5 py-4">
      <div className="flex w-52 shrink-0 flex-col justify-between rounded-xl border bg-card p-4">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">Thời gian làm việc</p>
            {targetH <= 0 && <InfoTip>Đặt số giờ cần làm mỗi ngày trong Cài đặt để có vạch mục tiêu.</InfoTip>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Hôm nay</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{formatDuration(todaySec)}</p>
          {targetH > 0 ? (
            <div className="mt-3 grid gap-1.5">
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full", percent >= 100 ? "bg-success" : "bg-primary")}
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {percent >= 100 ? (
                  <span className="text-success">Đủ {formatHours(targetH)} cần đạt</span>
                ) : (
                  <>
                    còn <span className="text-foreground">{formatDuration(targetH * 3600 - todaySec)}</span> / {formatHours(targetH)}
                  </>
                )}
              </span>
            </div>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          7 ngày qua <span className="font-medium text-foreground">{formatDuration(weekSec)}</span>
          <br />
          trung bình {formatDuration(weekSec / 7)}/ngày
        </div>
      </div>
      <WorkChart nowMs={nowMs} />
    </section>
  );
}
