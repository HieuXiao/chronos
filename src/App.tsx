import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { DayReviewDialog } from "@/components/goals/DayReviewDialog";
import { TopBar } from "@/components/layout/TopBar";
import { SettingsDialog } from "@/components/layout/SettingsDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { IdleDialog } from "@/components/timers/IdleDialog";
import { StopNoteDialog } from "@/components/timers/StopNoteDialog";
import { Toaster } from "@/components/ui/sonner";
import { useReviewReminder } from "@/hooks/useReviewReminder";
import { useIdleWatcher } from "@/hooks/useIdleWatcher";
import { useSystemIntegration } from "@/hooks/useSystemIntegration";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { InsightsPage } from "@/pages/InsightsPage";
import { useAppStore } from "@/store/appStore";

export default function App() {
  const init = useAppStore((s) => s.init);
  const dbStatus = useAppStore((s) => s.dbStatus);
  const dbError = useAppStore((s) => s.dbError);

  useEffect(() => {
    void init();
  }, [init]);

  if (dbStatus === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold">Không mở được cơ sở dữ liệu</h1>
        <p className="max-w-lg text-sm text-muted-foreground select-text">{dbError}</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-full flex-col">
        <TopBar />
        <main className="min-h-0 flex-1">
          {dbStatus === "ready" && (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/insights" element={<InsightsPage />} />
            </Routes>
          )}
        </main>
      </div>
      {dbStatus === "ready" && <BackgroundServices />}
      <ProjectDialog />
      <StopNoteDialog />
      <IdleDialog />
      <SettingsDialog />
      {dbStatus === "ready" && <DayReviewDialog />}
      <Toaster />
    </HashRouter>
  );
}

/** Hotkey, tray sync, idle detection and day rollover; mounted once the DB is ready. */
function BackgroundServices() {
  useSystemIntegration();
  useIdleWatcher();
  useDayRollover();
  useReviewReminder();
  return null;
}

/** Re-reads data after local midnight so "today" and the heatmap move on. */
function useDayRollover() {
  const refresh = useAppStore((s) => s.refresh);
  useEffect(() => {
    let day = new Date().toDateString();
    const id = window.setInterval(() => {
      const now = new Date().toDateString();
      if (now !== day) {
        day = now;
        void refresh();
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);
}
