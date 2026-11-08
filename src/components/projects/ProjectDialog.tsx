import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { DEFAULT_PROJECT_COLOR, PROJECT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";

export function ProjectDialog() {
  const state = useUiStore((s) => s.projectDialog);
  const setProjectDialog = useUiStore((s) => s.setProjectDialog);
  const createProject = useAppStore((s) => s.createProject);
  const updateProject = useAppStore((s) => s.updateProject);

  const editing = state?.mode === "edit" ? state.project : null;
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state) return;
    setName(editing?.name ?? "");
    setTarget(editing?.targetHours != null ? String(editing.targetHours) : "");
    setIcon(editing?.icon ?? "");
    setColor(editing?.color ?? DEFAULT_PROJECT_COLOR);
    setSubmitting(false);
  }, [state, editing]);

  const targetNumber = target.trim() === "" ? null : Number(target.replace(",", "."));
  const targetInvalid = targetNumber !== null && (!Number.isFinite(targetNumber) || targetNumber <= 0);
  const canSubmit = name.trim().length > 0 && !targetInvalid && !submitting;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const values = {
      name: name.trim(),
      targetHours: targetNumber,
      icon: icon.trim() || null,
      color,
    };
    const ok = editing
      ? await updateProject(editing.id, values)
      : (await createProject(values)) !== undefined;
    setSubmitting(false);
    if (ok) setProjectDialog(null);
  };

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && setProjectDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa project" : "Thêm project"}</DialogTitle>
            <DialogDescription>
              Đặt số giờ mục tiêu để Chronos dự báo ngày hoàn thành.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="project-name">Tên project</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Học tiếng Nhật"
              autoFocus
              maxLength={80}
            />
          </div>

          <div className="grid grid-cols-[1fr_96px] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="project-target">Mục tiêu (giờ)</Label>
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
              <Label htmlFor="project-icon">Biểu tượng</Label>
              <Input
                id="project-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📘"
                maxLength={4}
                className="text-center"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Màu</Label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Màu ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition",
                    color === c && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="size-4 text-black/70" />}
                </button>
              ))}
            </div>
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
