-- ============================================================
-- COURSE_STATS: cached session/member counts for each course
-- ============================================================

CREATE TABLE IF NOT EXISTS course_stats (
  course_id UUID PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
  session_count INTEGER NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_course_stats_course_id ON course_stats(course_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE course_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view course stats" ON course_stats;
DROP POLICY IF EXISTS "System can manage course stats" ON course_stats;

CREATE POLICY "Authenticated users can view course stats" ON course_stats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage course stats" ON course_stats
  FOR ALL USING (true);

-- ============================================================
-- FUNCTIONS to update counts
-- ============================================================

CREATE OR REPLACE FUNCTION update_course_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO course_stats (course_id, session_count, member_count, updated_at)
    VALUES (NEW.course_id, 1, 0, now())
    ON CONFLICT (course_id) DO UPDATE SET
      session_count = course_stats.session_count + 1,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_stats SET
      session_count = GREATEST(session_count - 1, 0),
      updated_at = now()
    WHERE course_id = OLD.course_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_course_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO course_stats (course_id, session_count, member_count, updated_at)
    VALUES (NEW.course_id, 0, 1, now())
    ON CONFLICT (course_id) DO UPDATE SET
      member_count = course_stats.member_count + 1,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_stats SET
      member_count = GREATEST(member_count - 1, 0),
      updated_at = now()
    WHERE course_id = OLD.course_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_session_insert_delete ON sessions;
CREATE TRIGGER on_session_insert_delete
  AFTER INSERT OR DELETE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_course_session_count();

DROP TRIGGER IF EXISTS on_member_insert_delete ON course_members;
CREATE TRIGGER on_member_insert_delete
  AFTER INSERT OR DELETE ON course_members
  FOR EACH ROW
  EXECUTE FUNCTION update_course_member_count();

-- ============================================================
-- Populate initial stats for existing courses
-- ============================================================

INSERT INTO course_stats (course_id, session_count, member_count, updated_at)
SELECT
  c.id,
  COALESCE(s.cnt, 0) AS session_count,
  COALESCE(m.cnt, 0) AS member_count,
  now()
FROM courses c
LEFT JOIN (
  SELECT course_id, COUNT(*) AS cnt
  FROM sessions
  GROUP BY course_id
) s ON s.course_id = c.id
LEFT JOIN (
  SELECT course_id, COUNT(*) AS cnt
  FROM course_members
  GROUP BY course_id
) m ON m.course_id = c.id
ON CONFLICT (course_id) DO UPDATE SET
  session_count = EXCLUDED.session_count,
  member_count = EXCLUDED.member_count,
  updated_at = now();
