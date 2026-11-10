import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { goalOn, indexGoals, MAX_DAY_HOURS } from "@/lib/goals";
import { dailyTotals } from "@/lib/stats";
import { formatDate, formatDuration, formatHours, weekdayName } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Id, ReasonLabel } from "@/types";

/** Why a day missed its work time: pick labels so repeats can be counted later. */
export function DayReasonDialog() {
  const day = useUiStore((s) => s.dayReason);
  const close = useUiStore((s) => s.closeDayReason);
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const labels = useAppStore((s) => s.labels);
  const dayReasons = useAppStore((s) => s.dayReasons);
  const saveDayReason = useAppStore((s) => s.saveDayReason);
  const [selected, setSelected] = useState<Set<Id>>(new Set());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!day) return;
    const existing = dayReasons.find((r) => r.day === day);
    setSelected(new Set(existing?.labelIds ?? []));
    setNote(existing?.note ?? "");
    setSaving(false);
    // Load once per opened day.
  }, [day]);

  const groups = useMemo(() => groupLabels(labels), [labels]);
  const dayMs = day ? new Date(`${day}T00:00`).getTime() : 0;
  const actualSec = day ? (dailyTotals(spans, Date.now()).get(day) ?? 0) : 0;
  const targetH = day ? Math.min(MAX_DAY_HOURS, goalOn(indexGoals(goals).day, day) / 60) : 0;

  const toggle = (id: Id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    if (!day) return;
    setSaving(true);
    const ok = await saveDayReason(day, [...selected], note);
    setSaving(false);
    if (ok) close();
  };

  return (
    <Dialog open={day !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lý do chưa đạt</DialogTitle>
          <DialogDescription className="tabular-nums">
            {day && `${weekdayName(dayMs)}, ${formatDate(dayMs)} · ${formatDuration(actualSec)}`}
            {targetH > 0 && ` / ${formatHours(targetH)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {groups.map(({ group, children }) => (
            <LabelGroup key={group.id} group={group} items={children} selected={selected} onToggle={toggle} />
          ))}
          <NewGroup />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="day-reason-note" className="text-sm font-medium">
            Ghi thêm <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </label>
          <Textarea
            id="day-reason-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Chi tiết nếu cần nhớ, VD: họp nhóm kéo dài đến 9h tối"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Huỷ
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface LabelTreeGroup {
  group: ReasonLabel;
  children: ReasonLabel[];
}

/** Groups (top-level labels) with their labels, both in display order. */
export function groupLabels(labels: ReasonLabel[]): LabelTreeGroup[] {
  const byOrder = (a: ReasonLabel, b: ReasonLabel) => a.orderIndex - b.orderIndex || a.id - b.id;
  return labels
    .filter((l) => l.parentId === null)
    .sort(byOrder)
    .map((group) => ({ group, children: labels.filter((l) => l.parentId === group.id).sort(byOrder) }));
}

interface LabelGroupProps {
  group: ReasonLabel;
  items: ReasonLabel[];
  selected: Set<Id>;
  onToggle: (id: Id) => void;
}

function LabelGroup({ group, items, selected, onToggle }: LabelGroupProps) {
  const createLabel = useAppStore((s) => s.createLabel);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    // Reuse a label with the same name in this group instead of duplicating it.
    const existing = items.find((c) => c.name.toLowerCase() === clean.toLowerCase());
    const label = existing ?? (await createLabel(clean, group.id));
    if (label && !selected.has(label.id)) onToggle(label.id);
    setName("");
    setAdding(false);
  };

  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{group.name}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((l) => {
          const on = selected.has(l.id);
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(l.id)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {on && <Check className="size-3" />}
              {l.name}
            </button>
          );
        })}
        {adding ? (
          <form onSubmit={(e) => void submit(e)} className="flex items-center gap-1">
            <Input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => !name.trim() && setAdding(false)}
              onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setAdding(false))}
              placeholder="Tên nhãn"
              className="h-6 w-36 px-2 text-xs"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label={`Thêm nhãn vào ${group.name}`}
            className="flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3" /> Thêm
          </button>
        )}
      </div>
    </div>
  );
}

/** Adds a new group of labels. */
function NewGroup() {
  const labels = useAppStore((s) => s.labels);
  const createLabel = useAppStore((s) => s.createLabel);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const exists = labels.some((l) => l.parentId === null && l.name.toLowerCase() === clean.toLowerCase());
    if (!exists) await createLabel(clean, null);
    setName("");
    setAdding(false);
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3" /> Nhóm lý do mới
      </button>
    );
  }
  return (
    <form onSubmit={(e) => void submit(e)}>
      <Input
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name.trim() && setAdding(false)}
        onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setAdding(false))}
        placeholder="Tên nhóm, VD: Học tập"
        className="h-7 w-48 text-xs"
      />
    </form>
  );
}
