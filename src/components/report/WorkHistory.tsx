import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { periodRange, type ChartPeriod } from "@/lib/chart";
import { projectColor } from "@/lib/colors";
import { dailyProjectTotals } from "@/lib/goals";
import { ProjectIcon } from "@/lib/projectIcons";
import { dayKey, formatDate, formatDateTime, formatDuration, formatTimeOfDay, weekdayName } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Id, LocalDate } from "@/types";

interface Entry {
  projectId: Id;
  sec: number;
  note: string | null;
  updatedAt: string | null;
}

interface Props {
  period: ChartPeriod;
  anchorMs: number;
  nowMs: number;
}

/** "Lịch sử": what was done, day by day, for all projects or one of them. */
export function WorkHistory({ period, anchorMs, nowMs }: Props) {
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  const reports = useAppStore((s) => s.reports);
  const openReport = useUiStore((s) => s.openReport);
  const [filter, setFilter] = useState<Id | null>(null);

  const { days, totals } = useMemo(() => {
    const { startMs, endMs } = periodRange(period, anchorMs);
    const from = dayKey(startMs);
    const to = dayKey(Math.min(endMs - 1, nowMs));
    const inRange = (d: LocalDate) => d >= from && d <= to;

    const byDay = new Map<LocalDate, Map<Id, Entry>>();
    const entry = (day: LocalDate, projectId: Id) => {
      let m = byDay.get(day);
      if (!m) byDay.set(day, (m = new Map()));
      let e = m.get(projectId);
      if (!e) m.set(projectId, (e = { projectId, sec: 0, note: null, updatedAt: null }));
      return e;
    };
    for (const [day, perProject] of dailyProjectTotals(spans, nowMs)) {
      if (!inRange(day)) continue;
      for (const [pid, sec] of perProject) if (sec >= 30) entry(day, pid).sec = sec;
    }
    for (const r of reports) {
      if (!inRange(r.day) || !r.note?.trim()) continue;
      const e = entry(r.day, r.projectId);
      e.note = r.note;
      e.updatedAt = r.updatedAt;
    }

    const totals = new Map<Id, { sec: number; notes: number }>();
    for (const m of byDay.values())
      for (const e of m.values()) {
        const t = totals.get(e.projectId) ?? { sec: 0, notes: 0 };
        t.sec += e.sec;
        if (e.note) t.notes += 1;
        totals.set(e.projectId, t);
      }

    const days = [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([day, m]) => ({ day, entries: [...m.values()].sort((a, b) => b.sec - a.sec) }));
    return { days, totals };
  }, [period, anchorMs, nowMs, spans, reports]);

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const listed = projects.filter((p) => totals.has(p.id) || p.id === filter);
  const shown = days
    .map((d) => ({ ...d, entries: d.entries.filter((e) => filter === null || e.projectId === filter) }))
    .filter((d) => d.entries.length > 0);
  const allSec = [...totals.values()].reduce((s, t) => s + t.sec, 0);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)] gap-4">
      {/* Project filter */}
      <ul className="grid min-h-0 content-start gap-0.5 overflow-y-auto pr-1 text-xs" aria-label="Lọc theo project">
        <FilterItem active={filter === null} onClick={() => setFilter(null)} label="Tất cả project" sec={allSec} />
        {listed.map((p) => (
          <FilterItem
            key={p.id}
            active={filter === p.id}
            onClick={() => setFilter(p.id)}
            label={p.name}
            sec={totals.get(p.id)?.sec ?? 0}
            icon={<ProjectIcon icon={p.icon} color={projectColor(p.color)} className="size-3.5" />}
          />
        ))}
      </ul>

      {/* Day by day */}
      <div className="min-h-0 overflow-y-auto pr-1">
        {shown.length === 0 ? (
          <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Chưa có gì trong khoảng này
          </p>
        ) : (
          <ol className="grid gap-3">
            {shown.map(({ day, entries }) => {
              const dayMs = new Date(`${day}T00:00`).getTime();
              const daySec = entries.reduce((s, e) => s + e.sec, 0);
              return (
                <li key={day}>
                  <p className="sticky top-0 z-10 flex items-baseline gap-2 bg-background pb-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {weekdayName(dayMs)}, {formatDate(dayMs)}
                    </span>
                    <span className="tabular-nums">{formatDuration(daySec)}</span>
                  </p>
                  <ul className="grid gap-1">
                    {entries.map((e) => {
                      const p = byId.get(e.projectId);
                      return (
                        <li key={e.projectId}>
                          <button
                            type="button"
                            onClick={() => openReport({ day, projectId: e.projectId })}
                            className="group grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-2 rounded-md border bg-card px-2.5 py-1.5 text-left hover:bg-accent/60"
                            title="Bấm để sửa “Đã làm gì”"
                          >
                            <span className="mt-1 size-2.5 rounded-[3px]" style={{ backgroundColor: projectColor(p?.color) }} />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium">{p?.name ?? "Project đã xoá"}</span>
                              {e.note ? (
                                <span className="mt-0.5 block whitespace-pre-line text-xs break-words text-foreground/90">{e.note}</span>
                              ) : (
                                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground italic">
                                  chưa ghi đã làm gì
                                  <Pencil className="size-3 opacity-0 group-hover:opacity-100" />
                                </span>
                              )}
                            </span>
                            <span className="text-right text-[11px] text-muted-foreground tabular-nums">
                              <span className="block text-xs text-foreground">{formatDuration(e.sec)}</span>
                              {e.updatedAt && (
                                <span className="block" title={`Ghi lúc ${formatDateTime(e.updatedAt)}`}>
                                  ghi lúc{" "}
                                  {dayKey(Date.parse(e.updatedAt)) === day
                                    ? formatTimeOfDay(Date.parse(e.updatedAt))
                                    : formatDateTime(e.updatedAt)}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function FilterItem({
  active,
  onClick,
  label,
  sec,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sec: number;
  icon?: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
          active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="tabular-nums">{formatDuration(sec)}</span>
      </button>
    </li>
  );
}
