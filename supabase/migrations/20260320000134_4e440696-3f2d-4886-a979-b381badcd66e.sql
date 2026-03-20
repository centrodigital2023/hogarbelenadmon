
-- Add manipuladora role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manipuladora';

-- Hygiene kits (kit de aseo mensual)
CREATE TABLE IF NOT EXISTS public.hygiene_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  kit_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hygiene_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage hygiene kits" ON public.hygiene_kits FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view hygiene kits" ON public.hygiene_kits FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Institutional documents
CREATE TABLE IF NOT EXISTS public.institutional_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  original_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutional_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage inst docs" ON public.institutional_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Staff can view inst docs" ON public.institutional_documents FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Training courses
CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  video_url text,
  quiz jsonb DEFAULT '[]',
  created_by uuid NOT NULL,
  is_published boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage courses" ON public.training_courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador'));
CREATE POLICY "Staff can view courses" ON public.training_courses FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Exam results
CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]',
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  passed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own results" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own results" ON public.exam_results FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador'));

-- Nursing notes
CREATE TABLE IF NOT EXISTS public.nursing_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.residents(id) ON DELETE CASCADE,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL,
  shift text,
  generated_by uuid NOT NULL,
  is_ai_generated boolean DEFAULT false,
  is_consolidated boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nursing_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nurses can manage notes" ON public.nursing_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador') OR has_role(auth.uid(), 'enfermera'));
CREATE POLICY "Staff can view notes" ON public.nursing_notes FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Care plans (PAI)
CREATE TABLE IF NOT EXISTS public.care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  objectives jsonb DEFAULT '[]',
  interventions jsonb DEFAULT '[]',
  generated_from jsonb DEFAULT '{}',
  status text DEFAULT 'borrador',
  notes text,
  created_by uuid NOT NULL,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medical can manage plans" ON public.care_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador') OR has_role(auth.uid(), 'enfermera'));
CREATE POLICY "Staff can view plans" ON public.care_plans FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- System settings (logo, config)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage settings" ON public.system_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can view settings" ON public.system_settings FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Life history versions
CREATE TABLE IF NOT EXISTS public.life_history_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  life_history_id uuid NOT NULL REFERENCES public.life_histories(id) ON DELETE CASCADE,
  version integer NOT NULL,
  data jsonb NOT NULL,
  modified_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.life_history_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth staff can manage versions" ON public.life_history_versions FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador') OR has_role(auth.uid(), 'psicologo'));
CREATE POLICY "Staff can view versions" ON public.life_history_versions FOR SELECT TO authenticated USING (is_staff(auth.uid()));
