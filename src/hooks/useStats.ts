import { useMemo } from "react";
import { takenColors } from "@/lib/colors";
import { EMPTY_TOTALS, projectTotals, type ProjectTotals } from "@/lib/stats";
import { useAppStore } from "@/store/appStore";
import type { Id, Project } from "@/types";
import { useNow } from "./useNow";

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

/** Colours held by other unfinished projects (see `takenColors`), at minute resolution. */
export function useTakenColors(exceptId?: Id): Map<string, string> {
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  const nowMs = useNow(60_000);
  return useMemo(() => {
    const totals = projectTotals(spans, nowMs);
    return takenColors(projects, (id) => (totals.get(id)?.totalSec ?? 0) / 3600, exceptId);
  }, [projects, spans, nowMs, exceptId]);
}
