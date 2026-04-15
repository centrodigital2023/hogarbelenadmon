-- Allow all authenticated staff to view published training courses
CREATE POLICY "Staff can view published courses"
ON public.training_courses
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()) AND is_published = true);
