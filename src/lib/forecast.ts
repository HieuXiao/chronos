import type { IsoUtc, Project, Session } from "@/types";

export interface Forecast {
  trackedSec: number;
  remainingSec: number | null;
  /** Average tracked seconds per active day over the sampling window. */
  dailyAverageSec: number;
  estimatedCompletion: IsoUtc | null;
}

export function forecastProject(project: Project, sessions: Session[], now?: IsoUtc): Forecast {
  throw new Error("not implemented");
}
