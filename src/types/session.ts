import type { Id, IsoUtc } from "./common";

export type SessionSource = "timer" | "manual";

export interface Session {
  id: Id;
  projectId: Id;
  startedAt: IsoUtc;
  /** `null` while the timer is still running. */
  endedAt: IsoUtc | null;
  durationSec: number | null;
  note: string | null;
  source: SessionSource;
}

/** Lightweight view of a session used for statistics. */
export type SessionSpan = Pick<Session, "id" | "projectId" | "startedAt" | "endedAt">;

export interface NewManualSession {
  projectId: Id;
  startedAt: IsoUtc;
  endedAt: IsoUtc;
  note?: string | null;
}

export type SessionPatch = Partial<Pick<Session, "projectId" | "startedAt" | "endedAt" | "note">>;

export interface SessionFilter {
  projectId?: Id;
  /** Sessions overlapping [from, to). Running sessions count as ending now. */
  from?: IsoUtc;
  to?: IsoUtc;
  limit?: number;
}
