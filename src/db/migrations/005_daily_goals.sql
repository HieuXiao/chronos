-- Daily goals, per-project daily minimums and reasons for missed goals.

-- Goal history: the goal on day D is the row with the latest effective_from <= D,
-- so changing a goal never rewrites how past days are judged.
-- project_id NULL = goal for the whole day; minutes 0 = no goal.
CREATE TABLE daily_goals (
    id             INTEGER PRIMARY KEY,
    project_id     INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    minutes        INTEGER NOT NULL,
    effective_from TEXT    NOT NULL  -- local date YYYY-MM-DD
);
CREATE UNIQUE INDEX ux_daily_goals ON daily_goals(COALESCE(project_id, 0), effective_from);

CREATE TABLE miss_labels (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT    NOT NULL
);

-- One reason per (day, project); project_id NULL = the whole-day goal.
CREATE TABLE miss_reasons (
    id         INTEGER PRIMARY KEY,
    day        TEXT    NOT NULL,     -- local date YYYY-MM-DD
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    note       TEXT,
    updated_at TEXT    NOT NULL
);
CREATE UNIQUE INDEX ux_miss_reasons ON miss_reasons(day, COALESCE(project_id, 0));

CREATE TABLE miss_reason_labels (
    reason_id INTEGER NOT NULL REFERENCES miss_reasons(id) ON DELETE CASCADE,
    label_id  INTEGER NOT NULL REFERENCES miss_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (reason_id, label_id)
);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

INSERT INTO miss_labels (name, created_at) VALUES
    ('Lướt mạng xã hội',        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Mất tập trung',           strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Ngủ dậy muộn',            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Việc đột xuất',           strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Mệt / ốm',                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Đi chơi',                 strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Ước lượng sai thời gian', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
