-- Fix for follow_up_tasks table to allow NULL lead_id for general tasks
-- Run this in Supabase SQL Editor

-- Drop existing foreign key constraint
ALTER TABLE follow_up_tasks DROP CONSTRAINT IF EXISTS follow_up_tasks_lead_id_fkey;

-- Add the foreign key constraint back with ON DELETE SET NULL (allows NULL values)
ALTER TABLE follow_up_tasks 
ADD CONSTRAINT follow_up_tasks_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- Make the column nullable (if it's not already)
ALTER TABLE follow_up_tasks ALTER COLUMN lead_id DROP NOT NULL;