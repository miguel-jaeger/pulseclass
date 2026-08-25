-- Fix ratings RLS: teacher can only update/delete in their courses, admin can do all
DROP POLICY IF EXISTS "Users can update ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete ratings" ON ratings;

CREATE POLICY "Users can update ratings" ON ratings
  FOR UPDATE USING (
    auth.uid() = student_id
    OR (
      get_user_role(auth.uid()) = 'teacher'
      AND EXISTS (
        SELECT 1 FROM sessions s
        JOIN course_members cm ON cm.course_id = s.course_id
        WHERE s.id = session_id AND cm.user_id = auth.uid()
      )
    )
    OR get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Users can delete ratings" ON ratings
  FOR DELETE USING (
    auth.uid() = student_id
    OR (
      get_user_role(auth.uid()) = 'teacher'
      AND EXISTS (
        SELECT 1 FROM sessions s
        JOIN course_members cm ON cm.course_id = s.course_id
        WHERE s.id = session_id AND cm.user_id = auth.uid()
      )
    )
    OR get_user_role(auth.uid()) = 'admin'
  );
