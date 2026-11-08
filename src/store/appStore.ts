import { create } from "zustand";
import { getDb } from "@/db/client";

export type DbStatus = "idle" | "connecting" | "ready" | "error";

interface AppState {
  dbStatus: DbStatus;
  dbError: string | null;
  initDb: () => Promise<void>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  dbStatus: "idle",
  dbError: null,
  initDb: async () => {
    const { dbStatus } = get();
    if (dbStatus === "connecting" || dbStatus === "ready") return;

    set({ dbStatus: "connecting", dbError: null });
    try {
      await getDb();
      set({ dbStatus: "ready" });
    } catch (err) {
      set({ dbStatus: "error", dbError: err instanceof Error ? err.message : String(err) });
    }
  },
}));
