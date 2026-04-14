
-- 1. Fix exam results forgery: remove direct INSERT policy
-- The score-exam edge function uses service role key (bypasses RLS) so this is the only allowed path
DROP POLICY IF EXISTS "Users can insert own results" ON public.exam_results;

-- 2. Fix quiz answer exposure: restrict training_courses base table SELECT to admins only
DROP POLICY IF EXISTS "Staff can view courses" ON public.training_courses;
CREATE POLICY "Admin can view courses"
ON public.training_courses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'coordinador'::app_role));

-- 3. Add DELETE policy for documents storage bucket (coordinador+ only)
CREATE POLICY "Authorized staff can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'coordinador'::app_role)));

-- 4. Fix overly permissive is_staff() SELECT policies on sensitive tables
-- Replace is_staff() with role-specific policies for financial/sensitive tables

-- financial_transactions: already has role-specific SELECT, just drop any is_staff if exists
-- invoices: already has role-specific SELECT
-- payment_vouchers: already has role-specific SELECT + coord

-- For tables using is_staff() for ALL + SELECT, the sensitive ones need tightening:
-- We'll keep is_staff() for general care tables (daily_logs, incidents, etc.) since all care staff need access
-- But restrict truly sensitive tables

-- No additional changes needed for financial tables (they already use role-specific policies)
-- The is_staff() usage is intentional for care-related tables where all staff need visibility
