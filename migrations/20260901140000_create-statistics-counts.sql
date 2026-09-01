-- ============================================================
-- STATISTICS_COUNTS: cached comment/suggestion totals
-- ============================================================

CREATE TABLE IF NOT EXISTS statistics_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_comments INTEGER NOT NULL DEFAULT 0,
  total_suggestions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE statistics_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view statistics counts" ON statistics_counts;
DROP POLICY IF EXISTS "System can manage statistics counts" ON statistics_counts;

CREATE POLICY "Authenticated users can view statistics counts" ON statistics_counts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage statistics counts" ON statistics_counts
  FOR ALL USING (true);

-- ============================================================
-- FUNCTIONS to update counts
-- ============================================================

CREATE OR REPLACE FUNCTION update_statistics_on_rating_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO statistics_counts (total_comments, total_suggestions, updated_at)
    VALUES (
      CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN 1 ELSE 0 END,
      CASE WHEN NEW.suggestion IS NOT NULL AND NEW.suggestion <> '' THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_comments = statistics_counts.total_comments + CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN 1 ELSE 0 END,
      total_suggestions = statistics_counts.total_suggestions + CASE WHEN NEW.suggestion IS NOT NULL AND NEW.suggestion <> '' THEN 1 ELSE 0 END,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO statistics_counts (total_comments, total_suggestions, updated_at)
    VALUES (
      CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN 1 ELSE 0 END,
      CASE WHEN NEW.suggestion IS NOT NULL AND NEW.suggestion <> '' THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_comments = statistics_counts.total_comments
        + CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN 1 ELSE 0 END
        - CASE WHEN OLD.comment IS NOT NULL AND OLD.comment <> '' THEN 1 ELSE 0 END,
      total_suggestions = statistics_counts.total_suggestions
        + CASE WHEN NEW.suggestion IS NOT NULL AND NEW.suggestion <> '' THEN 1 ELSE 0 END
        - CASE WHEN OLD.suggestion IS NOT NULL AND OLD.suggestion <> '' THEN 1 ELSE 0 END,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO statistics_counts (total_comments, total_suggestions, updated_at)
    VALUES (
      CASE WHEN OLD.comment IS NOT NULL AND OLD.comment <> '' THEN 1 ELSE 0 END,
      CASE WHEN OLD.suggestion IS NOT NULL AND OLD.suggestion <> '' THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_comments = statistics_counts.total_comments - CASE WHEN OLD.comment IS NOT NULL AND OLD.comment <> '' THEN 1 ELSE 0 END,
      total_suggestions = statistics_counts.total_suggestions - CASE WHEN OLD.suggestion IS NOT NULL AND OLD.suggestion <> '' THEN 1 ELSE 0 END,
      updated_at = now();
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_rating_statistics_change ON ratings;
CREATE TRIGGER on_rating_statistics_change
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_statistics_on_rating_change();

-- ============================================================
-- FUNCTION to populate initial counts (called once via RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION init_statistics_counts()
RETURNS VOID AS $$
BEGIN
  INSERT INTO statistics_counts (id, total_comments, total_suggestions, updated_at)
  SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    COALESCE(c.cnt, 0),
    COALESCE(s.cnt, 0),
    now()
  FROM
    (SELECT COUNT(*) AS cnt FROM ratings WHERE comment IS NOT NULL AND comment <> '') c,
    (SELECT COUNT(*) AS cnt FROM ratings WHERE suggestion IS NOT NULL AND suggestion <> '') s
  ON CONFLICT (id) DO UPDATE SET
    total_comments = EXCLUDED.total_comments,
    total_suggestions = EXCLUDED.total_suggestions,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
