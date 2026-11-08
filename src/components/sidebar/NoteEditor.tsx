import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import * as notesDb from "@/db/queries/notes";
import { attempt } from "@/lib/errors";
import type { Id } from "@/types";

const SAVE_DELAY_MS = 500;

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/** Free-form project note, auto-saved 500ms after the last keystroke. */
export function NoteEditor({ projectId }: { projectId: Id }) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timer = useRef<number | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void attempt("Không tải được ghi chú", async () => {
      const note = await notesDb.getNote(projectId);
      if (cancelled) return;
      setContent(note?.content ?? "");
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const flush = useCallback(async () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setSaveState("saving");
    const ok = await attempt("Không lưu được ghi chú", () => notesDb.upsertNote(projectId, value));
    // A newer edit may have been queued while saving.
    if (pending.current === null) setSaveState(ok ? "saved" : "error");
  }, [projectId]);

  // Save whatever is pending when switching project or closing the panel.
  useEffect(() => () => void flush(), [flush]);

  const onChange = (value: string) => {
    setContent(value);
    pending.current = value;
    setSaveState("pending");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const status =
    saveState === "pending" || saveState === "saving"
      ? "Đang lưu…"
      : saveState === "saved"
        ? "Đã lưu"
        : saveState === "error"
          ? "Lỗi khi lưu"
          : "";

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={`note-${projectId}`} className="text-sm font-semibold">
          Ghi chú
        </label>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {status}
        </span>
      </div>
      <Textarea
        id={`note-${projectId}`}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void flush()}
        disabled={!loaded}
        placeholder="Ghi chú nhanh cho project…"
        className="h-32 resize-none [field-sizing:fixed] select-text"
      />
    </div>
  );
}
