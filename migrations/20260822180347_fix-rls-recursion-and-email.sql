ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS 'SELECT role FROM profiles WHERE user_id = uid LIMIT 1';

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can update profiles" ON profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin and teachers can create courses" ON courses;
DROP POLICY IF EXISTS "Admin can update courses" ON courses;
DROP POLICY IF EXISTS "Admin can delete courses" ON courses;

CREATE POLICY "Admin and teachers can create courses" ON courses
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admin can update courses" ON courses
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can delete courses" ON courses
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin can manage course members" ON course_members;

CREATE POLICY "Admin can manage course members" ON course_members
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin and teachers can create sessions" ON sessions;
DROP POLICY IF EXISTS "Admin can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admin can delete sessions" ON sessions;

CREATE POLICY "Admin and teachers can create sessions" ON sessions
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admin can update sessions" ON sessions
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can delete sessions" ON sessions
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Students can view ratings for sessions in their courses" ON ratings;

CREATE POLICY "Students can view ratings for sessions in their courses" ON ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE s.id = session_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

DROP POLICY IF EXISTS "Students can view stars for ratings in their courses" ON comment_stars;

CREATE POLICY "Students can view stars for ratings in their courses" ON comment_stars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.profile->>'name', NEW.email),
    NEW.email,
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
