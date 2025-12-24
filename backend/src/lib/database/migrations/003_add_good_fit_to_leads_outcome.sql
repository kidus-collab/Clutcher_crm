-- Migration: Add 'Good Fit' to leads table outcome constraint
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_outcome_check;

-- Add the updated constraint that includes 'Good Fit'
ALTER TABLE leads ADD CONSTRAINT leads_outcome_check
CHECK (outcome IN ('Pending', 'No Reply', 'Bad Fit', 'Good Fit', 'Interested', 'Converted'));