-- Allow anyone to update sages with migration data
CREATE POLICY "anyone_update_sages" ON public.sages
FOR UPDATE WITH CHECK (true);

-- Verify policies
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'sages';
