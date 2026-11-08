import { useMemo } from "react";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/useNow";
import { currentStreak, dailyTotals } from "@/lib/stats";
import { dayKey, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
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
          </span>
          <StreakLabel streak={streak} />
        </div>
      ) : (
        <div className="grid h-full grid-cols-[170px_auto_minmax(0,1fr)] gap-6 p-4 pr-12">
          <TodayCard todaySec={todaySec} streak={streak} />
          <Heatmap daily={daily} nowMs={nowMs} />
          <ProjectProgressList nowMs={nowMs} />
        </div>
      )}
    </section>
  );
}

function TodayCard({ todaySec, streak }: { todaySec: number; streak: number }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Hôm nay</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatDuration(todaySec)}</p>
      </div>
      <StreakLabel streak={streak} />
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
