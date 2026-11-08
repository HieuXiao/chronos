import type { Id, IsoUtc, NewManualSession, Session, SessionFilter, SessionPatch } from "@/types";

export async function listSessions(filter?: SessionFilter): Promise<Session[]> {
  throw new Error("not implemented");
}

export async function getSession(id: Id): Promise<Session | null> {
  throw new Error("not implemented");
}

/** Sessions whose `endedAt` is NULL. */
export async function listRunningSessions(): Promise<Session[]> {
  throw new Error("not implemented");
}

export async function startSession(projectId: Id, startedAt?: IsoUtc): Promise<Session> {
  throw new Error("not implemented");
}

export async function stopSession(id: Id, endedAt?: IsoUtc): Promise<Session> {
  throw new Error("not implemented");
}

export async function createManualSession(input: NewManualSession): Promise<Session> {
  throw new Error("not implemented");
}

export async function updateSession(id: Id, patch: SessionPatch): Promise<Session> {
  throw new Error("not implemented");
}

export async function deleteSession(id: Id): Promise<void> {
  throw new Error("not implemented");
}

/** Total tracked seconds of a project (finished sessions only). */
export async function getProjectTotalSec(projectId: Id): Promise<number> {
  throw new Error("not implemented");
}
