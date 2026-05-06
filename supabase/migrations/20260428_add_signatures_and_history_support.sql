-- Migration: Add signature fields and history/reexport support for wellness forms
-- Date: 2026-04-28
-- Purpose: Enable 180-day history, reexportation, and signature capture for HB-F9, HB-F10, HB-F11

-- =============================================
-- 1. ALTER TABLE therapy_records (HB-F9)
-- =============================================
ALTER TABLE public.therapy_records
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_role TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for 180-day queries
CREATE INDEX IF NOT EXISTS idx_therapy_records_created_at ON public.therapy_records(created_at DESC);

-- =============================================
-- 2. ALTER TABLE spiritual_records (HB-F11)
-- =============================================
ALTER TABLE public.spiritual_records
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_role TEXT,
ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for 180-day queries
CREATE INDEX IF NOT EXISTS idx_spiritual_records_created_at ON public.spiritual_records(created_at DESC);

-- =============================================
-- 3. ADD INDEX for psychosocial_records (HB-F10) if not exists
-- =============================================
CREATE INDEX IF NOT EXISTS idx_psychosocial_records_created_at ON public.psychosocial_records(created_at DESC);

-- Ensure responsible tracking
ALTER TABLE public.psychosocial_records
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_role TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- 4. Create composite indexes for efficient history queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_therapy_records_resident_created 
  ON public.therapy_records(resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_psychosocial_records_resident_created 
  ON public.psychosocial_records(resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spiritual_records_resident_created 
  ON public.spiritual_records(resident_id, created_at DESC);

-- =============================================
-- 5. GRANT permissions
-- =============================================
-- Ensure all staff can access these indexes
GRANT SELECT ON public.therapy_records TO authenticated;
GRANT SELECT ON public.psychosocial_records TO authenticated;
GRANT SELECT ON public.spiritual_records TO authenticated;
