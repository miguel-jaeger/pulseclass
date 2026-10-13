-- Motivo del rechazo de una sugerencia
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
