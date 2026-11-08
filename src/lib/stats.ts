import type { Id, SessionSpan } from "@/types";
import { addLocalDays, dayKey, startOfLocalDay } from "./time";

/** [startMs, endMs) of a span; running sessions end at `nowMs`. */
function spanBounds(span: SessionSpan, nowMs: number): [number, number] {
  const start = Date.parse(span.startedAt);
  const end = span.endedAt === null ? nowMs : Date.parse(span.endedAt);
  return [start, Math.max(start, end)];
}

/** Seconds of `span` falling inside [fromMs, toMs). */
export function overlapSec(span: SessionSpan, fromMs: number, toMs: number, nowMs: number): number {
  const [start, end] = spanBounds(span, nowMs);
  const ms = Math.min(end, toMs) - Math.max(start, fromMs);
  return ms > 0 ? ms / 1000 : 0;
}

/** Seconds per local day (`YYYY-MM-DD`), splitting sessions that cross midnight. */
export function dailyTotals(spans: SessionSpan[], nowMs: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const span of spans) {
    const [start, end] = spanBounds(span, nowMs);
    let cursor = start;
    while (cursor < end) {
      const nextMidnight = addLocalDays(startOfLocalDay(cursor), 1);
      const segmentEnd = Math.min(end, nextMidnight);
      const key = dayKey(cursor);
      totals.set(key, (totals.get(key) ?? 0) + (segmentEnd - cursor) / 1000);
      cursor = segmentEnd;
    }
  }
  return totals;
}

/**
 * Consecutive days with tracked time, ending today. If nothing is tracked yet
 * today the streak is still alive and counts up to yesterday.
 */
export function currentStreak(daily: Map<string, number>, nowMs: number): number {
  let day = startOfLocalDay(nowMs);
  if (!(daily.get(dayKey(day)) ?? 0)) day = addLocalDays(day, -1);
  let streak = 0;
  while ((daily.get(dayKey(day)) ?? 0) > 0) {
    streak += 1;
    day = addLocalDays(day, -1);
  }
  return streak;
}

export interface ProjectTotals {
  totalSec: number;
  todaySec: number;
  /** Tracked seconds in the last `VELOCITY_WINDOW_DAYS` local days, today included. */
  windowSec: number;
  /** Start of the project's first session (ms), or null if never tracked. */
  firstStartedMs: number | null;
}

export const VELOCITY_WINDOW_DAYS = 14;

export function projectTotals(spans: SessionSpan[], nowMs: number): Map<Id, ProjectTotals> {
  const todayStart = startOfLocalDay(nowMs);
  const tomorrowStart = addLocalDays(todayStart, 1);
  const windowStart = addLocalDays(todayStart, -(VELOCITY_WINDOW_DAYS - 1));

  const result = new Map<Id, ProjectTotals>();
  for (const span of spans) {
    let t = result.get(span.projectId);
    if (!t) {
      t = { totalSec: 0, todaySec: 0, windowSec: 0, firstStartedMs: null };
      result.set(span.projectId, t);
    }
    const [start, end] = spanBounds(span, nowMs);
    t.totalSec += (end - start) / 1000;
    t.todaySec += overlapSec(span, todayStart, tomorrowStart, nowMs);
    t.windowSec += overlapSec(span, windowStart, tomorrowStart, nowMs);
    if (t.firstStartedMs === null || start < t.firstStartedMs) t.firstStartedMs = start;
  }
  return result;
}

export const EMPTY_TOTALS: ProjectTotals = { totalSec: 0, todaySec: 0, windowSec: 0, firstStartedMs: null };
