import { getDb } from "@/db/client";
import { nowUtc } from "@/lib/time";
import type { Id, ProjectLink } from "@/types";
import { expectRow } from "./rows";

interface LinkRow {
  id: number;
  project_id: number;
  title: string;
  target: string;
}

const toLink = (r: LinkRow): ProjectLink => ({ id: r.id, projectId: r.project_id, title: r.title, target: r.target });

export async function listLinks(projectId: Id): Promise<ProjectLink[]> {
  const db = await getDb();
  const rows = await db.select<LinkRow[]>(
    "SELECT id, project_id, title, target FROM project_links WHERE project_id = $1 ORDER BY order_index, id",
    [projectId],
  );
  return rows.map(toLink);
}

export async function addLink(projectId: Id, title: string, target: string): Promise<ProjectLink> {
  const db = await getDb();
  const rows = await db.select<LinkRow[]>(
    `INSERT INTO project_links (project_id, title, target, order_index, created_at)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM project_links WHERE project_id = $1), $4)
     RETURNING id, project_id, title, target`,
    [projectId, title.trim(), target.trim(), nowUtc()],
  );
  return toLink(expectRow(rows, "đường dẫn vừa thêm"));
}

export async function deleteLink(id: Id): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM project_links WHERE id = $1", [id]);
}

export async function listAllLinks(): Promise<ProjectLink[]> {
  const db = await getDb();
  const rows = await db.select<LinkRow[]>("SELECT id, project_id, title, target FROM project_links ORDER BY project_id, order_index, id");
  return rows.map(toLink);
}
