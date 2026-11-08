-- Move projects onto the unified, Notion-toned palette. Each old colour goes
-- to the new colour of the closest hue (one-to-one, so no two projects that
-- differed before end up sharing a colour). Custom colours are kept.
UPDATE projects
SET color = CASE lower(color)
    WHEN '#3987e5' THEN '#2f7dc4'
    WHEN '#d95926' THEN '#d2691e'
    WHEN '#199e70' THEN '#2e9e8a'
    WHEN '#c98500' THEN '#a9791f'
    WHEN '#d55181' THEN '#d45a9c'
    WHEN '#008300' THEN '#237a4b'
    WHEN '#9085e9' THEN '#9a6fc4'
    WHEN '#e66767' THEN '#c63f38'
    WHEN '#0891b2' THEN '#00939c'
    WHEN '#7c3aed' THEN '#7b5cc2'
    WHEN '#be123c' THEN '#c2566b'
    WHEN '#65a30d' THEN '#7e8c2a'
    WHEN '#92400e' THEN '#a8602f'
    WHEN '#64748b' THEN '#5c8a3a'
    WHEN '#c026d3' THEN '#b04a7f'
    WHEN '#4f46e5' THEN '#4a6bc0'
    ELSE color
END
WHERE color IS NOT NULL;
