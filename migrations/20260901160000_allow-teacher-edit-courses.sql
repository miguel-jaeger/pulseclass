-- Allow teachers to update/delete courses they created

DROP POLICY IF EXISTS "Admin can update courses" ON courses;
CREATE POLICY "Admin can update courses" ON courses
  FOR UPDATE USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'teacher' AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete courses" ON courses;
CREATE POLICY "Admin can delete courses" ON courses
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'teacher' AND created_by = auth.uid())
  );
