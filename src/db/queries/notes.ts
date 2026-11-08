import { getDb } from "@/db/client";
import { nowUtc } from "@/lib/time";
import type { Id, Note } from "@/types";
import { first, toNote, type NoteRow } from "./rows";

export async function getNote(projectId: Id): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<NoteRow[]>("SELECT * FROM notes WHERE project_id = $1", [projectId]);
  const row = first(rows);
  return row ? toNote(row) : null;
}

export async function listAllNotes(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.select<NoteRow[]>("SELECT * FROM notes ORDER BY project_id");
  return rows.map(toNote);
}

export async function upsertNote(projectId: Id, content: string): Promise<Note> {
  const db = await getDb();
  const updatedAt = nowUtc();
  await db.execute(
    `INSERT INTO notes (project_id, content, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(project_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    [projectId, content, updatedAt],
  );
  return { projectId, content, updatedAt };
}
