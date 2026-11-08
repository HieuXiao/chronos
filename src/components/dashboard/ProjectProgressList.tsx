import { useActiveProjects, useProjectTotals } from "@/hooks/useStats";
import { projectColor } from "@/lib/colors";
import { forecastProject, type Forecast } from "@/lib/forecast";
import { formatDate, formatHours } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

export function ProjectProgressList({ nowMs }: { nowMs: number }) {
  const projects = useActiveProjects();
  const totalsOf = useProjectTotals(nowMs);
  const openSidebar = useUiStore((s) => s.openSidebar);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tiến độ</p>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có project nào. Thêm project ở bên dưới để bắt đầu.</p>
      ) : (
        <ul className="-mr-2 grid min-h-0 content-start gap-1 overflow-y-auto pr-2">
          {projects.map((project) => {
            const totals = totalsOf(project.id);
            const doneHours = totals.totalSec / 3600;
            const forecast = forecastProject(project.targetHours, totals, nowMs);
            const target = project.targetHours;
            const percent = target ? Math.min(100, (doneHours / target) * 100) : 0;
            const color = projectColor(project.color);

            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => openSidebar(project.id)}
                  className="grid w-full grid-cols-[minmax(80px,160px)_minmax(60px,1fr)_auto] items-center gap-x-4 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate" title={project.name}>
                      {project.name}
                    </span>
                  </span>

                  <span className="flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full transition-[width]"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {target
                        ? `${formatHours(doneHours)} / ${formatHours(target)} (${Math.floor((doneHours / target) * 100)}%)`
                        : formatHours(doneHours)}
                    </span>
                  </span>

                  <ForecastLabel forecast={forecast} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ForecastLabel({ forecast }: { forecast: Forecast }) {
  switch (forecast.kind) {
    case "no-target":
      return <span className="text-right text-xs text-muted-foreground">chưa đặt mục tiêu</span>;
    case "reached":
      return <span className="text-right text-xs font-medium text-green-400">Đã đạt mục tiêu 🎉</span>;
    case "insufficient-data":
      return (
        <span className="flex items-center justify-end gap-3 text-xs text-muted-foreground tabular-nums">
          <Velocity value={forecast.velocityHoursPerDay} />
          <span title="Cần ít nhất 7 ngày dữ liệu và tốc độ lớn hơn 0">chưa đủ dữ liệu</span>
        </span>
      );
    case "eta":
      return (
        <span className="flex items-center justify-end gap-3 text-xs tabular-nums">
          <Velocity value={forecast.velocityHoursPerDay} />
          <span
            className="font-medium text-foreground"
            title={`Còn ${formatHours(forecast.remainingHours)} · khoảng ${forecast.daysLeft} ngày`}
          >
            → {formatDate(forecast.etaMs)}
          </span>
        </span>
      );
  }
}

function Velocity({ value }: { value: number }) {
  return (
    <span className={cn("text-muted-foreground", value <= 0 && "opacity-60")} title="Trung bình 14 ngày gần nhất">
      {value > 0 && value < 0.05 ? "<0.1h" : formatHours(value)}/ngày
    </span>
  );
}
