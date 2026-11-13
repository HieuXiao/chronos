-- "What was done" lives in one place: the day report of each project
-- (miss_reasons rows with a project_id). Notes written when stopping a timer
-- used to be kept on the session; move them into that day's report as
-- "- note" lines (day = local day the session started), then clear them.

CREATE TEMP TABLE session_note_days AS
    SELECT day, project_id, group_concat('- ' || note, char(10)) AS lines
      FROM (SELECT date(started_at, 'localtime') AS day, project_id, trim(note) AS note,
                   min(started_at) AS first_at
              FROM sessions
             WHERE note IS NOT NULL AND trim(note) <> ''
             GROUP BY 1, 2, 3
             ORDER BY first_at)
     GROUP BY day, project_id;

-- Days that already have a report: append the lines that are not in it yet.
UPDATE miss_reasons
   SET note = trim(coalesce(note, '') || char(10) || (
           SELECT n.lines FROM session_note_days n
            WHERE n.day = miss_reasons.day AND n.project_id = miss_reasons.project_id)),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
 WHERE group_id IS NULL
   AND project_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM session_note_days n
                WHERE n.day = miss_reasons.day AND n.project_id = miss_reasons.project_id
                  AND instr(coalesce(miss_reasons.note, ''), n.lines) = 0);

-- Days without a report yet.
INSERT INTO miss_reasons (day, project_id, note, updated_at)
    SELECT n.day, n.project_id, n.lines, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      FROM session_note_days n
     WHERE NOT EXISTS (SELECT 1 FROM miss_reasons r
                        WHERE r.day = n.day AND r.project_id = n.project_id AND r.group_id IS NULL);

UPDATE sessions SET note = NULL WHERE note IS NOT NULL;
DROP TABLE session_note_days;
