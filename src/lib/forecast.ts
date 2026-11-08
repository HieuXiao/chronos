import { VELOCITY_WINDOW_DAYS, type ProjectTotals } from "./stats";
import { addLocalDays, localDayDiff, startOfLocalDay } from "./time";

/** Minimum history (local days since the first session, inclusive) before forecasting. */
export const MIN_HISTORY_DAYS = 7;

export type Forecast =
  | { kind: "no-target" }
  | { kind: "reached" }
  | { kind: "insufficient-data"; velocityHoursPerDay: number }
  | { kind: "eta"; velocityHoursPerDay: number; remainingHours: number; daysLeft: number; etaMs: number };

/**
 * velocity  = hours tracked in the last 14 days / 14 (rest days included)
 * remaining = target_hours - hours tracked so far
 * eta       = today + ceil(remaining / velocity) days
 *
 * Returns "insufficient-data" instead of a misleading date when velocity is 0
 * or the project has fewer than 7 days of history.
 */
export function forecastProject(
  targetHours: number | null,
  totals: ProjectTotals,
  nowMs: number,
): Forecast {
  if (targetHours === null || targetHours <= 0) return { kind: "no-target" };

  const doneHours = totals.totalSec / 3600;
  const remainingHours = targetHours - doneHours;
  if (remainingHours <= 0) return { kind: "reached" };

  const velocityHoursPerDay = totals.windowSec / 3600 / VELOCITY_WINDOW_DAYS;
  const historyDays =
    totals.firstStartedMs === null ? 0 : localDayDiff(totals.firstStartedMs, nowMs) + 1;
  if (velocityHoursPerDay <= 0 || historyDays < MIN_HISTORY_DAYS) {
    return { kind: "insufficient-data", velocityHoursPerDay };
  }

  const daysLeft = Math.ceil(remainingHours / velocityHoursPerDay);
  return {
    kind: "eta",
    velocityHoursPerDay,
    remainingHours,
    daysLeft,
    etaMs: addLocalDays(startOfLocalDay(nowMs), daysLeft),
  };
}
