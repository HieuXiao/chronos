import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import * as sessionsDb from "@/db/queries/sessions";
import { projectColor } from "@/lib/colors";
import { dayStatus, formatMinutes, goalOn, indexGoals } from "@/lib/goals";
import { overlapSec } from "@/lib/stats";
import { addLocalDays, formatDate, formatDuration, weekdayName } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { StatusChip } from "./StatusChip";

/** Writes what was done on a project on one day. */
export function ReportDialog() {
  const target = useUiStore((s) => s.report);
  const closeReport = useUiStore((s) => s.closeReport);
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const reports = useAppStore((s) => s.reports);
  const saveReport = useAppStore((s) => s.saveReport);
  const [note, setNote] = useState("");
  const [sessionNotes, setSessionNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const dayMs = target ? new Date(`${target.day}T00:00`).getTime() : 0;

  useEffect(() => {
    if (!target) return;
    setNote(reports.find((r) => r.day === target.day && r.projectId === target.projectId)?.note ?? "");
    setSessionNotes([]);
    setSaving(false);
    // Notes written when stopping the timer that day, offered as a starting point.
    let cancelled = false;
    void sessionsDb
      .listSessions({
        projectId: target.projectId,
        from: new Date(dayMs).toISOString(),
        to: new Date(addLocalDays(dayMs, 1)).toISOString(),
      })
      .then((sessions) => {
        if (cancelled) return;
        const notes = sessions.map((s) => s.note?.trim() ?? "").filter((n) => n !== "");
        setSessionNotes([...new Set(notes)]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Load once per opened report.
  }, [target]);

  const project = target ? projects.find((p) => p.id === target.projectId) : undefined;
  const now = Date.now();
  const actualSec = target
    ? spans
        .filter((s) => s.projectId === target.projectId)
        .reduce((sum, s) => sum + overlapSec(s, dayMs, addLocalDays(dayMs, 1), now), 0)
    : 0;
  const minMinutes = target ? goalOn(indexGoals(goals).byProject.get(target.projectId), target.day) : 0;
  const status = dayStatus(actualSec, minMinutes);
  const unused = sessionNotes.filter((n) => !note.includes(n));

  const addLine = (line: string) => setNote((v) => (v.trim() ? `${v.trimEnd()}\n- ${line}` : `- ${line}`));

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
          {status && <StatusChip status={status} />}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="report-note" className="text-sm font-medium">
            Đã làm gì
          </label>
          <Textarea
            id="report-note"
            autoFocus
            rows={5}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Học xong bài 5, làm 20 câu nghe, ôn lại từ vựng tuần trước."
          />
        </div>
        {unused.length > 0 && (
          <div className="grid gap-1.5">
            <p className="text-xs text-muted-foreground">Ghi chú lúc dừng timer hôm đó</p>
            <div className="flex flex-wrap gap-1.5">
              {unused.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addLine(n)}
                  className="flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                >
                  <Plus className="size-3 shrink-0" />
                  <span className="truncate">{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
