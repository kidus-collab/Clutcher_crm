
export type DealStage = 'New' | 'Qualified' | 'Contacted' | 'Proposal' | 'Won';

export interface SocialProfile {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'telegram';
  url: string;
  handle: string;
}

export interface Business {
  id: string;
  name: string;
  website: string;
  email: string; // Generic business email
  phone: string;
  socials: SocialProfile[];
  description?: string;
}

export interface Lead {
  id: string;
  business: Business;
  status: 'Hot' | 'Cold' | 'New' | 'Warm' | 'Converted' | 'Lost' | 'Closed' | 'Outreach' | 'No Reply' | 'Negotiations';
  source: string;
  lastContact: string;
  tags: string[];
  rating?: number; // 1-5 stars
  outcome?: 'Pending' | 'No Reply' | 'Bad Fit' | 'Interested' | 'Converted' | 'Good Fit';
  createdAt?: string;
  estimatedValue?: number; // Pipeline value estimate
  daysInStage?: number; // Days in current stage
  duration?: number; // Duration in days (alias for daysInStage)
  pipelineValue?: number; // Pipeline value (alias for estimatedValue)
  caseStudy?: string; // Case study details for successful conversions
}

export interface Deal {
  id: string;
  leadId?: string; // Link back to the lead
  title: string;
  company: string;
  value: number;
  stage: DealStage;
  lastContact: string;
  probability: number;
  platform?: string; // Channel used (legacy support or DB derived)
}

export interface Offer {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  value: number;
  stage: 'Proposal' | 'Qualified' | 'Contacted' | 'Won' | 'Lost';
  probability: number;
  logQualityRating?: number; // 1-5 stars
  badFitGoodFit?: string; // 'Pending' | 'Bad Fit' | 'Good Fit' | 'Not Interested' | 'Interested'
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    business: Business;
  };
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  delta: string;
  isPositive: boolean;
  icon: string;
}

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'social';
  description: string;
  timestamp: string;
  isCompleted: boolean;
}
