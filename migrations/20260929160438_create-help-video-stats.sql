-- Cache de conteos de videos de ayuda por categoria.
-- Se actualiza solo ante INSERT/UPDATE/DELETE en help_videos (via trigger).

CREATE TABLE IF NOT EXISTS help_video_stats (
  category TEXT PRIMARY KEY CHECK (category IN ('platform', 'course')),
  video_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE help_video_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS help_video_stats_view ON help_video_stats;
CREATE POLICY help_video_stats_view ON help_video_stats
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS help_video_stats_system ON help_video_stats;
CREATE POLICY help_video_stats_system ON help_video_stats
  FOR ALL USING (true);

-- Recalculate the count of the affected category on every write to help_videos.
CREATE OR REPLACE FUNCTION public.update_help_video_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_category := OLD.category;
  ELSE
    v_category := NEW.category;
  END IF;

  INSERT INTO help_video_stats (category, video_count, updated_at)
  VALUES (v_category, (SELECT count(*) FROM help_videos WHERE category = v_category), now())
  ON CONFLICT (category) DO UPDATE SET
    video_count = EXCLUDED.video_count,
    updated_at = now();

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_help_video_stats_change ON help_videos;
CREATE TRIGGER on_help_video_stats_change
  AFTER INSERT OR UPDATE OR DELETE ON help_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_help_video_stats();

-- Backfill current counters.
INSERT INTO help_video_stats (category, video_count, updated_at)
SELECT category, count(*) AS video_count, now()
FROM help_videos
GROUP BY category
ON CONFLICT (category) DO UPDATE SET
  video_count = EXCLUDED.video_count,
  updated_at = now();