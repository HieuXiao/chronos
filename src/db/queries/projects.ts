import { getDb } from "@/db/client";
import { dayKey, nowUtc } from "@/lib/time";
import type { Id, NewProject, Project, ProjectPatch } from "@/types";
import { expectRow, first, toProject, type ProjectRow } from "./rows";

export interface ListProjectsOptions {
  includeArchived?: boolean;
}

export async function listProjects(options?: ListProjectsOptions): Promise<Project[]> {
  const db = await getDb();
  const where = options?.includeArchived ? "" : "WHERE archived = 0";
  const rows = await db.select<ProjectRow[]>(`SELECT * FROM projects ${where} ORDER BY id`);
  return rows.map(toProject);
}

export async function getProject(id: Id): Promise<Project | null> {
  const db = await getDb();
  const rows = await db.select<ProjectRow[]>("SELECT * FROM projects WHERE id = $1", [id]);
  const row = first(rows);
  return row ? toProject(row) : null;
}

export async function createProject(input: NewProject): Promise<Project> {
  const db = await getDb();
  const rows = await db.select<ProjectRow[]>(
    `INSERT INTO projects
       (name, color, icon, target_hours, status, created_at, archived, start_date, end_date, sample)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
     RETURNING *`,
    [
      input.name.trim(),
      input.color ?? null,
      input.icon ?? null,
      input.targetHours ?? null,
      input.status ?? "active",
      nowUtc(),
      input.startDate ?? dayKey(Date.now()),
      input.endDate ?? null,
      input.sample ? 1 : 0,
    ],
  );
  return toProject(expectRow(rows, "project vừa tạo"));
}

const PATCH_COLUMNS = {
  name: "name",
  color: "color",
  icon: "icon",
  targetHours: "target_hours",
  status: "status",
  archived: "archived",
  startDate: "start_date",
  endDate: "end_date",
} as const satisfies Record<keyof ProjectPatch, string>;

export async function updateProject(id: Id, patch: ProjectPatch): Promise<Project> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(PATCH_COLUMNS) as (keyof ProjectPatch)[]) {
    if (!(key in patch)) continue;
    let value: unknown = patch[key];
    if (key === "archived") value = value ? 1 : 0;
    if (key === "name" && typeof value === "string") value = value.trim();
    values.push(value ?? null);
    sets.push(`${PATCH_COLUMNS[key]} = $${values.length}`);
  }
  if (sets.length === 0) {
    const current = await getProject(id);
    if (!current) throw new Error("Không tìm thấy project");
    return current;
  }
  values.push(id);
  const rows = await db.select<ProjectRow[]>(
    `UPDATE projects SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values,
  );
  return toProject(expectRow(rows, "project"));
}

export async function setProjectArchived(id: Id, archived: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE projects SET archived = $1 WHERE id = $2", [archived ? 1 : 0, id]);
}

/** Deletes the project; sessions, todos and the note go with it (ON DELETE CASCADE). */
export async function deleteProject(id: Id): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM projects WHERE id = $1", [id]);
}
