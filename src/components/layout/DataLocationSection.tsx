import { useEffect, useState } from "react";
import { appConfigDir } from "@tauri-apps/api/path";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { closeDbForMove, getDb } from "@/db/client";
import { attempt, reportError } from "@/lib/errors";
import { dataDirHasDb, getDataLocation, prepareDataDir, setDataLocation, type DataLocation } from "@/lib/native";

const APP_FOLDER = "chronos";

/**
 * The folder the data goes into: a `chronos` folder inside the chosen one, so
 * picking "D:\" never scatters files at the drive root. A path that already
 * ends in `chronos` is used as is.
 */
function withAppFolder(path: string): string {
  const trimmed = path.trim().replace(/[\\/]+$/, "");
  if (trimmed === "") return "";
  const last = trimmed.split(/[\\/]/).pop() ?? "";
  if (last.toLowerCase() === APP_FOLDER) return trimmed;
  const sep = trimmed.includes("/") && !trimmed.includes("\\") ? "/" : "\\";
  return `${trimmed}${sep}${APP_FOLDER}`;
}

interface PendingMove {
  /** `null` = back to the default folder. */
  dir: string | null;
  displayDir: string;
  /** The target already has a data.db, which will be used as is. */
  hasDb: boolean;
}

export function DataLocationSection({ open }: { open: boolean }) {
  const [location, setLocation] = useState<DataLocation | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInput("");
    void attempt("Không đọc được vị trí dữ liệu", async () => setLocation(await getDataLocation()));
  }, [open]);

  if (!location) return null;

  const target = withAppFolder(input);
  const canApply = target !== "" && target.toLowerCase() !== location.dir.toLowerCase() && !busy;

  const browse = async () => {
    const picked = await attempt("Không mở được hộp chọn thư mục", () =>
      openDialog({ directory: true, title: "Chọn nơi đặt thư mục chronos", defaultPath: input.trim() || location.dir }),
    );
    if (typeof picked === "string") setInput(withAppFolder(picked));
  };

  const prepare = async (dir: string | null) => {
    setBusy(true);
    const displayDir = dir ?? (await appConfigDir().catch(() => "thư mục mặc định"));
    const hasDb = await attempt("Không kiểm tra được thư mục", () => dataDirHasDb(displayDir));
    setBusy(false);
    if (hasDb !== undefined) setPending({ dir, displayDir, hasDb });
  };

  const move = async ({ dir, hasDb }: PendingMove) => {
    setBusy(true);
    let unlock: (() => void) | undefined;
    try {
      if (!hasDb) {
        // SQLite's own online backup: a complete, consistent copy even while open.
        const target = await prepareDataDir(dir);
        const db = await getDb();
        await db.execute("VACUUM INTO $1", [target]);
      }
      ({ unlock } = await closeDbForMove());
      // On success the app restarts and this never settles in a useful way.
      await setDataLocation(dir);
    } catch (err) {
      unlock?.();
      reportError("Không chuyển được vị trí dữ liệu", err);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium">Vị trí dữ liệu</p>
        <InfoTip side="top">
          {location.isDefault ? "Đang dùng thư mục mặc định." : "Đang dùng thư mục tuỳ chọn."} Có thể chọn thư mục khác, ví dụ
          trong OneDrive để sao lưu.
        </InfoTip>
      </div>
      <div className="grid gap-1">
        <code className="rounded bg-muted px-2 py-1 text-xs break-all select-text">{location.dir}</code>
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={() => setInput((v) => withAppFolder(v))}
          placeholder="Dán đường dẫn hoặc bấm Chọn thư mục"
          aria-label="Thư mục chứa dữ liệu mới"
          className="h-8 text-xs md:text-xs"
          spellCheck={false}
        />
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void browse()}>
          <FolderOpen /> Chọn thư mục
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!canApply} onClick={() => void prepare(target)}>
          Chuyển dữ liệu
        </Button>
        {!location.isDefault && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void prepare(null)}>
            <RotateCcw /> Về mặc định
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.hasDb ? "Dùng dữ liệu có sẵn?" : "Chuyển dữ liệu?"}
        description={
          pending?.hasDb
            ? `“${pending.displayDir}” đã có data.db. Chronos sẽ dùng dữ liệu đó và khởi động lại; dữ liệu hiện tại vẫn nằm nguyên ở thư mục cũ.`
            : `Dữ liệu hiện tại sẽ được chép sang “${pending?.displayDir ?? ""}” và Chronos sẽ khởi động lại. Bản ở thư mục cũ được giữ nguyên.`
        }
        confirmLabel={pending?.hasDb ? "Dùng dữ liệu này" : "Chép và khởi động lại"}
        onConfirm={() => {
          if (pending) void move(pending);
          setPending(null);
        }}
      />
    </div>
  );
}
