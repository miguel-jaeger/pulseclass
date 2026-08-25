-- Fix suggestions RLS: allow teacher to update/delete any suggestion
DROP POLICY IF EXISTS "Admin can update any suggestion" ON suggestions;
DROP POLICY IF EXISTS "Admin can delete any suggestion" ON suggestions;

CREATE POLICY "Admin/teacher can update any suggestion"
  ON suggestions FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admin/teacher can delete any suggestion"
  ON suggestions FOR DELETE
  USING (get_user_role(auth.uid()) IN ('admin', 'teacher'));
