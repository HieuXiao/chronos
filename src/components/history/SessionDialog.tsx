import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as sessionsDb from "@/db/queries/sessions";
import { attempt } from "@/lib/errors";
import { diffSec, formatDuration, fromDateTimeInput, toDateTimeInput } from "@/lib/time";
import type { Id, Project, Session } from "@/types";

export type SessionDialogState = { mode: "create"; projectId: Id | null } | { mode: "edit"; session: Session } | null;

interface SessionDialogProps {
  state: SessionDialogState;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}

export function SessionDialog({ state, projects, onClose, onSaved }: SessionDialogProps) {
  const editing = state?.mode === "edit" ? state.session : null;
  const isRunning = editing !== null && editing.endedAt === null;

  const [projectId, setProjectId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) return;
    setSaving(false);
    if (state.mode === "edit") {
      setProjectId(String(state.session.projectId));
      setStart(toDateTimeInput(state.session.startedAt));
      setEnd(state.session.endedAt ? toDateTimeInput(state.session.endedAt) : "");
      setNote(state.session.note ?? "");
    } else {
      const now = new Date();
      now.setSeconds(0, 0);
      const hourAgo = new Date(now.getTime() - 3_600_000);
      const fallback = projects.find((p) => !p.archived)?.id ?? projects[0]?.id;
      setProjectId(String(state.projectId ?? fallback ?? ""));
      setStart(toDateTimeInput(hourAgo.toISOString()));
      setEnd(toDateTimeInput(now.toISOString()));
      setNote("");
    }
  }, [state, projects]);

  const startIso = fromDateTimeInput(start);
  const endIso = isRunning ? null : fromDateTimeInput(end);
  let error: string | null = null;
  if (!projectId) error = "Chọn project";
  else if (!startIso) error = "Thời điểm bắt đầu không hợp lệ";
  else if (!isRunning && !endIso) error = "Thời điểm kết thúc không hợp lệ";
  else if (endIso && Date.parse(endIso) <= Date.parse(startIso)) error = "Kết thúc phải sau bắt đầu";
  else if (Date.parse((endIso ?? startIso) as string) > Date.now() + 60_000) error = "Không thể chọn thời điểm ở tương lai";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (error || !startIso) return;
    setSaving(true);
    const pid = Number(projectId);
    const result = editing
      ? await attempt("Không lưu được session", () =>
          sessionsDb.updateSession(editing.id, {
            projectId: pid,
            startedAt: startIso,
            endedAt: isRunning ? null : endIso,
            note,
          }),
        )
      : await attempt("Không thêm được session", () =>
          sessionsDb.createManualSession({ projectId: pid, startedAt: startIso, endedAt: endIso as string, note }),
        );
    setSaving(false);
    if (result) {
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa session" : "Thêm session thủ công"}</DialogTitle>
            <DialogDescription>
              {editing ? "Thời gian theo giờ máy của bạn." : "Dùng khi quên bấm start. Thời gian theo giờ máy của bạn."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isRunning}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.archived ? " (đã lưu trữ)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="session-start">Bắt đầu</Label>
              <Input id="session-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-end">Kết thúc</Label>
              {isRunning ? (
                <Input id="session-end" value="Đang chạy" disabled />
              ) : (
                <Input id="session-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="session-note">Ghi chú</Label>
            <Input id="session-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>

          <p className="min-h-5 text-sm">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              startIso &&
              endIso && <span className="text-muted-foreground">Thời lượng: {formatDuration(diffSec(startIso, endIso))}</span>
            )}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="submit" disabled={error !== null || saving}>
              {editing ? "Lưu" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
