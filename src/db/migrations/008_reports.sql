-- 1. The unused project status (active/paused/completed): archiving covers it.
ALTER TABLE projects DROP COLUMN status;

-- 2. Group membership history: the group of a project on day D is the row with
--    the latest effective_from <= D (group_id NULL = ungrouped from that day).
CREATE TABLE project_group_history (
    id             INTEGER PRIMARY KEY,
    project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    group_id       INTEGER REFERENCES project_groups(id) ON DELETE SET NULL,
    effective_from TEXT    NOT NULL  -- local date YYYY-MM-DD
);
CREATE UNIQUE INDEX ux_project_group_history ON project_group_history(project_id, effective_from);
-- Current memberships count for all past days.
INSERT INTO project_group_history (project_id, group_id, effective_from)
    SELECT id, group_id, '0000-01-01' FROM projects WHERE group_id IS NOT NULL;

-- 3. Reason labels become a two-level tree (parent → children), each for a
--    missed goal ('miss') or for going well over it ('over'); a label can be
--    shared or belong to one project. Names repeat freely under different parents.
CREATE TABLE reason_labels (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    parent_id   INTEGER REFERENCES reason_labels(id) ON DELETE CASCADE,
    project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL DEFAULT 'miss',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL
);
CREATE INDEX idx_reason_labels_parent ON reason_labels(parent_id);

CREATE TABLE reason_label_links (
    reason_id INTEGER NOT NULL REFERENCES miss_reasons(id) ON DELETE CASCADE,
    label_id  INTEGER NOT NULL REFERENCES reason_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (reason_id, label_id)
);

-- Parents.
INSERT INTO reason_labels (name, kind, order_index, created_at) VALUES
    ('Sức khoẻ',  'miss', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Xao nhãng', 'miss', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Kế hoạch',  'miss', 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Việc ngoài','miss', 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Động lực',  'over', 4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Áp lực',    'over', 5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('Thời gian', 'over', 6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Existing flat labels become children of a fitting parent (unknown ones go under "Kế hoạch").
INSERT INTO reason_labels (id, name, parent_id, kind, order_index, created_at)
    SELECT 1000 + l.id, l.name,
           (SELECT p.id FROM reason_labels p WHERE p.parent_id IS NULL AND p.name =
               CASE l.name
                   WHEN 'Mệt / ốm' THEN 'Sức khoẻ'
                   WHEN 'Ngủ dậy muộn' THEN 'Sức khoẻ'
                   WHEN 'Lướt mạng xã hội' THEN 'Xao nhãng'
                   WHEN 'Mất tập trung' THEN 'Xao nhãng'
                   WHEN 'Việc đột xuất' THEN 'Việc ngoài'
                   WHEN 'Đi chơi' THEN 'Việc ngoài'
                   ELSE 'Kế hoạch'
               END),
           'miss', l.id, l.created_at
      FROM miss_labels l;
INSERT INTO reason_label_links (reason_id, label_id) SELECT reason_id, 1000 + label_id FROM miss_reason_labels;

-- More default children.
INSERT INTO reason_labels (name, parent_id, kind, order_index, created_at)
    SELECT c.name, p.id, p.kind, c.ord, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      FROM (SELECT 'Kế hoạch' AS parent, 'Ưu tiên môn khác' AS name, 10 AS ord
            UNION ALL SELECT 'Động lực', 'Đang hứng thú với nội dung', 0
            UNION ALL SELECT 'Động lực', 'Vào guồng, khó dừng', 1
            UNION ALL SELECT 'Áp lực', 'Sắp đến hạn nộp', 0
            UNION ALL SELECT 'Áp lực', 'Sắp thi', 1
            UNION ALL SELECT 'Thời gian', 'Rảnh nhiều hơn dự kiến', 0
            UNION ALL SELECT 'Thời gian', 'Bù cho hôm trước', 1) c
      JOIN reason_labels p ON p.parent_id IS NULL AND p.name = c.parent;

DROP TABLE miss_reason_labels;
DROP TABLE miss_labels;
