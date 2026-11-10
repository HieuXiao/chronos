import { Settings, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/uiStore";
import { RunningIndicator } from "./RunningIndicator";
import { WindowControls } from "./WindowControls";

/**
 * The window's title bar and the app header in one row: drag anywhere empty
 * to move the window, double-click to maximize. Window buttons sit at the right.
 */
export function TopBar() {
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  return (
    <header data-tauri-drag-region data-keep-sidebar className="flex h-11 shrink-0 select-none items-center border-b pl-4">
      <div data-tauri-drag-region className="flex items-center gap-2 text-sm font-semibold">
        <span className="pointer-events-none flex size-6 items-center justify-center rounded-md bg-primary/10">
          <Timer className="size-3.5 text-primary" />
        </span>
        <span className="pointer-events-none">Chronos</span>
      </div>

      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center justify-end gap-1 pr-2">
        <div className="min-w-0">
          <RunningIndicator />
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setSettingsOpen(true)} aria-label="Cài đặt" title="Cài đặt">
          <Settings />
        </Button>
      </div>

      <span aria-hidden="true" className="h-5 w-px bg-border" />
      <WindowControls />
    </header>
  );
}
