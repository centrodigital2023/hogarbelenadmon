-- =============================================
-- HOGAR BELÉN - ESQUEMA COMPLETO DE BASE DE DATOS
-- =============================================

-- Función para timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- ROLES Y PERFILES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'coordinador', 'enfermera', 'cuidadora', 'terapeuta', 'psicologo', 'administrativo');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Staff can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Super admin can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RESIDENTES
-- =============================================
CREATE TYPE public.resident_status AS ENUM ('prueba', 'permanente', 'egresado', 'fallecido');

CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_id TEXT,
  birth_date DATE,
  birth_place TEXT,
  gender TEXT CHECK (gender IN ('M', 'F')),
  eps TEXT,
  blood_type TEXT,
  allergies TEXT,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trial_end_date DATE,
  status resident_status NOT NULL DEFAULT 'prueba',
  room_id UUID,
  photo_url TEXT,
  emergency_contact_1_name TEXT,
  emergency_contact_1_phone TEXT,
  emergency_contact_1_relation TEXT,
  emergency_contact_2_name TEXT,
  emergency_contact_2_phone TEXT,
  emergency_contact_2_relation TEXT,
  responsible_family_name TEXT,
  responsible_family_document TEXT,
  responsible_family_phone TEXT,
  treating_doctor_name TEXT,
  treating_doctor_phone TEXT,
  special_diet TEXT,
  spiritual_preference TEXT,
  authorize_social_media BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view residents" ON public.residents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Coordinador+ can manage residents" ON public.residents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- HABITACIONES
-- =============================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 1,
  floor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view rooms" ON public.rooms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

ALTER TABLE public.residents ADD CONSTRAINT fk_residents_room FOREIGN KEY (room_id) REFERENCES public.rooms(id);

-- =============================================
-- HB-F1: CHECKLIST DE INGRESO
-- =============================================
CREATE TABLE public.admission_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  doc_cedula BOOLEAN DEFAULT false,
  doc_eps BOOLEAN DEFAULT false,
  doc_contrato BOOLEAN DEFAULT false,
  doc_reglamento BOOLEAN DEFAULT false,
  doc_contactos_emergencia BOOLEAN DEFAULT false,
  doc_inventario_f3 BOOLEAN DEFAULT false,
  doc_historia_clinica BOOLEAN DEFAULT false,
  doc_formulas_medicas BOOLEAN DEFAULT false,
  doc_laboratorios BOOLEAN DEFAULT false,
  doc_valoracion_f2 BOOLEAN DEFAULT false,
  doc_vacunacion BOOLEAN DEFAULT false,
  observations TEXT,
  folder_status TEXT CHECK (folder_status IN ('completa', 'pendiente')) DEFAULT 'pendiente',
  signature_family TEXT,
  signature_coordinator TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admission_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view checklists" ON public.admission_checklists FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Coordinador+ can manage checklists" ON public.admission_checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- HB-F3: INVENTARIO DE PERTENENCIAS
-- =============================================
CREATE TABLE public.belongings_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT CHECK (reason IN ('ingreso', 'egreso', 'actualizacion')) NOT NULL,
  items JSONB NOT NULL DEFAULT '{}',
  total_items INTEGER DEFAULT 0,
  signature_resident TEXT,
  signature_family TEXT,
  signature_coordinator TEXT,
  egress_date DATE,
  egress_reason TEXT,
  egress_family_name TEXT,
  egress_family_document TEXT,
  egress_signature_family TEXT,
  egress_signature_hogar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.belongings_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view inventory" ON public.belongings_inventory FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Coordinador+ can manage inventory" ON public.belongings_inventory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- HB-F22: HISTORIA DE VIDA
-- =============================================
CREATE TABLE public.life_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  preferred_name TEXT,
  occupation TEXT,
  marital_status TEXT,
  children_info TEXT,
  favorite_food TEXT,
  favorite_music TEXT,
  hobbies TEXT,
  morning_or_night TEXT,
  spiritual_beliefs TEXT,
  most_important_person TEXT,
  dislikes TEXT,
  dreams TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.life_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view life histories" ON public.life_histories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Authorized staff can manage" ON public.life_histories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'psicologo') OR public.has_role(auth.uid(), 'terapeuta'));

