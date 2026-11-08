import type { DailyGoal, Id, LocalDate, MissReason, Project, SessionSpan } from "@/types";
import { addLocalDays, dayKey, startOfLocalDay } from "./time";

/**
 * Daily goals: a goal for the whole day plus a minimum per project ("nhóm công
 * việc"). A day is judged against the goals that were in effect on that day.
 */

export interface GoalIndex {
  /** Whole-day goal history, oldest first. */
  total: DailyGoal[];
  byProject: Map<Id, DailyGoal[]>;
  /** Earliest day any goal applies; null when no goal was ever set. */
  firstDay: LocalDate | null;
}

export function indexGoals(goals: DailyGoal[]): GoalIndex {
  const sorted = [...goals].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id);
  const total: DailyGoal[] = [];
  const byProject = new Map<Id, DailyGoal[]>();
  let firstDay: LocalDate | null = null;
  for (const g of sorted) {
    if (g.minutes > 0 && (firstDay === null || g.effectiveFrom < firstDay)) firstDay = g.effectiveFrom;
    if (g.projectId === null) total.push(g);
    else {
      const list = byProject.get(g.projectId) ?? [];
      list.push(g);
      byProject.set(g.projectId, list);
    }
  }
  return { total, byProject, firstDay };
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

export interface GoalItem {
  /** null = the whole-day goal. */
  projectId: Id | null;
  targetMin: number;
  actualSec: number;
  met: boolean;
  /** Minutes still missing (0 when met). */
  shortMin: number;
}

export interface DayEvaluation {
  day: LocalDate;
  /** Whole-day goal first (when set), then projects in creation order. */
  items: GoalItem[];
  missed: GoalItem[];
  /** The day is over, so a miss is final (today is still in progress). */
  final: boolean;
}

/** Whether `project` counts on `day`: active and within its start date / deadline. */
export function projectActiveOn(project: Project, day: LocalDate): boolean {
  if (project.archived) return false;
  if (project.startDate && day < project.startDate) return false;
  if (project.endDate && day > project.endDate) return false;
  return true;
}

function item(projectId: Id | null, targetMin: number, actualSec: number): GoalItem {
  const shortMin = Math.max(0, Math.ceil(targetMin - actualSec / 60));
  return { projectId, targetMin, actualSec, met: shortMin === 0, shortMin };
}

export function evaluateDay(
  day: LocalDate,
  perProject: Map<Id, number> | undefined,
  index: GoalIndex,
  projects: Project[],
  today: LocalDate,
): DayEvaluation {
  const items: GoalItem[] = [];
  const totalTarget = goalOn(index.total, day);
  if (totalTarget > 0) {
    let sum = 0;
    perProject?.forEach((sec) => (sum += sec));
    items.push(item(null, totalTarget, sum));
  }
  for (const p of projects) {
    const target = goalOn(index.byProject.get(p.id), day);
    if (target <= 0 || !projectActiveOn(p, day)) continue;
    items.push(item(p.id, target, perProject?.get(p.id) ?? 0));
  }
  return { day, items, missed: items.filter((i) => !i.met), final: day < today };
}

export const reasonKey = (day: LocalDate, projectId: Id | null) => `${day}|${projectId ?? 0}`;

export function indexReasons(reasons: MissReason[]): Map<string, MissReason> {
  return new Map(reasons.map((r) => [reasonKey(r.day, r.projectId), r]));
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

/** Minutes → compact label: 90 → "1h30", 120 → "2h", 45 → "45m". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, "0")}`;
}
