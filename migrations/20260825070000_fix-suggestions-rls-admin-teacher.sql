-- Fix suggestions RLS: teacher can only update/delete suggestions from students in their courses
DROP POLICY IF EXISTS "Admin/teacher can update any suggestion" ON suggestions;
DROP POLICY IF EXISTS "Admin/teacher can delete any suggestion" ON suggestions;

CREATE POLICY "Users can update suggestions" ON suggestions
  FOR UPDATE USING (
    auth.uid() = user_id
    OR get_user_role(auth.uid()) = 'admin'
    OR (
      get_user_role(auth.uid()) = 'teacher'
      AND EXISTS (
        SELECT 1 FROM course_members cm1
        JOIN course_members cm2 ON cm1.course_id = cm2.course_id
        WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = suggestions.user_id
      )
    )
  );

CREATE POLICY "Users can delete suggestions" ON suggestions
  FOR DELETE USING (
    auth.uid() = user_id
    OR get_user_role(auth.uid()) = 'admin'
    OR (
      get_user_role(auth.uid()) = 'teacher'
      AND EXISTS (
        SELECT 1 FROM course_members cm1
        JOIN course_members cm2 ON cm1.course_id = cm2.course_id
        WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = suggestions.user_id
      )
    )
  );
