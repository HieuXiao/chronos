import { useEffect } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { TimersPanel } from "@/components/timers/TimersPanel";
import { useAppStore } from "@/store/appStore";

export default function App() {
  const initDb = useAppStore((s) => s.initDb);

  useEffect(() => {
    void initDb();
  }, [initDb]);

  return (
    <div className="flex h-full flex-col">
      <div className="h-[240px] shrink-0 border-b">
        <Dashboard />
      </div>
      <div className="min-h-0 flex-1">
        <TimersPanel />
      </div>
    </div>
  );
}
