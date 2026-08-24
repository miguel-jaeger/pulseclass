-- Allow both English and Spanish role values in profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher', 'student', 'Administrador', 'Profesor', 'Estudiante'));

-- Update get_user_role to handle all variants
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN role IN ('admin', 'Administrador') THEN 'admin'
    WHEN role IN ('teacher', 'Profesor') THEN 'teacher'
    WHEN role IN ('student', 'Estudiante') THEN 'student'
    ELSE role
  END
  FROM profiles WHERE user_id = uid LIMIT 1
$$;
