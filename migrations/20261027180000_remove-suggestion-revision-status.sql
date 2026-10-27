-- Elimina el estado "revision": queda recibida, aprobada, implementada y rechazada.
UPDATE public.suggestions SET status = 'recibida', updated_at = now() WHERE status = 'revision';

ALTER TABLE public.suggestions DROP CONSTRAINT IF EXISTS suggestions_status_check;
ALTER TABLE public.suggestions ADD CONSTRAINT suggestions_status_check
  CHECK (status IN ('recibida', 'aprobada', 'implementada', 'rechazada'));
