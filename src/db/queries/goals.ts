import { getDb } from "@/db/client";
import { nowUtc } from "@/lib/time";
import type { DailyGoal, DayReport, Id, LocalDate } from "@/types";
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

// ---- Daily reports ---------------------------------------------------------

export async function listReports(): Promise<DayReport[]> {
  const db = await getDb();
  const rows = await db.select<{ id: number; day: string; project_id: number; note: string | null; updated_at: string }[]>(
    "SELECT id, day, project_id, note, updated_at FROM miss_reasons WHERE project_id IS NOT NULL ORDER BY day, id",
  );
  return rows.map((r) => ({ id: r.id, day: r.day, projectId: r.project_id, note: r.note, updatedAt: r.updated_at }));
}

/** Saves the reason for (day, project); an empty note removes it. */
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
