
-- Drop and recreate all FK constraints referencing residents with ON DELETE CASCADE

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_resident_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.admission_checklists DROP CONSTRAINT IF EXISTS admission_checklists_resident_id_fkey;
ALTER TABLE public.admission_checklists ADD CONSTRAINT admission_checklists_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.belongings_inventory DROP CONSTRAINT IF EXISTS belongings_inventory_resident_id_fkey;
ALTER TABLE public.belongings_inventory ADD CONSTRAINT belongings_inventory_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.care_plans DROP CONSTRAINT IF EXISTS care_plans_resident_id_fkey;
ALTER TABLE public.care_plans ADD CONSTRAINT care_plans_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.companion_authorizations DROP CONSTRAINT IF EXISTS companion_authorizations_resident_id_fkey;
ALTER TABLE public.companion_authorizations ADD CONSTRAINT companion_authorizations_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_resident_id_fkey;
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.emergency_folders DROP CONSTRAINT IF EXISTS emergency_folders_resident_id_fkey;
ALTER TABLE public.emergency_folders ADD CONSTRAINT emergency_folders_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.geriatric_assessments DROP CONSTRAINT IF EXISTS geriatric_assessments_resident_id_fkey;
ALTER TABLE public.geriatric_assessments ADD CONSTRAINT geriatric_assessments_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.hygiene_kits DROP CONSTRAINT IF EXISTS hygiene_kits_resident_id_fkey;
ALTER TABLE public.hygiene_kits ADD CONSTRAINT hygiene_kits_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_resident_id_fkey;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.life_histories DROP CONSTRAINT IF EXISTS life_histories_resident_id_fkey;
ALTER TABLE public.life_histories ADD CONSTRAINT life_histories_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.medical_appointments DROP CONSTRAINT IF EXISTS medical_appointments_resident_id_fkey;
ALTER TABLE public.medical_appointments ADD CONSTRAINT medical_appointments_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.medication_admin DROP CONSTRAINT IF EXISTS medication_admin_resident_id_fkey;
ALTER TABLE public.medication_admin ADD CONSTRAINT medication_admin_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS medications_resident_id_fkey;
ALTER TABLE public.medications ADD CONSTRAINT medications_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.nursing_notes DROP CONSTRAINT IF EXISTS nursing_notes_resident_id_fkey;
ALTER TABLE public.nursing_notes ADD CONSTRAINT nursing_notes_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE public.post_hospitalization DROP CONSTRAINT IF EXISTS post_hospitalization_resident_id_fkey;
ALTER TABLE public.post_hospitalization ADD CONSTRAINT post_hospitalization_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;
