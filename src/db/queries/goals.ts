import { getDb } from "@/db/client";
import { nowUtc } from "@/lib/time";
import type { DailyGoal, Id, LocalDate, MissLabel, MissReason, MissReasonInput } from "@/types";
import { expectRow, first } from "./rows";

interface GoalRow {
  id: number;
  project_id: number | null;
  minutes: number;
  effective_from: string;
}

interface LabelRow {
  id: number;
  name: string;
}

interface ReasonRow {
  id: number;
  day: string;
  project_id: number | null;
  note: string | null;
  updated_at: string;
  label_ids: string | null;
}

// ---- Goals -----------------------------------------------------------------

export async function listGoals(): Promise<DailyGoal[]> {
  const db = await getDb();
  const rows = await db.select<GoalRow[]>("SELECT * FROM daily_goals ORDER BY effective_from, id");
  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    minutes: r.minutes,
    effectiveFrom: r.effective_from,
  }));
}

/** Sets the goal from `fromDay` on (replacing an entry for that same day). */
export async function setGoal(projectId: Id | null, minutes: number, fromDay: LocalDate): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM daily_goals WHERE COALESCE(project_id, 0) = COALESCE($1, 0) AND effective_from = $2",
    [projectId, fromDay],
  );
  await db.execute("INSERT INTO daily_goals (project_id, minutes, effective_from) VALUES ($1, $2, $3)", [
    projectId,
    Math.max(0, Math.round(minutes)),
    fromDay,
  ]);
}

// ---- Labels ----------------------------------------------------------------

export async function listLabels(): Promise<MissLabel[]> {
  const db = await getDb();
  return db.select<LabelRow[]>("SELECT id, name FROM miss_labels ORDER BY id");
}

/** Returns the existing label when one with the same name (case-insensitive) exists. */
export async function createLabel(name: string): Promise<MissLabel> {
  const db = await getDb();
  const clean = name.trim();
  // SQLite NOCASE only folds ASCII, so compare Vietnamese names here.
  const wanted = clean.toLocaleLowerCase("vi");
  const all = await db.select<LabelRow[]>("SELECT id, name FROM miss_labels");
  const existing = all.find((l) => l.name.toLocaleLowerCase("vi") === wanted);
  if (existing) return existing;
  const rows = await db.select<LabelRow[]>(
    "INSERT INTO miss_labels (name, created_at) VALUES ($1, $2) RETURNING id, name",
    [clean, nowUtc()],
  );
  return expectRow(rows, "label vừa tạo");
}

export async function renameLabel(id: Id, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE miss_labels SET name = $1 WHERE id = $2", [name.trim(), id]);
}

export async function deleteLabel(id: Id): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM miss_labels WHERE id = $1", [id]);
}

// ---- Reasons ---------------------------------------------------------------

export async function listReasons(): Promise<MissReason[]> {
  const db = await getDb();
  const rows = await db.select<ReasonRow[]>(
    `SELECT r.id, r.day, r.project_id, r.note, r.updated_at,
            (SELECT group_concat(label_id) FROM miss_reason_labels WHERE reason_id = r.id) AS label_ids
       FROM miss_reasons r
      ORDER BY r.day, r.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    day: r.day,
    projectId: r.project_id,
    note: r.note,
    updatedAt: r.updated_at,
    labelIds: r.label_ids ? r.label_ids.split(",").map(Number) : [],
  }));
}

/** Creates or replaces the reason for (day, project). Empty input removes it. */
export async function saveReason(input: MissReasonInput): Promise<void> {
  const db = await getDb();
  const note = input.note?.trim() || null;
  const existing = first(
    await db.select<{ id: number }[]>(
      "SELECT id FROM miss_reasons WHERE day = $1 AND COALESCE(project_id, 0) = COALESCE($2, 0)",
      [input.day, input.projectId],
    ),
  );

  if (!note && input.labelIds.length === 0) {
    if (existing) await db.execute("DELETE FROM miss_reasons WHERE id = $1", [existing.id]);
    return;
  }

  let id: number;
  if (existing) {
    id = existing.id;
    await db.execute("UPDATE miss_reasons SET note = $1, updated_at = $2 WHERE id = $3", [note, nowUtc(), id]);
    await db.execute("DELETE FROM miss_reason_labels WHERE reason_id = $1", [id]);
  } else {
    const rows = await db.select<{ id: number }[]>(
      "INSERT INTO miss_reasons (day, project_id, note, updated_at) VALUES ($1, $2, $3, $4) RETURNING id",
      [input.day, input.projectId, note, nowUtc()],
    );
    id = expectRow(rows, "lý do vừa lưu").id;
  }
  await insertReasonLabels(id, input.labelIds);
}

export async function insertReasonLabels(reasonId: Id, labelIds: Id[]): Promise<void> {
  const unique = [...new Set(labelIds)];
  if (unique.length === 0) return;
  const db = await getDb();
  const values: unknown[] = [];
  const rows = unique.map((labelId) => {
    values.push(reasonId, labelId);
    return `($${values.length - 1}, $${values.length})`;
  });
  await db.execute(`INSERT INTO miss_reason_labels (reason_id, label_id) VALUES ${rows.join(", ")}`, values);
}

// ---- Settings --------------------------------------------------------------

export async function getSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string | null }[]>("SELECT key, value FROM settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
