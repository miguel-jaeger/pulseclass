-- Fix course_members INSERT policy to also allow teachers
DROP POLICY IF EXISTS "Admin and teachers can add course members" ON public.course_members;

CREATE POLICY "Admin and teachers can add course members"
  ON public.course_members
  FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR get_user_role(auth.uid()) = 'teacher'
    OR EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_members.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Fix course_members DELETE policy to also allow teachers
DROP POLICY IF EXISTS "Admin and teachers can remove course members" ON public.course_members;

CREATE POLICY "Admin and teachers can remove course members"
  ON public.course_members
  FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'admin'
    OR get_user_role(auth.uid()) = 'teacher'
    OR EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_members.course_id
        AND courses.created_by = auth.uid()
    )
  );
