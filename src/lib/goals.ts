import type { DailyGoal, Id, LocalDate, Project, SessionSpan } from "@/types";
import { addLocalDays, dayKey, startOfLocalDay } from "./time";

/**
 * Goals: the work time needed per day (drawn as a line on the chart, at most
 * 16 h) and each project's minimum per day. A day is judged against the goals
 * that were in effect on that day.
 */

/** Highest work time per day that can be set. */
export const MAX_DAY_HOURS = 16;

export interface GoalIndex {
  /** Work time per day, oldest first. */
  day: DailyGoal[];
  byProject: Map<Id, DailyGoal[]>;
}

export function indexGoals(goals: DailyGoal[]): GoalIndex {
  const sorted = [...goals].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id);
  const index: GoalIndex = { day: [], byProject: new Map() };
  for (const g of sorted) {
    if (g.projectId === null) index.day.push(g);
    else {
      const list = index.byProject.get(g.projectId) ?? [];
      list.push(g);
      index.byProject.set(g.projectId, list);
    }
  }
  return index;
}

/** Goal minutes in effect on `day` (0 = none). Entries must be oldest first. */
export function goalOn(entries: DailyGoal[] | undefined, day: LocalDate): number {
  if (!entries) return 0;
  let minutes = 0;
  for (const g of entries) {
    if (g.effectiveFrom > day) break;
    minutes = g.minutes;
  }
  return minutes;
}

/** Seconds per local day per project, splitting sessions at midnight. */
export function dailyProjectTotals(spans: SessionSpan[], nowMs: number): Map<LocalDate, Map<Id, number>> {
  const result = new Map<LocalDate, Map<Id, number>>();
  for (const span of spans) {
    const start = Date.parse(span.startedAt);
    const end = Math.max(start, span.endedAt === null ? nowMs : Date.parse(span.endedAt));
    let cursor = start;
    while (cursor < end) {
      const segmentEnd = Math.min(end, addLocalDays(startOfLocalDay(cursor), 1));
      const key = dayKey(cursor);
      let day = result.get(key);
      if (!day) {
        day = new Map();
        result.set(key, day);
      }
      day.set(span.projectId, (day.get(span.projectId) ?? 0) + (segmentEnd - cursor) / 1000);
      cursor = segmentEnd;
    }
  }
  return result;
}

/** Clearly over the minimum: at least 20% and 15 minutes more. */
export const OVER_RATIO = 1.2;
export const OVER_MIN_MINUTES = 15;

export type DayStatus = "short" | "met" | "over";

export const STATUS_LABEL: Record<DayStatus, string> = { short: "Chưa đạt", met: "Đạt", over: "Vượt" };

/** How a project did against its minimum; null when it has no minimum. */
export function dayStatus(actualSec: number, targetMin: number): DayStatus | null {
  if (targetMin <= 0) return null;
  const actualMin = actualSec / 60;
  if (actualMin < targetMin) return "short";
  return actualMin >= targetMin * OVER_RATIO && actualMin - targetMin >= OVER_MIN_MINUTES ? "over" : "met";
}

/** Whether `project` counts on `day`: active and within its start date / deadline. */
export function projectActiveOn(project: Project, day: LocalDate): boolean {
  if (project.archived) return false;
  if (project.startDate && day < project.startDate) return false;
  if (project.endDate && day > project.endDate) return false;
  return true;
}

/**
 * Days in a row the project did its part: met its minimum when it has one,
 * otherwise any tracked time. Ends yesterday, or today once today counts.
 */
export function projectStreak(
  projectId: Id,
  perDay: Map<LocalDate, Map<Id, number>>,
  index: GoalIndex,
  today: LocalDate,
): number {
  const done = (day: LocalDate) => {
    const sec = perDay.get(day)?.get(projectId) ?? 0;
    const min = goalOn(index.byProject.get(projectId), day);
    return min > 0 ? sec / 60 >= min : sec > 0;
  };
  let day = today;
  let streak = 0;
  if (done(day)) streak = 1;
  for (let i = 0; i < 3650; i++) {
    day = dayKey(addLocalDays(new Date(`${day}T00:00`).getTime(), -1));
    if (!done(day)) break;
    streak += 1;
  }
  return streak;
}

/** Local days from `from` to `to` inclusive. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  let ms = new Date(`${from}T00:00`).getTime();
  const end = new Date(`${to}T00:00`).getTime();
  while (ms <= end && days.length < 5000) {
    days.push(dayKey(ms));
    ms = addLocalDays(ms, 1);
  }
  return days;
}

// ---- Input helpers ---------------------------------------------------------

/** Parses "2", "1.5", "1,5", "1:30" or "90m" into minutes; "" → 0; invalid → null. */
export function parseHoursInput(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (v === "") return 0;
  const hm = /^(\d{1,2}):([0-5]\d)$/.exec(v);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const m = /^(\d+)\s*m$/.exec(v);
  if (m) return Number(m[1]);
  const n = Number(v.replace(/h$/, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60);
}

/** Minutes → text for an hours input: 90 → "1.5", 0 → "". */
export function minutesToInput(minutes: number): string {
  if (minutes <= 0) return "";
  const h = minutes / 60;
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 100) / 100);
}

/** Minutes → label matching formatDuration: 90 → "1h 30m", 120 → "2h", 45 → "45m". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${String(rest).padStart(2, "0")}m`;
}
