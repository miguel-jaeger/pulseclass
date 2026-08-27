-- Tabla de likes/dislikes para videos y comentarios
CREATE TABLE IF NOT EXISTS help_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('video', 'comment', 'reply')),
  target_id UUID NOT NULL,
  value SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- Tabla de respuestas a comentarios
CREATE TABLE IF NOT EXISTS help_comment_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES help_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_likes_target ON help_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_help_comment_replies_comment_id ON help_comment_replies(comment_id);

ALTER TABLE help_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS help_likes
CREATE POLICY "Authenticated users can view likes" ON help_likes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own like" ON help_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own like" ON help_likes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own like" ON help_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS help_comment_replies
CREATE POLICY "Authenticated users can view replies" ON help_comment_replies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert own reply" ON help_comment_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies" ON help_comment_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can update any reply" ON help_comment_replies
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can delete own replies" ON help_comment_replies
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can delete any reply" ON help_comment_replies
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');
