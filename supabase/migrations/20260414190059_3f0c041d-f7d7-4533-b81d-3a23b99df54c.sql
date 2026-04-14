
-- Drop the overly broad ALL policy
DROP POLICY IF EXISTS "Super admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view roles" ON public.user_roles;

-- Only super_admin can view all roles
CREATE POLICY "Super admin can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Staff can view their own role(s)
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only super_admin can insert roles
CREATE POLICY "Super admin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can update roles
CREATE POLICY "Super admin can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can delete roles
CREATE POLICY "Super admin can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
