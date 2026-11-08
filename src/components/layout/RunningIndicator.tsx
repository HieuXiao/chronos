import { useNavigate } from "react-router";
import { Square } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { TOGGLE_SHORTCUT_LABEL } from "@/hooks/useSystemIntegration";
import { projectColor } from "@/lib/colors";
import { elapsedSec, formatClock } from "@/lib/time";
import { useAppStore } from "@/store/appStore";

/** The running timer, visible from every page, with a stop button. */
export function RunningIndicator() {
  const running = useAppStore((s) => s.running);
  const projects = useAppStore((s) => s.projects);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const navigate = useNavigate();
  const nowMs = useNow(1000, running !== null);

  if (!running) return null;
  const project = projects.find((p) => p.id === running.projectId);
  const color = projectColor(project?.color);

  return (
    <div
      className="flex h-7 items-center gap-2 rounded-full border pr-1 pl-3 text-sm"
      style={{ borderColor: `${color}80` }}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ backgroundColor: color }} />
        <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: color }} />
      </span>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="max-w-44 truncate hover:underline"
        title={`Đang chạy: ${project?.name ?? ""}`}
      >
        {project?.name ?? "Timer"}
      </button>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatClock(elapsedSec(running.startedAt, nowMs))}
      </span>
      <button
        type="button"
        onClick={() => void stopTimer()}
        className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
        aria-label="Dừng timer"
        title={`Dừng (${TOGGLE_SHORTCUT_LABEL})`}
      >
        <Square className="size-2.5 fill-current" />
      </button>
    </div>
  );
}
