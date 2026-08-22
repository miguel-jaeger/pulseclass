-- Restrict courses SELECT: admins see all, teachers see created+joined, students see joined
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;

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

-- Restrict sessions SELECT: admins see all, teachers/student see only sessions in accessible courses
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;

CREATE POLICY "Admins can view all sessions" ON sessions
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Teachers can view sessions in their courses" ON sessions
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'teacher'
    AND (
      EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM course_members WHERE course_id = sessions.course_id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Students can view sessions in their courses" ON sessions
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'student'
    AND EXISTS (SELECT 1 FROM course_members WHERE course_id = sessions.course_id AND user_id = auth.uid())
  );
