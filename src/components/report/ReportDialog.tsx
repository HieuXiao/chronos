import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { projectColor } from "@/lib/colors";
import { dayStatus, formatMinutes, goalOn, indexGoals } from "@/lib/goals";
import { overlapSec } from "@/lib/stats";
import { addLocalDays, formatDate, formatDuration, weekdayName } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { StatusChip } from "./StatusChip";

/** Writes why a project went the way it did on one day. */
export function ReportDialog() {
  const target = useUiStore((s) => s.report);
  const closeReport = useUiStore((s) => s.closeReport);
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const reports = useAppStore((s) => s.reports);
  const saveReport = useAppStore((s) => s.saveReport);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setNote(reports.find((r) => r.day === target.day && r.projectId === target.projectId)?.note ?? "");
    setSaving(false);
    // Load once per opened report.
  }, [target]);

  const project = target ? projects.find((p) => p.id === target.projectId) : undefined;
  const dayMs = target ? new Date(`${target.day}T00:00`).getTime() : 0;
  const now = Date.now();
  const actualSec = target
    ? spans
        .filter((s) => s.projectId === target.projectId)
        .reduce((sum, s) => sum + overlapSec(s, dayMs, addLocalDays(dayMs, 1), now), 0)
    : 0;
  const minMinutes = target ? goalOn(indexGoals(goals).byProject.get(target.projectId), target.day) : 0;
  const status = dayStatus(actualSec, minMinutes);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    await saveReport(target.day, target.projectId, note);
    setSaving(false);
    closeReport();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && closeReport()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: projectColor(project?.color) }} />
            {project?.name ?? "Project"}
          </DialogTitle>
          <DialogDescription>{target && `${weekdayName(dayMs)}, ${formatDate(dayMs)}`}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 text-sm">
          <span className="tabular-nums">
            {formatDuration(actualSec)}
            {minMinutes > 0 && <span className="text-muted-foreground"> / {formatMinutes(minMinutes)}</span>}
          </span>
          {status ? <StatusChip status={status} /> : <span className="text-xs text-muted-foreground">chưa đặt tối thiểu mỗi ngày</span>}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="report-note" className="text-sm font-medium">
            Nguyên nhân
          </label>
          <Textarea
            id="report-note"
            autoFocus
            rows={4}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              status === "short" ? "Vì sao chưa đạt? VD: Trễ deadline chuyên ngành nên phải dồn thời gian." : "Ghi lại vì sao hôm đó như vậy"
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeReport}>
            Huỷ
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
