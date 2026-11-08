-- At most one running session (ended_at IS NULL) at any time.
CREATE UNIQUE INDEX idx_sessions_single_running
    ON sessions ((ended_at IS NULL))
    WHERE ended_at IS NULL;

CREATE INDEX idx_todos_project_id ON todos(project_id);
