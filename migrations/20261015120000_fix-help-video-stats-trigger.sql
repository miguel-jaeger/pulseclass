-- Fix update_help_video_stats trigger: it previously only recalculated the
-- NEW category on UPDATE, leaving the OLD category with a stale count when a
-- video changed category. Recalculate every category from the actual rows on
-- every write, and drop counts for categories that no longer have videos.
CREATE OR REPLACE FUNCTION public.update_help_video_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM help_video_stats
  WHERE category NOT IN (SELECT DISTINCT category FROM help_videos);

  INSERT INTO help_video_stats (category, video_count, updated_at)
  SELECT category, count(*), now()
  FROM help_videos
  GROUP BY category
  ON CONFLICT (category) DO UPDATE SET
    video_count = EXCLUDED.video_count,
    updated_at = now();

  RETURN NULL;
END;
$$;

-- Recalculate current counters to clear any stale values.
INSERT INTO help_video_stats (category, video_count, updated_at)
SELECT category, count(*), now()
FROM help_videos
GROUP BY category
ON CONFLICT (category) DO UPDATE SET
  video_count = EXCLUDED.video_count,
  updated_at = now();
