import { useMemo } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoals } from "@/hooks/useGoals";
import { useNow } from "@/hooks/useNow";
import { formatMinutes, type DayEvaluation } from "@/lib/goals";
import { currentStreak, dailyTotals } from "@/lib/stats";
import { dayKey, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { ActivityChart } from "./ActivityChart";
import { Heatmap } from "./Heatmap";
import { ProjectProgressList } from "./ProjectProgressList";

export const DASHBOARD_HEIGHT = 240;
const COLLAPSED_HEIGHT = 44;

export function Dashboard() {
  const spans = useAppStore((s) => s.spans);
  const running = useAppStore((s) => s.running);
  const collapsed = useUiStore((s) => s.dashboardCollapsed);
  const toggleDashboard = useUiStore((s) => s.toggleDashboard);

  // Minute resolution is enough here; refresh faster while a timer runs.
  const nowMs = useNow(running ? 15_000 : 60_000);
  const daily = useMemo(() => dailyTotals(spans, nowMs), [spans, nowMs]);
  const todaySec = daily.get(dayKey(nowMs)) ?? 0;
  const streak = currentStreak(daily, nowMs);
  const goals = useGoals(nowMs);
  const todayEval = goals.evaluate(goals.today);
  const dayGoal = todayEval.items.find((i) => i.projectId === null)?.targetMin ?? 0;

  return (
    <section
      className="relative shrink-0 overflow-hidden border-b transition-[height] duration-200 ease-out"
      style={{ height: collapsed ? COLLAPSED_HEIGHT : DASHBOARD_HEIGHT }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleDashboard}
        className="absolute top-1.5 right-2 z-10 text-muted-foreground"
        aria-label={collapsed ? "Mở rộng dashboard" : "Thu gọn dashboard"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronDown /> : <ChevronUp />}
      </Button>

      {collapsed ? (
        <div className="flex h-full items-center gap-6 px-4 text-sm">
          <span className="text-muted-foreground">
            Hôm nay <span className="font-semibold text-foreground">{formatDuration(todaySec)}</span>
            {dayGoal > 0 && <span className="tabular-nums"> / {formatMinutes(dayGoal)}</span>}
          </span>
          {todayEval.items.length > 0 && (
            <span className="text-muted-foreground tabular-nums">
              Chỉ tiêu {todayEval.items.length - todayEval.missed.length}/{todayEval.items.length}
            </span>
          )}
          <StreakLabel streak={streak} />
        </div>
      ) : (
        <div className="flex h-full gap-5 p-4 pr-12">
          <TodayCard todaySec={todaySec} streak={streak} dayGoal={dayGoal} ev={todayEval} />
          {/* Heatmap gives way to the chart on narrow windows. */}
          <div className="hidden shrink-0 xl:flex">
            <Heatmap daily={daily} nowMs={nowMs} />
          </div>
          <ActivityChart nowMs={nowMs} />
          <div className="flex w-[clamp(240px,28%,400px)] shrink-0">
            <ProjectProgressList nowMs={nowMs} />
          </div>
        </div>
      )}
    </section>
  );
}

interface TodayCardProps {
  todaySec: number;
  streak: number;
  /** Whole-day goal in minutes (0 = none). */
  dayGoal: number;
  ev: DayEvaluation;
}

function TodayCard({ todaySec, streak, dayGoal, ev }: TodayCardProps) {
  const setReviewDay = useUiStore((s) => s.setReviewDay);
  const percent = dayGoal > 0 ? Math.min(100, (todaySec / 60 / dayGoal) * 100) : 0;
  const met = ev.items.length - ev.missed.length;
  return (
    <div className="flex w-[160px] shrink-0 flex-col justify-between gap-2 rounded-xl border bg-card p-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Hôm nay</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatDuration(todaySec)}</p>
        {dayGoal > 0 && (
          <div className="mt-1.5 grid gap-1">
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", percent >= 100 ? "bg-green-500" : "bg-primary")}
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">mục tiêu {formatMinutes(dayGoal)}</span>
          </div>
        )}
      </div>
      <div className="grid gap-1.5">
        {ev.items.length > 0 && (
          <button
            type="button"
            onClick={() => setReviewDay(ev.day)}
            className="flex items-center gap-1.5 text-left text-xs whitespace-nowrap text-muted-foreground hover:text-foreground"
            title="Xem chỉ tiêu và ghi lý do"
          >
            <ClipboardCheck className="size-3.5 shrink-0" />
            Chỉ tiêu
            <span className={cn("tabular-nums", met === ev.items.length ? "text-green-400" : "text-foreground")}>
              {met}/{ev.items.length}
            </span>
            <span className="underline underline-offset-2">Tổng kết</span>
          </button>
        )}
        <StreakLabel streak={streak} />
      </div>
    </div>
  );
}

function StreakLabel({ streak }: { streak: number }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-sm", streak > 0 ? "text-orange-400" : "text-muted-foreground")}>
      <Flame className="size-4" />
      {streak > 0 ? `${streak} ngày liên tục` : "Chưa có chuỗi ngày"}
    </p>
  );
}
