import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { ListTodo } from "lucide-react";
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
import * as sessionsDb from "@/db/queries/sessions";
import { appendLine } from "@/lib/workLog";
import * as todosDb from "@/db/queries/todos";
import { attempt } from "@/lib/errors";
import { dayKey, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Session, Todo } from "@/types";

/** Accent/case-insensitive comparison key ("Học" matches "hoc"). */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();
}

/**
 * Quick "vừa làm gì?" prompt shown after a timer stops. The answer is added as
 * a line to that day's "Đã làm gì" of the project, the one place work notes
 * live (also edited from the chart and shown in Lịch sử). Skipping is fine.
 */
export function StopNoteDialog() {
  const prompt = useUiStore((s) => s.notePrompt);
  const closeNotePrompt = useUiStore((s) => s.closeNotePrompt);
  const projects = useAppStore((s) => s.projects);
  const reports = useAppStore((s) => s.reports);
  const saveReport = useAppStore((s) => s.saveReport);

  const [session, setSession] = useState<Session | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(-1);

  useEffect(() => {
    setText("");
    setHighlight(-1);
    setSession(null);
    setTodos([]);
    if (!prompt) return;
    let cancelled = false;
    void attempt("Không tải được gợi ý", async () => {
      const [s, t] = await Promise.all([
        sessionsDb.getSession(prompt.sessionId),
        todosDb.listOpenTodos(prompt.projectId),
      ]);
      if (cancelled) return;
      setSession(s);
      setTodos(t);
    });
    return () => {
      cancelled = true;
    };
  }, [prompt]);

  const suggestions = useMemo(() => {
    const q = fold(text.trim());
    return todos.filter((t) => fold(t.text).includes(q) && t.text !== text).slice(0, 6);
  }, [todos, text]);

  const project = projects.find((p) => p.id === prompt?.projectId);
  // The day the timer stopped on.
  const day = dayKey(session?.endedAt ? Date.parse(session.endedAt) : Date.now());
  const dayNote = prompt ? (reports.find((r) => r.day === day && r.projectId === prompt.projectId)?.note ?? "") : "";

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!prompt) return;
    const { projectId } = prompt;
    closeNotePrompt();
    if (text.trim()) await saveReport(day, projectId, appendLine(dayNote, text));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if ((e.key === "Enter" || e.key === "Tab") && highlight >= 0) {
      const picked = suggestions[highlight];
      if (picked) {
        e.preventDefault();
        setText(picked.text);
        setHighlight(-1);
      }
    }
  };

  return (
    <Dialog open={prompt !== null} onOpenChange={(open) => !open && closeNotePrompt()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Vừa làm gì?</DialogTitle>
            <DialogDescription>
              {project?.name ?? "Project"}
              {session?.durationSec != null && ` · ${formatDuration(session.durationSec)}`} · thêm vào "Đã làm gì" hôm nay
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1">
            <Input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setHighlight(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="VD: Viết chương 3"
              autoFocus
              maxLength={500}
            />
            {dayNote && (
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground" title={dayNote}>
                {dayNote}
              </p>
            )}
            {suggestions.length > 0 && (
              <ul className="mt-1 grid gap-0.5 rounded-md border p-1" role="listbox" aria-label="Gợi ý từ todo">
                {suggestions.map((todo, i) => (
                  <li key={todo.id} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      onClick={() => {
                        setText(todo.text);
                        setHighlight(-1);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                        i === highlight && "bg-accent",
                      )}
                    >
                      <ListTodo className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{todo.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeNotePrompt}>
              Bỏ qua
            </Button>
            <Button type="submit">Lưu</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
