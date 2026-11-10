import type { Id, IsoUtc } from "./common";

/** Local calendar day `YYYY-MM-DD` (a date, not an instant). */
export type LocalDate = string;

export interface Project {
  id: Id;
  name: string;
  color: string | null;
  icon: string | null;
  /** Total hours to reach ("Tổng giờ cần đạt"). */
  targetHours: number | null;
  createdAt: IsoUtc;
  archived: boolean;
  startDate: LocalDate | null;
  /** Optional deadline. */
  endDate: LocalDate | null;
  /** Why this project matters ("Lý do của project"). */
  purpose: string | null;
  /** Position among the cards on the home page (drag and drop). */
  orderIndex: number;
}

export interface NewProject {
  name: string;
  color?: string | null;
  icon?: string | null;
  targetHours?: number | null;
  startDate?: LocalDate | null;
  endDate?: LocalDate | null;
  purpose?: string | null;
}

export type ProjectPatch = Partial<Omit<Project, "id" | "createdAt" | "orderIndex">>;

/** A related document: a web address or a local file / folder. */
export interface ProjectLink {
  id: Id;
  projectId: Id;
  title: string;
  target: string;
}
