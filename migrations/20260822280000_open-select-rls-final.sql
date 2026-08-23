-- ============================================================
-- FINAL FIX: Open SELECT on all tables for classroom app
-- ============================================================

-- PROFILES: drop ALL policies, recreate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Students can view course-mates profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin can insert profiles" ON profiles FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update profiles" ON profiles FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- COURSES: drop ALL policies, recreate SELECT only
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Teachers can view their courses" ON courses;
DROP POLICY IF EXISTS "Students can view their courses" ON courses;
DROP POLICY IF EXISTS "Admin and teachers can create courses" ON courses;
DROP POLICY IF EXISTS "Admin can update courses" ON courses;
DROP POLICY IF EXISTS "Admin can delete courses" ON courses;

CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Admin and teachers can create courses" ON courses FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher'));
CREATE POLICY "Admin can update courses" ON courses FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete courses" ON courses FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- SESSIONS: drop ALL policies, recreate SELECT only
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Teachers can view their sessions" ON sessions;
DROP POLICY IF EXISTS "Students can view sessions in their courses" ON sessions;
DROP POLICY IF EXISTS "Admin and teachers can create sessions" ON sessions;
DROP POLICY IF EXISTS "Admin can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admin can delete sessions" ON sessions;

CREATE POLICY "Anyone can view sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Admin and teachers can create sessions" ON sessions FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher'));
CREATE POLICY "Admin can update sessions" ON sessions FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete sessions" ON sessions FOR DELETE USING (get_user_role(auth.uid()) = 'admin');
