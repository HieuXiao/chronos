import { getDb } from "@/db/client";
import { diffSec, nowUtc } from "@/lib/time";
import type {
  Id,
  IsoUtc,
  NewManualSession,
  Session,
  SessionFilter,
  SessionPatch,
  SessionSpan,
} from "@/types";
import { expectRow, first, toSession, toSessionSpan, type SessionRow } from "./rows";

export async function listSessions(filter?: SessionFilter): Promise<Session[]> {
  const db = await getDb();
  const where: string[] = [];
  const values: unknown[] = [];
  if (filter?.projectId !== undefined) {
    values.push(filter.projectId);
    where.push(`project_id = $${values.length}`);
  }
  if (filter?.from !== undefined) {
    values.push(filter.from);
    where.push(`(ended_at IS NULL OR ended_at > $${values.length})`);
  }
  if (filter?.to !== undefined) {
    values.push(filter.to);
    where.push(`started_at < $${values.length}`);
  }
  let sql = "SELECT * FROM sessions";
  if (where.length > 0) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY started_at DESC";
  if (filter?.limit !== undefined) {
    values.push(filter.limit);
    sql += ` LIMIT $${values.length}`;
  }
  const rows = await db.select<SessionRow[]>(sql, values);
  return rows.map(toSession);
}

/** Start/end of every session, oldest first; input for all statistics. */
export async function listSessionSpans(): Promise<SessionSpan[]> {
  const db = await getDb();
  const rows = await db.select<Pick<SessionRow, "id" | "project_id" | "started_at" | "ended_at">[]>(
    "SELECT id, project_id, started_at, ended_at FROM sessions ORDER BY started_at",
  );
  return rows.map(toSessionSpan);
}

export async function getSession(id: Id): Promise<Session | null> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>("SELECT * FROM sessions WHERE id = $1", [id]);
  const row = first(rows);
  return row ? toSession(row) : null;
}

/** The running session (`endedAt` NULL), if any. A unique index guarantees at most one. */
export async function getRunningSession(): Promise<Session | null> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    "SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
  );
  const row = first(rows);
  return row ? toSession(row) : null;
}

/** Ends the running session at `endedAt`. Returns the stopped session, or null if none was running. */
export async function stopRunningSession(endedAt: IsoUtc = nowUtc()): Promise<Session | null> {
  const running = await getRunningSession();
  if (!running) return null;
  return stopSession(running.id, endedAt);
}

export interface StartSessionResult {
  started: Session;
  /** The session that was running before and got stopped to start this one. */
  stopped: Session | null;
}

/** Stops whatever is running, then starts a new timer session for `projectId`. */
export async function startSession(projectId: Id, startedAt: IsoUtc = nowUtc()): Promise<StartSessionResult> {
  const stopped = await stopRunningSession(startedAt);
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    `INSERT INTO sessions (project_id, started_at, ended_at, duration_sec, note, source)
     VALUES ($1, $2, NULL, NULL, NULL, 'timer')
     RETURNING *`,
    [projectId, startedAt],
  );
  return { started: toSession(expectRow(rows, "session vừa tạo")), stopped };
}

export async function stopSession(id: Id, endedAt: IsoUtc = nowUtc()): Promise<Session> {
  const session = await getSession(id);
  if (!session) throw new Error("Không tìm thấy session");
  // Never end before it started (clock changes, edited start time).
  const end = Date.parse(endedAt) < Date.parse(session.startedAt) ? session.startedAt : endedAt;
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    "UPDATE sessions SET ended_at = $1, duration_sec = $2 WHERE id = $3 RETURNING *",
    [end, diffSec(session.startedAt, end), id],
  );
  return toSession(expectRow(rows, "session"));
}

/**
 * Removes an idle gap [idleFrom, resumeAt) from the running session:
 * the current session ends at `idleFrom` and a new one starts at `resumeAt`.
 * Returns the session that is running afterwards.
 */
export async function discardIdleFromRunning(idleFrom: IsoUtc, resumeAt: IsoUtc): Promise<Session | null> {
  const running = await getRunningSession();
  if (!running) return null;
  const db = await getDb();

  if (Date.parse(idleFrom) <= Date.parse(running.startedAt)) {
    // Idle since before the timer started: just move the start forward.
    const rows = await db.select<SessionRow[]>(
      "UPDATE sessions SET started_at = $1 WHERE id = $2 RETURNING *",
      [resumeAt, running.id],
    );
    return toSession(expectRow(rows, "session"));
  }

  await stopSession(running.id, idleFrom);
  const { started } = await startSession(running.projectId, resumeAt);
  return started;
}

export async function createManualSession(input: NewManualSession): Promise<Session> {
  assertValidRange(input.startedAt, input.endedAt);
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    `INSERT INTO sessions (project_id, started_at, ended_at, duration_sec, note, source)
     VALUES ($1, $2, $3, $4, $5, 'manual')
     RETURNING *`,
    [
      input.projectId,
      input.startedAt,
      input.endedAt,
      diffSec(input.startedAt, input.endedAt),
      normalizeNote(input.note),
    ],
  );
  return toSession(expectRow(rows, "session vừa tạo"));
}

export async function updateSession(id: Id, patch: SessionPatch): Promise<Session> {
  const current = await getSession(id);
  if (!current) throw new Error("Không tìm thấy session");
  const next = { ...current, ...patch };
  if (next.endedAt !== null) assertValidRange(next.startedAt, next.endedAt);
  const duration = next.endedAt === null ? null : diffSec(next.startedAt, next.endedAt);

  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    `UPDATE sessions
     SET project_id = $1, started_at = $2, ended_at = $3, duration_sec = $4, note = $5
     WHERE id = $6
     RETURNING *`,
    [next.projectId, next.startedAt, next.endedAt, duration, normalizeNote(next.note), id],
  );
  return toSession(expectRow(rows, "session"));
}

export async function setSessionNote(id: Id, note: string | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sessions SET note = $1 WHERE id = $2", [normalizeNote(note), id]);
}

export async function deleteSession(id: Id): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}

function assertValidRange(startedAt: IsoUtc, endedAt: IsoUtc): void {
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) throw new Error("Thời gian không hợp lệ");
  if (end <= start) throw new Error("Thời điểm kết thúc phải sau thời điểm bắt đầu");
  if (end > Date.now() + 60_000) throw new Error("Không thể kết thúc ở tương lai");
}

function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}
