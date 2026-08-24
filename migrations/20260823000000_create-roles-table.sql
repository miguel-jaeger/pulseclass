-- Create roles table for dynamic role management
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador con acceso total al sistema'),
  ('teacher', 'Docente que puede crear cursos y sesiones'),
  ('student', 'Estudiante que puede evaluar sesiones');

-- Enable RLS on roles table
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Roles policies
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage roles" ON roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
