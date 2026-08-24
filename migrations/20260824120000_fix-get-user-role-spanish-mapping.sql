-- Fix get_user_role to map Spanish role names to English for RLS policies
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN role = 'Administrador' THEN 'admin'
    WHEN role = 'Profesor' THEN 'teacher'
    WHEN role = 'Estudiante' THEN 'student'
    ELSE role
  END
  FROM profiles WHERE user_id = uid LIMIT 1
$$;
