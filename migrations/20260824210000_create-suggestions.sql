CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'mejora' CHECK (type IN ('mejora', 'nuevo', 'problema', 'contenido')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recibida' CHECK (status IN ('recibida', 'revision', 'aprobada', 'rechazada', 'implementada')),
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suggestions"
  ON suggestions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can update any suggestion"
  ON suggestions FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can delete own suggestions"
  ON suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can delete any suggestion"
  ON suggestions FOR DELETE
  USING (get_user_role(auth.uid()) = 'admin');