-- =============================================
-- HB-F4: BITÁCORA DIARIA
-- =============================================
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT CHECK (shift IN ('manana', 'dia', 'noche')) NOT NULL,
  nutrition_pct INTEGER CHECK (nutrition_pct BETWEEN 0 AND 100),
  hydration_glasses INTEGER DEFAULT 0,
  elimination TEXT,
  mood TEXT,
  observations TEXT,
  ai_nursing_note TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view logs" ON public.daily_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Care staff can manage logs" ON public.daily_logs FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F16: SIGNOS VITALES
-- =============================================
CREATE TABLE public.vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  blood_pressure TEXT,
  spo2 NUMERIC,
  temperature NUMERIC,
  glucose NUMERIC,
  heart_rate INTEGER,
  weight NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view vitals" ON public.vital_signs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Medical staff can manage vitals" ON public.vital_signs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera'));

-- =============================================
-- HB-F14: MEDICAMENTOS
-- =============================================
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  medication_name TEXT NOT NULL,
  concentration TEXT,
  route TEXT,
  dose TEXT,
  schedule TEXT,
  prescription_date DATE,
  prescription_image_url TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view medications" ON public.medications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Medical staff can manage medications" ON public.medications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera'));

-- =============================================
-- HB-F15: ADMINISTRACIÓN DE MEDICAMENTOS
-- =============================================
CREATE TABLE public.medication_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  administered_by UUID NOT NULL REFERENCES auth.users(id),
  admin_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
  dose_given TEXT,
  route TEXT,
  check_patient BOOLEAN DEFAULT false,
  check_medication BOOLEAN DEFAULT false,
  check_dose BOOLEAN DEFAULT false,
  check_route BOOLEAN DEFAULT false,
  check_time BOOLEAN DEFAULT false,
  was_administered BOOLEAN DEFAULT true,
  skip_reason TEXT,
  notes TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medication_admin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view med admin" ON public.medication_admin FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Nurses can manage med admin" ON public.medication_admin FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera'));

-- =============================================
-- HB-F5: CHECKLIST COCINA
-- =============================================
CREATE TABLE public.kitchen_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  used_ppe BOOLEAN DEFAULT false,
  respected_diets BOOLEAN DEFAULT false,
  washed_produce BOOLEAN DEFAULT false,
  cleaned_kitchen BOOLEAN DEFAULT false,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kitchen_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view kitchen" ON public.kitchen_checklists FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage kitchen" ON public.kitchen_checklists FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F7: TEMPERATURA NEVERAS
-- =============================================
CREATE TABLE public.fridge_temps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT CHECK (shift IN ('manana', 'tarde')) NOT NULL,
  fridge_name TEXT NOT NULL,
  temperature NUMERIC NOT NULL,
  is_safe BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fridge_temps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view fridge" ON public.fridge_temps FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage fridge" ON public.fridge_temps FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F8: DESINFECCIÓN
-- =============================================
CREATE TABLE public.disinfection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  area TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  record_type TEXT CHECK (record_type IN ('cocina', 'general')) DEFAULT 'cocina',
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disinfection_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view disinfection" ON public.disinfection_records FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage disinfection" ON public.disinfection_records FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F6: INGRESO DE ALIMENTOS
-- =============================================
CREATE TABLE public.food_intake_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  record_month TEXT NOT NULL,
  week_number INTEGER CHECK (week_number BETWEEN 1 AND 5),
  reception_date DATE,
  supplier TEXT,
  invoice_number TEXT,
  packaging_ok BOOLEAN DEFAULT true,
  expiry_ok BOOLEAN DEFAULT true,
  temperature_ok BOOLEAN DEFAULT true,
  details TEXT,
  photo_urls JSONB DEFAULT '[]',
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.food_intake_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view food intake" ON public.food_intake_records FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage food intake" ON public.food_intake_records FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F9: TERAPIAS
-- =============================================
CREATE TABLE public.therapy_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  therapy_type TEXT,
  attended_monday BOOLEAN DEFAULT false,
  attended_wednesday BOOLEAN DEFAULT false,
  attended_friday BOOLEAN DEFAULT false,
  evolution_code TEXT CHECK (evolution_code IN ('M', 'I', 'D', 'P')),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.therapy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view therapies" ON public.therapy_records FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Therapists can manage" ON public.therapy_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'terapeuta'));

