import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Id } from "@/types";
import { NoteEditor } from "./NoteEditor";
import { TodoList } from "./TodoList";

/**
 * Slides in from the right inside the timers area only, so the dashboard
 * stays visible above it.
 */
export function Sidebar() {
  const projectId = useUiStore((s) => s.sidebarProjectId);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const projects = useAppStore((s) => s.projects);

  // Keep rendering the last project while the panel slides out.
  const [shownId, setShownId] = useState<Id | null>(projectId);
  useEffect(() => {
    if (projectId !== null) setShownId(projectId);
  }, [projectId]);

  const open = projectId !== null;
  const project = projects.find((p) => p.id === shownId) ?? null;

  // `inert` keeps the hidden panel out of tab order (React 18 has no `inert` prop).
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog],[role=alertdialog]")) closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSidebar]);

  return (
    <aside
      ref={panelRef}
      aria-hidden={!open}
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-[360px] max-w-full flex-col border-l bg-background shadow-2xl transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      {project && (
        <>
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: projectColor(project.color) }} />
            {project.icon && <span className="leading-none">{project.icon}</span>}
            <h2 className="min-w-0 flex-1 truncate font-semibold" title={project.name}>
              {project.name}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={closeSidebar} aria-label="Đóng">
              <X />
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <TodoList key={`todos-${project.id}`} projectId={project.id} />
          </div>

          <div className="border-t p-4">
            <NoteEditor key={`note-${project.id}`} projectId={project.id} />
          </div>
        </>
      )}
    </aside>
  );
}
