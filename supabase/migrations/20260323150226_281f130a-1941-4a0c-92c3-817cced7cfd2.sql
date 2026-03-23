CREATE OR REPLACE FUNCTION public.get_safe_quiz(p_course_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object('question', elem->>'question', 'options', elem->'options')
    )
    FROM public.training_courses tc,
    jsonb_array_elements(tc.quiz) elem
    WHERE tc.id = p_course_id AND tc.is_published = true),
    '[]'::jsonb
  )
$$;

CREATE OR REPLACE VIEW public.training_courses_public
WITH (security_invoker = on) AS
SELECT
  id, title, description, content, video_url, is_published, created_at,
  COALESCE(jsonb_array_length(quiz), 0)::int AS quiz_count
FROM public.training_courses;