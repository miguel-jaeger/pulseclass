-- ============================================================
-- CONSOLIDATED RLS MIGRATION
-- Run this SINGLE migration to apply all RLS policies
-- ============================================================

-- Helper function (create if not exists)
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS 'SELECT role FROM profiles WHERE user_id = uid LIMIT 1';

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Students can view course-mates profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of course members" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Teachers and admins can view all profiles" ON profiles
  FOR SELECT USING (get_user_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Students can view course-mates profiles" ON profiles
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'student'
    AND EXISTS (
      SELECT 1 FROM course_members cm1
      JOIN course_members cm2 ON cm2.course_id = cm1.course_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id
    )
  );

CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can update profiles" ON profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- COURSES
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Teachers can view their courses" ON courses;
DROP POLICY IF EXISTS "Students can view their courses" ON courses;
DROP POLICY IF EXISTS "Admin and teachers can create courses" ON courses;
DROP POLICY IF EXISTS "Admin can update courses" ON courses;
DROP POLICY IF EXISTS "Admin can delete courses" ON courses;

CREATE POLICY "Admins can view all courses" ON courses
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Teachers can view their courses" ON courses
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'teacher'
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM course_members WHERE course_id = id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Students can view their courses" ON courses
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'student'
    AND EXISTS (SELECT 1 FROM course_members WHERE course_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Admin and teachers can create courses" ON courses
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admin can update courses" ON courses
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can delete courses" ON courses
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- COURSE_MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view course members" ON course_members;
DROP POLICY IF EXISTS "Admin can manage course members" ON course_members;
DROP POLICY IF EXISTS "Admin and teachers can manage course members" ON course_members;
DROP POLICY IF EXISTS "Admin and teachers can add course members" ON course_members;
DROP POLICY IF EXISTS "Admin and teachers can remove course members" ON course_members;

CREATE POLICY "Anyone can view course members" ON course_members
  FOR SELECT USING (true);

CREATE POLICY "Admin and teachers can add course members" ON course_members
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid())
  );

CREATE POLICY "Admin and teachers can remove course members" ON course_members
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'admin'
    OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid())
  );

-- ============================================================
-- SESSIONS
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Teachers can view their sessions" ON sessions;
DROP POLICY IF EXISTS "Teachers can view sessions in their courses" ON sessions;
DROP POLICY IF EXISTS "Students can view sessions in their courses" ON sessions;
DROP POLICY IF EXISTS "Admin and teachers can create sessions" ON sessions;
DROP POLICY IF EXISTS "Admin can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admin can delete sessions" ON sessions;

CREATE POLICY "Admins can view all sessions" ON sessions
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Teachers can view their sessions" ON sessions
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'teacher'
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM course_members WHERE course_id = sessions.course_id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Students can view sessions in their courses" ON sessions
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'student'
    AND EXISTS (SELECT 1 FROM course_members WHERE course_id = sessions.course_id AND user_id = auth.uid())
  );

CREATE POLICY "Admin and teachers can create sessions" ON sessions
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admin can update sessions" ON sessions
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can delete sessions" ON sessions
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- RATINGS
-- ============================================================
DROP POLICY IF EXISTS "Students can view ratings for sessions in their courses" ON ratings;
DROP POLICY IF EXISTS "Students can insert own rating" ON ratings;
DROP POLICY IF EXISTS "Students can update own rating" ON ratings;
DROP POLICY IF EXISTS "Students can delete own rating" ON ratings;

CREATE POLICY "Users can view ratings for accessible sessions" ON ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE s.id = session_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY "Students can insert own rating" ON ratings
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM sessions s
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE s.id = session_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own rating" ON ratings
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own rating" ON ratings
  FOR DELETE USING (auth.uid() = student_id);

-- ============================================================
-- COMMENT_STARS
-- ============================================================
DROP POLICY IF EXISTS "Students can view stars for ratings in their courses" ON comment_stars;
DROP POLICY IF EXISTS "Students can insert own star" ON comment_stars;
DROP POLICY IF EXISTS "Students can delete own star" ON comment_stars;

CREATE POLICY "Users can view stars for accessible ratings" ON comment_stars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ratings r
      JOIN sessions s ON s.id = r.session_id
      JOIN course_members cm ON cm.course_id = s.course_id
      WHERE r.id = rating_id AND cm.user_id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY "Students can insert own star" ON comment_stars
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own star" ON comment_stars
  FOR DELETE USING (auth.uid() = student_id);
