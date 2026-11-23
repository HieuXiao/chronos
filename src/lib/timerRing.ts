import { goalOn, indexGoals } from "@/lib/goals";
import { overlapSec } from "@/lib/stats";
import { addLocalDays, dayKey, startOfLocalDay } from "@/lib/time";
import type { DailyGoal, Project, Session, SessionSpan } from "@/types";

export interface TimerRing {
  project: Project;
  running: boolean;
  /** Length of the running session (0 when stopped). */
  sessionSec: number;
  /** The project's time today, running session included. */
  todaySec: number;
  /** The project's daily minimum today (0 = none). */
  minSec: number;
  /**
   * How full the ring is, 0–1: today's time against the daily minimum, or,
   * without a minimum, the running session's current hour (fills every hour).
   */
  fraction: number;
}

/** What the mini clock and the taskbar ring show for `project` at `nowMs`. */
export function timerRing(
  project: Project,
  running: Session | null,
  spans: SessionSpan[],
  goals: DailyGoal[],
  nowMs: number,
): TimerRing {
  const isRunning = running?.projectId === project.id;
  const sessionSec = isRunning ? Math.max(0, (nowMs - Date.parse(running.startedAt)) / 1000) : 0;
  const dayStart = startOfLocalDay(nowMs);
  const dayEnd = addLocalDays(dayStart, 1);
  const todaySec = spans
    .filter((s) => s.projectId === project.id)
    .reduce((sum, s) => sum + overlapSec(s, dayStart, dayEnd, nowMs), 0);
  const minSec = goalOn(indexGoals(goals).byProject.get(project.id), dayKey(nowMs)) * 60;
  const fraction = minSec > 0 ? Math.min(1, todaySec / minSec) : (sessionSec % 3600) / 3600;
  return { project, running: isRunning, sessionSec, todaySec, minSec, fraction };
}
