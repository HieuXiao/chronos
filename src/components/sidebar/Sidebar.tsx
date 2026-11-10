import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import type { Id } from "@/types";
import { GoalsEditor } from "./GoalsEditor";
import { IdentityEditor } from "./IdentityEditor";
import { LinksSection } from "./LinksSection";
import { NoteEditor } from "./NoteEditor";
import { PurposeEditor } from "./PurposeEditor";
import { TodoList } from "./TodoList";

/**
 * Project details, sliding in from the right: name, icon and colour, why it
 * matters, its goals, todos, notes and related documents.
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

  // A click outside the panel closes it. Kept open for clicks on a project card
  // (it switches project instead), the title bar (dragging the window), toasts,
  // and while a dialog or menu is up (that click only closes the dialog/menu).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (!(target instanceof Element) || panelRef.current?.contains(target)) return;
      if (target.closest("[data-keep-sidebar],[data-sonner-toaster]")) return;
      if (document.querySelector("[role=dialog],[role=alertdialog],[role=menu],[role=listbox]")) return;
      closeSidebar();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeSidebar]);

  return (
    <aside
      ref={panelRef}
      aria-hidden={!open}
      className={cn(
        "fixed top-11 right-0 bottom-0 z-30 flex w-[400px] max-w-full flex-col border-l bg-background shadow-2xl transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      {project && (
        <>
          <IdentityEditor project={project} onClose={closeSidebar} />

          <div className="grid min-h-0 flex-1 content-start gap-6 overflow-y-auto p-4">
            <PurposeEditor project={project} />
            <GoalsEditor project={project} />
            <div className="-m-4">
              <TodoList key={`todos-${project.id}`} projectId={project.id} />
            </div>
            <NoteEditor key={`note-${project.id}`} projectId={project.id} />
            <LinksSection projectId={project.id} />
          </div>
        </>
      )}
    </aside>
  );
}
