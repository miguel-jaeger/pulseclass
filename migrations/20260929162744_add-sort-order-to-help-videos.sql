-- Orden de visualizacion de los videos de ayuda (ascendente).
ALTER TABLE help_videos
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: numerar los videos existentes segun su orden actual (created_at DESC).
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC, id DESC) - 1 AS pos
  FROM help_videos
)
UPDATE help_videos h
SET sort_order = ranked.pos
FROM ranked
WHERE h.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_help_videos_sort_order ON help_videos(sort_order);