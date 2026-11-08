-- Move projects still on the first-release colour set (or no colour) onto the
-- colour-blind-safe palette, one slot per project in creation order, so that
-- projects are distinguishable in the stacked chart. Custom colours are kept.
UPDATE projects
SET color = CASE (SELECT COUNT(*) FROM projects AS p2 WHERE p2.id < projects.id) % 8
    WHEN 0 THEN '#3987e5'
    WHEN 1 THEN '#d95926'
    WHEN 2 THEN '#199e70'
    WHEN 3 THEN '#c98500'
    WHEN 4 THEN '#d55181'
    WHEN 5 THEN '#008300'
    WHEN 6 THEN '#9085e9'
    ELSE '#e66767'
END
WHERE color IS NULL
   OR color IN ('#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899', '#eab308', '#14b8a6', '#ef4444');
