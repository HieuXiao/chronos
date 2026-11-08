import { useState } from "react";
import { Archive, ListTodo, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { DailyGoalLine, TargetProgress } from "@/components/projects/ProjectProgress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectColor } from "@/lib/colors";
import type { ProjectTotals } from "@/lib/stats";
import { elapsedSec, formatClock, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Project, Session } from "@/types";

interface TimerCardProps {
  project: Project;
  /** The running session if it belongs to this project. */
  running: Session | null;
  totals: ProjectTotals;
  /** Today's minimum for this project in minutes (0 = none). */
  dailyTargetMin: number;
  nowMs: number;
  selected: boolean;
}

/**
 * One card per project: timer, today vs. its daily minimum, and overall
 * progress / forecast / deadline. Clicking the card opens todos and notes.
 */
export function TimerCard({ project, running, totals, dailyTargetMin, nowMs, selected }: TimerCardProps) {
  const toggleProjectTimer = useAppStore((s) => s.toggleProjectTimer);
  const setProjectArchived = useAppStore((s) => s.setProjectArchived);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const openSidebar = useUiStore((s) => s.openSidebar);
  const setProjectDialog = useUiStore((s) => s.setProjectDialog);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const color = projectColor(project.color);
  const isRunning = running !== null;
  const elapsed = running ? elapsedSec(running.startedAt, nowMs) : 0;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${project.name}: mở todo và ghi chú`}
        onClick={() => openSidebar(project.id)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openSidebar(project.id);
          }
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 pl-5 text-left transition outline-none",
          "hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring",
          selected && "border-foreground/30 bg-accent/30",
        )}
        style={isRunning ? { borderColor: color, boxShadow: `0 0 0 1px ${color}` } : undefined}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />

        <div className="flex items-start gap-2">
          {project.icon && <span className="text-lg leading-6">{project.icon}</span>}
          <h3 className="min-w-0 flex-1 truncate leading-6 font-medium" title={project.name}>
            {project.name}
          </h3>
          <ListTodo
            className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-2 text-muted-foreground"
                aria-label="Tuỳ chọn project"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            {/* Menu is portalled, but React events still bubble to the card. */}
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => openSidebar(project.id)}>
                <ListTodo /> Todo & ghi chú
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setProjectDialog({ mode: "edit", project })}>
                <Pencil /> Sửa
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void setProjectArchived(project.id, true)}>
                <Archive /> Lưu trữ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Xoá
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between gap-3">
          {isRunning ? (
            <div className="min-w-0">
              <p className="font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums">
                {formatClock(elapsed)}
              </p>
              <p className="mt-1.5 text-xs" style={{ color }}>
                Đang chạy
              </p>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-3xl leading-none font-semibold tabular-nums">{formatDuration(totals.todaySec)}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">hôm nay</p>
            </div>
          )}
          <Button
            size="icon-lg"
            variant={isRunning ? "default" : "secondary"}
            className="shrink-0 rounded-full"
            style={isRunning ? { backgroundColor: color, color: "#09090b" } : undefined}
            aria-label={isRunning ? `Dừng ${project.name}` : `Bắt đầu ${project.name}`}
            title={isRunning ? "Dừng" : "Bắt đầu"}
            onClick={(e) => {
              e.stopPropagation();
              void toggleProjectTimer(project.id);
            }}
          >
            {isRunning ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </Button>
        </div>

        {(dailyTargetMin > 0 || isRunning) && (
          <div className="grid gap-3">
            {dailyTargetMin > 0 ? (
              <DailyGoalLine todaySec={totals.todaySec} targetMin={dailyTargetMin} color={color} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Hôm nay: <span className="text-foreground tabular-nums">{formatDuration(totals.todaySec)}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-auto border-t pt-3">
          <TargetProgress project={project} totals={totals} nowMs={nowMs} color={color} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Xoá project "${project.name}"?`}
        description="Toàn bộ session, todo và ghi chú của project này sẽ bị xoá vĩnh viễn. Nếu chỉ muốn ẩn đi, hãy dùng Lưu trữ."
        confirmLabel="Xoá vĩnh viễn"
        destructive
        onConfirm={() => void deleteProject(project.id)}
      />
    </>
  );
}
