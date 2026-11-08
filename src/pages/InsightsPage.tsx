import { useMemo, useState, type KeyboardEvent } from "react";
import { Pencil, Target, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoals } from "@/hooks/useGoals";
import { useNow } from "@/hooks/useNow";
import { projectColor } from "@/lib/colors";
import { formatMinutes } from "@/lib/goals";
import { buildInsights, type LabelStat } from "@/lib/insights";
import { addLocalDays, dayKey, formatDate, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Id, MissLabel, Project } from "@/types";

type RangeKey = "7" | "30" | "90" | "all";
const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "all", label: "Tất cả" },
];

const shortDate = (day: string) => formatDate(new Date(`${day}T00:00`));

/** Goal statistics and the reasons that come up most often. */
export function InsightsPage() {
  const projects = useAppStore((s) => s.projects);
  const labels = useAppStore((s) => s.labels);
  const reasons = useAppStore((s) => s.reasons);
  const setReviewDay = useUiStore((s) => s.setReviewDay);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const nowMs = useNow(60_000);
  const goals = useGoals(nowMs);
  const [range, setRange] = useState<RangeKey>("30");

  const insights = useMemo(() => {
    if (!goals.firstGoalDay) return null;
    const todayMs = new Date(`${goals.today}T00:00`).getTime();
    const to = dayKey(addLocalDays(todayMs, -1)); // finished days only
    const windowFrom = range === "all" ? goals.firstGoalDay : dayKey(addLocalDays(todayMs, -Number(range)));
    const from = windowFrom < goals.firstGoalDay ? goals.firstGoalDay : windowFrom;
    return buildInsights(from, to, goals.evaluate, reasons, labels);
  }, [goals, reasons, labels, range]);

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  if (!goals.firstGoalDay || !insights) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Target className="size-8 text-muted-foreground" />
        <p className="font-medium">Chưa có mục tiêu hằng ngày</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Đặt số giờ cần làm mỗi ngày và chỉ tiêu cho từng nhóm công việc. Những ngày không đạt sẽ được thống kê ở
          đây cùng lý do bạn ghi lại.
        </p>
        <Button size="sm" onClick={() => setSettingsOpen(true)}>
          Đặt mục tiêu
        </Button>
      </div>
    );
  }

  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
  const maxCount = Math.max(1, ...insights.labels.map((l) => l.count));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Thống kê chỉ tiêu</h1>
          <span className="text-sm text-muted-foreground tabular-nums">
            {insights.from <= insights.to
              ? `${shortDate(insights.from)} – ${shortDate(insights.to)}`
              : "Chưa có ngày nào kết thúc"}
          </span>
          <div role="radiogroup" aria-label="Khoảng thời gian" className="ml-auto flex rounded-md bg-muted p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={range === r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "rounded px-2.5 py-0.5 text-xs transition-colors",
                  range === r.value
                    ? "bg-primary font-medium text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Ngày đạt trọn chỉ tiêu"
            value={`${insights.perfectDays}/${insights.goalDays}`}
            sub={pct(insights.perfectDays, insights.goalDays)}
          />
          <Stat label="Lượt không đạt" value={String(insights.misses)} sub={`thiếu tổng ${formatMinutes(insights.shortMin)}`} />
          <Stat
            label="Đã ghi lý do"
            value={`${insights.explained}/${insights.misses}`}
            sub={pct(insights.explained, insights.misses)}
          />
          <Stat
            label="Lý do số 1"
            value={insights.labels[0]?.label.name ?? "—"}
            sub={insights.labels[0] ? `${insights.labels[0].count} lần` : "chưa có dữ liệu"}
          />
        </div>

        {insights.pendingDays.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-sm">
            <span className="text-amber-400">Chưa ghi lý do:</span>
            {insights.pendingDays.slice(0, 14).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setReviewDay(d)}
                className="rounded-full border px-2 py-0.5 text-xs tabular-nums hover:bg-accent"
              >
                {shortDate(d).slice(0, 5)}
              </button>
            ))}
            {insights.pendingDays.length > 14 && (
              <span className="text-xs text-muted-foreground">+{insights.pendingDays.length - 14} ngày</span>
            )}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <section className="grid content-start gap-2">
            <h2 className="text-sm font-medium">Lý do hay gặp</h2>
            {insights.labels.length === 0 ? (
              <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                Chưa có lý do nào trong khoảng này. Bấm vào cột có chấm vàng trên biểu đồ, hoặc vào một ngày ở trên để
                ghi lại.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Lý do</th>
                      <th className="w-[30%] px-2 py-2 font-medium">Số lần</th>
                      <th className="px-2 py-2 text-right font-medium">Giờ thiếu</th>
                      <th className="px-2 py-2 font-medium">Ảnh hưởng nhiều nhất</th>
                      <th className="px-2 py-2 font-medium">Gần nhất</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {insights.labels.map((l) => (
                      <LabelRow key={l.label.id} stat={l} maxCount={maxCount} byId={byId} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <UnusedLabels labels={labels} used={new Set(reasons.flatMap((r) => r.labelIds))} />
          </section>

          <section className="grid content-start gap-2">
            <h2 className="text-sm font-medium">Theo nhóm công việc</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nhóm</th>
                    <th className="px-2 py-2 text-right font-medium">Đạt</th>
                    <th className="px-2 py-2 text-right font-medium">TB/ngày</th>
                    <th className="px-3 py-2 text-right font-medium">Thiếu</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.groups.map((g) => {
                    const p = g.projectId === null ? null : byId.get(g.projectId);
                    const rate = g.metDays / g.days;
                    return (
                      <tr key={g.projectId ?? 0} className="border-t border-border/50">
                        <td className="px-3 py-2">
                          <GroupName project={p} isTotal={g.projectId === null} />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          <span className={rate < 0.5 ? "text-amber-400" : undefined}>{pct(g.metDays, g.days)}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {g.metDays}/{g.days}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatDuration(g.actualSec / g.days)}
                          <span className="text-xs text-muted-foreground"> / {formatMinutes(g.targetMin / g.days)}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {formatMinutes(g.shortMin)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="grid gap-2">
          <h2 className="text-sm font-medium">Ghi chú gần đây</h2>
          {insights.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có.</p>
          ) : (
            <ul className="grid gap-1">
              {insights.recent.slice(0, 30).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setReviewDay(r.day)}
                    className="flex w-full flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50"
                  >
                    <span className="w-20 shrink-0 text-muted-foreground tabular-nums">{shortDate(r.day)}</span>
                    <span className="w-40 shrink-0">
                      <GroupName
                        project={r.projectId === null ? null : byId.get(r.projectId)}
                        isTotal={r.projectId === null}
                      />
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {r.labelIds.map((id) => (
                        <span key={id} className="rounded-full bg-muted px-2 py-px text-xs">
                          {labels.find((l) => l.id === id)?.name ?? "?"}
                        </span>
                      ))}
                    </span>
                    {r.note && <span className="min-w-0 flex-1 truncate text-muted-foreground italic">“{r.note}”</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums" title={value}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
    </div>
  );
}

function GroupName({ project, isTotal }: { project: Project | null | undefined; isTotal: boolean }) {
  if (isTotal) return <span className="font-medium">Tổng ngày</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: projectColor(project?.color) }} />
      <span className="truncate">{project?.name ?? "Project đã xoá"}</span>
    </span>
  );
}

function LabelRow({ stat, maxCount, byId }: { stat: LabelStat; maxCount: number; byId: Map<Id, Project> }) {
  const renameLabel = useAppStore((s) => s.renameLabel);
  const deleteLabel = useAppStore((s) => s.deleteLabel);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stat.label.name);
  const [confirm, setConfirm] = useState(false);

  const commit = async () => {
    const clean = name.trim();
    setEditing(false);
    if (clean && clean !== stat.label.name) await renameLabel(stat.label.id, clean);
    else setName(stat.label.name);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void commit();
    if (e.key === "Escape") {
      setName(stat.label.name);
      setEditing(false);
    }
  };

  return (
    <tr className="group border-t border-border/50">
      <td className="px-3 py-2">
        {editing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => void commit()}
            maxLength={40}
            className="h-7"
          />
        ) : (
          <span className="font-medium whitespace-nowrap">{stat.label.name}</span>
        )}
      </td>
      <td className="px-2 py-2">
        <span className="flex items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-foreground/70"
              style={{ width: `${(stat.count / maxCount) * 100}%` }}
            />
          </span>
          <span className="w-14 text-right tabular-nums">
            {stat.count}
            <span className="ml-1 text-xs text-muted-foreground">{Math.round(stat.share * 100)}%</span>
          </span>
        </span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMinutes(stat.shortMin)}</td>
      <td className="max-w-40 px-2 py-2">
        {stat.topProjectId !== undefined && (
          <GroupName
            project={stat.topProjectId === null ? null : byId.get(stat.topProjectId)}
            isTotal={stat.topProjectId === null}
          />
        )}
      </td>
      <td className="px-2 py-2 text-muted-foreground tabular-nums">{shortDate(stat.lastDay).slice(0, 5)}</td>
      <td className="px-2 py-2">
        <span className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          <Button variant="ghost" size="icon-xs" aria-label="Đổi tên nhãn" onClick={() => setEditing(true)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Xoá nhãn"
            className="text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            <Trash2 />
          </Button>
        </span>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title={`Xoá nhãn "${stat.label.name}"?`}
          description="Nhãn sẽ bị gỡ khỏi mọi ngày đã ghi. Ghi chú dạng chữ vẫn giữ nguyên."
          confirmLabel="Xoá nhãn"
          destructive
          onConfirm={() => void deleteLabel(stat.label.id)}
        />
      </td>
    </tr>
  );
}

/** Labels never used on any day; these can be removed without losing history. */
function UnusedLabels({ labels, used }: { labels: MissLabel[]; used: Set<Id> }) {
  const deleteLabel = useAppStore((s) => s.deleteLabel);
  const unused = labels.filter((l) => !used.has(l.id));
  if (unused.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      Nhãn chưa dùng lần nào:
      {unused.map((l) => (
        <span key={l.id} className="group flex items-center gap-0.5 rounded-full border px-2 py-px">
          {l.name}
          <button
            type="button"
            aria-label={`Xoá nhãn ${l.name}`}
            onClick={() => void deleteLabel(l.id)}
            className="opacity-0 group-hover:opacity-100 hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
    </p>
  );
}
