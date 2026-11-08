import { useEffect, useMemo, useState } from "react";
import { appConfigDir } from "@tauri-apps/api/path";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { ArchiveRestore, Trash2 } from "lucide-react";
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
import { projectColor } from "@/lib/colors";
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
        <DialogContent className="sm:max-w-lg">
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

            {dataDir && (
              <div className="grid gap-1">
                <p className="text-sm">Vị trí dữ liệu</p>
                <code className="rounded bg-muted px-2 py-1 text-xs break-all select-text">{dataDir}</code>
              </div>
            )}

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
