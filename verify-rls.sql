-- Check all policies on sages table
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'sages'
ORDER BY policyname;

-- If missing, create them:
CREATE POLICY "anyone_select_sages" ON public.sages FOR SELECT USING (true);
CREATE POLICY "anyone_insert_sages" ON public.sages FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_update_sages" ON public.sages FOR UPDATE USING (true);
CREATE POLICY "anyone_delete_sages" ON public.sages FOR DELETE USING (true);

-- Verify after
SELECT policyname FROM pg_policies WHERE tablename = 'sages';
