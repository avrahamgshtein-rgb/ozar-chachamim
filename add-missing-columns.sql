-- Add missing columns to sages table if they don't exist

ALTER TABLE public.sages
ADD COLUMN IF NOT EXISTS migration_path JSONB DEFAULT NULL;

ALTER TABLE public.sages
ADD COLUMN IF NOT EXISTS coordinates JSONB DEFAULT NULL;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sages' AND column_name IN ('migration_path', 'coordinates');
