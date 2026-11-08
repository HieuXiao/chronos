import { create } from "zustand";
import { getDb } from "@/db/client";
import * as projectsDb from "@/db/queries/projects";
import * as sessionsDb from "@/db/queries/sessions";
import { attempt, errorMessage } from "@/lib/errors";
import type { Id, NewProject, Project, ProjectPatch, Session, SessionSpan } from "@/types";
import { useUiStore } from "./uiStore";

export type DbStatus = "idle" | "connecting" | "ready" | "error";

interface TimerOptions {
  /** Ask "vừa làm gì?" for the session that gets stopped. */
  askNote?: boolean;
}

interface AppState {
  dbStatus: DbStatus;
  dbError: string | null;
  /** All projects, archived included (history and export need them). */
  projects: Project[];
  /** The session with `endedAt === null`, restored from the DB on launch. */
  running: Session | null;
  /** Every session's time range, oldest first. Source of all statistics. */
  spans: SessionSpan[];

  init: () => Promise<void>;
  refresh: () => Promise<void>;

  createProject: (input: NewProject) => Promise<Project | undefined>;
  updateProject: (id: Id, patch: ProjectPatch) => Promise<boolean>;
  setProjectArchived: (id: Id, archived: boolean) => Promise<void>;
  deleteProject: (id: Id) => Promise<void>;

  startTimer: (projectId: Id, options?: TimerOptions) => Promise<void>;
  stopTimer: (options?: TimerOptions) => Promise<void>;
  /** Play/pause on a project card. */
  toggleProjectTimer: (projectId: Id, options?: TimerOptions) => Promise<void>;
  /** Hotkey / tray: stop the running timer, or restart the most recently used project. */
  toggleLastTimer: (options?: TimerOptions) => Promise<void>;
  /** Drops [idleFromMs, resumeAtMs) from the running session. */
  discardIdle: (idleFromMs: number, resumeAtMs: number) => Promise<void>;
}

// Timer operations run strictly one after another so that rapid clicks,
// the hotkey and the tray menu can never start two sessions at once.
let timerQueue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = timerQueue.then(fn, fn);
  timerQueue = run.catch(() => undefined);
  return run;
}

export const useAppStore = create<AppState>()((set, get) => {
  const promptNote = (stopped: Session | null, options?: TimerOptions) => {
    if (stopped && (options?.askNote ?? true)) {
      useUiStore.getState().openNotePrompt({ sessionId: stopped.id, projectId: stopped.projectId });
    }
  };

  return {
    dbStatus: "idle",
    dbError: null,
    projects: [],
    running: null,
    spans: [],

    init: async () => {
      const { dbStatus } = get();
      if (dbStatus === "connecting" || dbStatus === "ready") return;
      set({ dbStatus: "connecting", dbError: null });
      try {
        await getDb();
        set({ dbStatus: "ready" });
        await get().refresh();
      } catch (err) {
        set({ dbStatus: "error", dbError: errorMessage(err) });
      }
    },

    refresh: async () => {
      await attempt("Không tải được dữ liệu", async () => {
        const [projects, running, spans] = await Promise.all([
          projectsDb.listProjects({ includeArchived: true }),
          sessionsDb.getRunningSession(),
          sessionsDb.listSessionSpans(),
        ]);
        set({ projects, running, spans });
      });
    },

    createProject: async (input) => {
      const project = await attempt("Không tạo được project", () => projectsDb.createProject(input));
      if (project) await get().refresh();
      return project;
    },

    updateProject: async (id, patch) => {
      const updated = await attempt("Không lưu được project", () => projectsDb.updateProject(id, patch));
      if (updated) await get().refresh();
      return updated !== undefined;
    },

    setProjectArchived: async (id, archived) => {
      await serial(async () => {
        await attempt(archived ? "Không lưu trữ được project" : "Không khôi phục được project", async () => {
          if (archived && get().running?.projectId === id) await sessionsDb.stopRunningSession();
          await projectsDb.setProjectArchived(id, archived);
        });
        if (archived) useUiStore.getState().closeSidebarFor(id);
        await get().refresh();
      });
    },

    deleteProject: async (id) => {
      await serial(async () => {
        await attempt("Không xoá được project", () => projectsDb.deleteProject(id));
        useUiStore.getState().closeSidebarFor(id);
        await get().refresh();
      });
    },

    startTimer: (projectId, options) =>
      serial(async () => {
        if (get().running?.projectId === projectId) return;
        const result = await attempt("Không bắt đầu được timer", () => sessionsDb.startSession(projectId));
        await get().refresh();
        if (result) promptNote(result.stopped, options);
      }),

    stopTimer: (options) =>
      serial(async () => {
        if (!get().running) return;
        const stopped = await attempt("Không dừng được timer", () => sessionsDb.stopRunningSession());
        await get().refresh();
        promptNote(stopped ?? null, options);
      }),

    toggleProjectTimer: async (projectId, options) => {
      if (get().running?.projectId === projectId) await get().stopTimer(options);
      else await get().startTimer(projectId, options);
    },

    toggleLastTimer: async (options) => {
      if (get().running) {
        await get().stopTimer(options);
        return;
      }
      const project = lastUsedProject(get());
      if (project) await get().startTimer(project.id, options);
    },

    discardIdle: (idleFromMs, resumeAtMs) =>
      serial(async () => {
        await attempt("Không trừ được thời gian rảnh", () =>
          sessionsDb.discardIdleFromRunning(new Date(idleFromMs).toISOString(), new Date(resumeAtMs).toISOString()),
        );
        await get().refresh();
      }),
  };
});

/** Non-archived project whose timer was used last (running, or the latest to stop). */
export function lastUsedProject(state: Pick<AppState, "projects" | "spans" | "running">): Project | null {
  const byId = new Map(state.projects.map((p) => [p.id, p]));
  if (state.running) {
    const p = byId.get(state.running.projectId);
    if (p) return p;
  }
  let best: Project | null = null;
  let bestEnd = -Infinity;
  for (const span of state.spans) {
    const p = byId.get(span.projectId);
    if (!p || p.archived) continue;
    const end = span.endedAt === null ? Infinity : Date.parse(span.endedAt);
    if (end >= bestEnd) {
      bestEnd = end;
      best = p;
    }
  }
  return best;
}
