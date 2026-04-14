ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_shift_check;
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_shift_check CHECK (shift IN ('mañana', 'tarde', 'noche'));