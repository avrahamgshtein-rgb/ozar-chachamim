-- Update migration paths directly via SQL
-- Run this in Supabase SQL Editor

UPDATE public.sages SET migration_path = '{"from":"ירושלים","to":"מצא","intermediate":[],"description":"מירושלים למצא"}' WHERE id = '177';
UPDATE public.sages SET migration_path = '{"from":"יוון","to":"צפת","intermediate":["ספרד"],"description":"מיוון לצפת"}' WHERE id = '62';
UPDATE public.sages SET migration_path = '{"from":"ירושלים","to":"מצא","intermediate":[],"description":"מירושלים למצא"}' WHERE id = '164';
UPDATE public.sages SET migration_path = '{"from":"ירושלים","to":"ספרד","intermediate":["מצרים"],"description":"מירושלים לספרד"}' WHERE id = '154';
UPDATE public.sages SET migration_path = '{"from":"ירושלים","to":"מצא","intermediate":[],"description":"מירושלים למצא"}' WHERE id = '174';
UPDATE public.sages SET migration_path = '{"from":"בבל","to":"מצא","intermediate":["ספרד"],"description":"מבבל למצא"}' WHERE id = '74';
UPDATE public.sages SET migration_path = '{"from":"בבל","to":"מצא","intermediate":["יוון","ספרד"],"description":"מבבל למצא"}' WHERE id = '189';
UPDATE public.sages SET migration_path = '{"from":"ספרד","to":"מצא","intermediate":[],"description":"מספרד למצא"}' WHERE id = '39';
UPDATE public.sages SET migration_path = '{"from":"ירושלים","to":"גרמניה","intermediate":[],"description":"מירושלים לגרמניה"}' WHERE id = '22';
UPDATE public.sages SET migration_path = '{"from":"ירושלים","to":"פולין","intermediate":[],"description":"מירושלים לפולין"}' WHERE id = '3';

-- Verify
SELECT COUNT(*) as with_migration FROM public.sages WHERE migration_path IS NOT NULL;
