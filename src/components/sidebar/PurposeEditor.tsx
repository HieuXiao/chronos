import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/appStore";
import type { Project } from "@/types";

const SAVE_DELAY_MS = 800;

/** "Lý do của project": why it matters, saved shortly after typing stops. */
export function PurposeEditor({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject);
  const [value, setValue] = useState(project.purpose ?? "");
  const timer = useRef<number | null>(null);
  const pending = useRef<string | null>(null);

  // Reset when switching to another project.
  useEffect(() => {
    setValue(project.purpose ?? "");
  }, [project.id]);

  const flush = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next !== null && next !== (project.purpose ?? "")) void updateProject(project.id, { purpose: next.trim() || null });
  };
  useEffect(() => () => flush(), [project.id]);

  return (
    <div className="grid gap-2">
      <label htmlFor={`purpose-${project.id}`} className="text-sm font-semibold">
        Lý do của project
      </label>
      <Textarea
        id={`purpose-${project.id}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          pending.current = e.target.value;
          if (timer.current !== null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
        }}
        onBlur={flush}
        rows={3}
        maxLength={1000}
        placeholder="Vì sao mình làm project này? VD: Cần IELTS 7.0 để xét học bổng tháng 6."
        className="min-h-0 resize-none select-text"
      />
    </div>
  );
}
