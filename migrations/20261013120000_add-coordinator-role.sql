-- Nuevo rol 'coordinator' (Coordinador)
-- Permisos: ver estadísticas de cualquier curso, gestionar profesores,
-- y crear/editar/eliminar sugerencias de estudio (videos category='course').

-- 1. Permitir el rol en profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'coordinator', 'teacher', 'student'));

-- 2. Profiles: el coordinador solo puede crear/editar/eliminar profesores
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
CREATE POLICY "Admin can insert profiles" ON profiles FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role = 'teacher')
  );

DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
CREATE POLICY "Admin can update profiles" ON profiles FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role = 'teacher')
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role = 'teacher')
  );

DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
CREATE POLICY "Admin can delete profiles" ON profiles FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role = 'teacher')
  );

-- 3. Ratings: el coordinador ve las de cualquier curso (estadísticas)
DROP POLICY IF EXISTS "Users can view ratings for accessible sessions" ON ratings;
CREATE POLICY "Users can view ratings for accessible sessions" ON ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE s.id = session_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher', 'coordinator')
  );

-- 4. comment_stars: el coordinador ve todas
DROP POLICY IF EXISTS "Users can view stars for accessible ratings" ON comment_stars;
CREATE POLICY "Users can view stars for accessible ratings" ON comment_stars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher', 'coordinator')
  );

-- 5. comment_replies: el coordinador ve todas
DROP POLICY IF EXISTS "Course members can view replies" ON comment_replies;
CREATE POLICY "Course members can view replies" ON comment_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher', 'coordinator')
  );

-- 6. help_videos: admin todo; coordinador y profesor solo category='course' (Sugerencia de estudio)
DROP POLICY IF EXISTS "Admin can insert help videos" ON help_videos;
DROP POLICY IF EXISTS "Admin can update help videos" ON help_videos;
DROP POLICY IF EXISTS "Admin can delete help videos" ON help_videos;

CREATE POLICY "Admins and educators can insert help videos" ON help_videos
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) IN ('coordinator', 'teacher') AND category = 'course')
  );

CREATE POLICY "Admins and educators can update help videos" ON help_videos
  FOR UPDATE USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) IN ('coordinator', 'teacher') AND category = 'course')
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) IN ('coordinator', 'teacher') AND category = 'course')
  );

CREATE POLICY "Admins and educators can delete help videos" ON help_videos
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) IN ('coordinator', 'teacher') AND category = 'course')
  );
