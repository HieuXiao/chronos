import type { Project } from "@/types";

/**
 * Project colors, one unified family: Notion-like muted tones (a touch of
 * grey in every hue) so cards, icons and chart segments sit calmly on the
 * warm-neutral surfaces in light and dark mode. Validated as a categorical
 * palette: all adjacent pairs stay apart for normal and colour-blind vision,
 * and the first eight (taken first by new projects) clear CVD ΔE ≥ 8.
 * A colour in use by an unfinished project can't be picked again
 * (see `takenColors`).
 */
export const PROJECT_COLORS = [
  "#2f7dc4", // blue
  "#d2691e", // orange
  "#7b5cc2", // purple
  "#237a4b", // green
  "#d45a9c", // pink
  "#a9791f", // mustard
  "#00939c", // teal
  "#c63f38", // red
  "#4a6bc0", // indigo
  "#c2566b", // rose
  "#7e8c2a", // olive
  "#b04a7f", // plum
  "#2e9e8a", // jade
  "#a8602f", // brown
  "#9a6fc4", // lavender
  "#5c8a3a", // moss
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

/** Neutral for the folded "Khác" series (not a categorical slot). */
export const OTHER_SERIES_COLOR = "#71717a";

export function projectColor(color: string | null | undefined): string {
  return color ?? DEFAULT_PROJECT_COLOR;
}

/**
 * Colours held by unfinished projects (not archived and below their total
 * hours), mapped to the project's name. `exceptId` is the project being edited.
 */
export function takenColors(
  projects: Project[],
  totalHoursOf: (id: number) => number,
  exceptId?: number,
): Map<string, string> {
  const taken = new Map<string, string>();
  for (const p of projects) {
    if (p.id === exceptId || p.archived || !p.color) continue;
    const finished = p.targetHours != null && totalHoursOf(p.id) >= p.targetHours;
    if (!finished) taken.set(p.color, p.name);
  }
  return taken;
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
