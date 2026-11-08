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

export interface NewManualSession {
  projectId: Id;
  startedAt: IsoUtc;
  endedAt: IsoUtc;
  note?: string | null;
}

export type SessionPatch = Partial<Pick<Session, "projectId" | "startedAt" | "endedAt" | "note">>;

export interface SessionFilter {
  projectId?: Id;
  /** Inclusive lower bound on `startedAt`. */
  from?: IsoUtc;
  /** Exclusive upper bound on `startedAt`. */
  to?: IsoUtc;
}
