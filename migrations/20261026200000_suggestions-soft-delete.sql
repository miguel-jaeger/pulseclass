-- Papelera de sugerencias: borrado logico en vez de fisico.
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS suggestions_deleted_at_idx ON public.suggestions (deleted_at);

-- Poliza restrictiva: las sugerencias eliminadas solo las ve un administrador
-- (la poliza permisiva ya existente sigue exigiendo sesion autenticada).
DROP POLICY IF EXISTS sugerencias_visibles ON public.suggestions;
CREATE POLICY sugerencias_visibles ON public.suggestions
  AS RESTRICTIVE
  FOR SELECT
  USING (deleted_at IS NULL OR get_user_role(auth.uid()) = 'admin');
