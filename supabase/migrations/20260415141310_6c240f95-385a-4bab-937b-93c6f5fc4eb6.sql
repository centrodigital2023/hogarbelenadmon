ALTER TABLE public.admission_checklists ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.admission_checklists DROP CONSTRAINT IF EXISTS admission_checklists_created_by_fkey;
ALTER TABLE public.admission_checklists ADD CONSTRAINT admission_checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.belongings_inventory ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.belongings_inventory DROP CONSTRAINT IF EXISTS belongings_inventory_created_by_fkey;
ALTER TABLE public.belongings_inventory ADD CONSTRAINT belongings_inventory_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.celebrations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.celebrations DROP CONSTRAINT IF EXISTS celebrations_created_by_fkey;
ALTER TABLE public.celebrations ADD CONSTRAINT celebrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.daily_logs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_created_by_fkey;
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.disinfection_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.disinfection_records DROP CONSTRAINT IF EXISTS disinfection_records_created_by_fkey;
ALTER TABLE public.disinfection_records ADD CONSTRAINT disinfection_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.document_attachments DROP CONSTRAINT IF EXISTS document_attachments_uploaded_by_fkey;
ALTER TABLE public.document_attachments ADD CONSTRAINT document_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.emergency_folders DROP CONSTRAINT IF EXISTS emergency_folders_reviewed_by_fkey;
ALTER TABLE public.emergency_folders ADD CONSTRAINT emergency_folders_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.financial_transactions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_created_by_fkey;
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.food_intake_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.food_intake_records DROP CONSTRAINT IF EXISTS food_intake_records_created_by_fkey;
ALTER TABLE public.food_intake_records ADD CONSTRAINT food_intake_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.fridge_temps ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.fridge_temps DROP CONSTRAINT IF EXISTS fridge_temps_created_by_fkey;
ALTER TABLE public.fridge_temps ADD CONSTRAINT fridge_temps_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.geriatric_assessments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.geriatric_assessments DROP CONSTRAINT IF EXISTS geriatric_assessments_created_by_fkey;
ALTER TABLE public.geriatric_assessments ADD CONSTRAINT geriatric_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.incidents ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_created_by_fkey;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.kitchen_checklists ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.kitchen_checklists DROP CONSTRAINT IF EXISTS kitchen_checklists_created_by_fkey;
ALTER TABLE public.kitchen_checklists ADD CONSTRAINT kitchen_checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.life_histories ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.life_histories DROP CONSTRAINT IF EXISTS life_histories_created_by_fkey;
ALTER TABLE public.life_histories ADD CONSTRAINT life_histories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.medical_appointments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.medical_appointments DROP CONSTRAINT IF EXISTS medical_appointments_created_by_fkey;
ALTER TABLE public.medical_appointments ADD CONSTRAINT medical_appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.medication_admin ALTER COLUMN administered_by DROP NOT NULL;
ALTER TABLE public.medication_admin DROP CONSTRAINT IF EXISTS medication_admin_administered_by_fkey;
ALTER TABLE public.medication_admin ADD CONSTRAINT medication_admin_administered_by_fkey FOREIGN KEY (administered_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.medications ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS medications_created_by_fkey;
ALTER TABLE public.medications ADD CONSTRAINT medications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.performance_evaluations ALTER COLUMN evaluated_by DROP NOT NULL;
ALTER TABLE public.performance_evaluations ALTER COLUMN evaluated_user_id DROP NOT NULL;
ALTER TABLE public.performance_evaluations DROP CONSTRAINT IF EXISTS performance_evaluations_evaluated_by_fkey;
ALTER TABLE public.performance_evaluations DROP CONSTRAINT IF EXISTS performance_evaluations_evaluated_user_id_fkey;
ALTER TABLE public.performance_evaluations ADD CONSTRAINT performance_evaluations_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.performance_evaluations ADD CONSTRAINT performance_evaluations_evaluated_user_id_fkey FOREIGN KEY (evaluated_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.post_hospitalization ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.post_hospitalization DROP CONSTRAINT IF EXISTS post_hospitalization_created_by_fkey;
ALTER TABLE public.post_hospitalization ADD CONSTRAINT post_hospitalization_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.pqrsf DROP CONSTRAINT IF EXISTS pqrsf_created_by_fkey;
ALTER TABLE public.pqrsf ADD CONSTRAINT pqrsf_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.psychosocial_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.psychosocial_records DROP CONSTRAINT IF EXISTS psychosocial_records_created_by_fkey;
ALTER TABLE public.psychosocial_records ADD CONSTRAINT psychosocial_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.spiritual_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.spiritual_records DROP CONSTRAINT IF EXISTS spiritual_records_created_by_fkey;
ALTER TABLE public.spiritual_records ADD CONSTRAINT spiritual_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.therapeutic_activities ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.therapeutic_activities DROP CONSTRAINT IF EXISTS therapeutic_activities_created_by_fkey;
ALTER TABLE public.therapeutic_activities ADD CONSTRAINT therapeutic_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.therapy_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.therapy_records DROP CONSTRAINT IF EXISTS therapy_records_created_by_fkey;
ALTER TABLE public.therapy_records ADD CONSTRAINT therapy_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.trainings ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_created_by_fkey;
ALTER TABLE public.trainings ADD CONSTRAINT trainings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vital_signs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.vital_signs DROP CONSTRAINT IF EXISTS vital_signs_created_by_fkey;
ALTER TABLE public.vital_signs ADD CONSTRAINT vital_signs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;