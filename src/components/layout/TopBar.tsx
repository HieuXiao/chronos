import { NavLink } from "react-router";
import { Settings, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { ExportMenu } from "./ExportMenu";
import { RunningIndicator } from "./RunningIndicator";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-1 text-sm transition-colors",
    isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
  );

export function TopBar() {
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b px-4">
      <div className="flex items-center gap-2 font-semibold">
        <Timer className="size-4 text-green-500" />
        Chronos
      </div>
      <nav className="flex items-center gap-1">
        <NavLink to="/" end className={navClass}>
          Bộ đếm
        </NavLink>
        <NavLink to="/history" className={navClass}>
          Lịch sử
        </NavLink>
        <NavLink to="/insights" className={navClass}>
          Thống kê
        </NavLink>
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <div className="mr-2 min-w-0">
          <RunningIndicator />
        </div>
        <ExportMenu />
        <Button variant="ghost" size="icon-sm" onClick={() => setSettingsOpen(true)} aria-label="Cài đặt">
          <Settings />
        </Button>
      </div>
    </header>
  );
}
