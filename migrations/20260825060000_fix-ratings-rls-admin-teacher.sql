-- Fix ratings RLS: allow admin/teacher to update and delete any rating
DROP POLICY IF EXISTS "Students can update own rating" ON ratings;
DROP POLICY IF EXISTS "Students can delete own rating" ON ratings;

CREATE POLICY "Users can update ratings" ON ratings
  FOR UPDATE USING (
    auth.uid() = student_id
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY "Users can delete ratings" ON ratings
  FOR DELETE USING (
    auth.uid() = student_id
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );
