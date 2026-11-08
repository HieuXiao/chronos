import type { Id, Project, SessionSpan } from "@/types";
import { OTHER_SERIES_COLOR, projectColor } from "./colors";
import { addLocalDays, formatDate, startOfLocalDay, weekdayName } from "./time";

export type ChartPeriod = "week" | "month" | "year";

export interface Bucket {
  startMs: number;
  endMs: number;
  /** Short axis label. */
  label: string;
  /** Full label for the tooltip / table. */
  title: string;
  /** Starts after now: drawn as empty slot, excluded from lines. */
  future: boolean;
}

export interface ChartSeries {
  key: string;
  projectId: Id | null;
  name: string;
  color: string;
  /** Hours per bucket. */
  values: number[];
  totalHours: number;
  /**
   * Bucket indexes [from, to] where the project is active: from its start date
   * to its deadline (or now), widened to cover any tracked time outside it.
   * Lines are drawn only inside this range.
   */
  range: [number, number] | null;
}

/** Local midnight of a `YYYY-MM-DD` calendar date. */
export function localDateMs(date: string): number {
  return new Date(`${date}T00:00`).getTime();
}

function activeRange(
  buckets: Bucket[],
  values: number[],
  nowMs: number,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): [number, number] | null {
  const fromMs = startDate ? localDateMs(startDate) : -Infinity;
  const toMs = Math.min(nowMs, endDate ? addLocalDays(localDateMs(endDate), 1) : Infinity);
  let from = buckets.findIndex((b) => b.endMs > fromMs);
  let to = -1;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i]!.startMs < toMs) {
      to = i;
      break;
    }
  }
  if (from < 0 || to < from) {
    from = Infinity;
    to = -Infinity;
  }
  values.forEach((v, i) => {
    if (v > 0) {
      from = Math.min(from, i);
      to = Math.max(to, i);
    }
  });
  return Number.isFinite(from) && Number.isFinite(to) && from <= to ? [from, to] : null;
}

/** More series than palette slots fold into "Khác" (never generate new hues). */
const MAX_SERIES = 8;

const SHORT_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function startOfWeek(ms: number): number {
  const day = startOfLocalDay(ms);
  return addLocalDays(day, -((new Date(day).getDay() + 6) % 7));
}

export function periodRange(period: ChartPeriod, anchorMs: number): { startMs: number; endMs: number } {
  const d = new Date(anchorMs);
  switch (period) {
    case "week": {
      const startMs = startOfWeek(anchorMs);
      return { startMs, endMs: addLocalDays(startMs, 7) };
    }
    case "month":
      return {
        startMs: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        endMs: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
      };
    case "year":
      return {
        startMs: new Date(d.getFullYear(), 0, 1).getTime(),
        endMs: new Date(d.getFullYear() + 1, 0, 1).getTime(),
      };
  }
}

/** Moves the anchor one period back (-1) or forward (+1). */
export function shiftAnchor(period: ChartPeriod, anchorMs: number, dir: -1 | 1): number {
  const d = new Date(anchorMs);
  if (period === "week") return addLocalDays(anchorMs, 7 * dir);
  if (period === "month") return new Date(d.getFullYear(), d.getMonth() + dir, 1).getTime();
  return new Date(d.getFullYear() + dir, 0, 1).getTime();
}

export function periodLabel(period: ChartPeriod, anchorMs: number): string {
  const { startMs, endMs } = periodRange(period, anchorMs);
  const d = new Date(startMs);
  if (period === "week") {
    const last = addLocalDays(endMs, -1);
    return `${formatDate(startMs).slice(0, 5)} – ${formatDate(last)}`;
  }
  if (period === "month") return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  return `Năm ${d.getFullYear()}`;
}

