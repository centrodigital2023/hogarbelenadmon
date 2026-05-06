CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'super_admin'::app_role,
        'coordinador'::app_role,
        'enfermera'::app_role,
        'cuidadora'::app_role,
        'terapeuta'::app_role,
        'psicologo'::app_role,
        'administrativo'::app_role,
        'manipuladora'::app_role
      )
  )
$function$;