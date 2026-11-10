import { useState } from "react";
import { Archive, Check, Flame, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
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
import { ProjectIcon } from "@/lib/projectIcons";
import { formatMinutes } from "@/lib/goals";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  running: boolean;
  /** All tracked time, running session included. */
  totalSec: number;
  todaySec: number;
  /** Minimum per day in minutes (0 = none). */
  dailyMinMinutes: number;
  streak: number;
  selected: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Total time as a clock: "139:48" (h:mm), with seconds while running. */
function totalClock(sec: number, withSeconds: boolean): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return withSeconds ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${h}:${pad2(m)}`;
}

/**
 * Left: name, today's time and the streak. Right: the total clock inside a ring
 * that fills towards the project's total hours; it keeps counting while running.
 * Clicking the card opens the sidebar.
 */
export function ProjectCard({ project, running, totalSec, todaySec, dailyMinMinutes, streak, selected }: ProjectCardProps) {
  const toggleProjectTimer = useAppStore((s) => s.toggleProjectTimer);
  const setProjectArchived = useAppStore((s) => s.setProjectArchived);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const openSidebar = useUiStore((s) => s.openSidebar);
  const setProjectDialog = useUiStore((s) => s.setProjectDialog);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const color = projectColor(project.color);
  const target = project.targetHours ?? 0;
  const progress = target > 0 ? Math.min(1, totalSec / 3600 / target) : 0;
  const todayMet = dailyMinMinutes > 0 && todaySec / 60 >= dailyMinMinutes;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${project.name}: mở chi tiết`}
        data-keep-sidebar
        onClick={() => openSidebar(project.id)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openSidebar(project.id);
          }
        }}
        className={cn(
          "group relative flex min-w-0 cursor-pointer gap-3 overflow-hidden rounded-xl border bg-card p-4 pl-5 text-left transition-colors outline-none",
          "hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring",
          selected && "border-foreground/30",
        )}
        style={running ? { borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 6%, var(--card))` } : undefined}
      >
        <span className="absolute inset-y-3 left-2 w-1 rounded-full" style={{ backgroundColor: color }} />

        {/* Left: name, today, streak, start */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-1.5">
            <ProjectIcon icon={project.icon} color={color} className="size-[18px] text-base" />
            <h3 className="min-w-0 flex-1 truncate leading-6 font-semibold" title={project.name}>
              {project.name}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="-mr-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                  aria-label={`Tuỳ chọn ${project.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
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

          <div className="text-sm tabular-nums">
            <span className="text-muted-foreground">Hôm nay </span>
            <span className="font-medium">{formatDuration(todaySec)}</span>
            {dailyMinMinutes > 0 && <span className="text-muted-foreground"> / {formatMinutes(dailyMinMinutes)}</span>}
            {todayMet && <Check className="ml-1 inline size-3.5 text-success" aria-label="Đạt tối thiểu hôm nay" />}
          </div>

          <div
            className={cn("flex items-center gap-1 text-sm tabular-nums", streak > 0 ? "text-warning" : "text-muted-foreground")}
            title={dailyMinMinutes > 0 ? "Số ngày liên tiếp đạt tối thiểu mỗi ngày" : "Số ngày liên tiếp có làm"}
          >
            <Flame className="size-4" /> {streak} ngày
          </div>

          <Button
            size="sm"
            variant={running ? "default" : "secondary"}
            className="mt-auto w-fit rounded-full px-3"
            style={running ? { backgroundColor: color, color: "#fff" } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              void toggleProjectTimer(project.id);
            }}
          >
            {running ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            {running ? "Dừng" : "Bắt đầu"}
          </Button>
        </div>

        {/* Right: total clock in a progress ring */}
        <Ring progress={progress} color={color} active={running}>
          <span className={cn("font-mono text-[15px] leading-tight font-semibold tabular-nums", running && "text-foreground")}>
            {totalClock(totalSec, running)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {target > 0 ? `/ ${target}h` : "tổng giờ"}
          </span>
        </Ring>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Xoá project "${project.name}"?`}
        description="Toàn bộ thời gian, todo, ghi chú và tài liệu của project này sẽ bị xoá vĩnh viễn. Nếu chỉ muốn ẩn đi, hãy dùng Lưu trữ."
        confirmLabel="Xoá vĩnh viễn"
        destructive
        onConfirm={() => void deleteProject(project.id)}
      />
    </>
  );
}

const SIZE = 104;
const STROKE = 8;

function Ring({ progress, color, active, children }: { progress: number; color: string; active: boolean; children: React.ReactNode }) {
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0 self-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />
        {progress > 0 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${c * progress} ${c}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      {active && (
        <span
          className="absolute top-2 right-2 size-2 animate-pulse rounded-full"
          style={{ backgroundColor: color }}
          aria-label="Đang chạy"
        />
      )}
    </div>
  );
}
