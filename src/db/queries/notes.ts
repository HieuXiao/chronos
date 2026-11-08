import type { Id, Note } from "@/types";

export async function getNote(projectId: Id): Promise<Note | null> {
  throw new Error("not implemented");
}

export async function upsertNote(projectId: Id, content: string): Promise<Note> {
  throw new Error("not implemented");
}
