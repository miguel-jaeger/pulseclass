-- El coordinador puede administrar cursos, sesiones y miembros (profesores y estudiantes)

-- Cursos: crear/editar/eliminar
DROP POLICY IF EXISTS "Admin and teachers can create courses" ON courses;
CREATE POLICY "Admin and teachers can create courses" ON courses FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher', 'coordinator'));

DROP POLICY IF EXISTS "Admin can update courses" ON courses;
CREATE POLICY "Admin can update courses" ON courses FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Admin can delete courses" ON courses;
CREATE POLICY "Admin can delete courses" ON courses FOR DELETE
  USING (get_user_role(auth.uid()) IN ('admin', 'coordinator'));

-- Miembros del curso: agregar/quitar (profesores y estudiantes)
DROP POLICY IF EXISTS "Admin and teachers can add course members" ON course_members;
CREATE POLICY "Admin and teachers can add course members" ON course_members FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'coordinator')
    OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Admin and teachers can remove course members" ON course_members;
CREATE POLICY "Admin and teachers can remove course members" ON course_members FOR DELETE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'coordinator')
    OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid())
  );

-- Sesiones: crear/editar/eliminar
DROP POLICY IF EXISTS "Admin and teachers can create sessions" ON sessions;
CREATE POLICY "Admin and teachers can create sessions" ON sessions FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'teacher', 'coordinator'));

DROP POLICY IF EXISTS "Admin can update sessions" ON sessions;
CREATE POLICY "Admin can update sessions" ON sessions FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Admin can delete sessions" ON sessions;
CREATE POLICY "Admin can delete sessions" ON sessions FOR DELETE
  USING (get_user_role(auth.uid()) IN ('admin', 'coordinator'));
