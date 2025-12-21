-- Migration: Create lead_financials table for money/contract values
-- Run this in Supabase SQL Editor

-- Create lead_financials table
CREATE TABLE IF NOT EXISTS lead_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  contract_value DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'ETB')),
  payment_terms TEXT DEFAULT 'Net 30' CHECK (payment_terms IN ('Net 15', 'Net 30', 'Net 45', 'Net 60', 'Immediate', 'Milestone')),
  contract_type TEXT DEFAULT 'Fixed' CHECK (contract_type IN ('Fixed', 'Hourly', 'Retainer', 'Milestone')),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Negotiating')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_financials_lead ON lead_financials(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_financials_offer ON lead_financials(offer_id);
CREATE INDEX IF NOT EXISTS idx_lead_financials_status ON lead_financials(status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_lead_financials_updated_at ON lead_financials;
CREATE TRIGGER update_lead_financials_updated_at
  BEFORE UPDATE ON lead_financials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for lead_financials
ALTER TABLE lead_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to lead_financials" ON lead_financials FOR ALL USING (true) WITH CHECK (true);