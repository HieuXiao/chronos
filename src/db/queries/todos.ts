import type { Id, NewTodo, Todo, TodoPatch } from "@/types";

export async function listTodos(projectId: Id): Promise<Todo[]> {
  throw new Error("not implemented");
}

export async function createTodo(input: NewTodo): Promise<Todo> {
  throw new Error("not implemented");
}

export async function updateTodo(id: Id, patch: TodoPatch): Promise<Todo> {
  throw new Error("not implemented");
}

export async function setTodoDone(id: Id, done: boolean): Promise<Todo> {
  throw new Error("not implemented");
}

/** Rewrites `orderIndex` of a project's todos to follow `orderedIds`. */
export async function reorderTodos(projectId: Id, orderedIds: Id[]): Promise<void> {
  throw new Error("not implemented");
}

export async function deleteTodo(id: Id): Promise<void> {
  throw new Error("not implemented");
}
