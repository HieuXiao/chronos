import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildBuckets, buildSeries, niceScale, type ChartPeriod } from "@/lib/chart";
import { dayStatus, formatMinutes, goalOn, indexGoals, MAX_DAY_HOURS } from "@/lib/goals";
import { addLocalDays, dayKey, formatDuration, formatHours } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { StatusChip } from "./StatusChip";

const MARGIN = { top: 18, right: 34, bottom: 28, left: 30 };
const MAX_BAR = 28;
const SEGMENT_GAP = 2;
const RADIUS = 4;
/** Narrowest column that still gets its total written above it. */
const MIN_BAND_FOR_TOTAL = 22;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Bar with rounded top corners and a square base. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

const shortTotal = (hours: number) => (hours < 1 ? `${Math.round(hours * 60)}m` : formatHours(hours));

interface Hover {
  bucket: number;
  seriesKey: string;
  /** Pointer position in the viewport, for the tooltip. */
  x: number;
  y: number;
}

interface WorkChartProps {
  period: ChartPeriod;
  anchorMs: number;
  nowMs: number;
  /** Year view: a month's column was clicked. */
  onOpenMonth: (monthStartMs: number) => void;
}

/**
 * Time per project per day as stacked columns. Each piece of a column shows
 * that project's time, how it did against its minimum and what was done;
 * the line is the work time needed per day. Days under that line get a mark
 * under their label that opens the missed-day reason.
 */