-- =============================================
-- HB-F10: ATENCIÓN PSICOSOCIAL
-- =============================================
CREATE TABLE public.psychosocial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_type TEXT CHECK (record_type IN ('individual', 'grupal')) NOT NULL,
  reason TEXT,
  evolution TEXT,
  recommendations TEXT,
  group_topic TEXT,
  group_achievement TEXT,
  attendees JSONB DEFAULT '[]',
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.psychosocial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view psych" ON public.psychosocial_records FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Psych can manage" ON public.psychosocial_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'psicologo'));

-- =============================================
-- HB-F11: ACOMPAÑAMIENTO ESPIRITUAL
-- =============================================
CREATE TABLE public.spiritual_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT,
  topic TEXT,
  leader TEXT,
  attendees_count INTEGER DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spiritual_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view spiritual" ON public.spiritual_records FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage spiritual" ON public.spiritual_records FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F12: CALENDARIO DE CELEBRACIONES
-- =============================================
CREATE TABLE public.celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  event_month INTEGER CHECK (event_month BETWEEN 1 AND 12),
  event_name TEXT NOT NULL,
  activity TEXT,
  responsible TEXT,
  budget_estimated NUMERIC DEFAULT 0,
  budget_actual NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  feedback TEXT,
  evidence_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.celebrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view celebrations" ON public.celebrations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can manage celebrations" ON public.celebrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- HB-F13: ACTIVIDADES TERAPÉUTICAS
-- =============================================
CREATE TABLE public.therapeutic_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_name TEXT NOT NULL,
  participants JSONB DEFAULT '[]',
  responsible TEXT,
  photo_urls JSONB DEFAULT '[]',
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.therapeutic_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view activities" ON public.therapeutic_activities FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage activities" ON public.therapeutic_activities FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F17: CITAS MÉDICAS
-- =============================================
CREATE TABLE public.medical_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  specialty TEXT,
  location TEXT,
  companion TEXT,
  companion_type TEXT CHECK (companion_type IN ('familiar', 'personal')),
  was_attended BOOLEAN,
  medical_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view appointments" ON public.medical_appointments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Medical staff can manage" ON public.medical_appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera'));

-- =============================================
-- HB-F19: CARPETA DE URGENCIAS
-- =============================================
CREATE TABLE public.emergency_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE UNIQUE,
  has_cedula BOOLEAN DEFAULT false,
  cedula_date DATE,
  has_medications_list BOOLEAN DEFAULT false,
  medications_date DATE,
  has_clinical_summary BOOLEAN DEFAULT false,
  clinical_summary_date DATE,
  has_family_contacts BOOLEAN DEFAULT false,
  has_doctor_contact BOOLEAN DEFAULT false,
  last_review_date DATE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view emergency" ON public.emergency_folders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Medical staff can manage emergency" ON public.emergency_folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera'));

-- =============================================
-- HB-F20: INCIDENTES Y CAÍDAS
-- =============================================
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  incident_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
  incident_type TEXT NOT NULL,
  description TEXT,
  consequences TEXT,
  cause_analysis TEXT,
  corrective_actions JSONB DEFAULT '[]',
  first_aid BOOLEAN DEFAULT false,
  family_notified BOOLEAN DEFAULT false,
  family_contact_name TEXT,
  transferred_to_er BOOLEAN DEFAULT false,
  er_facility TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view incidents" ON public.incidents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage incidents" ON public.incidents FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- HB-F21: AUTORIZACIÓN DE ACOMPAÑAMIENTO
-- =============================================
CREATE TABLE public.companion_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.medical_appointments(id),
  family_name TEXT NOT NULL,
  family_document TEXT,
  appointment_date DATE NOT NULL,
  specialty TEXT,
  authorization_text TEXT,
  signature_family TEXT,
  signature_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companion_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view authorizations" ON public.companion_authorizations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can manage authorizations" ON public.companion_authorizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- HB-F18: SEGUIMIENTO POST-HOSPITALIZACIÓN
-- =============================================
CREATE TABLE public.post_hospitalization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  hospital_admission_date DATE,
  hospital_discharge_date DATE,
  diagnosis TEXT,
  new_instructions TEXT,
  followup_date DATE,
  followup_result TEXT,
  discharge_summary_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_hospitalization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view post-hosp" ON public.post_hospitalization FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Medical can manage post-hosp" ON public.post_hospitalization FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera'));

