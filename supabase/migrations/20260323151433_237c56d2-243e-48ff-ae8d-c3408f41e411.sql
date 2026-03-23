DROP VIEW IF EXISTS public.training_courses_public;

CREATE VIEW public.training_courses_public
WITH (security_invoker = true)
AS
SELECT
  id,
  title,
  description,
  content,
  video_url,
  is_published,
  created_at,
  COALESCE(jsonb_array_length(quiz), 0) AS quiz_count
FROM public.training_courses
WHERE is_published = true;