export function WorkChart({ period, anchorMs, nowMs, onOpenMonth }: WorkChartProps) {
  const spans = useAppStore((s) => s.spans);
  const projects = useAppStore((s) => s.projects);
  const goals = useAppStore((s) => s.goals);
  const reports = useAppStore((s) => s.reports);
  const dayReasons = useAppStore((s) => s.dayReasons);
  const labels = useAppStore((s) => s.labels);
  const openReport = useUiStore((s) => s.openReport);
  const openDayReason = useUiStore((s) => s.openDayReason);

  const [hover, setHover] = useState<Hover | null>(null);
  const [plotRef, size] = useSize<HTMLDivElement>();
  useEffect(() => setHover(null), [period, anchorMs]);

  const index = useMemo(() => indexGoals(goals), [goals]);
  const hatchId = `short-${useId().replace(/:/g, "")}`;
  const reportOf = useMemo(() => new Map(reports.map((r) => [`${r.day}|${r.projectId}`, r])), [reports]);
  const reasonOf = useMemo(() => new Map(dayReasons.map((r) => [r.day, r])), [dayReasons]);
  const labelName = useMemo(() => new Map(labels.map((l) => [l.id, l.name])), [labels]);
  const isYear = period === "year";
  const buckets = useMemo(() => buildBuckets(period, anchorMs, nowMs), [period, anchorMs, nowMs]);
  /** Hours per bucket: totals per day, or per month in the year view. */
  const rawSeries = useMemo(() => buildSeries(spans, projects, buckets, nowMs), [spans, projects, buckets, nowMs]);
  // The year view shows each month's average per day, so the day-target line still applies.
  const series = useMemo(
    () =>
      isYear
        ? rawSeries.map((s) => ({
            ...s,
            values: s.values.map((v, i) => (buckets[i]!.elapsedDays ? v / buckets[i]!.elapsedDays : 0)),
          }))
        : rawSeries,
    [isYear, rawSeries, buckets],
  );
  const totals = buckets.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  /** Last day of a bucket that has passed: the target in effect then. */
  const lastDayOf = (b: (typeof buckets)[number]) =>
    isYear && b.elapsedDays > 1 ? dayKey(addLocalDays(b.startMs, b.elapsedDays - 1)) : b.day;
  const targets = buckets.map((b) => Math.min(MAX_DAY_HOURS, goalOn(index.day, lastDayOf(b)) / 60));
  const hasLine = targets.some((t) => t > 0);
  const today = dayKey(nowMs);
  /** Under the day's work time (day views; today counts while it is still running). */
  const missed = buckets.map((b, i) => !isYear && !b.future && targets[i]! > 0 && totals[i]! < targets[i]!);
  /** Mark under the label: a passed missed day, or any day that has a reason. */
  const markOf = (i: number): "todo" | "done" | null => {
    if (!missed[i]) return null;
    const b = buckets[i]!;
    if (reasonOf.has(b.day)) return "done";
    return b.day < today ? "todo" : null;
  };
  const anyTodo = buckets.some((_, i) => markOf(i) === "todo");

  // A work day tops out at MAX_DAY_HOURS: keep the axis fixed at 0–16h so
  // weeks compare at a glance; only a day beyond that stretches it.
  const peak = Math.max(0, ...totals, ...targets);
  const { max, step } = peak <= MAX_DAY_HOURS ? { max: MAX_DAY_HOURS, step: 4 } : niceScale(peak);
  const plotW = Math.max(0, size.width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, size.height - MARGIN.top - MARGIN.bottom);
  const band = buckets.length ? plotW / buckets.length : 0;
  const barW = Math.max(3, Math.min(MAX_BAR, band * 0.62));
  const y = (v: number) => MARGIN.top + plotH - (v / max) * plotH;
  const cx = (i: number) => MARGIN.left + band * i + band / 2;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const todayIndex = buckets.findIndex((b) => b.startMs <= nowMs && nowMs < b.endMs);
  const showLabel = (i: number) => period !== "month" || i === 0 || (i + 1) % 5 === 0;

  // Day-target line: one flat step per day, joined where the target changes.
  const linePath = useMemo(() => {
    let d = "";
    let drawing = false;
    targets.forEach((t, i) => {
      const x0 = MARGIN.left + band * i;
      const x1 = x0 + band;
      if (t <= 0) {
        drawing = false;
        return;
      }
      d += drawing ? `V${y(t)}H${x1}` : `M${x0},${y(t)}H${x1}`;
      drawing = true;
    });
    return d;
    // y depends on max/plotH, both derived from the deps below.
  }, [targets.join(","), band, max, plotH]);
  const lastTarget = [...targets].reverse().find((t) => t > 0) ?? 0;

  /** Is this project short of its own daily minimum on that day? (day views only) */
  const isShort = (projectId: number | null, i: number) => {
    if (isYear || projectId === null) return false;
    const b = buckets[i]!;
    const sec = (series.find((x) => x.projectId === projectId)?.values[i] ?? 0) * 3600;
    return dayStatus(sec, goalOn(index.byProject.get(projectId), b.day)) === "short";
  };
  const anyShort = !isYear && buckets.some((_, i) => series.some((x) => (x.values[i] ?? 0) > 0 && isShort(x.projectId, i)));

  const hovered = hover ? series.find((s) => s.key === hover.seriesKey) : undefined;
  const hoveredRaw = hover ? rawSeries.find((s) => s.key === hover.seriesKey) : undefined;
  const hoverBucket = hover ? buckets[hover.bucket] : undefined;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div ref={plotRef} className="relative min-h-0 flex-1" onPointerLeave={() => setHover(null)}>
        {size.width > 0 && size.height > 0 && (
          <svg width={size.width} height={size.height} className="block overflow-visible" role="img" aria-label="Thời gian theo ngày, xếp chồng theo project">
            <defs>
              <pattern id={hatchId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--card)" fillOpacity={0.35} />
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--card)" strokeWidth="2.2" strokeOpacity={0.85} />
              </pattern>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--border)" shapeRendering="crispEdges" />
                <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                  {t === 0 ? "0" : t < 1 ? `${Math.round(t * 60)}m` : formatHours(t)}
                </text>
              </g>
            ))}

            {/* Stacked pieces: one per project per day */}
            {buckets.map((b, i) => {
              let top = y(0);
              const stack = series.filter((s) => (s.values[i] ?? 0) > 0);
              return (
                <g key={b.day}>
                  {stack.map((s, k) => {
                    const h = y(0) - y(s.values[i] ?? 0);
                    const isTop = k === stack.length - 1;
                    const yTop = top - h;
                    top = yTop;
                    const drawH = isTop ? h : Math.max(0, h - SEGMENT_GAP);
                    if (drawH <= 0) return null;
                    const x = cx(i) - barW / 2;
                    const active = hover?.bucket === i && hover.seriesKey === s.key;
                    const dim = hover !== null && !active;
                    const handlers = {
                      onPointerMove: (e: React.PointerEvent) => setHover({ bucket: i, seriesKey: s.key, x: e.clientX, y: e.clientY }),
                      onClick: () => {
                        if (b.future) return;
                        if (isYear) onOpenMonth(b.startMs);
                        else if (s.projectId !== null) openReport({ day: b.day, projectId: s.projectId });
                      },
                      className: isYear || s.projectId !== null ? "cursor-pointer" : undefined,
                      opacity: dim ? 0.45 : 1,
                    };
                    const short = isShort(s.projectId, i);
                    const d = isTop
                      ? topRoundedBar(x, yTop, barW, drawH, RADIUS)
                      : `M${x},${yTop + SEGMENT_GAP}h${barW}v${drawH}h${-barW}Z`;
                    return (
                      <g key={s.key} {...handlers}>
                        <path d={d} fill={s.color} />
                        {short && <path d={d} fill={`url(#${hatchId})`} />}
                      </g>
                    );
                  })}
                  {band >= MIN_BAND_FOR_TOTAL && totals[i]! > 0 && (
                    <text x={cx(i)} y={y(totals[i]!) - 5} textAnchor="middle" className="pointer-events-none fill-muted-foreground text-[10px] tabular-nums">
                      {shortTotal(totals[i]!)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Work time needed per day */}
            {hasLine && (
              <g className="pointer-events-none">
                <path d={linePath} fill="none" stroke="var(--foreground)" strokeOpacity={0.75} strokeWidth={1.5} strokeDasharray="5 3" />
                <text x={MARGIN.left + plotW + 4} y={y(lastTarget)} dy="0.32em" className="fill-foreground text-[10px] font-medium tabular-nums">
                  {formatHours(lastTarget)}
                </text>
              </g>
            )}

            {buckets.map((b, i) => {
              const mark = markOf(i);
              const reason = reasonOf.get(b.day);
              const text = showLabel(i) || mark ? (
                <text
                  x={cx(i)}
                  y={size.height - 13}
                  textAnchor="middle"
                  className={cn("text-[10px]", i === todayIndex ? "fill-foreground font-semibold" : "fill-muted-foreground")}
                >
                  {b.label}
                </text>
              ) : null;
              if (!missed[i]) return <g key={`x-${b.day}`}>{text}</g>;
              const tip = reason
                ? `Lý do chưa đạt: ${reason.labelIds.map((id) => labelName.get(id)).filter(Boolean).join(", ") || reason.note || ""}\nBấm để sửa`
                : "Chưa đạt thời gian cần đạt · bấm để ghi lý do";
              return (
                <g
                  key={`x-${b.day}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.title}: ${reason ? "sửa lý do chưa đạt" : "ghi lý do chưa đạt"}`}
                  className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-ring"
                  onClick={() => openDayReason(b.day)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDayReason(b.day))}
                >
                  <title>{tip}</title>
                  <rect x={cx(i) - band / 2} y={size.height - 26} width={band} height={26} fill="transparent" rx={4} />
                  {text}
                  {mark && (
                    <circle
                      cx={cx(i)}
                      cy={size.height - 4}
                      r={2.5}
                      className={mark === "todo" ? "fill-warning" : "fill-muted-foreground/60"}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {series.length === 0 && size.width > 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pl-8 text-xs text-muted-foreground">
            Chưa có thời gian làm việc trong khoảng này
          </p>
        )}
      </div>

      <ul className="flex max-h-[34px] flex-wrap items-center gap-x-3 gap-y-0.5 overflow-hidden text-[11px] text-muted-foreground">
        {hasLine && (
          <li className="flex items-center gap-1.5">
            <svg width="14" height="4" aria-hidden="true">
              <line x1="0" x2="14" y1="2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3" />
            </svg>
            Cần đạt mỗi ngày
          </li>
        )}
        {anyShort && (
          <li className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true" className="rounded-[2px]">
              <rect width="10" height="10" fill="currentColor" />
              <rect width="10" height="10" fill={`url(#${hatchId})`} />
            </svg>
            Chưa đạt tối thiểu
          </li>
        )}
        {anyTodo && (
          <li className="flex items-center gap-1.5">
            <span className="size-[5px] rounded-full bg-warning" />
            Chưa ghi lý do (bấm vào ngày)
          </li>
        )}
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: s.color }} />
            <span className="max-w-32 truncate">{s.name}</span>
            <span className="tabular-nums">{formatDuration(s.totalHours * 3600)}</span>
          </li>
        ))}
      </ul>

      {hover && hovered && hoverBucket &&
        createPortal(
          <PieceTooltip
            x={hover.x}
            y={hover.y}
            title={hoverBucket.title}
            name={hovered.name}
            color={hovered.color}
            actualSec={(hovered.values[hover.bucket] ?? 0) * 3600}
            month={
              isYear
                ? {
                    totalSec: (hoveredRaw?.values[hover.bucket] ?? 0) * 3600,
                    monthTotalSec: rawSeries.reduce((sum, r) => sum + (r.values[hover.bucket] ?? 0), 0) * 3600,
                  }
                : null
            }
            minMinutes={hovered.projectId === null || isYear ? 0 : goalOn(index.byProject.get(hovered.projectId), hoverBucket.day)}
            note={hovered.projectId === null || isYear ? null : (reportOf.get(`${hoverBucket.day}|${hovered.projectId}`)?.note ?? null)}
            canWrite={hovered.projectId !== null && !isYear}
            dayTotal={totals[hover.bucket] ?? 0}
            dayTarget={targets[hover.bucket] ?? 0}
          />,
          document.body,
        )}
    </div>
  );
}

interface PieceTooltipProps {
  x: number;
  y: number;
  title: string;
  name: string;
  color: string;
  actualSec: number;
  minMinutes: number;
  note: string | null;
  canWrite: boolean;
  dayTotal: number;
  dayTarget: number;
  /** Year view: the piece is a month and `actualSec` its average per day. */
  month: { totalSec: number; monthTotalSec: number } | null;
}

/** One project on one day: time vs. its minimum, the status label and the reason. */
function PieceTooltip({ x, y, title, name, color, actualSec, minMinutes, note, canWrite, dayTotal, dayTarget, month }: PieceTooltipProps) {
  const status = dayStatus(actualSec, minMinutes);
  const right = x > window.innerWidth - 320;
  if (month) {
    return (
      <div
        role="tooltip"
        className="pointer-events-none fixed z-50 w-72 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
        style={{ top: Math.min(y + 14, window.innerHeight - 160), ...(right ? { right: window.innerWidth - x + 14 } : { left: x + 14 }) }}
      >
        <p className="text-muted-foreground">{title}</p>
        <p className="mt-1 flex items-center gap-2 text-sm">
          <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
          <span className="tabular-nums">{formatDuration(month.totalSec)}</span>
        </p>
        <p className="mt-1 text-muted-foreground tabular-nums">trung bình {formatDuration(actualSec)}/ngày</p>
        <p className="mt-2 border-t pt-2 text-muted-foreground tabular-nums">
          Cả tháng {formatDuration(month.monthTotalSec)} · TB {formatDuration(dayTotal * 3600)}/ngày
          {dayTarget > 0 && " / " + formatHours(dayTarget)}
          <br />
          Bấm để xem từng ngày của tháng này
        </p>
      </div>
    );
  }
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-72 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
      style={{ top: Math.min(y + 14, window.innerHeight - 200), ...(right ? { right: window.innerWidth - x + 14 } : { left: x + 14 }) }}
    >
      <p className="text-muted-foreground">{title}</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <span className="tabular-nums">
          {formatDuration(actualSec)}
          {minMinutes > 0 && <span className="text-muted-foreground"> / {formatMinutes(minMinutes)}</span>}
        </span>
      </p>
      {status && (
        <p className="mt-2">
          <StatusChip status={status} />
        </p>
      )}
      <p className="mt-2">
        <span className="text-muted-foreground">Đã làm gì: </span>
        {note ? <span className="whitespace-pre-line">{note}</span> : <span className="text-muted-foreground italic">chưa ghi</span>}
      </p>
      <p className="mt-2 border-t pt-2 text-muted-foreground tabular-nums">
        Cả ngày {formatDuration(dayTotal * 3600)}
        {dayTarget > 0 && ` / ${formatHours(dayTarget)}`}
        {canWrite && " · bấm để ghi đã làm gì"}
      </p>
    </div>
  );
}
