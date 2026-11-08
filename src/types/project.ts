import type { Id, IsoUtc } from "./common";

export type ProjectStatus = "active" | "paused" | "completed";

/** Local calendar day `YYYY-MM-DD` (a date, not an instant). */
export type LocalDate = string;

export interface Project {
  id: Id;
  name: string;
  color: string | null;
  icon: string | null;
  targetHours: number | null;
  status: ProjectStatus;
  createdAt: IsoUtc;
  archived: boolean;
  startDate: LocalDate | null;
  /** Optional deadline. */
  endDate: LocalDate | null;
  /** Created by the sample-data generator. */
  sample: boolean;
}

export interface NewProject {
  name: string;
  color?: string | null;
  icon?: string | null;
  targetHours?: number | null;
  status?: ProjectStatus;
  startDate?: LocalDate | null;
  endDate?: LocalDate | null;
  sample?: boolean;
}

export type ProjectPatch = Partial<Omit<Project, "id" | "createdAt" | "sample">>;
