import { createClient } from '@supabase/supabase-js';
import { Business, Lead, Deal, Activity, SocialProfile } from '../../types';

// Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Database features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================
// BUSINESS OPERATIONS
// ============================================

/**
 * Save a business to the database
 * Uses insert-or-select approach to avoid needing unique constraint on website
 */
export async function saveBusiness(business: Omit<Business, 'id'>): Promise<Business | null> {
  console.log('=== saveBusiness START ===');
  console.log('Business data received:', business.name, business.website);
  
  if (!supabase) {
    console.error('FAILURE: Supabase client is null - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return null;
  }
  
  try {
    // First, check if business with this website already exists
    const { data: existingBusiness, error: selectError } = await supabase
      .from('businesses')
      .select('*')
      .eq('website', business.website)
      .maybeSingle();
    
    if (selectError) {
      console.error('Error checking for existing business:', selectError);
      throw new Error(`Database Error: ${selectError.message}`);
    }
    
    let data;
    
    if (existingBusiness) {
      // Business exists, update it
      console.log('Business already exists, updating:', existingBusiness.id);
      const { data: updatedData, error: updateError } = await supabase
        .from('businesses')
        .update({
          name: business.name,
          email: business.email,
          phone: business.phone,
          description: business.description,
        })
        .eq('id', existingBusiness.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating business:', updateError);
        throw new Error(`Database Error: ${updateError.message}`);
      }
      data = updatedData;
    } else {
      // Business doesn't exist, insert it
      console.log('Inserting new business...');
      const { data: insertedData, error: insertError } = await supabase
        .from('businesses')
        .insert({
          name: business.name,
          website: business.website,
          email: business.email,
          phone: business.phone,
          description: business.description,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error inserting business:', insertError);
        console.error('Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`Database Error: ${insertError.message} (${insertError.code})`);
      }
      data = insertedData;
    }
    
    if (!data) {
      console.error('No data returned from database operation');
      return null;
    }
    
    console.log('Business saved with ID:', data.id);
    
    // Save social profiles (delete old ones first, then insert new)
    if (business.socials && business.socials.length > 0) {
      console.log('Saving social profiles...');
      
      // Delete existing social profiles for this business
      await supabase
        .from('social_profiles')
        .delete()
        .eq('business_id', data.id);
      
      // Insert new social profiles
      const { error: socialError } = await supabase
        .from('social_profiles')
        .insert(
          business.socials.map(social => ({
            business_id: data.id,
            platform: social.platform,
            url: social.url,
            handle: social.handle,
          }))
        );
      
      if (socialError) {
        console.error('Error saving social profiles:', socialError);
        // Don't fail the whole operation for social profiles
      }
    }
    
    console.log('=== saveBusiness SUCCESS ===');
    return {
      ...data,
      socials: business.socials || [],
    };
  } catch (error) {
    console.error('saveBusiness exception:', error);
    throw error;
  }
}

/**
 * Save multiple businesses at once
 */
export async function saveBusinesses(businesses: Omit<Business, 'id'>[]): Promise<Business[]> {
  if (!supabase) return [];
  
  const savedBusinesses: Business[] = [];
  
  for (const business of businesses) {
    try {
      const saved = await saveBusiness(business);
      if (saved) {
        savedBusinesses.push(saved);
      }
    } catch (err) {
      console.error('Error saving business in batch:', business.name, err);
      // Continue with next business instead of failing entirely
    }
  }
  
  return savedBusinesses;
}

/**
 * Get all businesses
 */
export async function getBusinesses(): Promise<Business[]> {
  if (!supabase) return [];
  
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select(`
      *,
      social_profiles (*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }
  
  return businesses.map(b => ({
    id: b.id,
    name: b.name,
    website: b.website || '',
    email: b.email || '',
    phone: b.phone || '',
    description: b.description,
    socials: (b.social_profiles || []).map((sp: any) => ({
      platform: sp.platform,
      url: sp.url,
      handle: sp.handle,
    })),
  }));
}

// ============================================
// LEAD OPERATIONS
// ============================================

/**
 * Add a business as a lead
 */
export async function addToLeads(businessId: string, tags: string[] = []): Promise<Lead | null> {
  if (!supabase) return null;
  
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      business_id: businessId,
      status: 'New',
      source: 'Scraper',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding lead:', error);
    return null;
  }
  
  // Add tags
  if (tags.length > 0) {
    await supabase
      .from('lead_tags')
      .insert(tags.map(tag => ({
        lead_id: lead.id,
        tag,
      })));
  }
  
  // Fetch the business data
  const { data: business } = await supabase
    .from('businesses')
    .select(`*, social_profiles (*)`)
    .eq('id', businessId)
    .single();
  
  return {
    id: lead.id,
    business: {
      id: business.id,
      name: business.name,
      website: business.website || '',
      email: business.email || '',
      phone: business.phone || '',
      socials: (business.social_profiles || []).map((sp: any) => ({
        platform: sp.platform,
        url: sp.url,
        handle: sp.handle,
      })),
    },
    status: lead.status,
    source: lead.source,
    lastContact: lead.last_contact || 'Never',
    tags,
    rating: lead.rating,
    outcome: lead.outcome,
  };
}

/**
 * Get all leads with their business info
 */
export async function getLeads(): Promise<Lead[]> {
  if (!supabase) return [];
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      businesses (*,
        social_profiles (*)
      ),
      lead_tags (tag)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }
  
  return leads.map(l => ({
    id: l.id,
    business: {
      id: l.businesses.id,
      name: l.businesses.name,
      website: l.businesses.website || '',
      email: l.businesses.email || '',
      phone: l.businesses.phone || '',
      socials: (l.businesses.social_profiles || []).map((sp: any) => ({
        platform: sp.platform,
        url: sp.url,
        handle: sp.handle,
      })),
    },
    status: l.status,
    source: l.source,
    lastContact: l.last_contact || 'Never',
    tags: (l.lead_tags || []).map((t: any) => t.tag),
    rating: l.rating,
    outcome: l.outcome,
    createdAt: l.created_at,
  }));
}

/**
 * Update lead status
 */
/**
 * Update lead status
 */
export async function updateLeadStatus(
  leadId: string,
  status: any, // Use any to accommodate additional statuses
  outcome?: Lead['outcome'],
  rating?: number
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database client not initialized' };
  
  const updates: any = { status, last_contact: new Date().toISOString() };
  if (outcome) {
    updates.outcome = outcome;
  }
  if (rating !== undefined) {
    updates.rating = rating;
  }
  
  console.log(`Updating lead ${leadId} status to ${status}...`);
  
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId);
  
  if (error) {
    console.error('Error updating lead status:', error);
    return { success: false, error: error.message };
  }
  
  console.log('Lead status updated successfully');
  return { success: true };
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
  if (!supabase) return null;
  
  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      businesses (*,
        social_profiles (*)
      ),
      lead_tags (tag)
    `)
    .eq('id', leadId)
    .single();
  
  if (error || !lead) {
    console.error('Error fetching lead:', error);
    return null;
  }
  
  return {
    id: lead.id,
    business: {
      id: lead.businesses.id,
      name: lead.businesses.name,
      website: lead.businesses.website || '',
      email: lead.businesses.email || '',
      phone: lead.businesses.phone || '',
      socials: (lead.businesses.social_profiles || []).map((sp: any) => ({
        platform: sp.platform,
        url: sp.url,
        handle: sp.handle,
      })),
    },
    status: lead.status,
    source: lead.source,
    lastContact: lead.last_contact || 'Never',
    tags: (lead.lead_tags || []).map((t: any) => t.tag),
    rating: lead.rating,
    outcome: lead.outcome,
    createdAt: lead.created_at,
  };
}

// ============================================
// DEAL OPERATIONS
// ============================================

/**
 * Create a deal from a lead
 */
export async function createDeal(
  leadId: string,
  title: string,
  company: string,
  value: number,
  stage: Deal['stage'] = 'New',
  probability: number = 10
): Promise<Deal | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('deals')
    .insert({
      lead_id: leadId,
      title,
      company,
      value,
      stage,
      probability,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating deal:', error);
    return null;
  }
  
  return {
    id: data.id,
    title: data.title,
    company: data.company,
    value: data.value,
    stage: data.stage,
    lastContact: data.last_contact || 'Just now',
    probability: data.probability,
  };
}

/**
 * Create a direct deal (not from a lead)
 */
export async function createDirectDeal(
  title: string,
  company: string,
  value: number,
  stage: Deal['stage'] = 'New',
  probability: number = 10
): Promise<Deal | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('deals')
    .insert({
      title,
      company,
      value,
      stage,
      last_contact: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating direct deal:', error);
    return null;
  }
  
  return {
    id: data.id,
    title: data.title,
    company: data.company,
    value: data.value,
    stage: data.stage,
    lastContact: data.last_contact || 'Just now',
    probability: data.probability,
  };
}

/**
 * Get all deals
 */
export async function getDeals(): Promise<Deal[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
  
  return data.map(d => ({
    id: d.id,
    title: d.title,
    company: d.company,
    value: d.value,
    stage: d.stage,
    lastContact: d.last_contact || 'Never',
    probability: d.probability,
  }));
}

/**
 * Update deal stage
 */
export async function updateDealStage(dealId: string, stage: Deal['stage']): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('deals')
    .update({ stage, last_contact: new Date().toISOString() })
    .eq('id', dealId);
  
  return !error;
}

// ============================================
// ACTIVITY OPERATIONS
// ============================================

/**
 * Log an activity (can be scheduled for future)
 */
export async function logActivity(
  type: Activity['type'],
  description: string,
  leadId?: string,
  dealId?: string,
  timestamp?: string // Optional future date
): Promise<Activity | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('activities')
    .insert({
      type,
      description,
      lead_id: leadId,
      deal_id: dealId,
      timestamp: timestamp || new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error logging activity:', error);
    return null;
  }
  
  return {
    id: data.id,
    type: data.type,
    description: data.description,
    timestamp: data.timestamp,
    isCompleted: data.is_completed,
  };
}

/**
 * Get all activities (can filter by upcoming)
 */
export async function getActivities(limit: number = 10, upcomingOnly: boolean = false): Promise<Activity[]> {
  if (!supabase) return [];
  
  let query = supabase
    .from('activities')
    .select('*')
    .order('timestamp', { ascending: upcomingOnly }); // Upcoming: ascending (soonest first)
    
  if (upcomingOnly) {
    query = query.gt('timestamp', new Date().toISOString());
  } else {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
  
  return data.map(a => ({
    id: a.id,
    type: a.type,
    description: a.description,
    timestamp: a.timestamp,
    isCompleted: a.is_completed,
  }));
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);
    
  if (error) {
    console.error('Error deleting lead:', error);
    return false;
  }
  return true;
}

/**
 * Get Dashboard Stats
 */
export async function getDashboardStats() {
  if (!supabase) return { closed: 0, unclosed: 0, outreach: 0, total: 0 };
  
  // We can optimize this with Supabase output count, but for now fetching all leads is okay for small datasets
  // Or use .count() queries
  
  const { count: closedCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Closed');

  const { count: outreachCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Outreach'); // Assuming 'Outreach' status exists, or we check activities

  const { count: allCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });
    
  // Unclosed = Total - Closed
  const unclosedCount = (allCount || 0) - (closedCount || 0);

  return {
    closed: closedCount || 0,
    unclosed: unclosedCount,
    outreach: outreachCount || 0,
    total: allCount || 0
  };
}

// ============================================
// FOLLOW-UP TASKS OPERATIONS
// ============================================

/**
 * Create a follow-up task
 */
export async function createFollowUpTask(
  leadId: string,
  taskTitle: string,
  taskNotes: string,
  scheduledDate: string,
  priority: 'Low' | 'Medium' | 'High' = 'Medium'
): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('follow_up_tasks')
    .insert({
      lead_id: leadId,
      task_title: taskTitle,
      task_notes: taskNotes,
      scheduled_date: scheduledDate,
      status: 'Pending',
      priority
    });
    
  if (error) {
    console.error('Error creating follow-up task:', error);
    return false;
  }
  return true;
}

// ============================================
// OFFERS OPERATIONS
// ============================================

/**
 * Create an offer
 */
export async function createOffer(
  leadId: string,
  title: string,
  value?: number,
  stage: 'Proposal' | 'Qualified' | 'Contacted' | 'Won' | 'Lost' = 'Proposal',
  probability: number = 0
): Promise<{ success: boolean; duplicate?: boolean }> {
  if (!supabase) return { success: false };
  
  // Check for existing offer
  const { data: existing } = await supabase
    .from('offers')
    .select('id')
    .eq('lead_id', leadId)
    .single();
    
  if (existing) {
    return { success: false, duplicate: true };
  }
  
  const { error } = await supabase
    .from('offers')
    .insert({
      lead_id: leadId,
      title,
      value: value || 0,
      stage,
      probability
    });
    
  if (error) {
    console.error('Error creating offer:', error, error.message, error.details);
    return { success: false };
  }
  return { success: true };
}

/**
 * Get all offers
 */
export async function getOffers(): Promise<any[]> {
  if (!supabase) return [];
  
  const { data: offers, error } = await supabase
    .from('offers')
    .select(`
      *,
      leads (
        id,
        businesses (
          id,
          name,
          website,
          email,
          phone,
          social_profiles (
            platform,
            url,
            handle
          )
        )
      )
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching offers:', error);
    return [];
  }
  
  return offers.map(offer => {
    const lead = offer.leads || {};
    const business = lead.businesses || {};
    const socials = business.social_profiles || [];
    
    return {
      id: offer.id,
      leadId: offer.lead_id,
      title: offer.title,
      description: offer.description,
      value: offer.value,
      stage: offer.stage,
      probability: offer.probability,
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
      lead: {
        id: lead.id || '',
        business: {
          id: business.id || '',
          name: business.name || 'Unknown Business',
          website: business.website || '',
          email: business.email || '',
          phone: business.phone || '',
          socials: socials.map((sp: any) => ({
            platform: sp.platform,
            url: sp.url,
            handle: sp.handle
          }))
        }
      }
    };
  });
}

/**
 * Update offer stage
 */
export async function updateOfferStage(
  offerId: string,
  stage: 'Proposal' | 'Qualified' | 'Contacted' | 'Won' | 'Lost'
): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('offers')
    .update({
      stage,
      updated_at: new Date().toISOString()
    })
    .eq('id', offerId);
    
  if (error) {
    console.error('Error updating offer stage:', error);
    return false;
  }
  return true;
}

/**
 * Delete an offer
 */
export async function deleteOffer(offerId: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', offerId);
    
  if (error) {
    console.error('Error deleting offer:', error);
    return false;
  }
  return true;
}

/**
 * Get all follow-up tasks
 */
export async function getFollowUpTasks(): Promise<any[]> {
  if (!supabase) return [];
  
  const { data: tasks, error } = await supabase
    .from('follow_up_tasks')
    .select(`
      *,
      leads (
        id,
        businesses (
          id,
          name,
          website,
          email
        )
      )
    `)
    .order('scheduled_date', { ascending: true });
    
  if (error) {
    console.error('Error fetching follow-up tasks:', error);
    return [];
  }
  
  return tasks.map(task => ({
    id: task.id,
    leadId: task.lead_id,
    taskTitle: task.task_title,
    taskNotes: task.task_notes,
    scheduledDate: task.scheduled_date,
    status: task.status,
    priority: task.priority,
    createdAt: task.created_at,
    completedAt: task.completed_at,
    lead: task.leads ? {
      id: task.leads.id,
      business: task.leads.businesses ? {
        id: task.leads.businesses.id,
        name: task.leads.businesses.name,
        website: task.leads.businesses.website,
        email: task.leads.businesses.email
      } : { name: 'Unknown Business' }
    } : null 
  }));
}

/**
 * Update follow-up task status
 */
export async function updateFollowUpTaskStatus(
  taskId: string,
  status: 'Pending' | 'Completed' | 'Cancelled'
): Promise<boolean> {
  if (!supabase) return false;
  
  const updates: any = { status };
  if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('follow_up_tasks')
    .update(updates)
    .eq('id', taskId);
    
  if (error) {
    console.error('Error updating follow-up task:', error);
    return false;
  }
  return true;
}

// ============================================
// OUTREACH TRACKING OPERATIONS
// ============================================

/**
 * Get leads from outreach_tracking table for No Reply column
 */
export async function getOutreachTrackingLeads(): Promise<any[]> {
  if (!supabase) return [];
  
  const { data: trackingData, error } = await supabase
    .from('outreach_tracking')
    .select(`
      *,
      leads (
        id,
        businesses (
          id,
          name,
          website,
          email,
          phone,
          social_profiles (
            platform,
            url,
            handle
          )
        )
      )
    `)
    .order('timestamp', { ascending: false });
    
  if (error) {
    console.error('Error fetching outreach tracking leads:', error);
    return [];
  }
  
  // Get unique lead IDs to avoid duplicates
  const uniqueLeadIds = new Set();
  const uniqueTrackingData = (trackingData || []).filter(track => {
    const leadId = track.leads?.id || track.id;
    if (uniqueLeadIds.has(leadId)) {
      return false; // Skip duplicate
    }
    uniqueLeadIds.add(leadId);
    return true;
  });
  
  return uniqueTrackingData.map(track => ({
    id: track.leads?.id || track.id,
    business: track.leads?.businesses ? {
      id: track.leads.businesses.id,
      name: track.leads.businesses.name,
      website: track.leads.businesses.website || '',
      email: track.leads.businesses.email || '',
      phone: track.leads.businesses.phone || '',
      socials: (track.leads.businesses.social_profiles || []).map((sp: any) => ({
        platform: sp.platform,
        url: sp.url,
        handle: sp.handle,
      })),
    } : { name: 'Unknown Business' },
    status: 'No Reply',
    source: 'Outreach Tracking',
    lastContact: track.timestamp || 'Never',
    tags: [],
    rating: 0,
    outcome: 'No Reply',
    createdAt: track.created_at,
  }));
}

/**
 * Get leads from offers table for Negotiations column
 */
export async function getOffersLeads(): Promise<any[]> {
  if (!supabase) return [];
  
  const { data: offersData, error } = await supabase
    .from('offers')
    .select(`
      *,
      leads (
        id,
        businesses (
          id,
          name,
          website,
          email,
          phone,
          social_profiles (
            platform,
            url,
            handle
          )
        )
      )
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching offers leads:', error);
    return [];
  }
  
  // Get unique lead IDs to avoid duplicates
  const uniqueLeadIds = new Set();
  const uniqueOffersData = offersData.filter(offer => {
    const leadId = offer.leads?.id || offer.id;
    if (uniqueLeadIds.has(leadId)) {
      return false; // Skip duplicate
    }
    uniqueLeadIds.add(leadId);
    return true;
  });
  
  return uniqueOffersData.map(offer => ({
    id: offer.leads?.id || offer.id,
    business: offer.leads?.businesses ? {
      id: offer.leads.businesses.id,
      name: offer.leads.businesses.name,
      website: offer.leads.businesses.website || '',
      email: offer.leads.businesses.email || '',
      phone: offer.leads.businesses.phone || '',
      socials: (offer.leads.businesses.social_profiles || []).map((sp: any) => ({
        platform: sp.platform,
        url: sp.url,
        handle: sp.handle,
      })),
    } : { name: 'Unknown Business' },
    status: 'Negotiations',
    source: 'Offer',
    lastContact: offer.created_at || 'Never',
    tags: [],
    rating: 0,
    outcome: 'Interested',
    createdAt: offer.created_at,
  }));
}

/**
 * Delete a follow-up task
 */
export async function deleteFollowUpTask(taskId: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('follow_up_tasks')
    .delete()
    .eq('id', taskId);
    
  if (error) {
    console.error('Error deleting follow-up task:', error);
    return false;
  }
  return true;
}

/**
 * Add lead to closed_leads table
 */
export async function addClosedLead(
  leadId: string,
  businessName: string,
  duration: number, // Time difference in days
  rating: number,
  pipelineValue: number,
  outcome: string
): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('closed_leads')
    .insert({
      lead_id: leadId,
      business_name: businessName,
      duration: duration,
      rating: rating,
      pipeline_value: pipelineValue,
      outcome: outcome
    });
    
  if (error) {
    console.error('Error adding closed lead:', error);
    return false;
  }
  
  return true;
}

/**
 * Get leads from closed_leads table
 */
export async function getClosedLeads(): Promise<any[]> {
  if (!supabase) return [];
  
  const { data: closedLeads, error } = await supabase
    .from('closed_leads')
    .select(`
      *,
      leads (
        id,
        businesses (
          id,
          name,
          website,
          email,
          phone,
          social_profiles (
            platform,
            url,
            handle
          )
        )
      )
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching closed leads:', error);
    return [];
  }
  
  return closedLeads.map(lead => ({
    id: lead.id,
    business: lead.leads?.businesses ? {
      id: lead.leads.businesses.id,
      name: lead.leads.businesses.name,
      website: lead.leads.businesses.website || '',
      email: lead.leads.businesses.email || '',
      phone: lead.leads.businesses.phone || '',
      socials: (lead.leads.businesses.social_profiles || []).map((sp: any) => ({
        platform: sp.platform,
        url: sp.url,
        handle: sp.handle,
      })),
    } : { name: 'Unknown Business' },
    status: 'Closed',
    source: 'Closed',
    lastContact: lead.created_at || 'Never',
    tags: [],
    rating: lead.rating,
    outcome: lead.outcome,
    createdAt: lead.created_at,
    duration: lead.duration,
    daysInStage: lead.duration, // Map duration to daysInStage for consistency
    pipelineValue: lead.pipeline_value,
    estimatedValue: lead.pipeline_value, // Map pipeline_value to estimatedValue for consistency
  }));
}

/**
 * Log outreach tracking event
 */
export async function logOutreachTracking(
  leadId: string,
  businessName: string,
  actionType: string,
  actionDetails: any,
  sourcePage: string = 'outreach_page'
): Promise<{ success: boolean; duplicate?: boolean }> {
  if (!supabase) return { success: false };
  
  // Check for existing entry to prevent redundancy
  const { data: existing } = await supabase
    .from('outreach_tracking')
    .select('id')
    .eq('lead_id', leadId)
    .single();
    
  if (existing) {
    return { success: false, duplicate: true };
  }
  
  const { error } = await supabase
    .from('outreach_tracking')
    .insert({
      lead_id: leadId,
      business_name: businessName,
      action_type: actionType,
      action_details: actionDetails,
      source_page: sourcePage,
      timestamp: new Date().toISOString()
    });
    
  if (error) {
    console.error('Error logging outreach tracking:', error);
    return { success: false };
  }
  
  return { success: true };
}

/**
 * Get the total number of outreach actions sent
 */
export async function getOutreachSentCount(): Promise<number> {
  if (!supabase) return 0;
  
  const { count, error } = await supabase
    .from('outreach_tracking')
    .select('*', { count: 'exact', head: true })
    .in('action_type', ['email_sent', 'social_clicked', 'outreach_button_clicked']);
    
  if (error) {
    console.error('Error fetching outreach sent count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Delete lead from outreach_tracking table
 */
export async function deleteOutreachTracking(leadId: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('outreach_tracking')
    .delete()
    .eq('lead_id', leadId);
    
  if (error) {
    console.error('Error deleting from outreach tracking:', error);
    return false;
  }
  
  return true;
}

// ============================================
// CONSOLIDATED DEALS OPERATIONS
// ============================================

/**
 * Get consolidated deals from multiple source tables
 * Pulls from leads, outreach_tracking, and follow_up_tasks
 * Maps to appropriate deal stages
 */
export async function getConsolidatedDeals(): Promise<Deal[]> {
  if (!supabase) return [];
  
  const consolidatedDeals: Deal[] = [];
  
  try {
    // 1. Get leads from leads table (status: 'New')
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select(`
        *,
        businesses (
          id,
          name,
          website,
          email,
          phone,
          social_profiles (
            platform,
            url,
            handle
          )
        )
      `)
      .eq('status', 'New')
      .order('created_at', { ascending: false });
    
    if (leadsError) {
      console.error('Error fetching leads for deals:', leadsError);
    } else {
      // Map leads to deals with 'New' status
      (leadsData || []).forEach(lead => {
        const business = lead.businesses || {};
        consolidatedDeals.push({
          id: `lead_${lead.id}`,
          leadId: lead.id,
          title: `New Lead: ${business.name || 'Unknown Company'}`,
          company: business.name || 'Unknown Company',
          value: 0, // $0 for New stage
          stage: 'New',
          lastContact: lead.last_contact || 'Never',
          probability: 10, // Default probability for new leads
        });
      });
    }

    // 2. Get leads from outreach_tracking table (status: 'Qualified' or 'Contacted')
    const { data: outreachData, error: outreachError } = await supabase
      .from('outreach_tracking')
      .select(`
        *,
        leads (
          id,
          businesses (
            id,
            name,
            website,
            email,
            phone,
            social_profiles (
              platform,
              url,
              handle
            )
          )
        )
      `)
      .in('action_type', ['email_sent', 'social_clicked', 'outreach_button_clicked'])
      .order('timestamp', { ascending: false });
    
    if (outreachError) {
      console.error('Error fetching outreach tracking for deals:', outreachError);
    } else {
      // Map outreach tracking to deals
      (outreachData || []).forEach(track => {
        const lead = track.leads || {};
        const business = lead.businesses || {};
        
        // Determine stage based on action type and recency
        let stage: Deal['stage'] = 'Qualified';
        const actionType = track.action_type;
        const actionDetails = track.action_details || {};
        
        // If recent email_sent, mark as Contacted
        if (actionType === 'email_sent' && track.timestamp) {
          const daysSinceContact = (new Date().getTime() - new Date(track.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          stage = daysSinceContact <= 7 ? 'Contacted' : 'Qualified';
        }
        
        // If social_clicked or outreach_button_clicked, mark as Qualified
        if (actionType === 'social_clicked' || actionType === 'outreach_button_clicked') {
          stage = 'Qualified';
        }
        
        consolidatedDeals.push({
          id: `outreach_${track.id}`,
          leadId: lead.id || track.lead_id,
          title: `${stage}: ${business.name || 'Unknown Company'}`,
          company: business.name || 'Unknown Company',
          value: 0, // $0 for Qualified/Contacted stages
          stage: stage,
          lastContact: track.timestamp || 'Never',
          probability: stage === 'Contacted' ? 25 : 20, // Higher probability for contacted
        });
      });
    }

    // 3. Get leads from follow_up_tasks table (status: 'Proposal')
    const { data: followUpData, error: followUpError } = await supabase
      .from('follow_up_tasks')
      .select(`
        *,
        leads (
          id,
          businesses (
            id,
            name,
            website,
            email,
            phone,
            social_profiles (
              platform,
              url,
              handle
            )
          )
        )
      `)
      .eq('status', 'Pending')
      .order('scheduled_date', { ascending: false });
    
    if (followUpError) {
      console.error('Error fetching follow-up tasks for deals:', followUpError);
    } else {
      // Map follow-up tasks to deals with 'Proposal' status
      (followUpData || []).forEach(task => {
        const lead = task.leads || {};
        const business = lead.businesses || {};
        
        consolidatedDeals.push({
          id: `followup_${task.id}`,
          leadId: lead.id || task.lead_id,
          title: `Proposal: ${business.name || 'Unknown Company'}`,
          company: business.name || 'Unknown Company',
          value: 0, // $0 for Proposal stage
          stage: 'Proposal',
          lastContact: task.scheduled_date || 'Never',
          probability: 35, // Higher probability for proposals
        });
      });
    }

    // 4. Get deals from offers table for 'Won'/'Lost' status (Closed deals)
    const { data: offersData, error: offersError } = await supabase
      .from('offers')
      .select(`
        *,
        leads (
          id,
          businesses (
            id,
            name,
            website,
            email,
            phone,
            social_profiles (
              platform,
              url,
              handle
            )
          )
        )
      `)
      .in('stage', ['Won', 'Lost'])
      .order('created_at', { ascending: false });
    
    if (offersError) {
      console.error('Error fetching offers for closed deals:', offersError);
    } else {
      // Map offers to deals with 'Won'/'Lost' status
      (offersData || []).forEach(offer => {
        const lead = offer.leads || {};
        const business = lead.businesses || {};
        
        consolidatedDeals.push({
          id: `offer_${offer.id}`,
          leadId: lead.id,
          title: `${offer.stage}: ${business.name || 'Unknown Company'}`,
          company: business.name || 'Unknown Company',
          value: offer.value || 0, // Pull value from offers table
          stage: offer.stage as Deal['stage'], // Map Won/Lost directly
          lastContact: offer.last_contacted || offer.created_at || 'Never',
          probability: offer.probability || 0, // Use probability from offers table
        });
      });
    }
    
    console.log(`Consolidated ${consolidatedDeals.length} deals from all sources`);
    return consolidatedDeals;
    
  } catch (error) {
    console.error('Error in getConsolidatedDeals:', error);
    return [];
  }
}

/**
 * Sync consolidated deals to the actual deals table
 * This function can be called periodically to keep the deals table in sync
 */
export async function syncConsolidatedDeals(): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    const consolidatedDeals = await getConsolidatedDeals();
    
    // Clear existing deals table
    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .neq('id', 'dummy'); // Delete all records
    
    if (deleteError) {
      console.error('Error clearing deals table:', deleteError);
      return false;
    }
    
    // Insert consolidated deals
    if (consolidatedDeals.length > 0) {
      const dealsToInsert = consolidatedDeals.map(deal => ({
        id: deal.id.startsWith('lead_') || deal.id.startsWith('outreach_') || deal.id.startsWith('followup_')
          ? undefined // Let database generate UUID for new records
          : deal.id,
        lead_id: deal.leadId,
        title: deal.title,
        company: deal.company,
        value: deal.value,
        stage: deal.stage,
        probability: deal.probability,
        last_contact: deal.lastContact === 'Never' ? null : deal.lastContact,
      }));
      
      const { error: insertError } = await supabase
        .from('deals')
        .insert(dealsToInsert);
      
      if (insertError) {
        console.error('Error inserting consolidated deals:', insertError);
        return false;
      }
    }
    
    console.log(`Successfully synced ${consolidatedDeals.length} consolidated deals to deals table`);
    return true;
    
  } catch (error) {
    console.error('Error syncing consolidated deals:', error);
    return false;
  }
}
