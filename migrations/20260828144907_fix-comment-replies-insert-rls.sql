-- Fix comment_replies INSERT RLS: add admin/teacher bypass (matches SELECT/UPDATE/DELETE policies)
DROP POLICY IF EXISTS "Course members can insert replies" ON comment_replies;

CREATE POLICY "Course members can insert replies" ON comment_replies
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM ratings r
        JOIN sessions s ON s.id = r.session_id
        JOIN course_members cm ON cm.course_id = s.course_id
        WHERE r.id = rating_id AND cm.user_id = auth.uid()
      )
      OR get_user_role(auth.uid()) IN ('admin', 'teacher')
    )
  );
