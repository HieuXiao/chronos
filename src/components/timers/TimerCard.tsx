import { useState } from "react";
import { Archive, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectColor } from "@/lib/colors";
import { elapsedSec, formatClock, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Project, Session } from "@/types";

interface TimerCardProps {
  project: Project;
  /** The running session if it belongs to this project. */
  running: Session | null;
  todaySec: number;
  nowMs: number;
  selected: boolean;
}

export function TimerCard({ project, running, todaySec, nowMs, selected }: TimerCardProps) {
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
        onClick={() => openSidebar(project.id)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openSidebar(project.id);
          }
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 text-left transition outline-none",
          "hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring",
          selected && "border-foreground/30",
        )}
        style={isRunning ? { borderColor: color, boxShadow: `0 0 0 1px ${color}` } : undefined}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />

        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {project.icon && <span className="text-lg leading-none">{project.icon}</span>}
            <h3 className="truncate font-medium" title={project.name}>
              {project.name}
            </h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label="Tuỳ chọn project"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            {/* Menu is portalled, but React events still bubble to the card. */}
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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

        <div
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums tracking-tight",
            !isRunning && "text-muted-foreground/50",
          )}
        >
          {formatClock(elapsed)}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Hôm nay: <span className="text-foreground">{formatDuration(todaySec)}</span>
          </span>
          <Button
            size="icon"
            variant={isRunning ? "default" : "secondary"}
            className="rounded-full"
            style={isRunning ? { backgroundColor: color, color: "#09090b" } : undefined}
            aria-label={isRunning ? "Dừng" : "Bắt đầu"}
            onClick={(e) => {
              e.stopPropagation();
              void toggleProjectTimer(project.id);
            }}
          >
            {isRunning ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </Button>
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
