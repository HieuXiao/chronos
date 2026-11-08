-- Why the project exists, shown at the top of its sidebar.
ALTER TABLE projects ADD COLUMN purpose TEXT;

-- Links to related documents: web pages or local files/folders.
CREATE TABLE project_links (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    target      TEXT    NOT NULL,  -- URL or absolute path
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL
);
CREATE INDEX idx_project_links_project_id ON project_links(project_id);
