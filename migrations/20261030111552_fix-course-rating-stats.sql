-- Recalcula los agregados historicos de evaluaciones de un curso completo.
CREATE OR REPLACE FUNCTION public.recalc_course_rating_stats(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_course_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.course_rating_stats (course_id, rating_count, avg_score, updated_at)
  SELECT p_course_id,
         count(r.id),
         COALESCE(round(avg(r.score), 2), 0),
         now()
  FROM public.sessions s
  LEFT JOIN public.ratings r ON r.session_id = s.id
  WHERE s.course_id = p_course_id
  ON CONFLICT (course_id) DO UPDATE SET
    rating_count = EXCLUDED.rating_count,
    avg_score = EXCLUDED.avg_score,
    updated_at = now();
END;
$$;

-- Al insertar, editar o borrar una evaluacion, recalcula el acumulado del curso.
CREATE OR REPLACE FUNCTION public.update_course_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_course_id uuid;
  v_new_course_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT s.course_id INTO v_old_course_id FROM public.sessions s WHERE s.id = OLD.session_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT s.course_id INTO v_new_course_id FROM public.sessions s WHERE s.id = NEW.session_id;
  END IF;

  PERFORM public.recalc_course_rating_stats(v_old_course_id);

  IF v_new_course_id IS DISTINCT FROM v_old_course_id THEN
    PERFORM public.recalc_course_rating_stats(v_new_course_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_course_stats_change ON public.ratings;
CREATE TRIGGER on_rating_course_stats_change
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_rating_stats();

-- Al borrar una sesion sus evaluaciones se eliminan en cascada. Este trigger
-- diferido recalcula el acumulado cuando la cascada ya termino.
CREATE OR REPLACE FUNCTION public.update_course_rating_stats_on_session_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_course_rating_stats(OLD.course_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_session_delete_course_rating_stats ON public.sessions;
CREATE CONSTRAINT TRIGGER on_session_delete_course_rating_stats
  AFTER DELETE ON public.sessions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_rating_stats_on_session_delete();

-- Si una sesion cambia de curso, recalcula ambos acumulados.
CREATE OR REPLACE FUNCTION public.update_course_rating_stats_on_session_course_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    PERFORM public.recalc_course_rating_stats(OLD.course_id);
    PERFORM public.recalc_course_rating_stats(NEW.course_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_session_course_change_course_rating_stats ON public.sessions;
CREATE TRIGGER on_session_course_change_course_rating_stats
  AFTER UPDATE OF course_id ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_rating_stats_on_session_course_change();

-- Recalcular los acumulados existentes.
INSERT INTO public.course_rating_stats (course_id, rating_count, avg_score, updated_at)
SELECT c.id,
       count(r.id),
       COALESCE(round(avg(r.score), 2), 0),
       now()
FROM public.courses c
LEFT JOIN public.sessions s ON s.course_id = c.id
LEFT JOIN public.ratings r ON r.session_id = s.id
GROUP BY c.id
ON CONFLICT (course_id) DO UPDATE SET
  rating_count = EXCLUDED.rating_count,
  avg_score = EXCLUDED.avg_score,
  updated_at = now();
