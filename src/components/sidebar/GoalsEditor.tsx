import { useEffect, useMemo, useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { useNow } from "@/hooks/useNow";
import { useProjectTotals } from "@/hooks/useStats";
import { localDateMs } from "@/lib/chart";
import { forecastProject } from "@/lib/forecast";
import { goalOn, indexGoals, minutesToInput, parseHoursInput } from "@/lib/goals";
import { dayKey, formatDate, formatHours } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import type { Project } from "@/types";

/**
 * "Mục tiêu cần đạt": total hours, minimum per day and deadline, edited in
 * place (saved when a field loses focus), with the projected finish date.
 */
export function GoalsEditor({ project }: { project: Project }) {
  const goals = useAppStore((s) => s.goals);
  const updateProject = useAppStore((s) => s.updateProject);
  const setGoal = useAppStore((s) => s.setGoal);
  const nowMs = useNow(60_000);
  const totals = useProjectTotals(nowMs)(project.id);
  const dailyMin = useMemo(
    () => goalOn(indexGoals(goals).byProject.get(project.id), dayKey(nowMs)),
    [goals, project.id, nowMs],
  );

  const [target, setTarget] = useState("");
  const [daily, setDaily] = useState("");
  const [deadline, setDeadline] = useState("");
  const [start, setStart] = useState("");
  useEffect(() => {
    setTarget(project.targetHours != null ? String(project.targetHours) : "");
    setDeadline(project.endDate ?? "");
    setStart(project.startDate ?? "");
  }, [project.id, project.targetHours, project.endDate, project.startDate]);
  useEffect(() => setDaily(minutesToInput(dailyMin)), [project.id, dailyMin]);

  const saveTarget = () => {
    const n = target.trim() === "" ? null : Number(target.replace(",", "."));
    if (n !== null && (!Number.isFinite(n) || n <= 0)) return setTarget(project.targetHours != null ? String(project.targetHours) : "");
    if (n !== project.targetHours) void updateProject(project.id, { targetHours: n });
  };
  const saveDaily = () => {
    const m = parseHoursInput(daily);
    if (m === null || m > 16 * 60) return setDaily(minutesToInput(dailyMin));
    if (m !== dailyMin) void setGoal(project.id, m);
  };
  const saveStart = (value: string) => {
    setStart(value);
    // A project always has a start date; the deadline can't come before it.
    if (!value || value === project.startDate || (project.endDate && value > project.endDate)) return;
    void updateProject(project.id, { startDate: value });
  };
  const saveDeadline = (value: string) => {
    setDeadline(value);
    if ((value || null) !== project.endDate) void updateProject(project.id, { endDate: value || null });
  };

  const doneHours = totals.totalSec / 3600;
  const forecast = forecastProject(project.targetHours, totals, nowMs);
  const late =
    forecast.kind === "eta" && project.endDate ? forecast.etaMs > localDateMs(project.endDate) : false;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold">Mục tiêu cần đạt</h3>
        <InfoTip>
          Ngày xong được dự báo theo tốc độ trung bình 14 ngày gần nhất; cần ít nhất 7 ngày có dữ liệu. “Tối thiểu mỗi
          ngày” là mức để chấm Chưa đạt / Đạt / Vượt trên biểu đồ.
        </InfoTip>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Bắt đầu">
          <Input
            type="date"
            value={start}
            max={project.endDate ?? undefined}
            onChange={(e) => saveStart(e.target.value)}
            className="h-8 px-2 text-xs"
          />
        </Field>
        <Field label="Hạn">
          <Input type="date" value={deadline} min={project.startDate ?? undefined} onChange={(e) => saveDeadline(e.target.value)} className="h-8 px-2 text-xs" />
        </Field>
        <Field label="Tổng giờ cần đạt">
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onBlur={saveTarget}
            placeholder="VD 300"
            className="h-8 tabular-nums"
          />
        </Field>
        <Field label="Tối thiểu mỗi ngày">
          <Input
            inputMode="decimal"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            onBlur={saveDaily}
            placeholder="VD 2 (giờ)"
            className="h-8 tabular-nums"
          />
        </Field>
      </div>
      {project.targetHours ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          Đã làm <span className="text-foreground">{formatHours(doneHours)}</span> / {formatHours(project.targetHours)} (
          {Math.floor((doneHours / project.targetHours) * 100)}%)
          {forecast.kind === "reached" && " · đã đủ tổng giờ"}
          {forecast.kind === "eta" && (
            <>
              {" · xong ~"}
              <span className={late ? "text-warning" : "text-foreground"}>{formatDate(forecast.etaMs)}</span>
              {late && " (trễ hạn)"}
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
