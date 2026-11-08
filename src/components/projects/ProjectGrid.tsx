import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { useActiveProjects, useProjectTotals } from "@/hooks/useStats";
import { dailyProjectTotals, goalOn, indexGoals, projectStreak } from "@/lib/goals";
import { dayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { ProjectCard } from "./ProjectCard";

const MIN_CARD = 300;
const GAP = 12;

/** 2 to 6 cards per row, depending on the window width. */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const fit = Math.floor((entry.contentRect.width + GAP) / (MIN_CARD + GAP));
      setCols(Math.min(6, Math.max(2, fit)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, cols] as const;
}

/** Part 2: one card per project. */
export function ProjectGrid() {
  const projects = useActiveProjects();
  const running = useAppStore((s) => s.running);
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const sidebarProjectId = useUiStore((s) => s.sidebarProjectId);
  const setProjectDialog = useUiStore((s) => s.setProjectDialog);
  // Every second while a clock runs; streaks only need minute resolution.
  const nowMs = useNow(running ? 1000 : 60_000);
  const minuteMs = useNow(60_000);
  const totalsOf = useProjectTotals(nowMs);
  const [gridRef, cols] = useColumns();

  const today = dayKey(minuteMs);
  const index = useMemo(() => indexGoals(goals), [goals]);
  const perDay = useMemo(() => dailyProjectTotals(spans, minuteMs), [spans, minuteMs]);
  const streaks = useMemo(
    () => new Map(projects.map((p) => [p.id, projectStreak(p.id, perDay, index, today)])),
    [projects, perDay, index, today],
  );

  return (
    <section className="p-5">
      <div ref={gridRef} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP }}>
        {projects.map((p) => {
          const totals = totalsOf(p.id);
          return (
            <ProjectCard
              key={p.id}
              project={p}
              running={running?.projectId === p.id}
              totalSec={totals.totalSec}
              todaySec={totals.todaySec}
              dailyMinMinutes={goalOn(index.byProject.get(p.id), today)}
              streak={streaks.get(p.id) ?? 0}
              selected={sidebarProjectId === p.id}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setProjectDialog({ mode: "create" })}
          className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="size-5" />
          <span className="text-sm font-medium">Thêm project</span>
        </button>
      </div>
    </section>
  );
}
