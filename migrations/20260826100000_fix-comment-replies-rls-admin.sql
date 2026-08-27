-- Fix comment_replies RLS: allow admin/teacher to update and delete any reply
DROP POLICY IF EXISTS "Users can delete own replies" ON comment_replies;

CREATE POLICY "Users can update replies" ON comment_replies
  FOR UPDATE USING (
    auth.uid() = user_id
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );

CREATE POLICY "Users can delete replies" ON comment_replies
  FOR DELETE USING (
    auth.uid() = user_id
    OR get_user_role(auth.uid()) IN ('admin', 'teacher')
  );
