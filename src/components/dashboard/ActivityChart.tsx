import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildBuckets,
  buildSeries,
  niceScale,
  periodLabel,
  periodRange,
  shiftAnchor,
  type Bucket,
  type ChartPeriod,
  type ChartSeries,
} from "@/lib/chart";
import { useGoals, type GoalData } from "@/hooks/useGoals";
import { formatMinutes, type DayEvaluation } from "@/lib/goals";
import { dayKey, formatDuration, formatHours } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { MissLabel, Project } from "@/types";

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];
const PERIOD_KEY = "chronos.chartPeriod";

const MARGIN = { top: 6, right: 6, bottom: 18, left: 30 };
const MAX_BAR = 24;
const SEGMENT_GAP = 2;
const RADIUS = 4;
/** Status "warning" (amber-400); always paired with text in tooltip / legend. */
const WARN_COLOR = "#fbbf24";

function readPeriod(): ChartPeriod {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return v === "week" || v === "month" || v === "year" ? v : "week";
  } catch {
    return "week";
  }
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Path of a bar with rounded top corners and a square base. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/**
 * Time per project per day as stacked columns (week / month);
 * the year view switches to one line per project over months.
 */
export function ActivityChart({ nowMs }: { nowMs: number }) {
  const spans = useAppStore((s) => s.spans);
  const projects = useAppStore((s) => s.projects);
  const labels = useAppStore((s) => s.labels);
  const setReviewDay = useUiStore((s) => s.setReviewDay);
  const goals = useGoals(nowMs);

  const [period, setPeriodState] = useState<ChartPeriod>(readPeriod);
  const [anchorMs, setAnchorMs] = useState(() => Date.now());
  const [hover, setHover] = useState<number | null>(null);
  const [plotRef, size] = useSize<HTMLDivElement>();

  const setPeriod = (p: ChartPeriod) => {
    setPeriodState(p);
    setHover(null);
    try {
      localStorage.setItem(PERIOD_KEY, p);
    } catch {
      // Preference only.
    }
  };

  const isCurrent = periodRange(period, anchorMs).endMs > nowMs && periodRange(period, anchorMs).startMs <= nowMs;
  const buckets = useMemo(() => buildBuckets(period, anchorMs, nowMs), [period, anchorMs, nowMs]);
  const series = useMemo(() => buildSeries(spans, projects, buckets, nowMs), [spans, projects, buckets, nowMs]);
  const totals = buckets.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const asLine = period === "year";
  // Goals are per day, so only the week / month views show them.
  const evals = useMemo(
    () => (asLine ? [] : buckets.map((b) => goals.evaluate(dayKey(b.startMs)))),
    [asLine, buckets, goals],
  );
  const dayTargets = evals.map((ev) => (ev.items.find((i) => i.projectId === null)?.targetMin ?? 0) / 60);
  const hasGoals = evals.some((ev) => ev.items.length > 0);

  const maxValue = asLine
    ? Math.max(0, ...series.flatMap((s) => s.values))
    : Math.max(0, ...totals, ...dayTargets);
  const { max, step } = niceScale(maxValue);

  const plotW = Math.max(0, size.width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, size.height - MARGIN.top - MARGIN.bottom);
  const band = buckets.length ? plotW / buckets.length : 0;
  const y = (v: number) => MARGIN.top + plotH - (v / max) * plotH;
  const cx = (i: number) => MARGIN.left + band * i + band / 2;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const todayIndex = buckets.findIndex((b) => b.startMs <= nowMs && nowMs < b.endMs);

  const showLabel = (i: number) => {
    if (period !== "month") return true;
    const day = i + 1;
    return day === 1 || day % 5 === 0;
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">Hoạt động</p>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Khoảng trước"
            onClick={() => {
              setAnchorMs((a) => shiftAnchor(period, a, -1));
              setHover(null);
            }}
          >
            <ChevronLeft />
          </Button>
          <button
            type="button"
            className="min-w-24 text-center text-xs whitespace-nowrap tabular-nums text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground"
            title={isCurrent ? undefined : "Về hiện tại"}
            disabled={isCurrent}
            onClick={() => setAnchorMs(Date.now())}
          >
            {periodLabel(period, anchorMs)}
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Khoảng sau"
            disabled={isCurrent}
            onClick={() => {
              setAnchorMs((a) => shiftAnchor(period, a, 1));
              setHover(null);
            }}
          >
            <ChevronRight />
          </Button>
        </div>
        <div role="radiogroup" aria-label="Khoảng thời gian" className="flex rounded-md bg-muted p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={period === p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                period === p.value
                  ? "bg-primary font-medium text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={plotRef} className="relative min-h-0 flex-1" onPointerLeave={() => setHover(null)}>
        {size.width > 0 && size.height > 0 && (
          <svg width={size.width} height={size.height} className="block overflow-visible" aria-hidden="true">
            {/* Gridlines + y labels */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={MARGIN.left - 6}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {t === 0 ? "0" : t < 1 ? `${Math.round(t * 60)}m` : formatHours(t)}
                </text>
              </g>
            ))}

            {/* Hovered column highlight */}
            {hover !== null && (
              <rect
                x={MARGIN.left + band * hover}
                y={MARGIN.top}
                width={band}
                height={plotH}
                fill="var(--accent)"
                opacity={0.5}
              />
            )}

            {asLine ? (
              <LineMarks series={series} buckets={buckets} cx={cx} y={y} hover={hover} />
            ) : (
              <>
                <BarMarks series={series} buckets={buckets} band={band} cx={cx} y={y} />
                <GoalMarks evals={evals} goals={goals} targets={dayTargets} totals={totals} band={band} cx={cx} y={y} />
              </>
            )}

            {/* X labels */}
            {buckets.map((b, i) =>
              showLabel(i) ? (
                <text
                  key={b.startMs}
                  x={cx(i)}
                  y={size.height - 4}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px]",
                    i === todayIndex ? "fill-foreground font-semibold" : "fill-muted-foreground",
                  )}
                >
                  {b.label}
                </text>
              ) : null,
            )}

            {/* Hit targets: a whole column, larger than the mark */}
            {buckets.map((b, i) => (
              <rect
                key={`hit-${b.startMs}`}
                x={MARGIN.left + band * i}
                y={MARGIN.top}
                width={band}
                height={plotH + MARGIN.bottom}
                fill="transparent"
                className={asLine || b.future ? undefined : "cursor-pointer"}
                onPointerEnter={() => setHover(i)}
                onPointerMove={() => setHover(i)}
                onClick={() => {
                  if (!asLine && !b.future) setReviewDay(dayKey(b.startMs));
                }}
              />
            ))}
          </svg>
        )}

        {series.length === 0 && size.width > 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pl-8 text-xs text-muted-foreground">
            Chưa có dữ liệu trong khoảng này
          </p>
        )}

        {hover !== null && buckets[hover] && (series.length > 0 || (evals[hover]?.items.length ?? 0) > 0) && (
          <ChartTooltip
            bucket={buckets[hover]}
            series={series}
            index={hover}
            total={totals[hover] ?? 0}
            asLine={asLine}
            ev={evals[hover] ?? null}
            goals={goals}
            projects={projects}
            labels={labels}
            x={cx(hover)}
            alignRight={cx(hover) > size.width / 2}
            anchor={plotRef.current?.getBoundingClientRect() ?? null}
          />
        )}
      </div>

      <Legend series={series} asLine={asLine} showGoals={hasGoals} />
      <DataTable buckets={buckets} series={series} />
    </div>
  );
}

