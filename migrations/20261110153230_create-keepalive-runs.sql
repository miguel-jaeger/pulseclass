-- ============================================================
-- KEEPALIVE_RUNS: historial de ejecuciones del cron keepalive
-- ============================================================

CREATE TABLE IF NOT EXISTS keepalive_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'external',
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  http_status INTEGER,
  message TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS keepalive_runs_created_at_idx
  ON keepalive_runs (created_at DESC);

ALTER TABLE keepalive_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view keepalive runs" ON keepalive_runs;

CREATE POLICY "Admins can view keepalive runs" ON keepalive_runs
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

COMMENT ON TABLE keepalive_runs IS 'Registro de ejecuciones del cron que mantiene activo el proyecto';
COMMENT ON COLUMN keepalive_runs.source IS 'Origen de la ejecución: external, insforge-schedule, manual, etc.';
COMMENT ON COLUMN keepalive_runs.status IS 'ok o error';
COMMENT ON COLUMN keepalive_runs.http_status IS 'Código HTTP de la consulta interna a la base de datos';
COMMENT ON COLUMN keepalive_runs.duration_ms IS 'Duración total de la ejecución en milisegundos';
