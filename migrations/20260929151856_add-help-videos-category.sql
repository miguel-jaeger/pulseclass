-- Categoría de video de ayuda: 'platform' = videos sobre el trabajo con la plataforma,
-- 'course' = videos de curso sugeridos para los estudiantes.
ALTER TABLE help_videos
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'platform';

ALTER TABLE help_videos
  ADD CONSTRAINT help_videos_category_check CHECK (category IN ('platform', 'course'));

CREATE INDEX IF NOT EXISTS idx_help_videos_category ON help_videos(category);