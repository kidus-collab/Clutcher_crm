-- Fix currency constraint to include ETB (Ethiopian Birr)
-- Run this in Supabase SQL Editor

-- Drop the existing check constraint
ALTER TABLE lead_financials DROP CONSTRAINT IF EXISTS lead_financials_currency_check;

-- Add new check constraint that includes only USD and ETB
ALTER TABLE lead_financials ADD CONSTRAINT lead_financials_currency_check
CHECK (currency IN ('USD', 'ETB'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) as consrc
FROM pg_constraint
WHERE conrelid = 'lead_financials'::regclass
  AND contype = 'c';