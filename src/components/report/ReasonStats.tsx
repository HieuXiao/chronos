import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";
import { periodRange, shiftAnchor, type ChartPeriod } from "@/lib/chart";
import { goalOn, indexGoals, MAX_DAY_HOURS } from "@/lib/goals";
import { dailyTotals } from "@/lib/stats";
import { addLocalDays, dayKey, formatDate, formatDuration, weekdayName } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { DailyGoal, DayReason, Id, LocalDate, ReasonLabel } from "@/types";

/** Share of all label mentions that marks the "vital few" (Pareto principle). */
const PARETO_CUTOFF = 0.8;
const VIEW_KEY = "chronos.reasonView";
type View = "label" | "group";

interface Row {
  id: Id;
  name: string;
  /** Group name, for labels. */
  group?: string;
  /** Missed days the reason came up on. */
  count: number;
  days: LocalDate[];
  /** Among the reasons that together make up ~80% of all mentions. */
  vital: boolean;
}

interface PeriodStats {
  /** Passed days that had a work time to reach. */
  goalDays: number;
  metDays: number;
  /** Passed short days plus any day that has a reason. */
  missedDays: LocalDate[];
  unwritten: LocalDate[];
  /** Missed days with at least one label: the base for shares. */
  labelledDays: number;
  /** Average time short of the target over passed short days. */
  avgShortSec: number;
  byLabel: Row[];
  byGroup: Row[];
}

/**
 * Why days missed their work time, read like a quality report: three headline
 * figures on the left, a ranked (Pareto) list of causes on the right.
 */
