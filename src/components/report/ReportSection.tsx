import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { useNow } from "@/hooks/useNow";
import { periodLabel, periodRange, shiftAnchor, type ChartPeriod } from "@/lib/chart";
import { goalOn, indexGoals, MAX_DAY_HOURS } from "@/lib/goals";
import { dailyTotals } from "@/lib/stats";
import { addLocalDays, dayKey, formatDuration, formatHours, startOfLocalDay } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { PeriodPicker } from "./PeriodPicker";
import { ReasonStats } from "./ReasonStats";
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
      <ReportPanel nowMs={nowMs} />
    </section>
  );
}

const PERIOD_KEY = "chronos.chartPeriod";
const TAB_KEY = "chronos.reportTab";
type ReportTab = "chart" | "reasons";

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preference only.
  }
}

/** Two tabs over one period: time per day as a chart, and reasons for missed days. */
function ReportPanel({ nowMs }: { nowMs: number }) {
  const [tab, setTabState] = useState<ReportTab>(() => readPref(TAB_KEY, ["chart", "reasons"], "chart"));
  const [period, setPeriodState] = useState<ChartPeriod>(() => readPref(PERIOD_KEY, ["week", "month", "year"], "week"));
  const [anchorMs, setAnchorMs] = useState(() => Date.now());

  const setTab = (t: ReportTab) => {
    setTabState(t);
    writePref(TAB_KEY, t);
  };
  const setPeriod = (p: ChartPeriod) => {
    setPeriodState(p);
    writePref(PERIOD_KEY, p);
  };

  const range = periodRange(period, anchorMs);
  const isCurrent = range.startMs <= nowMs && nowMs < range.endMs;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Báo cáo" className="flex items-center gap-3">
          {(
            [
              ["chart", "Thời gian"],
              ["reasons", "Nguyên nhân"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "-mb-px border-b-2 pb-0.5 text-[13px] transition-colors",
                tab === value
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon-xs" aria-label="Khoảng trước" onClick={() => setAnchorMs((a) => shiftAnchor(period, a, -1))}>
            <ChevronLeft />
          </Button>
          <PeriodPicker
            period={period}
            anchorMs={anchorMs}
            nowMs={nowMs}
            label={periodLabel(period, anchorMs)}
            onPick={setAnchorMs}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Khoảng sau"
            disabled={isCurrent}
            onClick={() => setAnchorMs((a) => shiftAnchor(period, a, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <div role="radiogroup" aria-label="Khoảng thời gian" className="flex rounded-md bg-muted p-0.5">
          {(
            [
              ["week", "Tuần"],
              ["month", "Tháng"],
              ["year", "Năm"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={period === value}
              onClick={() => setPeriod(value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                period === value ? "bg-primary font-medium text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "chart" ? (
        <WorkChart
          period={period}
          anchorMs={anchorMs}
          nowMs={nowMs}
          onOpenMonth={(ms) => {
            setPeriod("month");
            setAnchorMs(ms);
          }}
        />
      ) : (
        <ReasonStats period={period} anchorMs={anchorMs} nowMs={nowMs} />
      )}
    </div>
  );
}
