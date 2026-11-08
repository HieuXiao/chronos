import type { Id, IsoUtc } from "./common";

export type ProjectStatus = "active" | "paused" | "completed";

export interface Project {
  id: Id;
  name: string;
  color: string | null;
  icon: string | null;
  targetHours: number | null;
  status: ProjectStatus;
  createdAt: IsoUtc;
  archived: boolean;
}

export interface NewProject {
  name: string;
  color?: string | null;
  icon?: string | null;
  targetHours?: number | null;
  status?: ProjectStatus;
}

export type ProjectPatch = Partial<Omit<Project, "id" | "createdAt">>;
