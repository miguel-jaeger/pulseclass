-- Allow teachers to manage course members for their own courses
DROP POLICY IF EXISTS "Admin can manage course_members" ON course_members;

CREATE POLICY "Admin and teachers can manage course members" ON course_members
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()
    )
  );

-- Helper: check if a user is a member of a course
CREATE OR REPLACE FUNCTION is_course_member(cid UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_members WHERE course_id = cid AND user_id = uid
  );
$$;

-- Helper: check if a user is a member of the course that owns a session
CREATE OR REPLACE FUNCTION is_session_course_member(sid UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions s
    JOIN course_members cm ON cm.course_id = s.course_id
    WHERE s.id = sid AND cm.user_id = uid
  );
$$;
