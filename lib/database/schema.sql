-- ============================================
-- Clutcher CRM Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUSINESSES TABLE
-- Stores scraped business contacts
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  email TEXT,
  phone TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);

-- ============================================
-- SOCIAL PROFILES TABLE
-- Social media links for each business
-- ============================================
CREATE TABLE IF NOT EXISTS social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook')),
  url TEXT,
  handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_profiles_business ON social_profiles(business_id);

-- ============================================
-- LEADS TABLE
-- Businesses converted to leads
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'No Reply', 'Negotiations', 'Converted')),
  source TEXT DEFAULT 'Scraper',
  last_contact TIMESTAMPTZ,
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  outcome TEXT DEFAULT 'Pending' CHECK (outcome IN ('Pending', 'No Reply', 'Bad Fit', 'Interested', 'Converted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ============================================
-- LEAD TAGS TABLE
-- Tags/categories for leads
-- ============================================
CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(lead_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);

-- ============================================
-- DEALS TABLE
-- Sales pipeline deals
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  value DECIMAL(12,2) DEFAULT 0,
  stage TEXT DEFAULT 'New' CHECK (stage IN ('New', 'Qualified', 'Contacted', 'Proposal', 'Won')),
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  last_contact TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals(lead_id);

-- ============================================
-- ACTIVITIES TABLE
-- Activity log (emails, calls, meetings)
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('email', 'call', 'meeting', 'note', 'social')),
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);

-- ============================================
-- OUTREACH TRACKING TABLE
-- Tracks all outreach interactions and actions
-- ============================================
CREATE TABLE IF NOT EXISTS outreach_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('lead_selected', 'lead_clicked', 'outreach_button_clicked', 'email_sent', 'follow_up_scheduled', 'status_changed', 'social_clicked')),
  action_details JSONB, -- Store additional details like subject, note, new status, etc.
  source_page TEXT NOT NULL CHECK (source_page IN ('leads_page', 'outreach_page')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_outreach_tracking_lead ON outreach_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tracking_timestamp ON outreach_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_outreach_tracking_action ON outreach_tracking(action_type);
CREATE INDEX IF NOT EXISTS idx_outreach_tracking_source ON outreach_tracking(source_page);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable when adding authentication
-- ============================================
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE outreach_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at column
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- OFFERS TABLE
-- Stores deal offers and proposals
-- ============================================
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Proposal', 'Qualified', 'Contacted', 'Won', 'Lost')),
  value DECIMAL(12,2) DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_lead ON offers(lead_id);
CREATE INDEX IF NOT EXISTS idx_offers_stage ON offers(stage);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FOLLOW_UP_TASKS TABLE
-- Stores scheduled follow-up tasks for leads
-- ============================================
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_notes TEXT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_lead ON follow_up_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_date ON follow_up_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_status ON follow_up_tasks(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_follow_up_tasks_updated_at ON follow_up_tasks;
CREATE TRIGGER update_follow_up_tasks_updated_at
  BEFORE UPDATE ON follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for offers
alter table offers enable row level security;
create policy "Allow public access to offers" on offers for all using (true) with check (true);

-- ============================================
-- CLOSED_LEADS TABLE
-- Stores closed/converted leads with duration and analytics
-- ============================================
CREATE TABLE IF NOT EXISTS closed_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  duration INTEGER DEFAULT 0, -- Duration in days from lead creation to close
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  pipeline_value DECIMAL(12,2) DEFAULT 0,
  outcome TEXT DEFAULT 'Closed' CHECK (outcome IN ('Closed', 'Converted', 'Bad Fit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_closed_leads_lead ON closed_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_closed_leads_outcome ON closed_leads(outcome);
CREATE INDEX IF NOT EXISTS idx_closed_leads_created_at ON closed_leads(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_closed_leads_updated_at ON closed_leads;
CREATE TRIGGER update_closed_leads_updated_at
  BEFORE UPDATE ON closed_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for closed_leads
alter table closed_leads enable row level security;
create policy "Allow public access to closed_leads" on closed_leads for all using (true) with check (true);

-- Update leads status constraint to include new statuses
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
CHECK (status IN ('New', 'No Reply', 'Negotiations', 'Converted'));