export function buildBuckets(period: ChartPeriod, anchorMs: number, nowMs: number): Bucket[] {
  const { startMs, endMs } = periodRange(period, anchorMs);
  const buckets: Bucket[] = [];
  if (period === "year") {
    const year = new Date(startMs).getFullYear();
    for (let m = 0; m < 12; m++) {
      const s = new Date(year, m, 1).getTime();
      buckets.push({
        startMs: s,
        endMs: new Date(year, m + 1, 1).getTime(),
        label: `Th${m + 1}`,
        title: `Tháng ${m + 1}/${year}`,
        future: s > nowMs,
      });
    }
    return buckets;
  }
  for (let s = startMs, i = 0; s < endMs; s = addLocalDays(s, 1), i++) {
    const d = new Date(s);
    buckets.push({
      startMs: s,
      endMs: addLocalDays(s, 1),
      label: period === "week" ? (SHORT_WEEKDAYS[i] ?? "") : String(d.getDate()),
      title: `${weekdayName(d)}, ${formatDate(d)}`,
      future: s > nowMs,
    });
  }
  return buckets;
}

/**
 * Hours per bucket per project. Sessions crossing a bucket boundary (midnight,
 * month end) are split; a running session counts up to `nowMs`.
 * Series keep creation order so each project sits at the same place in the stack.
 */
export function buildSeries(
  spans: SessionSpan[],
  projects: Project[],
  buckets: Bucket[],
  nowMs: number,
): ChartSeries[] {
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  if (!first || !last) return [];
  const rangeStart = first.startMs;
  const rangeEnd = last.endMs;

  const secs = new Map<Id, number[]>();
  for (const span of spans) {
    const s = Date.parse(span.startedAt);
    const e = span.endedAt === null ? nowMs : Date.parse(span.endedAt);
    if (e <= rangeStart || s >= rangeEnd || e <= s) continue;
    let arr = secs.get(span.projectId);
    if (!arr) {
      arr = new Array<number>(buckets.length).fill(0);
      secs.set(span.projectId, arr);
    }
    // Binary search the first bucket that ends after the span starts.
    let lo = 0;
    let hi = buckets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (buckets[mid]!.endMs <= s) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < buckets.length; i++) {
      const b = buckets[i]!;
      if (b.startMs >= e) break;
      const overlap = Math.min(e, b.endMs) - Math.max(s, b.startMs);
      if (overlap > 0) arr[i]! += overlap / 1000;
    }
  }

  const byId = new Map(projects.map((p) => [p.id, p]));
  let series: ChartSeries[] = [...secs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([projectId, values]) => {
      const hours = values.map((v) => v / 3600);
      const p = byId.get(projectId);
      return {
        key: `p${projectId}`,
        projectId,
        name: p?.name ?? `#${projectId}`,
        color: projectColor(p?.color),
        values: hours,
        totalHours: hours.reduce((a, b) => a + b, 0),
        range: activeRange(buckets, hours, nowMs, p?.startDate, p?.endDate),
      };
    })
    .filter((s) => s.totalHours > 0);

  if (series.length > MAX_SERIES) {
    const keep = new Set(
      [...series]
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, MAX_SERIES - 1)
        .map((s) => s.key),
    );
    const rest = series.filter((s) => !keep.has(s.key));
    const ranges = rest.flatMap((s) => (s.range ? [s.range] : []));
    const other: ChartSeries = {
      key: "other",
      projectId: null,
      name: `Khác (${rest.length})`,
      color: OTHER_SERIES_COLOR,
      values: buckets.map((_, i) => rest.reduce((sum, s) => sum + (s.values[i] ?? 0), 0)),
      totalHours: rest.reduce((sum, s) => sum + s.totalHours, 0),
      range: ranges.length
        ? [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1]))]
        : null,
    };
    series = [...series.filter((s) => keep.has(s.key)), other];
  }
  return series;
}

/** Clean axis maximum and tick step in hours (e.g. 0/2/4/6). */
export function niceScale(maxValue: number, targetTicks = 4): { max: number; step: number } {
  // Never zoom below one hour: a few minutes shouldn't fill the whole chart.
  if (maxValue <= 1) return { max: 1, step: 0.25 };
  const raw = maxValue / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return { max: Math.ceil(maxValue / step) * step, step };
}
