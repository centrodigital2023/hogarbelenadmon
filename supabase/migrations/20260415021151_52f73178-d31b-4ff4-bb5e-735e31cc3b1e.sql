
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS blood_pressure text,
  ADD COLUMN IF NOT EXISTS spo2 integer,
  ADD COLUMN IF NOT EXISTS temperature numeric,
  ADD COLUMN IF NOT EXISTS glucose integer,
  ADD COLUMN IF NOT EXISTS heart_rate integer,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS vital_notes text,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS responsible_role text;
