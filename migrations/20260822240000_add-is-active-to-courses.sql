-- Add is_active column to courses (default true for existing courses)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Only admins and teachers can update courses (already exists, but add is_active awareness)
-- RLS policies don't need changes - existing update policy covers this column
