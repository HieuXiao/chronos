import type { Project } from "@/types";

/**
 * Categorical project colors, stepped for the dark surface.
 * The ORDER is what keeps neighbouring series distinguishable for colour-blind
 * users (validated: adjacent CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3, ≥ 3:1 on
 * the background). New projects take the next unused slot; never generate hues.
 */
export const PROJECT_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

/** Neutral for the folded "Khác" series (not a categorical slot). */
export const OTHER_SERIES_COLOR = "#71717a";

export function projectColor(color: string | null | undefined): string {
  return color ?? DEFAULT_PROJECT_COLOR;
}

/** First palette slot no active project uses yet (cycles only after all 8 are taken). */
export function nextProjectColor(projects: Project[]): string {
  return nextProjectColors(projects, 1)[0]!;
}

/** The next `count` palette slots for new projects, in palette order. */
export function nextProjectColors(projects: Project[], count: number): string[] {
  const active = projects.filter((p) => !p.archived);
  const used = new Set(active.map((p) => p.color));
  const free = PROJECT_COLORS.filter((c) => !used.has(c));
  return Array.from(
    { length: count },
    (_, i) => free[i] ?? PROJECT_COLORS[(active.length + i) % PROJECT_COLORS.length]!,
  );
}
