/** Adds `line` as a "- line" bullet to a day's "Đã làm gì" text, unless it is already there. */
export function appendLine(note: string, line: string): string {
  const clean = line.trim();
  const current = note.trimEnd();
  if (!clean) return current;
  const bullet = `- ${clean}`;
  if (current.split("\n").some((l) => l.trim() === bullet || l.trim() === clean)) return current;
  return current ? `${current}\n${bullet}` : bullet;
}
