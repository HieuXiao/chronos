import type { Id, IsoUtc } from "./common";
import type { LocalDate } from "./project";

/**
 * One entry of a goal's history. The goal on a day is the entry with the
 * latest `effectiveFrom` on or before that day. `projectId` null = whole day.
 */
export interface DailyGoal {
  id: Id;
  projectId: Id | null;
  /** 0 = no goal from this day on. */
  minutes: number;
  effectiveFrom: LocalDate;
}

export interface MissLabel {
  id: Id;
  name: string;
}

/** Why a goal was missed on a day. `projectId` null = the whole-day goal. */
export interface MissReason {
  id: Id;
  day: LocalDate;
  projectId: Id | null;
  note: string | null;
  labelIds: Id[];
  updatedAt: IsoUtc;
}

export interface MissReasonInput {
  day: LocalDate;
  projectId: Id | null;
  note: string | null;
  labelIds: Id[];
}
