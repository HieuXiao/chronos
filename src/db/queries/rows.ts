import type { Note, Project, ProjectStatus, Session, SessionSource, SessionSpan, Todo } from "@/types";

/** Raw row shapes as returned by SQLite (snake_case, 0/1 booleans). */

export interface ProjectRow {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  target_hours: number | null;
  status: string | null;
  created_at: string;
  archived: number | null;
}

export interface SessionRow {
  id: number;
  project_id: number;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  note: string | null;
  source: string;
}

export interface TodoRow {
  id: number;
  project_id: number;
  text: string;
  done: number | null;
  order_index: number | null;
  created_at: string;
  done_at: string | null;
}

export interface NoteRow {
  project_id: number;
  content: string | null;
  updated_at: string | null;
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    targetHours: row.target_hours,
    status: (row.status ?? "active") as ProjectStatus,
    createdAt: row.created_at,
    archived: row.archived === 1,
  };
}

export function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    projectId: row.project_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    note: row.note,
    source: row.source as SessionSource,
  };
}

export function toSessionSpan(row: Pick<SessionRow, "id" | "project_id" | "started_at" | "ended_at">): SessionSpan {
  return {
    id: row.id,
    projectId: row.project_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    projectId: row.project_id,
    text: row.text,
    done: row.done === 1,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    doneAt: row.done_at,
  };
}

export function toNote(row: NoteRow): Note {
  return {
    projectId: row.project_id,
    content: row.content,
    updatedAt: row.updated_at,
  };
}

export function first<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

/** Throws when a statement that must return a row returned none. */
export function expectRow<T>(rows: T[], what: string): T {
  const row = rows[0];
  if (row === undefined) throw new Error(`Không tìm thấy ${what}`);
  return row;
}
