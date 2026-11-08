import type { Note, Project, Session, Todo } from "@/types";
import { nowUtc } from "./time";

export interface FullExport {
  app: "chronos";
  formatVersion: 1;
  exportedAt: string;
  projects: Project[];
  sessions: Session[];
  todos: Todo[];
  notes: Note[];
}

export function buildJsonExport(data: Omit<FullExport, "app" | "formatVersion" | "exportedAt">): string {
  const payload: FullExport = {
    app: "chronos",
    formatVersion: 1,
    exportedAt: nowUtc(),
    ...data,
  };
  return JSON.stringify(payload, null, 2);
}

const CSV_HEADER = [
  "id",
  "project_id",
  "project_name",
  "started_at",
  "ended_at",
  "duration_sec",
  "duration_hours",
  "note",
  "source",
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Sessions as CSV (UTF-8 with BOM so Excel shows Vietnamese correctly). Timestamps stay UTC. */
export function buildSessionsCsv(sessions: Session[], projects: Project[]): string {
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const lines = [CSV_HEADER.join(",")];
  for (const s of [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    lines.push(
      [
        s.id,
        s.projectId,
        names.get(s.projectId) ?? "",
        s.startedAt,
        s.endedAt,
        s.durationSec,
        s.durationSec === null ? null : (s.durationSec / 3600).toFixed(2),
        s.note,
        s.source,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
