import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useNow } from "@/hooks/useNow";
import { useActiveProjects, useProjectTotals } from "@/hooks/useStats";
import { goalOn, indexGoals, projectActiveOn } from "@/lib/goals";
import { dayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { TimerCard } from "./TimerCard";

export function TimersPanel() {
  const projects = useActiveProjects();
  const running = useAppStore((s) => s.running);
  const sidebarProjectId = useUiStore((s) => s.sidebarProjectId);
  const setProjectDialog = useUiStore((s) => s.setProjectDialog);
  // Re-render trigger only; elapsed time is derived from started_at.
  const nowMs = useNow(running ? 1000 : 60_000);
  const totalsOf = useProjectTotals(nowMs);
  const goals = useAppStore((s) => s.goals);
  const today = dayKey(nowMs);
  // Only the goals matter here; avoid re-evaluating every session each second.
  const todayTargets = useMemo(() => {
    const index = indexGoals(goals);
    return new Map(
      projects.map((p) => [p.id, projectActiveOn(p, today) ? goalOn(index.byProject.get(p.id), today) : 0] as const),
    );
  }, [goals, projects, today]);

  return (
    <section className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {projects.map((project) => (
            <TimerCard
              key={project.id}
              project={project}
              running={running?.projectId === project.id ? running : null}
              totals={totalsOf(project.id)}
              dailyTargetMin={todayTargets.get(project.id) ?? 0}
              nowMs={nowMs}
              selected={sidebarProjectId === project.id}
            />
          ))}
          <button
            type="button"
            onClick={() => setProjectDialog({ mode: "create" })}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">Thêm project</span>
          </button>
        </div>
      </div>

      <Sidebar />
    </section>
  );
}
