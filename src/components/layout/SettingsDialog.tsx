import { useEffect, useMemo, useState } from "react";
import { appConfigDir } from "@tauri-apps/api/path";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { ArchiveRestore, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as sampleDb from "@/db/queries/sample";
import { buildSampleData, SAMPLE_PROJECT_COUNT } from "@/lib/sampleData";
import { DailyGoalsSection } from "@/components/goals/DailyGoalsSection";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TOGGLE_SHORTCUT_LABEL } from "@/hooks/useSystemIntegration";
import { nextProjectColors, projectColor } from "@/lib/colors";
import { attempt } from "@/lib/errors";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Project } from "@/types";

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const projects = useAppStore((s) => s.projects);
  const setProjectArchived = useAppStore((s) => s.setProjectArchived);
  const deleteProject = useAppStore((s) => s.deleteProject);

  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const archived = useMemo(() => projects.filter((p) => p.archived), [projects]);
  const refresh = useAppStore((s) => s.refresh);
  const hasSample = projects.some((p) => p.sample);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [confirmClearSample, setConfirmClearSample] = useState(false);

  const createSample = async () => {
    setSampleBusy(true);
    // Sample projects take the palette slots after the ones already in use.
    const colors = nextProjectColors(projects, SAMPLE_PROJECT_COUNT);
    const ok = await attempt("Không tạo được dữ liệu mẫu", () =>
      sampleDb.insertSampleData(buildSampleData(Date.now(), colors)),
    );
    await refresh();
    setSampleBusy(false);
    if (ok !== undefined) toast.success("Đã tạo dữ liệu mẫu");
  };

  const clearSample = async () => {
    setSampleBusy(true);
    const ok = await attempt("Không xoá được dữ liệu mẫu", () => sampleDb.deleteSampleData());
    useUiStore.getState().closeSidebar();
    await refresh();
    setSampleBusy(false);
    if (ok !== undefined) toast.success("Đã xoá dữ liệu mẫu");
  };

  useEffect(() => {
    if (!open) return;
    void attempt("Không đọc được cài đặt khởi động", async () => setAutostart(await isEnabled()));
    void appConfigDir()
      .then(setDataDir)
      .catch(() => setDataDir(""));
  }, [open]);

  const changeAutostart = async (value: boolean) => {
    setAutostart(value);
    const ok = await attempt("Không đổi được cài đặt khởi động", () => (value ? enable() : disable()));
    if (ok === undefined) setAutostart(await isEnabled().catch(() => !value));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cài đặt</DialogTitle>
            <DialogDescription>Chronos chạy hoàn toàn offline; dữ liệu chỉ nằm trên máy này.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="autostart">Khởi động cùng Windows</Label>
                <p className="text-xs text-muted-foreground">Chạy ẩn dưới khay hệ thống khi đăng nhập.</p>
              </div>
              <Switch
                id="autostart"
                checked={autostart ?? false}
                disabled={autostart === null}
                onCheckedChange={(v) => void changeAutostart(v)}
              />
            </div>

            <div className="grid gap-1 text-sm">
              <p>
                Phím tắt bật/tắt timer gần nhất:{" "}
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{TOGGLE_SHORTCUT_LABEL}</kbd>
              </p>
              <p className="text-xs text-muted-foreground">Đóng cửa sổ sẽ thu xuống khay; chọn “Thoát” ở khay để tắt hẳn.</p>
            </div>

            <DailyGoalsSection open={open} />

            {dataDir && (
              <div className="grid gap-1">
                <p className="text-sm">Vị trí dữ liệu</p>
                <code className="rounded bg-muted px-2 py-1 text-xs break-all select-text">{dataDir}</code>
              </div>
            )}

            <div className="grid gap-2">
              <p className="text-sm font-medium">Dữ liệu mẫu</p>
              <p className="text-xs text-muted-foreground">
                {SAMPLE_PROJECT_COUNT} project mẫu với khoảng 6 tháng session, todo, ghi chú, chỉ tiêu ngày và lý do không đạt để xem thử biểu đồ và dự
                báo. Dữ liệu thật của bạn không bị ảnh hưởng.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={hasSample || sampleBusy} onClick={() => void createSample()}>
                  <Sparkles /> Tạo dữ liệu mẫu
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!hasSample || sampleBusy}
                  onClick={() => setConfirmClearSample(true)}
                >
                  <Trash2 /> Xoá dữ liệu mẫu
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Project đã lưu trữ</p>
              {archived.length === 0 ? (
                <p className="text-xs text-muted-foreground">Không có project nào.</p>
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
                        aria-label="Xoá vĩnh viễn"
                        onClick={() => setToDelete(p)}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmClearSample}
        onOpenChange={setConfirmClearSample}
        title="Xoá dữ liệu mẫu?"
        description="Các project mẫu cùng session, todo và ghi chú của chúng sẽ bị xoá. Project của bạn giữ nguyên."
        confirmLabel="Xoá dữ liệu mẫu"
        destructive
        onConfirm={() => void clearSample()}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá project "${toDelete?.name ?? ""}"?`}
        description="Toàn bộ session, todo và ghi chú của project này sẽ bị xoá vĩnh viễn."
        confirmLabel="Xoá vĩnh viễn"
        destructive
        onConfirm={() => {
          if (toDelete) void deleteProject(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
