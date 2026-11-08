import type { Id, IsoUtc } from "./common";

export interface Todo {
  id: Id;
  projectId: Id;
  text: string;
  done: boolean;
  orderIndex: number | null;
  createdAt: IsoUtc;
  doneAt: IsoUtc | null;
}

export interface NewTodo {
  projectId: Id;
  text: string;
}

export type TodoPatch = Partial<Pick<Todo, "text" | "done" | "orderIndex">>;