export function ReasonStats({ period, anchorMs, nowMs }: { period: ChartPeriod; anchorMs: number; nowMs: number }) {
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const labels = useAppStore((s) => s.labels);
  const dayReasons = useAppStore((s) => s.dayReasons);
  const openDayReason = useUiStore((s) => s.openDayReason);
  const [view, setViewState] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "group" ? "group" : "label";
    } catch {
      return "label";
    }
  });
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Preference only.
    }
  };

  const { cur, prev } = useMemo(() => {
    const totals = dailyTotals(spans, nowMs);
    const input = { totals, goals, labels, dayReasons, nowMs };
    return {
      cur: computeStats(period, anchorMs, input),
      prev: computeStats(period, shiftAnchor(period, anchorMs, -1), input),
    };
  }, [period, anchorMs, nowMs, spans, goals, labels, dayReasons]);

  const hasGoal = goals.some((g) => g.projectId === null && g.minutes > 0);
  if (!hasGoal && dayReasons.length === 0) {
    return <Empty>Đặt thời gian cần đạt mỗi ngày trong Cài đặt để theo dõi ngày chưa đạt và nguyên nhân.</Empty>;
  }

  const rate = cur.goalDays > 0 ? cur.metDays / cur.goalDays : null;
  const prevRate = prev.goalDays > 0 ? prev.metDays / prev.goalDays : null;
  const delta = rate !== null && prevRate !== null ? Math.round((rate - prevRate) * 100) : null;
  const missed = cur.missedDays.length;
  const written = missed - cur.unwritten.length;
  const rows = view === "label" ? cur.byLabel : cur.byGroup;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[168px_minmax(0,1fr)] gap-5">
      {/* Headline figures */}
      <div className="grid min-h-0 content-start gap-2">
        <Kpi
          label="Tỉ lệ ngày đạt"
          value={rate === null ? "–" : `${Math.round(rate * 100)}%`}
          sub={
            <>
              {cur.metDays}/{cur.goalDays} ngày
              {delta !== null && delta !== 0 && (
                <span className={cn("ml-1.5 inline-flex items-center", delta > 0 ? "text-success" : "text-warning")}>
                  {delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {Math.abs(delta)} điểm
                </span>
              )}
            </>
          }
          tip="Số ngày đã qua đủ thời gian cần đạt, trên số ngày có đặt thời gian cần đạt. Mũi tên so với kỳ trước (điểm phần trăm)."
        />
        <Kpi
          label="Ngày chưa đạt"
          value={String(missed)}
          sub={
            missed === 0 ? (
              "không có"
            ) : cur.unwritten.length === 0 ? (
              "đã ghi đủ nguyên nhân"
            ) : (
              <button
                type="button"
                onClick={() => openDayReason(cur.unwritten[cur.unwritten.length - 1]!)}
                className="text-warning underline-offset-2 hover:underline"
                title={cur.unwritten.map(dayTitle).join("\n")}
              >
                {written}/{missed} đã ghi · ghi tiếp
              </button>
            )
          }
        />
        <Kpi
          label="Hụt trung bình"
          value={cur.avgShortSec > 0 ? formatDuration(cur.avgShortSec) : "–"}
          sub="mỗi ngày chưa đạt"
          tip="Thời gian còn thiếu so với mức cần đạt, tính trung bình trên các ngày chưa đạt đã qua."
        />
      </div>

      {/* Ranked causes */}
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium">Nguyên nhân chính</p>
          <InfoTip>
            Mỗi nguyên nhân tính bằng số ngày chưa đạt có gắn nhãn đó; phần trăm là trên các ngày đã ghi nguyên nhân (một ngày có thể có
            nhiều nhãn). Thanh đậm là nhóm nguyên nhân chính, cộng lại chiếm khoảng 80% số lần được ghi.
          </InfoTip>
          <div role="radiogroup" aria-label="Xem theo" className="ml-auto flex rounded-md bg-muted p-0.5">
            {(
              [
                ["label", "Nhãn"],
                ["group", "Nhóm"],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "rounded px-2 py-px text-[11px] transition-colors",
                  view === value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty>
            {missed === 0 ? "Không có ngày nào chưa đạt trong khoảng này." : "Chưa ghi nguyên nhân nào. Bấm vào chấm dưới ngày chưa đạt ở tab Thời gian."}
          </Empty>
        ) : (
          <ParetoList rows={rows} base={cur.labelledDays} />
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tip }: { label: string; value: string; sub: ReactNode; tip?: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </p>
      <p className="text-lg leading-tight font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">{sub}</p>
    </div>
  );
}

/** Horizontal bars, longest first; the vital few in the accent colour, the rest muted. */
function ParetoList({ rows, base }: { rows: Row[]; base: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="grid min-h-0 content-start gap-1 overflow-y-auto pr-1">
      {rows.map((r) => {
        const share = base > 0 ? Math.round((r.count / base) * 100) : 0;
        return (
          <li
            key={r.id}
            className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4.5rem] items-center gap-3 rounded px-1 py-0.5 text-xs hover:bg-muted/60"
            title={`${r.name}${r.group ? ` (${r.group})` : ""}: ${r.count} ngày, ${share}% số ngày đã ghi\n${r.days.map(dayTitle).join("\n")}`}
          >
            <span className="truncate">
              {r.name}
              {r.group && <span className="text-muted-foreground"> · {r.group}</span>}
            </span>
            <span className="h-2.5">
              <span
                className={cn("block h-full rounded-r", r.vital ? "bg-primary" : "bg-muted-foreground/35")}
                style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }}
              />
            </span>
            <span className="text-right tabular-nums">
              <span className="font-medium">{r.count}</span>
              <span className="text-muted-foreground"> · {share}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="flex flex-1 items-center justify-center px-6 text-center text-xs text-muted-foreground">{children}</p>;
}

function dayTitle(day: LocalDate): string {
  const d = new Date(`${day}T00:00`);
  return `${weekdayName(d)}, ${formatDate(d)}`;
}

interface StatsInput {
  totals: Map<string, number>;
  goals: DailyGoal[];
  labels: ReasonLabel[];
  dayReasons: DayReason[];
  nowMs: number;
}

function computeStats(period: ChartPeriod, anchorMs: number, { totals, goals, labels, dayReasons, nowMs }: StatsInput): PeriodStats {
  const { startMs, endMs } = periodRange(period, anchorMs);
  const today = dayKey(nowMs);
  const dayGoals = indexGoals(goals).day;
  const reasonOf = new Map(dayReasons.map((r) => [r.day, r]));

  let goalDays = 0;
  let metDays = 0;
  let shortSec = 0;
  let shortDays = 0;
  const missedDays: LocalDate[] = [];
  for (let ms = startMs; ms < endMs; ms = addLocalDays(ms, 1)) {
    const day = dayKey(ms);
    if (day > today) break;
    const targetSec = Math.min(MAX_DAY_HOURS * 60, goalOn(dayGoals, day)) * 60;
    const actual = totals.get(day) ?? 0;
    // Today is still running: it only counts once it has a reason.
    const passed = day < today && targetSec > 0;
    const short = passed && actual < targetSec;
    if (passed) {
      goalDays += 1;
      if (short) {
        shortDays += 1;
        shortSec += targetSec - actual;
      } else metDays += 1;
    }
    if (short || reasonOf.has(day)) missedDays.push(day);
  }

  const labelById = new Map(labels.map((l) => [l.id, l]));
  const groupName = new Map(labels.filter((l) => l.parentId === null).map((l) => [l.id, l.name]));
  const byLabel = new Map<Id, Row>();
  const byGroup = new Map<Id, Row>();
  let labelledDays = 0;
  for (const day of missedDays) {
    const reason = reasonOf.get(day);
    const known = (reason?.labelIds ?? []).map((id) => labelById.get(id)).filter((l): l is ReasonLabel => l !== undefined);
    if (known.length === 0) continue;
    labelledDays += 1;
    const groupsHit = new Set<Id>();
    for (const l of known) {
      bump(byLabel, l.id, day, () => ({ name: l.name, group: l.parentId === null ? undefined : groupName.get(l.parentId) }));
      const gid = l.parentId ?? l.id;
      if (!groupsHit.has(gid)) {
        groupsHit.add(gid);
        bump(byGroup, gid, day, () => ({ name: groupName.get(gid) ?? l.name }));
      }
    }
  }

  return {
    goalDays,
    metDays,
    missedDays,
    unwritten: missedDays.filter((d) => !reasonOf.has(d)),
    labelledDays,
    avgShortSec: shortDays > 0 ? shortSec / shortDays : 0,
    byLabel: pareto([...byLabel.values()]),
    byGroup: pareto([...byGroup.values()]),
  };
}

function bump(map: Map<Id, Row>, id: Id, day: LocalDate, init: () => Pick<Row, "name" | "group">) {
  const row = map.get(id) ?? { id, ...init(), count: 0, days: [], vital: false };
  row.count += 1;
  row.days.push(day);
  map.set(id, row);
}

/** Sorts by count and flags the rows that reach the cutoff share of all mentions. */
function pareto(rows: Row[]): Row[] {
  const sorted = rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  const total = sorted.reduce((sum, r) => sum + r.count, 0);
  let cumulative = 0;
  for (const r of sorted) {
    // A row is vital while the share before it is still under the cutoff.
    r.vital = total > 0 && cumulative / total < PARETO_CUTOFF;
    cumulative += r.count;
  }
  // Ties with the last vital row are vital too.
  const lastVital = [...sorted].reverse().find((r) => r.vital);
  if (lastVital) for (const r of sorted) if (r.count === lastVital.count) r.vital = true;
  return sorted;
}
