import { useEffect, useMemo, useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataLocationSection } from "@/components/layout/DataLocationSection";
import { ExportSection } from "@/components/layout/ExportSection";
import { ThemeSection } from "@/components/layout/ThemeSection";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TOGGLE_SHORTCUT_LABEL } from "@/hooks/useSystemIntegration";
import { projectColor } from "@/lib/colors";
import { attempt } from "@/lib/errors";
import { goalOn, indexGoals, MAX_DAY_HOURS, minutesToInput, parseHoursInput } from "@/lib/goals";
import { dayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Project } from "@/types";

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  return (
    <Dialog open={open} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cài đặt</DialogTitle>
          <DialogDescription className="sr-only">Chronos chạy offline, dữ liệu chỉ nằm trên máy này.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-7">
          <DayTargetSection open={open} />
          <ThemeSection />
          <GeneralSection open={open} />
          <div className="grid gap-7 border-t pt-6">
            <ExportSection />
            <ArchivedSection />
            <DataLocationSection open={open} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Work time needed per day: the line on the chart (at most 16 h). */
function DayTargetSection({ open }: { open: boolean }) {
  const goals = useAppStore((s) => s.goals);
  const setGoal = useAppStore((s) => s.setGoal);
  const current = useMemo(() => goalOn(indexGoals(goals).day, dayKey(Date.now())), [goals]);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(minutesToInput(current));
  }, [open, current]);

  const minutes = parseHoursInput(value);
  const invalid = minutes === null || minutes > MAX_DAY_HOURS * 60;

  const save = async () => {
    if (invalid || minutes === current) return;
    if (await setGoal(null, minutes)) toast.success(minutes ? "Đã lưu thời gian cần đạt" : "Đã bỏ thời gian cần đạt");
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="day-target">Thời gian cần làm mỗi ngày</Label>
        <InfoTip>Vẽ thành đường ngang trên biểu đồ. Đổi số này chỉ áp dụng từ hôm nay; các ngày trước giữ mức cũ.</InfoTip>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="day-target"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          placeholder="VD 12"
          aria-invalid={invalid || undefined}
          className="h-8 w-24 tabular-nums"
        />
        <span className="text-sm text-muted-foreground">giờ (tối đa {MAX_DAY_HOURS})</span>
      </div>
    </div>
  );
}

function GeneralSection({ open }: { open: boolean }) {
  const [autostart, setAutostart] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    void attempt("Không đọc được cài đặt khởi động", async () => setAutostart(await isEnabled()));
  }, [open]);

  const changeAutostart = async (value: boolean) => {
    setAutostart(value);
    const ok = await attempt("Không đổi được cài đặt khởi động", () => (value ? enable() : disable()));
    if (ok === undefined) setAutostart(await isEnabled().catch(() => !value));
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="autostart">Khởi động cùng Windows</Label>
          <InfoTip>Chạy ẩn dưới khay hệ thống khi đăng nhập.</InfoTip>
        </div>
        <Switch
          id="autostart"
          checked={autostart ?? false}
          disabled={autostart === null}
          onCheckedChange={(v) => void changeAutostart(v)}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <Label>Phím tắt bật/dừng timer</Label>
          <InfoTip>
            Bật lại timer gần nhất, hoặc dừng timer đang chạy. Nút đóng cửa sổ chỉ thu Chronos xuống khay; chọn “Thoát” ở
            khay để tắt hẳn.
          </InfoTip>
        </div>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{TOGGLE_SHORTCUT_LABEL}</kbd>
      </div>
    </div>
  );
}

function ArchivedSection() {
  const projects = useAppStore((s) => s.projects);
  const setProjectArchived = useAppStore((s) => s.setProjectArchived);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const archived = useMemo(() => projects.filter((p) => p.archived), [projects]);
  const [toDelete, setToDelete] = useState<Project | null>(null);

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Project đã lưu trữ</p>
      {archived.length === 0 ? (
        <p className="text-xs text-muted-foreground">Không có.</p>
      ) : (
        <ul className="grid max-h-48 gap-1 overflow-y-auto">
          {archived.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/50">
              <span className="size-2 rounded-full" style={{ backgroundColor: projectColor(p.color) }} />
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              <Button size="xs" variant="ghost" onClick={() => void setProjectArchived(p.id, false)}>
                <ArchiveRestore /> Khôi phục
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground"
                aria-label={`Xoá vĩnh viễn ${p.name}`}
                onClick={() => setToDelete(p)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá project "${toDelete?.name ?? ""}"?`}
        description="Toàn bộ thời gian, todo, ghi chú và tài liệu của project này sẽ bị xoá vĩnh viễn."
        confirmLabel="Xoá vĩnh viễn"
        destructive
        onConfirm={() => {
          if (toDelete) void deleteProject(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
