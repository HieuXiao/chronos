import { useMemo } from "react";
import { EMPTY_TOTALS, projectTotals, type ProjectTotals } from "@/lib/stats";
import { useAppStore } from "@/store/appStore";
import type { Id, Project } from "@/types";

export function useActiveProjects(): Project[] {
  const projects = useAppStore((s) => s.projects);
  return useMemo(() => projects.filter((p) => !p.archived), [projects]);
}

/** Per-project totals at `nowMs` (running session included). */
export function useProjectTotals(nowMs: number): (id: Id) => ProjectTotals {
  const spans = useAppStore((s) => s.spans);
  const totals = useMemo(() => projectTotals(spans, nowMs), [spans, nowMs]);
  return (id) => totals.get(id) ?? EMPTY_TOTALS;
}
