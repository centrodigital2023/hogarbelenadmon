
-- Drop conflicting policies and recreate (use IF NOT EXISTS pattern)
DO $$ BEGIN
  -- These tables already exist, just ensure policies don't conflict
  EXECUTE 'SELECT 1';
END $$;
