-- Order of the project cards on the home page, set by drag and drop.
-- Existing projects keep the order they were shown in (creation order).
ALTER TABLE projects ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
UPDATE projects SET order_index = id;
