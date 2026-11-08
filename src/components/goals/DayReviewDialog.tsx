import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGoals } from "@/hooks/useGoals";
import { useNow } from "@/hooks/useNow";
import { projectColor } from "@/lib/colors";
import { formatMinutes, type GoalItem } from "@/lib/goals";
import { formatDate, formatDuration, weekdayName } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Id, MissLabel, MissReasonInput } from "@/types";

interface Draft {
  labelIds: Id[];
  note: string;
}

const keyOf = (projectId: Id | null) => String(projectId ?? 0);

/** End-of-day review: goal vs. actual per group, and why a goal was missed. */
export function DayReviewDialog() {
  const day = useUiStore((s) => s.reviewDay);
  const setReviewDay = useUiStore((s) => s.setReviewDay);
  const projects = useAppStore((s) => s.projects);
  const labels = useAppStore((s) => s.labels);
  const saveReasons = useAppStore((s) => s.saveReasons);
  const nowMs = useNow(60_000, day !== null);
  const goals = useGoals(nowMs);

  const ev = useMemo(() => (day ? goals.evaluate(day) : null), [day, goals]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!day) return;
    const next: Record<string, Draft> = {};
    const current = goals.evaluate(day);
    for (const item of current.items) {
      const r = goals.reasonFor(day, item.projectId);
      next[keyOf(item.projectId)] = { labelIds: r?.labelIds ?? [], note: r?.note ?? "" };
    }
    setDrafts(next);
    setSaving(false);
    // Load once per opened day; later refreshes must not wipe what is being typed.
  }, [day]);

  const byId = new Map(projects.map((p) => [p.id, p]));
  const dayMs = day ? new Date(`${day}T00:00`).getTime() : 0;
  const metCount = ev ? ev.items.length - ev.missed.length : 0;

  const save = async () => {
    if (!day || !ev) return;
    setSaving(true);
    // Reasons are kept for every item that has one, met or not, so nothing typed is lost.
    const inputs: MissReasonInput[] = ev.items.map((item) => {
      const d = drafts[keyOf(item.projectId)] ?? { labelIds: [], note: "" };
      return { day, projectId: item.projectId, labelIds: d.labelIds, note: d.note };
    });
    const ok = await saveReasons(inputs);
    setSaving(false);
    if (ok) setReviewDay(null);
  };

  const update = (projectId: Id | null, patch: Partial<Draft>) =>
    setDrafts((all) => {
      const key = keyOf(projectId);
      const cur = all[key] ?? { labelIds: [], note: "" };
      return { ...all, [key]: { ...cur, ...patch } };
    });

  return (
    <Dialog open={day !== null} onOpenChange={(o) => !o && setReviewDay(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tổng kết ngày</DialogTitle>
          <DialogDescription>
            {day && `${weekdayName(dayMs)}, ${formatDate(dayMs)}`}
            {ev && !ev.final && " · hôm nay chưa kết thúc"}
          </DialogDescription>
        </DialogHeader>

        {ev && ev.items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Ngày này chưa có mục tiêu nào. Đặt mục tiêu trong Cài đặt → Mục tiêu hằng ngày.
          </p>
        ) : (
          <div className="grid gap-3">
            {ev && (
              <p className="text-sm text-muted-foreground">
                Đạt <span className="font-medium text-foreground">{metCount}</span>/{ev.items.length} chỉ tiêu
                {ev.missed.length === 0 ? " 🎉" : ev.final ? " · ghi lại lý do cho những mục chưa đạt" : ""}
              </p>
            )}
            <ul className="grid gap-2">
              {ev?.items.map((item) => {
                const project = item.projectId === null ? null : byId.get(item.projectId);
                const draft = drafts[keyOf(item.projectId)] ?? { labelIds: [], note: "" };
                const hasReason = draft.labelIds.length > 0 || draft.note.trim() !== "";
                return (
                  <li key={keyOf(item.projectId)} className="rounded-lg border p-3">
                    <GoalRow
                      item={item}
                      name={project ? project.name : "Tổng thời gian trong ngày"}
                      color={project ? projectColor(project.color) : "var(--foreground)"}
                      final={ev.final}
                    />
                    {(!item.met || hasReason) && (
                      <div className="mt-3 grid gap-2">
                        <LabelPicker
                          labels={labels}
                          selected={draft.labelIds}
                          onChange={(labelIds) => update(item.projectId, { labelIds })}
                        />
                        <Textarea
                          value={draft.note}
                          onChange={(e) => update(item.projectId, { note: e.target.value })}
                          placeholder="Ghi chú thêm (tuỳ chọn)"
                          rows={2}
                          maxLength={500}
                          className="min-h-0 text-sm"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setReviewDay(null)}>
            Đóng
          </Button>
          {ev && ev.items.length > 0 && (
            <Button onClick={() => void save()} disabled={saving}>
              Lưu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalRow({ item, name, color, final }: { item: GoalItem; name: string; color: string; final: boolean }) {
  const percent = Math.min(100, (item.actualSec / 60 / item.targetMin) * 100);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <span className="tabular-nums">
          {formatDuration(item.actualSec)} <span className="text-muted-foreground">/ {formatMinutes(item.targetMin)}</span>
        </span>
        <StatusBadge item={item} final={final} />
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </span>
    </div>
  );
}

export function StatusBadge({ item, final }: { item: GoalItem; final: boolean }) {
  if (item.met) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <Check className="size-3" aria-hidden="true" /> Đạt
      </span>
    );
  }
  return (
    <span className="text-xs whitespace-nowrap text-amber-400 tabular-nums">
      {final ? "thiếu" : "còn"} {formatMinutes(item.shortMin)}
    </span>
  );
}

interface LabelPickerProps {
  labels: MissLabel[];
  selected: Id[];
  onChange: (ids: Id[]) => void;
}

/** Toggle chips for the reason labels, plus inline creation of a new one. */
function LabelPicker({ labels, selected, onChange }: LabelPickerProps) {
  const createLabel = useAppStore((s) => s.createLabel);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const toggle = (id: Id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const add = async () => {
    const clean = name.trim();
    if (!clean) {
      setAdding(false);
      return;
    }
    const label = await createLabel(clean);
    if (label && !selected.includes(label.id)) onChange([...selected, label.id]);
    setName("");
    setAdding(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void add();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setName("");
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lý do">
      {labels.map((l) => {
        const on = selected.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(l.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {l.name}
          </button>
        );
      })}
      {adding ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => void add()}
          placeholder="Tên nhãn mới"
          maxLength={40}
          className="h-6 w-36 rounded-full px-2.5 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" /> Nhãn mới
        </button>
      )}
    </div>
  );
}
