-- Normalize roles to English only in profiles
UPDATE profiles SET role = 'admin' WHERE role = 'Administrador';
UPDATE profiles SET role = 'teacher' WHERE role = 'Profesor';
UPDATE profiles SET role = 'student' WHERE role = 'Estudiante';

-- Restrict role check constraint to English only
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher', 'student'));

-- get_user_role: no longer needs Spanish mapping, roles are canonical English
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM profiles WHERE user_id = uid LIMIT 1
$$;