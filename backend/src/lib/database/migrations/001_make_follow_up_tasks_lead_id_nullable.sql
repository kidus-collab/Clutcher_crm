-- Migration: Make follow_up_tasks.lead_id nullable
-- This allows creating general tasks not associated with specific leads

-- First, drop the existing foreign key constraint
ALTER TABLE follow_up_tasks DROP CONSTRAINT IF EXISTS follow_up_tasks_lead_id_fkey;

-- Add the foreign key constraint back with ON DELETE SET NULL
ALTER TABLE follow_up_tasks 
ADD CONSTRAINT follow_up_tasks_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- Note: The column should already be nullable, but if not, uncomment the following:
-- ALTER TABLE follow_up_tasks ALTER COLUMN lead_id DROP NOT NULL;