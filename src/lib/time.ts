import type { IsoUtc } from "@/types";

/** Current instant as an ISO 8601 UTC string. Use this for every timestamp written to the DB. */
export function nowUtc(): IsoUtc {
  return new Date().toISOString();
}

/** Normalizes a Date to an ISO 8601 UTC string. */
export function toUtc(date: Date): IsoUtc {
  return date.toISOString();
}

/** Seconds between two UTC timestamps. */
export function diffSec(startedAt: IsoUtc, endedAt: IsoUtc): number {
  throw new Error("not implemented");
}

/** Formats a duration as `HH:MM:SS`. */
export function formatDuration(totalSec: number): string {
  throw new Error("not implemented");
}
