import { getDb } from "@/db/client";
import { diffSec, nowUtc } from "@/lib/time";
import type { SampleData } from "@/lib/sampleData";
import type { Id } from "@/types";
import { createProject } from "./projects";

const CHUNK = 100;

/** Multi-row INSERT in chunks; `row` returns one row's values in column order. */
async function insertMany<T>(table: string, columns: string[], items: T[], row: (item: T) => unknown[]) {
  const db = await getDb();
  for (let i = 0; i < items.length; i += CHUNK) {
    const values: unknown[] = [];
    const tuples = items.slice(i, i + CHUNK).map((item) => {
      const start = values.length;
      values.push(...row(item));
      return `(${columns.map((_, k) => `$${start + k + 1}`).join(", ")})`;
    });
    await db.execute(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}`, values);
  }
}

/** Writes generated demo data. Every project is flagged `sample = 1`. */
export async function insertSampleData(data: SampleData): Promise<void> {
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
  const now = nowUtc();

  await insertMany("sessions", ["project_id", "started_at", "ended_at", "duration_sec", "note", "source"], data.sessions, (s) => [
    idOf(s.projectKey),
    s.startedAt,
    s.endedAt,
    diffSec(s.startedAt, s.endedAt),
    s.note,
    s.source,
  ]);

  const order = new Map<string, number>();
  await insertMany("todos", ["project_id", "text", "done", "order_index", "created_at", "done_at"], data.todos, (t) => {
    const idx = order.get(t.projectKey) ?? 0;
    order.set(t.projectKey, idx + 1);
    return [idOf(t.projectKey), t.text, t.done ? 1 : 0, idx, t.createdAt, t.doneAt];
  });

  await insertMany("notes", ["project_id", "content", "updated_at"], data.notes, (n) => [idOf(n.projectKey), n.content, now]);

  const linkOrder = new Map<string, number>();
  await insertMany("project_links", ["project_id", "title", "target", "order_index", "created_at"], data.links, (l) => {
    const idx = linkOrder.get(l.projectKey) ?? 0;
    linkOrder.set(l.projectKey, idx + 1);
    return [idOf(l.projectKey), l.title, l.target, idx, now];
  });

  await insertMany("daily_goals", ["project_id", "minutes", "effective_from"], data.goals, (g) => [
    idOf(g.projectKey),
    g.minutes,
    g.effectiveFrom,
  ]);

  await insertMany("miss_reasons", ["day", "project_id", "note", "updated_at"], data.reports, (r) => [
    r.day,
    idOf(r.projectKey),
    r.note,
    now,
  ]);
}

/** Removes the sample projects with everything attached to them (cascade). */
export async function deleteSampleData(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM projects WHERE sample = 1");
}
