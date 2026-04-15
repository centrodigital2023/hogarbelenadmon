-- 1. Fix profiles phone exposure: restrict full profile visibility to admin/coord
--    Regular staff can only see their own profile OR just full_name of others
DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;

-- Admin/coordinador can view all profiles (including phone)
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'coordinador'::app_role)
);

-- All staff can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Add staff SELECT policies for environmental compliance tables
-- pest_control: currently only coordinador can SELECT
CREATE POLICY "Staff can view pest control"
ON public.pest_control
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

-- hazardous_waste: currently only coordinador can SELECT
CREATE POLICY "Staff can view hazardous waste"
ON public.hazardous_waste
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));