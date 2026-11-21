import { getDb } from "@/db/client";
import { diffSec, nowUtc } from "@/lib/time";
import type {
  Id,
  IsoUtc,
  Session,
  SessionFilter,
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

