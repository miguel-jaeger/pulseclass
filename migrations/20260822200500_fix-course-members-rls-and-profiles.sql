-- Fix course_members RLS: separate read and write policies
DROP POLICY IF EXISTS "Admin and teachers can manage course members" ON course_members;
DROP POLICY IF EXISTS "Anyone can view course members" ON course_members;

-- Everyone can read course members
CREATE POLICY "Anyone can view course members" ON course_members
  FOR SELECT USING (true);

-- Only admin/teacher can insert
CREATE POLICY "Admin and teachers can add course members" ON course_members
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()
    )
  );

-- Only admin/teacher can delete
CREATE POLICY "Admin and teachers can remove course members" ON course_members
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()
    )
  );

-- Allow viewing profiles of users who share a course with you
DROP POLICY IF EXISTS "Users can view profiles of course members" ON profiles;

CREATE POLICY "Users can view profiles of course members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_members cm1
      JOIN course_members cm2 ON cm2.course_id = cm1.course_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id
    )
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );
