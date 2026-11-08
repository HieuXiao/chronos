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

/** Daily report of one project: why it went the way it did that day. */
export interface DayReport {
  id: Id;
  day: LocalDate;
  projectId: Id;
  note: string | null;
  updatedAt: IsoUtc;
}
