-- Re-number existing help_videos to guarantee unique, contiguous sort_order
-- values. New videos were being inserted with the default 0, producing ties
-- that made reordering a no-op.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY sort_order ASC, created_at DESC, id ASC) - 1 AS pos
  FROM help_videos
)
UPDATE help_videos h
SET sort_order = ranked.pos
FROM ranked
WHERE h.id = ranked.id;
