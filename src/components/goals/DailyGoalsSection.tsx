import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveProjects } from "@/hooks/useStats";
import { projectColor } from "@/lib/colors";
import { formatMinutes, goalOn, indexGoals, minutesToInput, parseHoursInput } from "@/lib/goals";
import { dayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import type { Id } from "@/types";

export const REMINDER_KEY = "review_reminder";
export const DEFAULT_REMINDER = "21:30";

const TOTAL = "total";

/** Whole-day goal, minimum per project and the evening reminder time. */
export function DailyGoalsSection({ open }: { open: boolean }) {
  const projects = useActiveProjects();
  const goals = useAppStore((s) => s.goals);
  const settings = useAppStore((s) => s.settings);
  const setGoals = useAppStore((s) => s.setGoals);
  const setSetting = useAppStore((s) => s.setSetting);

  const current = useMemo(() => {
    const index = indexGoals(goals);
    const today = dayKey(Date.now());
    const map = new Map<string, number>([[TOTAL, goalOn(index.total, today)]]);
    for (const p of projects) map.set(String(p.id), goalOn(index.byProject.get(p.id), today));
    return map;
  }, [goals, projects]);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reminder, setReminder] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(Object.fromEntries([...current].map(([k, m]) => [k, minutesToInput(m)])));
    setReminder(settings[REMINDER_KEY] ?? DEFAULT_REMINDER);
    // Reset only when the dialog opens, not on every refresh while typing.
  }, [open]);

  const parsed = new Map([...current.keys()].map((k) => [k, parseHoursInput(draft[k] ?? "")]));
  const invalid = [...parsed.values()].some((v) => v === null || v > 24 * 60);
  const total = parsed.get(TOTAL) ?? 0;
  const sumProjects = projects.reduce((sum, p) => sum + (parsed.get(String(p.id)) ?? 0), 0);
  const dirty =
    [...current].some(([k, m]) => parsed.get(k) !== m) || reminder !== (settings[REMINDER_KEY] ?? DEFAULT_REMINDER);

  const save = async () => {
    setSaving(true);
    const changed: { projectId: Id | null; minutes: number }[] = [];
    for (const [k, m] of current) {
      const next = parsed.get(k);
      if (next === null || next === undefined || next === m) continue;
      changed.push({ projectId: k === TOTAL ? null : Number(k), minutes: next });
    }
    if (changed.length) await setGoals(changed);
    if (reminder !== (settings[REMINDER_KEY] ?? DEFAULT_REMINDER)) await setSetting(REMINDER_KEY, reminder);
    setSaving(false);
  };

  const field = (key: string, id: string) => (
    <Input
      id={id}
      inputMode="decimal"
      placeholder="—"
      value={draft[key] ?? ""}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      aria-invalid={parsed.get(key) === null || undefined}
      className="h-8 w-20 text-right tabular-nums"
    />
  );

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium">Mục tiêu hằng ngày</p>
        <p className="text-xs text-muted-foreground">
          Nhập số giờ (VD 8, 1.5 hoặc 1:30). Để trống = không đặt. Thay đổi áp dụng từ hôm nay, các ngày trước giữ
          mục tiêu cũ.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="goal-total">Tổng thời gian mỗi ngày</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {field(TOTAL, "goal-total")} giờ
        </div>
      </div>

      {projects.length > 0 && (
        <div className="grid gap-1.5 rounded-md border p-2">
          <p className="px-1 text-xs text-muted-foreground">Tối thiểu mỗi ngày cho từng nhóm công việc</p>
          <ul className="grid max-h-52 gap-1 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-1">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: projectColor(p.color) }} />
                <label htmlFor={`goal-${p.id}`} className="min-w-0 flex-1 truncate text-sm">
                  {p.name}
                </label>
                {field(String(p.id), `goal-${p.id}`)}
                <span className="text-sm text-muted-foreground">giờ</span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground tabular-nums">
            Tổng các nhóm: <span className="text-foreground">{formatMinutes(sumProjects)}</span>
            {total > 0 && sumProjects > total && (
              <>
                <AlertTriangle className="size-3 text-amber-400" aria-hidden="true" />
                vượt mục tiêu ngày ({formatMinutes(total)})
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <Label htmlFor="goal-reminder">Nhắc tổng kết ngày lúc</Label>
          <p className="text-xs text-muted-foreground">Để trống để tắt nhắc.</p>
        </div>
        <Input
          id="goal-reminder"
          type="time"
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
          className="h-8 w-28"
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" disabled={!dirty || invalid || saving} onClick={() => void save()}>
          Lưu mục tiêu
        </Button>
      </div>
    </div>
  );
}
