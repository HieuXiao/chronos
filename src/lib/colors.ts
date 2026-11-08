export const PROJECT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#eab308",
  "#14b8a6",
  "#ef4444",
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

export function projectColor(color: string | null | undefined): string {
  return color ?? DEFAULT_PROJECT_COLOR;
}