-- =============================================
-- VALORACIONES GERIÁTRICAS (resultados de tests)
-- =============================================
CREATE TABLE public.geriatric_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  test_key TEXT NOT NULL,
  test_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  interpretation TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  signature_evaluator TEXT,
  signature_supervisor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.geriatric_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view assessments" ON public.geriatric_assessments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Medical can manage assessments" ON public.geriatric_assessments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'enfermera') OR public.has_role(auth.uid(), 'terapeuta'));

-- =============================================
-- HB-F23: PQRSF
-- =============================================
CREATE TABLE public.pqrsf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sender_name TEXT NOT NULL,
  pqrsf_type TEXT CHECK (pqrsf_type IN ('peticion', 'queja', 'reclamo', 'sugerencia', 'felicitacion')) NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('abierto', 'cerrado')) DEFAULT 'abierto',
  response_date DATE,
  analysis TEXT,
  improvement_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pqrsf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view pqrsf" ON public.pqrsf FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can manage pqrsf" ON public.pqrsf FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- HB-F24: CAPACITACIONES
-- =============================================
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  topic TEXT NOT NULL,
  facilitator TEXT,
  facilitator_entity TEXT,
  training_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  objective TEXT,
  content TEXT,
  attendees JSONB DEFAULT '[]',
  objective_met BOOLEAN,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view trainings" ON public.trainings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can manage trainings" ON public.trainings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- HB-F25: EVALUACIÓN DE DESEMPEÑO
-- =============================================
CREATE TABLE public.performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluated_user_id UUID NOT NULL REFERENCES auth.users(id),
  evaluated_by UUID NOT NULL REFERENCES auth.users(id),
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT,
  score_resident_care INTEGER CHECK (score_resident_care BETWEEN 1 AND 5),
  score_compliance INTEGER CHECK (score_compliance BETWEEN 1 AND 5),
  score_safety INTEGER CHECK (score_safety BETWEEN 1 AND 5),
  score_proactivity INTEGER CHECK (score_proactivity BETWEEN 1 AND 5),
  score_teamwork INTEGER CHECK (score_teamwork BETWEEN 1 AND 5),
  score_hygiene INTEGER CHECK (score_hygiene BETWEEN 1 AND 5),
  total_score INTEGER,
  concept TEXT CHECK (concept IN ('sobresaliente', 'satisfactorio', 'necesita_mejorar')),
  improvement_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view evals" ON public.performance_evaluations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR auth.uid() = evaluated_user_id);
CREATE POLICY "Admin can manage evals" ON public.performance_evaluations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador'));

-- =============================================
-- FINANCIERO: PLAN DE CUENTAS
-- =============================================
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('ingreso', 'gasto')) NOT NULL,
  parent_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view accounts" ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Admin can manage accounts" ON public.chart_of_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'administrativo'));

-- =============================================
-- FINANCIERO: TRANSACCIONES
-- =============================================
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_number TEXT,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  cost_center TEXT,
  description TEXT NOT NULL,
  income_amount NUMERIC DEFAULT 0,
  expense_amount NUMERIC DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  bank TEXT,
  client_supplier TEXT,
  payment_status TEXT CHECK (payment_status IN ('pagado', 'no_pagado', 'parcial')) DEFAULT 'pagado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view transactions" ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Finance can manage transactions" ON public.financial_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'administrativo'));

-- =============================================
-- FINANCIERO: FACTURAS
-- =============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  invoice_number TEXT,
  period TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('pagada', 'pendiente', 'vencida')) DEFAULT 'pendiente',
  due_date DATE,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Finance can manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'administrativo'));

-- =============================================
-- PROVEEDORES
-- =============================================
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nit TEXT,
  contact_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  products_services TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Finance can manage suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'administrativo'));

-- =============================================
-- DOCUMENTOS ADJUNTOS (general)
-- =============================================
CREATE TABLE public.document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view attachments" ON public.document_attachments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage attachments" ON public.document_attachments FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- =============================================
-- AUDITORÍA
-- =============================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "System can insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
CREATE POLICY "Staff can view documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can update documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.is_staff(auth.uid()));

-- Default rooms
INSERT INTO public.rooms (room_number, capacity, floor) VALUES
  ('101', 2, '1'), ('102', 2, '1'), ('103', 2, '1'),
  ('201', 2, '2'), ('202', 2, '2'), ('203', 2, '2');