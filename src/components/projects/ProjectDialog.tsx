import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTakenColors } from "@/hooks/useStats";
import { DEFAULT_PROJECT_COLOR, PROJECT_COLORS } from "@/lib/colors";
import { goalOn, indexGoals, minutesToInput, parseHoursInput } from "@/lib/goals";
import { dayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";

export function ProjectDialog() {
  const state = useUiStore((s) => s.projectDialog);
  const setProjectDialog = useUiStore((s) => s.setProjectDialog);
  const createProject = useAppStore((s) => s.createProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const setGoal = useAppStore((s) => s.setGoal);

  const editing = state?.mode === "edit" ? state.project : null;
  const taken = useTakenColors(editing?.id);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyMin, setDailyMin] = useState("");
  const [initialDailyMin, setInitialDailyMin] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state) return;
    setName(editing?.name ?? "");
    setTarget(editing?.targetHours != null ? String(editing.targetHours) : "");
    setIcon(editing?.icon ?? null);
    // A new project gets the first colour no unfinished project is using.
    setColor(editing?.color ?? PROJECT_COLORS.find((c) => !taken.has(c)) ?? DEFAULT_PROJECT_COLOR);
    setStartDate(editing ? (editing.startDate ?? "") : dayKey(Date.now()));
    setEndDate(editing?.endDate ?? "");
    const minutes = editing
      ? goalOn(indexGoals(useAppStore.getState().goals).byProject.get(editing.id), dayKey(Date.now()))
      : 0;
    setInitialDailyMin(minutes);
    setDailyMin(minutesToInput(minutes));
    setSubmitting(false);
    // Reset only when the dialog opens.
  }, [state, editing]);

  const targetNumber = target.trim() === "" ? null : Number(target.replace(",", "."));
  const targetInvalid = targetNumber !== null && (!Number.isFinite(targetNumber) || targetNumber <= 0);
  // 'YYYY-MM-DD' strings compare correctly as text.
  const datesInvalid = startDate !== "" && endDate !== "" && endDate < startDate;
  const dailyMinutes = parseHoursInput(dailyMin);
  const dailyInvalid = dailyMinutes === null || dailyMinutes > 16 * 60;
  const colorTaken = taken.has(color) && color !== editing?.color;
  const canSubmit =
    name.trim().length > 0 && startDate !== "" && !targetInvalid && !datesInvalid && !dailyInvalid && !colorTaken && !submitting;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const values = {
      name: name.trim(),
      targetHours: targetNumber,
      icon,
      color,
      startDate,
      endDate: endDate || null,
    };
    let id: number | undefined;
    if (editing) id = (await updateProject(editing.id, values)) ? editing.id : undefined;
    else id = (await createProject(values))?.id;
    let ok = id !== undefined;
    if (ok && id !== undefined && dailyMinutes !== null && dailyMinutes !== initialDailyMin) {
      ok = await setGoal(id, dailyMinutes);
    }
    setSubmitting(false);
    if (ok) setProjectDialog(null);
  };

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && setProjectDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa project" : "Thêm project"}</DialogTitle>
            <DialogDescription className="sr-only">Tên, biểu tượng, màu, mục tiêu và thời gian của project.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="project-name">Tên project</Label>
            <div className="flex gap-2">
              <IconPicker value={icon} color={color} onChange={setIcon} />
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Học tiếng Nhật"
                autoFocus
                maxLength={80}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Màu</Label>
            <ColorPicker value={color} onChange={setColor} taken={taken} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="project-target">Tổng giờ cần đạt</Label>
              <Input
                id="project-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="VD: 150"
                aria-invalid={targetInvalid || undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-daily">Tối thiểu mỗi ngày (giờ)</Label>
              <Input
                id="project-daily"
                inputMode="decimal"
                value={dailyMin}
                onChange={(e) => setDailyMin(e.target.value)}
                placeholder="VD: 2"
                aria-invalid={dailyInvalid || undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-start">Bắt đầu</Label>
              <Input id="project-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-end">Hạn (tuỳ chọn)</Label>
              <Input
                id="project-end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={datesInvalid || undefined}
              />
            </div>
            {datesInvalid && <p className="col-span-2 text-xs text-destructive">Hạn phải sau ngày bắt đầu.</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProjectDialog(null)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {editing ? "Lưu" : "Tạo project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
