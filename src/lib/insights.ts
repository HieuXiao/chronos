import type { Id, LocalDate, MissLabel, MissReason } from "@/types";
import { eachDay, reasonKey, type DayEvaluation } from "./goals";

export interface LabelStat {
  label: MissLabel;
  /** Misses tagged with this label. */
  count: number;
  /** Share of the misses that have a reason. */
  share: number;
  /** Minutes missing across those misses. */
  shortMin: number;
  /** Group hit most often by this reason (null = whole-day goal). */
  topProjectId: Id | null | undefined;
  lastDay: LocalDate;
}

export interface GroupStat {
  projectId: Id | null;
  days: number;
  metDays: number;
  actualSec: number;
  targetMin: number;
  shortMin: number;
}

export interface Insights {
  from: LocalDate;
  to: LocalDate;
  /** Days with at least one goal. */
  goalDays: number;
  /** Days where every goal was met. */
  perfectDays: number;
  misses: number;
  explained: number;
  shortMin: number;
  labels: LabelStat[];
  groups: GroupStat[];
  /** Days with a miss that has no reason yet, newest first. */
  pendingDays: LocalDate[];
  /** Recorded reasons, newest first. */
  recent: MissReason[];
}

/** Statistics over finished days in [from, to]. */
export function buildInsights(
  from: LocalDate,
  to: LocalDate,
  evaluate: (day: LocalDate) => DayEvaluation,
  reasons: MissReason[],
  labels: MissLabel[],
): Insights {
  const reasonIdx = new Map(reasons.map((r) => [reasonKey(r.day, r.projectId), r]));
  const groups = new Map<string, GroupStat>();
  const shortByKey = new Map<string, number>();
  const result: Insights = {
    from,
    to,
    goalDays: 0,
    perfectDays: 0,
    misses: 0,
    explained: 0,
    shortMin: 0,
    labels: [],
    groups: [],
    pendingDays: [],
    recent: [],
  };

  const days = from <= to ? eachDay(from, to) : [];
  for (const day of days) {
    const ev = evaluate(day);
    if (ev.items.length === 0) continue;
    result.goalDays += 1;
    if (ev.missed.length === 0) result.perfectDays += 1;
    let pending = false;
    for (const item of ev.items) {
      const gk = String(item.projectId ?? 0);
      const g = groups.get(gk) ?? {
        projectId: item.projectId,
        days: 0,
        metDays: 0,
        actualSec: 0,
        targetMin: 0,
        shortMin: 0,
      };
      g.days += 1;
      g.actualSec += item.actualSec;
      g.targetMin += item.targetMin;
      if (item.met) g.metDays += 1;
      else g.shortMin += item.shortMin;
      groups.set(gk, g);
      if (item.met) continue;

      result.misses += 1;
      result.shortMin += item.shortMin;
      const key = reasonKey(day, item.projectId);
      shortByKey.set(key, item.shortMin);
      const r = reasonIdx.get(key);
      if (r && (r.labelIds.length > 0 || r.note)) result.explained += 1;
      else pending = true;
    }
    if (pending) result.pendingDays.push(day);
  }
  result.pendingDays.reverse();

  const inRange = reasons.filter((r) => r.day >= from && r.day <= to);
  result.recent = [...inRange].sort((a, b) => b.day.localeCompare(a.day) || b.id - a.id);

  const labelById = new Map(labels.map((l) => [l.id, l]));
  const acc = new Map<Id, { count: number; shortMin: number; lastDay: LocalDate; byGroup: Map<string, number> }>();
  for (const r of inRange) {
    for (const id of r.labelIds) {
      const a = acc.get(id) ?? { count: 0, shortMin: 0, lastDay: r.day, byGroup: new Map() };
      a.count += 1;
      a.shortMin += shortByKey.get(reasonKey(r.day, r.projectId)) ?? 0;
      if (r.day > a.lastDay) a.lastDay = r.day;
      const gk = String(r.projectId ?? 0);
      a.byGroup.set(gk, (a.byGroup.get(gk) ?? 0) + 1);
      acc.set(id, a);
    }
  }
  const labelled = inRange.filter((r) => r.labelIds.length > 0).length;
  result.labels = [...acc.entries()]
    .flatMap(([id, a]) => {
      const label = labelById.get(id);
      if (!label) return [];
      const top = [...a.byGroup.entries()].sort((x, y) => y[1] - x[1])[0];
      return [
        {
          label,
          count: a.count,
          share: labelled ? a.count / labelled : 0,
          shortMin: a.shortMin,
          topProjectId: top ? (top[0] === "0" ? null : Number(top[0])) : undefined,
          lastDay: a.lastDay,
        },
      ];
    })
    .sort((a, b) => b.count - a.count || b.shortMin - a.shortMin);

  result.groups = [...groups.values()].sort((a, b) => {
    if (a.projectId === null) return -1;
    if (b.projectId === null) return 1;
    return a.metDays / a.days - b.metDays / b.days;
  });
  return result;
}
