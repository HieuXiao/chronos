import type { Id, IsoUtc } from "./common";
import type { LocalDate } from "./project";

/**
 * One entry of a goal's history. The goal on a day is the entry with the
 * latest `effectiveFrom` on or before that day. `projectId` null = the
 * work time needed per day (the line on the chart); otherwise the project's
 * minimum per day.
 */
export interface DailyGoal {
  id: Id;
  projectId: Id | null;
  /** 0 = no goal from this day on. */
  minutes: number;
  effectiveFrom: LocalDate;
}

/** What was done on one project on one day. */
export interface DayReport {
  id: Id;
  day: LocalDate;
  projectId: Id;
  note: string | null;
  updatedAt: IsoUtc;
}

/** A reason label for a missed day. Two levels: groups (parentId null) and labels under them. */
export interface ReasonLabel {
  id: Id;
  name: string;
  parentId: Id | null;
  orderIndex: number;
}

/** Why the work time needed for a day was not reached: labels plus an optional note. */
export interface DayReason {
  id: Id;
  day: LocalDate;
  labelIds: Id[];
  note: string | null;
  updatedAt: IsoUtc;
}
