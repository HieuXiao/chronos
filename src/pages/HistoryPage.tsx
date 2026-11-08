import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SessionDialog, type SessionDialogState } from "@/components/history/SessionDialog";
import { ConfirmDialog } from "@/components/projects/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as sessionsDb from "@/db/queries/sessions";
import { useNow } from "@/hooks/useNow";
import { projectColor } from "@/lib/colors";
import { attempt } from "@/lib/errors";
import { addLocalDays, elapsedSec, formatDate, formatDuration, formatTimeOfDay, fromDateInput } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import type { Session } from "@/types";

const ALL = "all";
const LIMIT = 1000;

export function HistoryPage() {
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  const running = useAppStore((s) => s.running);
  const refresh = useAppStore((s) => s.refresh);

  const [projectFilter, setProjectFilter] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<SessionDialogState>(null);
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const nowMs = useNow(1000, running !== null);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const load = useCallback(async () => {
    const fromIso = fromDateInput(from);
    const toStart = fromDateInput(to);
    const toIso = toStart ? new Date(addLocalDays(Date.parse(toStart), 1)).toISOString() : undefined;
    const rows = await attempt("Không tải được lịch sử", () =>
      sessionsDb.listSessions({
        projectId: projectFilter === ALL ? undefined : Number(projectFilter),
        from: fromIso ?? undefined,
        to: toIso,
        limit: LIMIT,
      }),
    );
    if (rows) setSessions(rows);
    setLoading(false);
  }, [projectFilter, from, to]);

  // Reload when filters change and whenever data changes elsewhere (timer, idle, hotkey).
  useEffect(() => {
    void load();
  }, [load, spans]);

  const afterChange = () => void refresh();

  const totalSec = sessions.reduce(
    (sum, s) => sum + (s.endedAt === null ? elapsedSec(s.startedAt, nowMs) : (s.durationSec ?? 0)),
    0,
  );

  const remove = async (session: Session) => {
    setToDelete(null);
    await attempt("Không xoá được session", () => sessionsDb.deleteSession(session.id));
    afterChange();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end gap-3 border-b p-4">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Project</span>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                  {p.archived ? " (đã lưu trữ)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Từ ngày</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Đến ngày</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </label>
        {(projectFilter !== ALL || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setProjectFilter(ALL);
              setFrom("");
              setTo("");
            }}
          >
            Xoá lọc
          </Button>
        )}

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {sessions.length} session · <span className="text-foreground">{formatDuration(totalSec)}</span>
          </span>
          <Button
            size="sm"
            disabled={projects.length === 0}
            onClick={() =>
              setDialog({ mode: "create", projectId: projectFilter === ALL ? null : Number(projectFilter) })
            }
          >
            <Plus /> Thêm session
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-2 py-2 font-medium">Ngày</th>
              <th className="px-2 py-2 font-medium">Bắt đầu</th>
              <th className="px-2 py-2 font-medium">Kết thúc</th>
              <th className="px-2 py-2 text-right font-medium">Thời lượng</th>
              <th className="px-2 py-2 font-medium">Ghi chú</th>
              <th className="px-2 py-2 font-medium">Nguồn</th>
              <th className="w-20 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const project = projectById.get(s.projectId);
              const isRunning = s.endedAt === null;
              const duration = isRunning ? elapsedSec(s.startedAt, nowMs) : (s.durationSec ?? 0);
              const startMs = Date.parse(s.startedAt);
              const endMs = s.endedAt ? Date.parse(s.endedAt) : null;
              const crossesDay = endMs !== null && formatDate(startMs) !== formatDate(endMs);
              return (
                <tr key={s.id} className="group border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: projectColor(project?.color) }}
                      />
                      <span className="max-w-48 truncate">{project?.name ?? `#${s.projectId}`}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 tabular-nums">{formatDate(startMs)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatTimeOfDay(startMs)}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {endMs === null ? (
                      <span className="text-green-400">đang chạy</span>
                    ) : (
                      <>
                        {formatTimeOfDay(endMs)}
                        {crossesDay && <span className="ml-1 text-xs text-muted-foreground">({formatDate(endMs)})</span>}
                      </>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatDuration(duration)}</td>
                  <td className="max-w-72 truncate px-2 py-2 text-muted-foreground" title={s.note ?? undefined}>
                    {s.note}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{s.source === "manual" ? "Thủ công" : "Timer"}</td>
                  <td className="px-4 py-2">
                    <span className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Sửa"
                        onClick={() => setDialog({ mode: "edit", session: s })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Xoá"
                        className="text-muted-foreground"
                        onClick={() => setToDelete(s)}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && sessions.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">Không có session nào.</p>
        )}
        {sessions.length >= LIMIT && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            Chỉ hiển thị {LIMIT} session gần nhất — hãy thu hẹp bộ lọc.
          </p>
        )}
      </div>

      <SessionDialog state={dialog} projects={projects} onClose={() => setDialog(null)} onSaved={afterChange} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xoá session này?"
        description={
          toDelete
            ? `${projectById.get(toDelete.projectId)?.name ?? ""} · ${formatDate(Date.parse(toDelete.startedAt))} ${formatTimeOfDay(Date.parse(toDelete.startedAt))}. Không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && void remove(toDelete)}
      />
    </div>
  );
}
