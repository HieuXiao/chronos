import type { Id, IsoUtc } from "./common";

/** One free-form note per project. */
export interface Note {
  projectId: Id;
  content: string | null;
  updatedAt: IsoUtc | null;
}
