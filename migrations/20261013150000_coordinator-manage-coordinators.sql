-- El coordinador también puede crear y gestionar otros coordinadores (además de profesores)

DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
CREATE POLICY "Admin can insert profiles" ON profiles FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role IN ('teacher', 'coordinator'))
  );

DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
CREATE POLICY "Admin can update profiles" ON profiles FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role IN ('teacher', 'coordinator'))
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role IN ('teacher', 'coordinator'))
  );

DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
CREATE POLICY "Admin can delete profiles" ON profiles FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'admin'
    OR (get_user_role(auth.uid()) = 'coordinator' AND role IN ('teacher', 'coordinator'))
  );
