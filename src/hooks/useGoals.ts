import { useCallback, useMemo } from "react";
import {
  dailyProjectTotals,
  evaluateDay,
  indexGoals,
  indexReasons,
  reasonKey,
  type DayEvaluation,
} from "@/lib/goals";
import { dayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import type { Id, LocalDate, MissReason } from "@/types";

export interface GoalData {
  today: LocalDate;
  evaluate: (day: LocalDate) => DayEvaluation;
  reasonFor: (day: LocalDate, projectId: Id | null) => MissReason | undefined;
  /** Missed items of `ev` that have no reason recorded yet. */
  unexplained: (ev: DayEvaluation) => number;
  firstGoalDay: LocalDate | null;
}

/** Goal evaluation for any day, computed from sessions at `nowMs`. */
export function useGoals(nowMs: number): GoalData {
  const spans = useAppStore((s) => s.spans);
  const projects = useAppStore((s) => s.projects);
  const goals = useAppStore((s) => s.goals);
  const reasons = useAppStore((s) => s.reasons);

  const index = useMemo(() => indexGoals(goals), [goals]);
  const perDay = useMemo(() => dailyProjectTotals(spans, nowMs), [spans, nowMs]);
  const reasonIdx = useMemo(() => indexReasons(reasons), [reasons]);
  const today = dayKey(nowMs);

  const evaluate = useCallback(
    (day: LocalDate) => evaluateDay(day, perDay.get(day), index, projects, today),
    [perDay, index, projects, today],
  );
  const reasonFor = useCallback(
    (day: LocalDate, projectId: Id | null) => reasonIdx.get(reasonKey(day, projectId)),
    [reasonIdx],
  );
  const unexplained = useCallback(
    (ev: DayEvaluation) => ev.missed.filter((m) => !reasonIdx.has(reasonKey(ev.day, m.projectId))).length,
    [reasonIdx],
  );

  return { today, evaluate, reasonFor, unexplained, firstGoalDay: index.firstDay };
}
