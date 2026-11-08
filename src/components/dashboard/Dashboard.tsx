import { useAppStore } from "@/store/appStore";

export function Dashboard() {
  const dbStatus = useAppStore((s) => s.dbStatus);
  const dbError = useAppStore((s) => s.dbError);

  return (
    <section className="flex h-full items-center justify-between px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <span className="text-xs text-muted-foreground" title={dbError ?? undefined}>
        DB: {dbStatus}
      </span>
    </section>
  );
}
