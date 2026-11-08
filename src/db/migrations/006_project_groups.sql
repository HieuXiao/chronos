-- Project groups: several projects can be gathered under one group, which can
-- carry its own daily goal and missed-goal reasons.

CREATE TABLE project_groups (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    color       TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL
);

-- Deleting a group leaves its projects ungrouped.
ALTER TABLE projects ADD COLUMN group_id INTEGER REFERENCES project_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_projects_group_id ON projects(group_id);

-- A goal / reason now targets the whole day (both NULL), a project, or a group.
ALTER TABLE daily_goals ADD COLUMN group_id INTEGER REFERENCES project_groups(id) ON DELETE CASCADE;
DROP INDEX ux_daily_goals;
CREATE UNIQUE INDEX ux_daily_goals
    ON daily_goals(COALESCE(project_id, 0), COALESCE(group_id, 0), effective_from);

ALTER TABLE miss_reasons ADD COLUMN group_id INTEGER REFERENCES project_groups(id) ON DELETE CASCADE;
DROP INDEX ux_miss_reasons;
CREATE UNIQUE INDEX ux_miss_reasons
    ON miss_reasons(day, COALESCE(project_id, 0), COALESCE(group_id, 0));
