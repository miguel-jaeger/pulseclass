-- Likes independientes para el comentario y la sugerencia de una misma evaluacion.
ALTER TABLE public.rating_votes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'comment';
ALTER TABLE public.rating_votes DROP CONSTRAINT IF EXISTS rating_votes_rating_id_user_id_key;
ALTER TABLE public.rating_votes ADD CONSTRAINT rating_votes_target_key UNIQUE (rating_id, user_id, kind);
ALTER TABLE public.rating_votes DROP CONSTRAINT IF EXISTS rating_votes_kind_check;
ALTER TABLE public.rating_votes ADD CONSTRAINT rating_votes_kind_check CHECK (kind IN ('comment', 'suggestion'));

ALTER TABLE public.comment_stars ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'comment';
ALTER TABLE public.comment_stars DROP CONSTRAINT IF EXISTS comment_stars_rating_id_student_id_key;
ALTER TABLE public.comment_stars ADD CONSTRAINT comment_stars_target_key UNIQUE (rating_id, student_id, kind);
ALTER TABLE public.comment_stars DROP CONSTRAINT IF EXISTS comment_stars_kind_check;
ALTER TABLE public.comment_stars ADD CONSTRAINT comment_stars_kind_check CHECK (kind IN ('comment', 'suggestion'));
