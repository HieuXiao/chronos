import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { periodRange, type ChartPeriod } from "@/lib/chart";
import { addLocalDays, startOfLocalDay } from "@/lib/time";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const YEARS_PER_PAGE = 12;

interface PeriodPickerProps {
  period: ChartPeriod;
  anchorMs: number;
  nowMs: number;
  label: string;
  onPick: (anchorMs: number) => void;
}

/**
 * The period label; clicking it opens a small calendar: days for a week,
 * months for a month, years for a year. Nothing after today can be picked.
 */
export function PeriodPicker({ period, anchorMs, nowMs, label, onPick }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const pick = (ms: number) => {
    onPick(ms);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "min-w-28 rounded-md px-2 py-0.5 text-center text-xs whitespace-nowrap tabular-nums transition-colors",
          open ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Chọn thời gian"
          className="absolute top-full right-0 z-40 mt-1 w-64 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          {period === "week" && <DayGrid anchorMs={anchorMs} nowMs={nowMs} onPick={pick} />}
          {period === "month" && <MonthGrid anchorMs={anchorMs} nowMs={nowMs} onPick={pick} />}
          {period === "year" && <YearGrid anchorMs={anchorMs} nowMs={nowMs} onPick={pick} />}
          <div className="mt-2 flex justify-end border-t pt-2">
            <Button variant="ghost" size="xs" onClick={() => pick(nowMs)}>
              {period === "week" ? "Tuần này" : period === "month" ? "Tháng này" : "Năm nay"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface GridProps {
  anchorMs: number;
  nowMs: number;
  onPick: (ms: number) => void;
}

function Header({ title, onPrev, onNext, nextDisabled }: { title: string; onPrev: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <Button variant="ghost" size="icon-xs" aria-label="Trước" onClick={onPrev}>
        <ChevronLeft />
      </Button>
      <span className="text-sm font-medium tabular-nums">{title}</span>
      <Button variant="ghost" size="icon-xs" aria-label="Sau" onClick={onNext} disabled={nextDisabled}>
        <ChevronRight />
      </Button>
    </div>
  );
}

/** A month of days; the selected week is highlighted, clicking a day picks its week. */
function DayGrid({ anchorMs, nowMs, onPick }: GridProps) {
  const anchor = new Date(anchorMs);
  const [view, setView] = useState({ y: anchor.getFullYear(), m: anchor.getMonth() });
  const first = new Date(view.y, view.m, 1).getTime();
  const gridStart = addLocalDays(first, -((new Date(first).getDay() + 6) % 7));
  const week = periodRange("week", anchorMs);
  const today = startOfLocalDay(nowMs);
  const now = new Date(nowMs);
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();
  const shift = (dir: -1 | 1) => {
    const d = new Date(view.y, view.m + dir, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div>
      <Header title={`Tháng ${view.m + 1}/${view.y}`} onPrev={() => shift(-1)} onNext={() => shift(1)} nextDisabled={atCurrentMonth} />
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-[11px] text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => {
          const ms = addLocalDays(gridStart, i);
          const d = new Date(ms);
          const inMonth = d.getMonth() === view.m;
          const inWeek = ms >= week.startMs && ms < week.endMs;
          const future = ms > today;
          return (
            <button
              key={ms}
              type="button"
              disabled={future}
              onClick={() => onPick(ms)}
              className={cn(
                "h-7 tabular-nums transition-colors disabled:opacity-30",
                inWeek ? "bg-primary text-primary-foreground" : "rounded-md hover:bg-accent",
                inWeek && d.getDay() === 1 && "rounded-l-md",
                inWeek && d.getDay() === 0 && "rounded-r-md",
                !inMonth && !inWeek && "text-muted-foreground/60",
                ms === today && !inWeek && "font-semibold text-primary",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({ anchorMs, nowMs, onPick }: GridProps) {
  const anchor = new Date(anchorMs);
  const now = new Date(nowMs);
  const [year, setYear] = useState(anchor.getFullYear());
  return (
    <div>
      <Header title={`Năm ${year}`} onPrev={() => setYear((y) => y - 1)} onNext={() => setYear((y) => y + 1)} nextDisabled={year >= now.getFullYear()} />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 12 }, (_, m) => {
          const selected = year === anchor.getFullYear() && m === anchor.getMonth();
          const future = year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());
          return (
            <button
              key={m}
              type="button"
              disabled={future}
              onClick={() => onPick(new Date(year, m, 1).getTime())}
              className={cn(
                "h-9 rounded-md text-sm transition-colors disabled:opacity-30",
                selected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              Th{m + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({ anchorMs, nowMs, onPick }: GridProps) {
  const anchorYear = new Date(anchorMs).getFullYear();
  const thisYear = new Date(nowMs).getFullYear();
  // Pages of 12 years ending with this year.
  const [last, setLast] = useState(thisYear + Math.ceil((anchorYear - thisYear) / YEARS_PER_PAGE) * YEARS_PER_PAGE);
  const first = last - YEARS_PER_PAGE + 1;
  return (
    <div>
      <Header
        title={`${first} – ${last}`}
        onPrev={() => setLast((y) => y - YEARS_PER_PAGE)}
        onNext={() => setLast((y) => y + YEARS_PER_PAGE)}
        nextDisabled={last >= thisYear}
      />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
          const y = first + i;
          return (
            <button
              key={y}
              type="button"
              disabled={y > thisYear}
              onClick={() => onPick(new Date(y, 0, 1).getTime())}
              className={cn(
                "h-9 rounded-md text-sm tabular-nums transition-colors disabled:opacity-30",
                y === anchorYear ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}
