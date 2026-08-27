-- Tabla de videos de ayuda
CREATE TABLE IF NOT EXISTS help_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  youtube_code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de comentarios de videos de ayuda
CREATE TABLE IF NOT EXISTS help_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES help_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_comments_video_id ON help_comments(video_id);

ALTER TABLE help_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_comments ENABLE ROW LEVEL SECURITY;

-- RLS help_videos
CREATE POLICY "Authenticated users can view help videos" ON help_videos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert help videos" ON help_videos
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can update help videos" ON help_videos
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can delete help videos" ON help_videos
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- RLS help_comments
CREATE POLICY "Authenticated users can view help comments" ON help_comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert own help comment" ON help_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own help comments" ON help_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can update any help comment" ON help_comments
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can delete own help comments" ON help_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can delete any help comment" ON help_comments
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');
