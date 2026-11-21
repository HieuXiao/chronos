import { useEffect, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Check, Maximize2, MoreHorizontal, Pause, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNow } from "@/hooks/useNow";
import { projectColor } from "@/lib/colors";
import { formatMinutes } from "@/lib/goals";
import { exitMini } from "@/lib/miniWindow";
import { ProjectIcon } from "@/lib/projectIcons";
import { timerRing } from "@/lib/timerRing";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { lastUsedProject, useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";

const TICKS = 60;
const SIZE = 156;
const R = SIZE / 2;

/** `25:13`, or `1:02:13` from one hour on. */
function clockText(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The whole window while in mini mode: a small clock that stays above other apps. */
export function MiniClock() {
  const projects = useAppStore((s) => s.projects);
  const running = useAppStore((s) => s.running);
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const nowMs = useNow(1000);
  const idlePrompt = useUiStore((s) => s.idlePrompt);

  // The idle question needs room: open the full window for it.
  useEffect(() => {
    if (idlePrompt) void exitMini().catch(() => undefined);
  }, [idlePrompt]);

  const project = lastUsedProject({ projects, spans, running });
  const ring = useMemo(
    () => (project ? timerRing(project, running, spans, goals, nowMs) : null),
    [project, running, spans, goals, nowMs],
  );
  const active = projects.filter((p) => !p.archived);
  const color = projectColor(project?.color);
  const lit = ring ? Math.round(ring.fraction * TICKS) : 0;

  const toggle = () => {
    if (!project) return;
    if (ring?.running) void stopTimer({ askNote: false });
    else void startTimer(project.id, { askNote: false });
  };

  const minimize = () => {
    try {
      void getCurrentWindow().minimize();
    } catch {
      /* browser preview */
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background select-none">
      {/* Title bar: drag anywhere */}
      <div data-tauri-drag-region className="flex h-9 shrink-0 items-center gap-1 px-1.5">
        <IconButton label="Mở cửa sổ đầy đủ" onClick={() => void exitMini()}>
          <Maximize2 className="size-3.5" />
        </IconButton>
        <p data-tauri-drag-region className="min-w-0 flex-1 truncate text-center text-xs font-medium">
          {project?.name ?? "Chronos"}
        </p>
        <IconButton label="Thu nhỏ xuống taskbar" onClick={minimize}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" stroke="currentColor" strokeWidth="1">
            <path d="M0 5.5h10" />
          </svg>
        </IconButton>
      </div>

      {/* Ring */}
      <div data-tauri-drag-region className="flex flex-1 items-center justify-center">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="pointer-events-none absolute inset-0" aria-hidden="true">
            <circle cx={R} cy={R} r={R - 1} className="fill-muted/60" />
            {Array.from({ length: TICKS }, (_, i) => {
              const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
              const major = i % 5 === 0;
              const outer = R - 9;
              const inner = outer - (major ? 9 : 6);
              const on = i < lit;
              return (
                <line
                  key={i}
                  x1={R + inner * Math.cos(a)}
                  y1={R + inner * Math.sin(a)}
                  x2={R + outer * Math.cos(a)}
                  y2={R + outer * Math.sin(a)}
                  stroke={on ? color : "currentColor"}
                  strokeOpacity={on ? 1 : 0.22}
                  strokeWidth={major ? 2.2 : 1.6}
                  strokeLinecap="round"
                  className="text-foreground"
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {ring ? (
              <>
                <p className="text-[28px] leading-none font-light tracking-tight tabular-nums">
                  {clockText(ring.running ? ring.sessionSec : ring.todaySec)}
                </p>
                <p className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {ring.running ? "hôm nay " : "đã dừng · hôm nay "}
                  {formatDuration(ring.todaySec)}
                  {ring.minSec > 0 && ` / ${formatMinutes(ring.minSec / 60)}`}
                </p>
              </>
            ) : (
              <p className="px-6 text-xs text-muted-foreground">Chưa có project</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex shrink-0 items-center justify-center gap-3 pb-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!project}
          aria-label={ring?.running ? "Dừng timer" : "Bắt đầu timer"}
          title={ring?.running ? "Dừng timer" : `Bắt đầu: ${project?.name ?? ""}`}
          className="flex size-9 items-center justify-center rounded-full text-white shadow-sm transition-[filter] hover:brightness-110 disabled:opacity-40"
          style={{ backgroundColor: color }}
        >
          {ring?.running ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Chọn project"
              title="Chọn project"
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="max-h-56 w-52 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Bắt đầu project</DropdownMenuLabel>
            {active.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => void startTimer(p.id, { askNote: false })}
                className="gap-2 text-xs"
              >
                <ProjectIcon icon={p.icon} color={projectColor(p.color)} className="size-3.5" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {running?.projectId === p.id && <Check className="size-3.5" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void exitMini()} className="gap-2 text-xs">
              <Maximize2 className="size-3.5" />
              Mở cửa sổ đầy đủ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground")}
    >
      {children}
    </button>
  );
}
