-- Cache per-course rating aggregates so the dashboard does not have to read all ratings.
-- Values are refreshed only when a rating is inserted/updated/deleted.

CREATE TABLE IF NOT EXISTS course_rating_stats (
  course_id UUID PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
  rating_count INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE course_rating_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_rating_stats_view ON course_rating_stats;
CREATE POLICY course_rating_stats_view ON course_rating_stats
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS course_rating_stats_system ON course_rating_stats;
CREATE POLICY course_rating_stats_system ON course_rating_stats
  FOR ALL USING (true);

-- Recompute aggregates for the course of the affected session.
CREATE OR REPLACE FUNCTION public.update_course_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_session_id := OLD.session_id;
  ELSE
    v_session_id := NEW.session_id;
  END IF;

  INSERT INTO course_rating_stats (course_id, rating_count, avg_score, updated_at)
  SELECT s.course_id,
         count(r.id),
         COALESCE(round(avg(r.score), 2), 0),
         now()
  FROM sessions s
  LEFT JOIN ratings r ON r.session_id = s.id
  WHERE s.id = v_session_id
  GROUP BY s.course_id
  ON CONFLICT (course_id) DO UPDATE SET
    rating_count = EXCLUDED.rating_count,
    avg_score = EXCLUDED.avg_score,
    updated_at = now();

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_course_stats_change ON ratings;
CREATE TRIGGER on_rating_course_stats_change
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_rating_stats();

-- Backfill current data
INSERT INTO course_rating_stats (course_id, rating_count, avg_score, updated_at)
SELECT c.id,
       count(r.id),
       COALESCE(round(avg(r.score), 2), 0),
       now()
FROM courses c
LEFT JOIN sessions s ON s.course_id = c.id
LEFT JOIN ratings r ON r.session_id = s.id
GROUP BY c.id
ON CONFLICT (course_id) DO UPDATE SET
  rating_count = EXCLUDED.rating_count,
  avg_score = EXCLUDED.avg_score,
  updated_at = now();