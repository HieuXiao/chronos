import type { Project, Session } from "@/types";

export type ExportFormat = "csv" | "json";

export function exportSessions(
  sessions: Session[],
  projects: Project[],
  format: ExportFormat,
): string {
  throw new Error("not implemented");
}
