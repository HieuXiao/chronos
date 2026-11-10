import { create } from "zustand";
import { getDb } from "@/db/client";
import * as goalsDb from "@/db/queries/goals";
import * as projectsDb from "@/db/queries/projects";
import * as sessionsDb from "@/db/queries/sessions";
import { attempt, errorMessage } from "@/lib/errors";
import { dayKey } from "@/lib/time";
import type {
  DailyGoal,
  DayReason,
  DayReport,
  Id,
  NewProject,
  Project,
  ProjectPatch,
  ReasonLabel,
  Session,
  SessionSpan,
} from "@/types";
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
  /** Goal history: work time per day and each project's minimum per day. */
  goals: DailyGoal[];
  /** What was done on each project on a day. */
  reports: DayReport[];
  /** Why a day missed its work time, as labels. */
  dayReasons: DayReason[];
  /** Labels for missed days (groups and labels under them). */
  labels: ReasonLabel[];
  settings: Record<string, string>;

  init: () => Promise<void>;
  refresh: () => Promise<void>;

  createProject: (input: NewProject) => Promise<Project | undefined>;
  updateProject: (id: Id, patch: ProjectPatch) => Promise<boolean>;
  setProjectArchived: (id: Id, archived: boolean) => Promise<void>;
  deleteProject: (id: Id) => Promise<void>;
  /** Puts the given projects in this order (drag and drop on the home page). */
  reorderProjects: (orderedIds: Id[]) => Promise<void>;

  startTimer: (projectId: Id, options?: TimerOptions) => Promise<void>;
  stopTimer: (options?: TimerOptions) => Promise<void>;
  /** Play/pause on a project card. */
  toggleProjectTimer: (projectId: Id, options?: TimerOptions) => Promise<void>;
  /** Hotkey / tray: stop the running timer, or restart the most recently used project. */
  toggleLastTimer: (options?: TimerOptions) => Promise<void>;
  /** Drops [idleFromMs, resumeAtMs) from the running session. */
  discardIdle: (idleFromMs: number, resumeAtMs: number) => Promise<void>;

  /** Sets a goal from today on (`projectId` null = work time per day). Minutes 0 removes it. */
  setGoal: (projectId: Id | null, minutes: number) => Promise<boolean>;
  saveReport: (day: string, projectId: Id, note: string) => Promise<void>;
  saveDayReason: (day: string, labelIds: Id[], note: string) => Promise<boolean>;
  createLabel: (name: string, parentId: Id | null) => Promise<ReasonLabel | undefined>;
  setSetting: (key: string, value: string) => Promise<void>;
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
    goals: [],
    reports: [],
    dayReasons: [],
    labels: [],
    settings: {},

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
        const [projects, running, spans, goals, reports, dayReasons, labels, settings] = await Promise.all([
          projectsDb.listProjects({ includeArchived: true }),
          sessionsDb.getRunningSession(),
          sessionsDb.listSessionSpans(),
          goalsDb.listGoals(),
          goalsDb.listReports(),
          goalsDb.listDayReasons(),
          goalsDb.listReasonLabels(),
          goalsDb.getSettings(),
        ]);
        set({ projects, running, spans, goals, reports, dayReasons, labels, settings });
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

    reorderProjects: async (orderedIds) => {
      // Show the new order at once; the DB catches up behind it.
      const position = new Map(orderedIds.map((id, i) => [id, i]));
      const projects = get().projects.map((p) => (position.has(p.id) ? { ...p, orderIndex: position.get(p.id)! } : p));
      set({ projects: [...projects].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id) });
      const ok = await attempt("Không lưu được thứ tự project", async () => {
        await projectsDb.reorderProjects(orderedIds);
        return true;
      });
      if (!ok) await get().refresh();
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

    setGoal: async (projectId, minutes) => {
      const ok = await attempt("Không lưu được mục tiêu", async () => {
        await goalsDb.setGoal(projectId, minutes, dayKey(Date.now()));
        return true;
      });
      set({ goals: await goalsDb.listGoals().catch(() => get().goals) });
      return ok === true;
    },

    saveReport: async (day, projectId, note) => {
      await attempt("Không lưu được báo cáo", () => goalsDb.saveReport(day, projectId, note));
      set({ reports: await goalsDb.listReports().catch(() => get().reports) });
    },

    saveDayReason: async (day, labelIds, note) => {
      const ok = await attempt("Không lưu được lý do", async () => {
        await goalsDb.saveDayReason(day, labelIds, note);
        return true;
      });
      set({ dayReasons: await goalsDb.listDayReasons().catch(() => get().dayReasons) });
      return ok === true;
    },

    createLabel: async (name, parentId) => {
      const label = await attempt("Không tạo được nhãn", () => goalsDb.createReasonLabel(name, parentId));
      if (label) set({ labels: [...get().labels, label] });
      return label;
    },

    setSetting: async (key, value) => {
      await attempt("Không lưu được cài đặt", () => goalsDb.setSetting(key, value));
      set({ settings: { ...get().settings, [key]: value } });
    },
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
