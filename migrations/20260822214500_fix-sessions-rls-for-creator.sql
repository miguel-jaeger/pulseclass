-- Fix sessions RLS: also allow viewing sessions you created
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Teachers can view sessions in their courses" ON sessions;
DROP POLICY IF EXISTS "Students can view sessions in their courses" ON sessions;

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
