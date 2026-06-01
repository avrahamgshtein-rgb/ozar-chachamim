-- Allow anonymous users to insert research content
CREATE POLICY "anyone_insert_research" ON public.research_content
FOR INSERT
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'research_content';
