import { create } from "zustand";
import type { Id, LocalDate, Project } from "@/types";

export interface NotePrompt {
  sessionId: Id;
  projectId: Id;
}

export interface IdlePrompt {
  sessionId: Id;
  /** When input stopped (ms). */
  idleFromMs: number;
  /** When input resumed (ms); null while the user is still away. */
  returnedAtMs: number | null;
}

/** The project and day whose reason is being written. */
export interface ReportTarget {
  day: LocalDate;
  projectId: Id;
}

export type ProjectDialogState = { mode: "create" } | { mode: "edit"; project: Project } | null;

interface UiState {
  sidebarProjectId: Id | null;
  notePrompt: NotePrompt | null;
  idlePrompt: IdlePrompt | null;
  projectDialog: ProjectDialogState;
  settingsOpen: boolean;
  report: ReportTarget | null;

  openSidebar: (projectId: Id) => void;
  closeSidebar: () => void;
  closeSidebarFor: (projectId: Id) => void;
  openNotePrompt: (prompt: NotePrompt) => void;
  closeNotePrompt: () => void;
  setIdlePrompt: (prompt: IdlePrompt | null) => void;
  setProjectDialog: (state: ProjectDialogState) => void;
  setSettingsOpen: (open: boolean) => void;
  openReport: (target: ReportTarget) => void;
  closeReport: () => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  sidebarProjectId: null,
  notePrompt: null,
  idlePrompt: null,
  projectDialog: null,
  settingsOpen: false,
  report: null,

  openSidebar: (projectId) => set({ sidebarProjectId: projectId }),
  closeSidebar: () => set({ sidebarProjectId: null }),
  closeSidebarFor: (projectId) => {
    if (get().sidebarProjectId === projectId) set({ sidebarProjectId: null });
  },
  openNotePrompt: (prompt) => set({ notePrompt: prompt }),
  closeNotePrompt: () => set({ notePrompt: null }),
  setIdlePrompt: (prompt) => set({ idlePrompt: prompt }),
  setProjectDialog: (state) => set({ projectDialog: state }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  openReport: (target) => set({ report: target }),
  closeReport: () => set({ report: null }),
}));
