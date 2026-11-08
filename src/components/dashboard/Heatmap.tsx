import { useMemo, useState } from "react";
import { addLocalDays, dayKey, formatDate, formatHours, startOfLocalDay, weekdayName } from "@/lib/time";

const WEEKS = 12;
const CELL = 14;
const GAP = 3;
const ROW_LABELS = ["T2", "", "T4", "", "T6", "", "CN"];

/** Fill colour by hours worked that day. */
function cellColor(hours: number): string {
  if (hours <= 0) return "var(--muted)";
  if (hours < 1) return "#14532d";
  if (hours < 2) return "#15803d";
  if (hours < 4) return "#22c55e";
  return "#86efac";
}

const LEGEND = [0, 0.5, 1.5, 3, 5];

interface Cell {
  key: string;
  dateMs: number;
  col: number;
  row: number;
  hours: number;
  future: boolean;
}

interface Hover {
  x: number;
  y: number;
  text: string;
}

/** 7 rows (Mon→Sun) × 12 weeks, current week in the last column. */
export function Heatmap({ daily, nowMs }: { daily: Map<string, number>; nowMs: number }) {
  const [hover, setHover] = useState<Hover | null>(null);

  const cells = useMemo(() => {
    const today = startOfLocalDay(nowMs);
    const mondayOffset = (new Date(today).getDay() + 6) % 7;
    const firstMonday = addLocalDays(today, -mondayOffset - (WEEKS - 1) * 7);
    const result: Cell[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const dateMs = addLocalDays(firstMonday, i);
      const key = dayKey(dateMs);
      result.push({
        key,
        dateMs,
        col: Math.floor(i / 7),
        row: i % 7,
        hours: (daily.get(key) ?? 0) / 3600,
        future: dateMs > today,
      });
    }
    return result;
  }, [daily, nowMs]);

  const width = WEEKS * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  return (
    <div className="flex flex-col justify-between">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">12 tuần gần nhất</p>

      <div className="relative flex gap-2" onMouseLeave={() => setHover(null)}>
        <div className="grid text-[10px] leading-none text-muted-foreground" style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}>
          {ROW_LABELS.map((label, i) => (
            <span key={i} className="flex items-center">
              {label}
            </span>
          ))}
        </div>

        <div className="relative" style={{ width, height }}>
          {cells.map((cell) =>
            cell.future ? null : (
              <div
                key={cell.key}
                className="absolute rounded-[3px] transition-[outline] hover:outline hover:outline-1 hover:outline-foreground/60"
                style={{
                  left: cell.col * (CELL + GAP),
                  top: cell.row * (CELL + GAP),
                  width: CELL,
                  height: CELL,
                  backgroundColor: cellColor(cell.hours),
                }}
                onMouseEnter={() =>
                  setHover({
                    x: cell.col * (CELL + GAP) + CELL / 2,
                    y: cell.row * (CELL + GAP),
                    text: `${weekdayName(cell.dateMs)}, ${formatDate(cell.dateMs)} — ${
                      cell.hours > 0 ? formatHours(cell.hours) : "không làm"
                    }`,
                  })
                }
              />
            ),
          )}

          {hover && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
              style={{ left: hover.x, top: hover.y - 6 }}
            >
              {hover.text}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        Ít
        {LEGEND.map((h) => (
          <span key={h} className="size-2.5 rounded-[2px]" style={{ backgroundColor: cellColor(h) }} />
        ))}
        Nhiều
      </div>
    </div>
  );
}
