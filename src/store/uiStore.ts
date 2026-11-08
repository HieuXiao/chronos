import { create } from "zustand";
import type { Id, Project } from "@/types";

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

export type ProjectDialogState = { mode: "create" } | { mode: "edit"; project: Project } | null;

interface UiState {
  sidebarProjectId: Id | null;
  dashboardCollapsed: boolean;
  notePrompt: NotePrompt | null;
  idlePrompt: IdlePrompt | null;
  projectDialog: ProjectDialogState;
  settingsOpen: boolean;
  /** Day (YYYY-MM-DD) whose review dialog is open. */
  reviewDay: string | null;

  openSidebar: (projectId: Id) => void;
  closeSidebar: () => void;
  closeSidebarFor: (projectId: Id) => void;
  toggleDashboard: () => void;
  openNotePrompt: (prompt: NotePrompt) => void;
  closeNotePrompt: () => void;
  setIdlePrompt: (prompt: IdlePrompt | null) => void;
  setProjectDialog: (state: ProjectDialogState) => void;
  setSettingsOpen: (open: boolean) => void;
  setReviewDay: (day: string | null) => void;
}

const COLLAPSED_KEY = "chronos.dashboardCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export const useUiStore = create<UiState>()((set, get) => ({
  sidebarProjectId: null,
  dashboardCollapsed: readCollapsed(),
  notePrompt: null,
  idlePrompt: null,
  projectDialog: null,
  settingsOpen: false,
  reviewDay: null,

  openSidebar: (projectId) => set({ sidebarProjectId: projectId }),
  closeSidebar: () => set({ sidebarProjectId: null }),
  closeSidebarFor: (projectId) => {
    if (get().sidebarProjectId === projectId) set({ sidebarProjectId: null });
  },
  toggleDashboard: () => {
    const next = !get().dashboardCollapsed;
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Preference only; ignore storage failures.
    }
    set({ dashboardCollapsed: next });
  },
  openNotePrompt: (prompt) => set({ notePrompt: prompt }),
  closeNotePrompt: () => set({ notePrompt: null }),
  setIdlePrompt: (prompt) => set({ idlePrompt: prompt }),
  setProjectDialog: (state) => set({ projectDialog: state }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setReviewDay: (day) => set({ reviewDay: day }),
}));
