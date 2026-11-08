import { getDb } from "@/db/client";
import { diffSec, nowUtc } from "@/lib/time";
import type { SampleData } from "@/lib/sampleData";
import type { Id } from "@/types";
import { createProject } from "./projects";

const CHUNK = 100;

/** Writes generated demo data. Every project is flagged `sample = 1`. */
export async function insertSampleData(data: SampleData): Promise<void> {
  const db = await getDb();
  const ids = new Map<string, Id>();
  for (const { key, ...input } of data.projects) {
    const project = await createProject({ ...input, sample: true });
    ids.set(key, project.id);
  }
  const idOf = (key: string): Id => {
    const id = ids.get(key);
    if (id === undefined) throw new Error(`Thiếu project mẫu ${key}`);
    return id;
  };

  for (let i = 0; i < data.sessions.length; i += CHUNK) {
    const chunk = data.sessions.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const rows = chunk.map((s) => {
      values.push(idOf(s.projectKey), s.startedAt, s.endedAt, diffSec(s.startedAt, s.endedAt), s.note, s.source);
      const n = values.length;
      return `($${n - 5}, $${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
    });
    await db.execute(
      `INSERT INTO sessions (project_id, started_at, ended_at, duration_sec, note, source) VALUES ${rows.join(", ")}`,
      values,
    );
  }

  const order = new Map<string, number>();
  for (const t of data.todos) {
    const idx = order.get(t.projectKey) ?? 0;
    order.set(t.projectKey, idx + 1);
    await db.execute(
      `INSERT INTO todos (project_id, text, done, order_index, created_at, done_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [idOf(t.projectKey), t.text, t.done ? 1 : 0, idx, t.createdAt, t.doneAt],
    );
  }

  for (const n of data.notes) {
    await db.execute("INSERT INTO notes (project_id, content, updated_at) VALUES ($1, $2, $3)", [
      idOf(n.projectKey),
      n.content,
      nowUtc(),
    ]);
  }
}

/** Removes every sample project with its sessions, todos and notes (cascade). */
export async function deleteSampleData(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM projects WHERE sample = 1");
}
