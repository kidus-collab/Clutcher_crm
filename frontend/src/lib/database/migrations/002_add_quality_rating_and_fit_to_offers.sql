-- Migration: Add quality rating and fit status to offers table
-- Run this in Supabase SQL Editor

-- Add log_quality_rating column
ALTER TABLE offers 
ADD COLUMN log_quality_rating INTEGER DEFAULT 0 CHECK (log_quality_rating >= 0 AND log_quality_rating <= 5);

-- Add bad_fit_good_fit column
ALTER TABLE offers 
ADD COLUMN bad_fit_good_fit TEXT DEFAULT 'Pending' CHECK (bad_fit_good_fit IN ('Pending', 'Bad Fit', 'Good Fit', 'Not Interested', 'Interested'));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_quality_rating ON offers(log_quality_rating);
CREATE INDEX IF NOT EXISTS idx_offers_fit_status ON offers(bad_fit_good_fit);