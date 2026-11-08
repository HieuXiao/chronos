-- Chronos initial schema.
-- All timestamps are ISO 8601 UTC strings (e.g. 2026-11-08T03:15:00.000Z).
-- Never store local time in the database; convert at the UI layer.

CREATE TABLE projects (
    id           INTEGER PRIMARY KEY,
    name         TEXT    NOT NULL,
    color        TEXT,
    icon         TEXT,
    target_hours REAL,
    status       TEXT    DEFAULT 'active',
    created_at   TEXT    NOT NULL,
    archived     INTEGER DEFAULT 0
);

CREATE TABLE sessions (
    id           INTEGER PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at   TEXT    NOT NULL,
    ended_at     TEXT,                -- NULL = timer is still running
    duration_sec INTEGER,
    note         TEXT,
    source       TEXT    NOT NULL DEFAULT 'timer'
);

CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

CREATE TABLE todos (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    text        TEXT    NOT NULL,
    done        INTEGER DEFAULT 0,
    order_index INTEGER,
    created_at  TEXT    NOT NULL,
    done_at     TEXT
);

CREATE TABLE notes (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    content    TEXT,
    updated_at TEXT
);
