import { Dashboard } from "@/components/dashboard/Dashboard";
import { TimersPanel } from "@/components/timers/TimersPanel";

export function HomePage() {
  return (
    <div className="flex h-full flex-col">
      <Dashboard />
      <div className="min-h-0 flex-1">
        <TimersPanel />
      </div>
    </div>
  );
}
