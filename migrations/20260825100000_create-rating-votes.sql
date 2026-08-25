-- ============================================================
-- RATING_VOTES: like/dislike on ratings (comments & suggestions)
-- ============================================================

CREATE TABLE IF NOT EXISTS rating_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating_id UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rating_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rating_votes_rating_id ON rating_votes(rating_id);
CREATE INDEX IF NOT EXISTS idx_rating_votes_user_id ON rating_votes(user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE rating_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view votes for accessible ratings" ON rating_votes;
DROP POLICY IF EXISTS "Users can insert own vote" ON rating_votes;
DROP POLICY IF EXISTS "Users can update own vote" ON rating_votes;
DROP POLICY IF EXISTS "Users can delete own vote" ON rating_votes;

CREATE POLICY "Users can view votes for accessible ratings" ON rating_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY "Users can insert own vote" ON rating_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vote" ON rating_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vote" ON rating_votes
  FOR DELETE USING (auth.uid() = user_id);
