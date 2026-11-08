import { getDb } from "@/db/client";
import { nowUtc } from "@/lib/time";
import type { Id, NewTodo, Todo, TodoPatch } from "@/types";
import { expectRow, toTodo, type TodoRow } from "./rows";

const ORDER = "ORDER BY order_index IS NULL, order_index, id";

export async function listTodos(projectId: Id): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<TodoRow[]>(`SELECT * FROM todos WHERE project_id = $1 ${ORDER}`, [projectId]);
  return rows.map(toTodo);
}

export async function listOpenTodos(projectId: Id): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<TodoRow[]>(
    `SELECT * FROM todos WHERE project_id = $1 AND done = 0 ${ORDER}`,
    [projectId],
  );
  return rows.map(toTodo);
}

export async function listAllTodos(): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<TodoRow[]>(`SELECT * FROM todos ORDER BY project_id, order_index, id`);
  return rows.map(toTodo);
}

/** Appends a todo at the end of the project's list. */
export async function createTodo(input: NewTodo): Promise<Todo> {
  const db = await getDb();
  const rows = await db.select<TodoRow[]>(
    `INSERT INTO todos (project_id, text, done, order_index, created_at, done_at)
     VALUES ($1, $2, 0,
             (SELECT COALESCE(MAX(order_index), -1) + 1 FROM todos WHERE project_id = $1),
             $3, NULL)
     RETURNING *`,
    [input.projectId, input.text.trim(), nowUtc()],
  );
  return toTodo(expectRow(rows, "todo vừa tạo"));
}

export async function updateTodo(id: Id, patch: TodoPatch): Promise<Todo> {
  if (patch.done !== undefined) {
    await setTodoDone(id, patch.done);
  }
  const db = await getDb();
  const rows = await db.select<TodoRow[]>(
    `UPDATE todos
     SET text = COALESCE($1, text),
         order_index = COALESCE($2, order_index)
     WHERE id = $3
     RETURNING *`,
    [patch.text?.trim() ?? null, patch.orderIndex ?? null, id],
  );
  return toTodo(expectRow(rows, "todo"));
}

export async function setTodoDone(id: Id, done: boolean): Promise<Todo> {
  const db = await getDb();
  const rows = await db.select<TodoRow[]>(
    "UPDATE todos SET done = $1, done_at = $2 WHERE id = $3 RETURNING *",
    [done ? 1 : 0, done ? nowUtc() : null, id],
  );
  return toTodo(expectRow(rows, "todo"));
}

/** Rewrites `orderIndex` of a project's todos to follow `orderedIds`. */
export async function reorderTodos(projectId: Id, orderedIds: Id[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const db = await getDb();
  // Single statement so the new order is applied atomically.
  const cases = orderedIds.map((_, i) => `WHEN $${i + 2} THEN ${i}`).join(" ");
  const placeholders = orderedIds.map((_, i) => `$${i + 2}`).join(", ");
  await db.execute(
    `UPDATE todos SET order_index = CASE id ${cases} END
     WHERE project_id = $1 AND id IN (${placeholders})`,
    [projectId, ...orderedIds],
  );
}

export async function deleteTodo(id: Id): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM todos WHERE id = $1", [id]);
}
