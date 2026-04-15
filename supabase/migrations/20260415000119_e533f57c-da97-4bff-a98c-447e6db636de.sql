-- Drop existing INSERT policy if any
DROP POLICY IF EXISTS "Users can insert own results" ON public.exam_results;
DROP POLICY IF EXISTS "Staff can insert results" ON public.exam_results;

-- Check for any ALL policy that might grant INSERT and recreate without INSERT
-- The current SELECT policy is fine, keep it as is

-- Add a deny-all INSERT policy so no client can insert directly
CREATE POLICY "Only service role can insert results"
ON public.exam_results
FOR INSERT
TO authenticated
WITH CHECK (false);