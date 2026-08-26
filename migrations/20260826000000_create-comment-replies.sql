CREATE TABLE IF NOT EXISTS comment_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating_id UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_replies_rating_id ON comment_replies(rating_id);

ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course members can view replies" ON comment_replies;
DROP POLICY IF EXISTS "Course members can insert replies" ON comment_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON comment_replies;

CREATE POLICY "Course members can view replies" ON comment_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY "Course members can insert replies" ON comment_replies
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own replies" ON comment_replies
  FOR DELETE USING (auth.uid() = user_id);
