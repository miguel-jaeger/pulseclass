-- Fix profiles RLS: teachers/admins see all profiles, students see course-mates
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of course members" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

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
