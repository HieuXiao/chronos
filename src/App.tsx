import { useEffect } from "react";
import { SettingsDialog } from "@/components/layout/SettingsDialog";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { DayReasonDialog } from "@/components/report/DayReasonDialog";
import { ReportDialog } from "@/components/report/ReportDialog";
import { ReportSection } from "@/components/report/ReportSection";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { IdleDialog } from "@/components/timers/IdleDialog";
import { StopNoteDialog } from "@/components/timers/StopNoteDialog";
import { Toaster } from "@/components/ui/sonner";
import { useIdleWatcher } from "@/hooks/useIdleWatcher";
import { useSystemIntegration } from "@/hooks/useSystemIntegration";
import { useAppStore } from "@/store/appStore";

/** One page: the report on top, the project cards below, details in a sidebar. */
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
    <>
      <div className="flex h-full flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          {dbStatus === "ready" && (
            <>
              <ReportSection />
              <ProjectGrid />
            </>
          )}
        </main>
      </div>
      {dbStatus === "ready" && (
        <>
          <BackgroundServices />
          <Sidebar />
          <ReportDialog />
          <DayReasonDialog />
        </>
      )}
      <ProjectDialog />
      <StopNoteDialog />
      <IdleDialog />
      <SettingsDialog />
      <Toaster />
    </>
  );
}

/** Hotkey, tray sync, idle detection and day rollover; mounted once the DB is ready. */
function BackgroundServices() {
  useSystemIntegration();
  useIdleWatcher();
  useDayRollover();
  return null;
}

/** Re-reads data after local midnight so "today" moves on. */
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