interface MarkProps {
  series: ChartSeries[];
  buckets: Bucket[];
  cx: (i: number) => number;
  y: (v: number) => number;
}

function BarMarks({ series, buckets, band, cx, y }: MarkProps & { band: number }) {
  const barW = Math.max(2, Math.min(MAX_BAR, band * 0.7));
  const baseline = y(0);
  return (
    <g>
      {buckets.map((b, i) => {
        const stack = series
          .map((s) => ({ key: s.key, color: s.color, value: s.values[i] ?? 0 }))
          .filter((seg) => seg.value > 0);
        let top = baseline;
        return (
          <g key={b.startMs}>
            {stack.map((seg, k) => {
              const h = baseline - y(seg.value);
              const isTop = k === stack.length - 1;
              const yTop = top - h;
              // A 2px surface gap separates stacked segments.
              const drawH = isTop ? h : Math.max(0, h - SEGMENT_GAP);
              const x = cx(i) - barW / 2;
              top = yTop;
              if (drawH <= 0) return null;
              return isTop ? (
                <path key={seg.key} d={topRoundedBar(x, yTop, barW, drawH, RADIUS)} fill={seg.color} />
              ) : (
                <rect key={seg.key} x={x} y={yTop + SEGMENT_GAP} width={barW} height={drawH} fill={seg.color} />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

interface GoalMarksProps {
  evals: DayEvaluation[];
  goals: GoalData;
  /** Whole-day goal in hours per bucket (0 = none). */
  targets: number[];
  totals: number[];
  band: number;
  cx: (i: number) => number;
  y: (v: number) => number;
}

/**
 * Dashed tick at each day's whole-day goal, and a marker over days that missed
 * a goal: filled once a reason is recorded, hollow while it still needs one.
 */
function GoalMarks({ evals, goals, targets, totals, band, cx, y }: GoalMarksProps) {
  const tickW = Math.max(6, Math.min(MAX_BAR + 8, band * 0.85));
  return (
    <g>
      {evals.map((ev, i) => {
        const target = targets[i] ?? 0;
        const top = Math.min(y(totals[i] ?? 0), target > 0 ? y(target) : Infinity);
        const missed = ev.final && ev.missed.length > 0;
        const pending = missed && goals.unexplained(ev) > 0;
        return (
          <g key={ev.day}>
            {target > 0 && (
              <line
                x1={cx(i) - tickW / 2}
                x2={cx(i) + tickW / 2}
                y1={y(target)}
                y2={y(target)}
                stroke="var(--foreground)"
                strokeOpacity={0.7}
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            )}
            {missed && (
              <circle
                cx={cx(i)}
                cy={Math.max(MARGIN.top - 2, top - 7)}
                r={3}
                fill={pending ? "var(--background)" : WARN_COLOR}
                stroke={WARN_COLOR}
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function LineMarks({ series, buckets, cx, y, hover }: MarkProps & { hover: number | null }) {
  const lastIndex = buckets.reduce((acc, b, i) => (b.future ? acc : i), -1);
  return (
    <g>
      {hover !== null && hover <= lastIndex && (
        <line
          x1={cx(hover)}
          x2={cx(hover)}
          y1={y(0)}
          y2={MARGIN.top}
          stroke="var(--muted-foreground)"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      )}
      {series.map((s) => {
        if (!s.range) return null;
        // Only between the project's start and its deadline (or now).
        const from = s.range[0];
        const to = Math.min(s.range[1], lastIndex);
        if (to < from) return null;
        const points: string[] = [];
        for (let i = from; i <= to; i++) points.push(`${cx(i)},${y(s.values[i] ?? 0)}`);
        const inRange = hover !== null && hover >= from && hover <= to;
        return (
          <g key={s.key}>
            <polyline
              points={points.join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={cx(to)} cy={y(s.values[to] ?? 0)} r={4} fill={s.color} stroke="var(--background)" strokeWidth={2} />
            {inRange && hover !== to && (
              <circle cx={cx(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke="var(--background)" strokeWidth={2} />
            )}
          </g>
        );
      })}
    </g>
  );
}

interface TooltipProps {
  bucket: Bucket;
  series: ChartSeries[];
  index: number;
  total: number;
  asLine: boolean;
  ev: DayEvaluation | null;
  goals: GoalData;
  projects: Project[];
  labels: MissLabel[];
  x: number;
  alignRight: boolean;
  /** Plot box in the viewport; the tooltip is portalled so the dashboard cannot clip it. */
  anchor: DOMRect | null;
}

function ChartTooltip({
  bucket,
  series,
  index,
  total,
  asLine,
  ev,
  goals,
  projects,
  labels,
  x,
  alignRight,
  anchor,
}: TooltipProps) {
  const rows = series.filter((s) => (s.values[index] ?? 0) > 0);
  if (!anchor) return null;
  const left = anchor.left + x;
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-80 min-w-40 rounded-md border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-lg"
      style={{
        top: anchor.top,
        ...(alignRight ? { right: window.innerWidth - left + 12 } : { left: left + 12 }),
      }}
    >
      <p className="mb-1 font-medium">{bucket.title}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{bucket.future ? "Chưa tới" : "Không làm"}</p>
      ) : (
        <ul className="grid gap-0.5">
          {rows.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-semibold tabular-nums">{formatDuration((s.values[index] ?? 0) * 3600)}</span>
              <span className="truncate text-muted-foreground">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
      {!asLine && rows.length > 1 && (
        <p className="mt-1 border-t pt-1 text-muted-foreground">
          Tổng <span className="font-semibold text-foreground tabular-nums">{formatDuration(total * 3600)}</span>
        </p>
      )}
      {ev && ev.items.length > 0 && !bucket.future && (
        <GoalDetails ev={ev} goals={goals} projects={projects} labels={labels} />
      )}
    </div>,
    document.body,
  );
}

function GoalDetails({
  ev,
  goals,
  projects,
  labels,
}: {
  ev: DayEvaluation;
  goals: GoalData;
  projects: Project[];
  labels: MissLabel[];
}) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const labelName = new Map(labels.map((l) => [l.id, l.name]));
  const pending = ev.final ? goals.unexplained(ev) : 0;
  return (
    <div className="mt-1.5 grid gap-1 border-t pt-1.5">
      <p className="text-muted-foreground">
        Chỉ tiêu {ev.items.length - ev.missed.length}/{ev.items.length}
      </p>
      <ul className="grid gap-1">
        {ev.items.map((item) => {
          const name = item.projectId === null ? "Tổng ngày" : (byId.get(item.projectId)?.name ?? "?");
          const reason = goals.reasonFor(ev.day, item.projectId);
          return (
            <li key={item.projectId ?? 0} className="grid gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className={cn("w-3 shrink-0 text-center", item.met ? "text-green-400" : "text-amber-400")}>
                  {item.met ? "✓" : "!"}
                </span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatDuration(item.actualSec)} / {formatMinutes(item.targetMin)}
                </span>
              </span>
              {reason && !item.met && (
                <span className="ml-4.5 grid gap-0.5">
                  {reason.labelIds.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {reason.labelIds.map((id) => (
                        <span key={id} className="rounded-full bg-muted px-1.5 py-px text-[10px]">
                          {labelName.get(id) ?? "?"}
                        </span>
                      ))}
                    </span>
                  )}
                  {reason.note && <span className="text-muted-foreground italic">“{reason.note}”</span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {pending > 0 && <p className="text-amber-400">Bấm vào cột để ghi lý do chưa đạt</p>}
    </div>
  );
}

function Legend({ series, asLine, showGoals }: { series: ChartSeries[]; asLine: boolean; showGoals: boolean }) {
  if (series.length === 0 && !showGoals) return <div className="h-4" />;
  return (
    <ul className="flex max-h-[34px] flex-wrap items-center gap-x-3 gap-y-0.5 overflow-hidden text-[11px] text-muted-foreground">
      {showGoals && (
        <>
          <li className="flex shrink-0 items-center gap-1.5">
            <svg width="12" height="4" aria-hidden="true">
              <line x1="0" x2="12" y1="2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>
            Mục tiêu
          </li>
          <li className="flex shrink-0 items-center gap-1.5">
            <span className="size-2 rounded-full border-[1.5px]" style={{ borderColor: WARN_COLOR }} />
            Chưa đạt
          </li>
        </>
      )}
      {series.map((s) => (
        <li key={s.key} className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn("shrink-0", asLine ? "h-0.5 w-3 rounded-full" : "size-2 rounded-[2px]")}
            style={{ backgroundColor: s.color }}
          />
          <span className="max-w-28 truncate">{s.name}</span>
          <span className="tabular-nums">{formatDuration(s.totalHours * 3600)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Same numbers for screen readers. */
function DataTable({ buckets, series }: { buckets: Bucket[]; series: ChartSeries[] }) {
  return (
    <table className="sr-only">
      <caption>Số giờ theo project</caption>
      <thead>
        <tr>
          <th scope="col">Thời gian</th>
          {series.map((s) => (
            <th key={s.key} scope="col">
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {buckets.map((b, i) => (
          <tr key={b.startMs}>
            <th scope="row">{b.title}</th>
            {series.map((s) => (
              <td key={s.key}>{formatHours(s.values[i] ?? 0)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
