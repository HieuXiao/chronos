import { getDb } from "@/db/client";
import { nowUtc } from "@/lib/time";
import type { DailyGoal, DayReason, DayReport, Id, LocalDate, ReasonLabel } from "@/types";
import { expectRow, first } from "./rows";

// ---- Goals -----------------------------------------------------------------
// Group goals from older versions stay in the table but are ignored.

export async function listGoals(): Promise<DailyGoal[]> {
  const db = await getDb();
  const rows = await db.select<{ id: number; project_id: number | null; minutes: number; effective_from: string }[]>(
    "SELECT id, project_id, minutes, effective_from FROM daily_goals WHERE group_id IS NULL ORDER BY effective_from, id",
  );
  return rows.map((r) => ({ id: r.id, projectId: r.project_id, minutes: r.minutes, effectiveFrom: r.effective_from }));
}

/** Sets a goal from `fromDay` on, replacing an entry for that same day. `projectId` null = work time per day. */
export async function setGoal(projectId: Id | null, minutes: number, fromDay: LocalDate): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM daily_goals WHERE COALESCE(project_id, 0) = COALESCE($1, 0) AND group_id IS NULL AND effective_from = $2",
    [projectId, fromDay],
  );
  await db.execute("INSERT INTO daily_goals (project_id, minutes, effective_from) VALUES ($1, $2, $3)", [
    projectId,
    Math.max(0, Math.round(minutes)),
    fromDay,
  ]);
}

// ---- What was done (per project per day) ----------------------------------
// Rows of miss_reasons with a project_id; the table name predates this use.

export async function listReports(): Promise<DayReport[]> {
  const db = await getDb();
  const rows = await db.select<{ id: number; day: string; project_id: number; note: string | null; updated_at: string }[]>(
    "SELECT id, day, project_id, note, updated_at FROM miss_reasons WHERE project_id IS NOT NULL ORDER BY day, id",
  );
  return rows.map((r) => ({ id: r.id, day: r.day, projectId: r.project_id, note: r.note, updatedAt: r.updated_at }));
}

/** Saves what was done on (day, project); an empty note removes it. */
export async function saveReport(day: LocalDate, projectId: Id, note: string): Promise<void> {
  const db = await getDb();
  const clean = note.trim();
  const existing = first(
    await db.select<{ id: number }[]>(
      "SELECT id FROM miss_reasons WHERE day = $1 AND project_id = $2 AND group_id IS NULL",
      [day, projectId],
    ),
  );
  if (!clean) {
    if (existing) await db.execute("DELETE FROM miss_reasons WHERE id = $1", [existing.id]);
    return;
  }
  if (existing) {
    await db.execute("UPDATE miss_reasons SET note = $1, updated_at = $2 WHERE id = $3", [clean, nowUtc(), existing.id]);
  } else {
    const rows = await db.select<{ id: number }[]>(
      "INSERT INTO miss_reasons (day, project_id, note, updated_at) VALUES ($1, $2, $3, $4) RETURNING id",
      [day, projectId, clean, nowUtc()],
    );
    expectRow(rows, "báo cáo vừa lưu");
  }
}

// ---- Reasons for a missed day ----------------------------------------------
// One row per day in miss_reasons with project_id and group_id NULL; its
// labels are in reason_label_links.

type LabelRow = { id: number; name: string; parent_id: number | null; order_index: number };
const toLabel = (r: LabelRow): ReasonLabel => ({ id: r.id, name: r.name, parentId: r.parent_id, orderIndex: r.order_index });

/** Shared labels for missed goals, in display order. */
export async function listReasonLabels(): Promise<ReasonLabel[]> {
  const db = await getDb();
  const rows = await db.select<LabelRow[]>(
    "SELECT id, name, parent_id, order_index FROM reason_labels WHERE kind = 'miss' AND project_id IS NULL ORDER BY order_index, id",
  );
  return rows.map(toLabel);
}

/** Adds a label at the end of its group (`parentId` null = a new group). */
export async function createReasonLabel(name: string, parentId: Id | null): Promise<ReasonLabel> {
  const db = await getDb();
  const next = first(
    await db.select<{ next: number }[]>(
      "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM reason_labels WHERE kind = 'miss' AND parent_id IS $1",
      [parentId],
    ),
  );
  const rows = await db.select<LabelRow[]>(
    `INSERT INTO reason_labels (name, parent_id, kind, order_index, created_at)
     VALUES ($1, $2, 'miss', $3, $4)
     RETURNING id, name, parent_id, order_index`,
    [name.trim(), parentId, next?.next ?? 0, nowUtc()],
  );
  return toLabel(expectRow(rows, "nhãn vừa tạo"));
}

export async function listDayReasons(): Promise<DayReason[]> {
  const db = await getDb();
  const [rows, links] = await Promise.all([
    db.select<{ id: number; day: string; note: string | null; updated_at: string }[]>(
      "SELECT id, day, note, updated_at FROM miss_reasons WHERE project_id IS NULL AND group_id IS NULL ORDER BY day, id",
    ),
    db.select<{ reason_id: number; label_id: number }[]>(
      `SELECT l.reason_id, l.label_id
         FROM reason_label_links l
         JOIN miss_reasons r ON r.id = l.reason_id
        WHERE r.project_id IS NULL AND r.group_id IS NULL`,
    ),
  ]);
  const labelsOf = new Map<number, Id[]>();
  for (const l of links) {
    const list = labelsOf.get(l.reason_id) ?? [];
    list.push(l.label_id);
    labelsOf.set(l.reason_id, list);
  }
  return rows.map((r) => ({ id: r.id, day: r.day, note: r.note, labelIds: labelsOf.get(r.id) ?? [], updatedAt: r.updated_at }));
}

/** Saves the reason for a missed day; no labels and no note removes it. */
export async function saveDayReason(day: LocalDate, labelIds: Id[], note: string): Promise<void> {
  const db = await getDb();
  const clean = note.trim();
  const existing = first(
    await db.select<{ id: number }[]>(
      "SELECT id FROM miss_reasons WHERE day = $1 AND project_id IS NULL AND group_id IS NULL",
      [day],
    ),
  );
  if (!clean && labelIds.length === 0) {
    if (existing) {
      // Foreign keys are not enforced, so the links are removed by hand.
      await db.execute("DELETE FROM reason_label_links WHERE reason_id = $1", [existing.id]);
      await db.execute("DELETE FROM miss_reasons WHERE id = $1", [existing.id]);
    }
    return;
  }
  let id: number;
  if (existing) {
    id = existing.id;
    await db.execute("UPDATE miss_reasons SET note = $1, updated_at = $2 WHERE id = $3", [clean || null, nowUtc(), id]);
    await db.execute("DELETE FROM reason_label_links WHERE reason_id = $1", [id]);
  } else {
    const rows = await db.select<{ id: number }[]>(
      "INSERT INTO miss_reasons (day, note, updated_at) VALUES ($1, $2, $3) RETURNING id",
      [day, clean || null, nowUtc()],
    );
    id = expectRow(rows, "lý do vừa lưu").id;
  }
  const unique = [...new Set(labelIds)];
  if (unique.length > 0) {
    await db.execute(
      `INSERT INTO reason_label_links (reason_id, label_id) VALUES ${unique.map((_, i) => `($1, $${i + 2})`).join(", ")}`,
      [id, ...unique],
    );
  }
}

// ---- Settings--------------------------------------------------------------

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
