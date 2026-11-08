import type { Id, NewProject, Project, ProjectPatch } from "@/types";

export interface ListProjectsOptions {
  includeArchived?: boolean;
}

export async function listProjects(options?: ListProjectsOptions): Promise<Project[]> {
  throw new Error("not implemented");
}

export async function getProject(id: Id): Promise<Project | null> {
  throw new Error("not implemented");
}

export async function createProject(input: NewProject): Promise<Project> {
  throw new Error("not implemented");
}

export async function updateProject(id: Id, patch: ProjectPatch): Promise<Project> {
  throw new Error("not implemented");
}

export async function setProjectArchived(id: Id, archived: boolean): Promise<void> {
  throw new Error("not implemented");
}

export async function deleteProject(id: Id): Promise<void> {
  throw new Error("not implemented");
}
