import React, { useEffect, useState } from 'react';
import GlassCard from './ui/GlassCard';
import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import {
    Mail,
    Linkedin,
    Twitter,
    Send,
    Calendar,
    ExternalLink,
    CheckCircle2,
    Instagram,
    Facebook,
    MessageCircle,
    PlusCircle,
    Star,
    ThumbsUp,
    Ban,
    ArrowRight,
    CheckSquare,
    Globe,
    Phone,
    Youtube,
    Video,
    AlertTriangle,
    Database,
    Loader2
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { getLeads, updateLeadStatus, logActivity, createFollowUpTask, createOffer, supabase, logOutreachTracking, addClosedLead, getOutreachTrackingLeads, deleteOutreachTracking, saveBusiness, addToLeads } from '../lib/database/supabase';
import { Lead, SocialProfile } from '../types';

const Outreach: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialLeadId = searchParams.get('lead');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Email State
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Scheduler State
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  
  // Sidebar visibility state
  const [hideSidebar, setHideSidebar] = useState(false);
  
  // Server status state
  const [scraperStatus, setScraperStatus] = useState<'active' | 'inactive' | 'checking'>('checking');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // Outcome State
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  
  // Duplicate detection state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateLeadName, setDuplicateLeadName] = useState('');
  
  // Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerValue, setOfferValue] = useState('');
  const [offerStage, setOfferStage] = useState<'Proposal' | 'Qualified' | 'Contacted' | 'Won' | 'Lost'>('Proposal');
  const [offerProbability, setOfferProbability] = useState(50);
  const [offerRating, setOfferRating] = useState(3);
  const [offerOutcome, setOfferOutcome] = useState('Interested');

  // Outreach Tracking Modal State
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [outreachType, setOutreachType] = useState<'email' | 'phone' | 'social' | 'website'>('email');
  const [outreachNotes, setOutreachNotes] = useState('');
  const [outreachDate, setOutreachDate] = useState('');

  // New Business Form State (for Outreach Portal)
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessWebsite, setNewBusinessWebsite] = useState('');
  const [newBusinessEmail, setNewBusinessEmail] = useState('');
  const [newBusinessPhone, setNewBusinessPhone] = useState('');
  const [newBusinessLinkedin, setNewBusinessLinkedin] = useState('');
  const [newBusinessTwitter, setNewBusinessTwitter] = useState('');
  const [newBusinessInstagram, setNewBusinessInstagram] = useState('');
  const [isAddingBusiness, setIsAddingBusiness] = useState(false);

  // Email outreach state
  const [emailSubject, setEmailSubject] = useState('');
  const [outreachEmailBody, setOutreachEmailBody] = useState('');

  // Social outreach state
  const [socialPlatform, setSocialPlatform] = useState<'linkedin' | 'twitter' | 'tiktok' | 'youtube' | 'instagram' | 'telegram'>('linkedin');
  const [socialMessage, setSocialMessage] = useState('');

  // Phone outreach state
  const [callNotes, setCallNotes] = useState('');

  // Website outreach state
  const [websiteAction, setWebsiteAction] = useState<'contact' | 'inquiry'>('contact');
  const [websiteMessage, setWebsiteMessage] = useState('');

  // Email popup state
  const [showEmailPopup, setShowEmailPopup] = useState(false);

  // Check scraper server status
  const checkScraperStatus = async () => {
    setScraperStatus('checking');
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        setScraperStatus('active');
      } else {
        setScraperStatus('inactive');
      }
    } catch (error) {
      console.error('Failed to check scraper status:', error);
      setScraperStatus('inactive');
    }
  };

  // Check database connection status
  const checkDbStatus = async () => {
    setDbStatus('checking');
    try {
      if (!supabase) {
        setDbStatus('disconnected');
        return;
      }
      const { data, error } = await supabase.from('leads').select('id').limit(1);
      if (error) {
        console.error('Database connection error:', error);
        setDbStatus('disconnected');
      } else {
        setDbStatus('connected');
      }
    } catch (error) {
      console.error('Failed to check database status:', error);
      setDbStatus('disconnected');
    }
  };

  // Track business interactions in Outreach page
  const trackBusinessInteraction = (leadId: string, leadName: string, action: string) => {
    const interactions = JSON.parse(localStorage.getItem('outreachInteractions') || '[]');
    interactions.push({
      leadId,
      leadName,
      action,
      timestamp: new Date().toISOString(),
      source: 'outreach_page'
    });
    localStorage.setItem('outreachInteractions', JSON.stringify(interactions));
  };

  const fetchOutreachLeads = async () => {
    const startTime = Date.now();
    setLoading(true);
    
    // Fetch leads from outreach_tracking table
    const trackingLeads = await getOutreachTrackingLeads();
    console.log(`Outreach.tsx: Fetched ${trackingLeads.length} leads from outreach_tracking table`);
    
    setLeads(trackingLeads);

    if (initialLeadId && trackingLeads.find((l: any) => l.id === initialLeadId)) {
        setSelectedLeadId(initialLeadId);
        // Track initial lead selection
        const lead = trackingLeads.find((l: any) => l.id === initialLeadId);
        if (lead) {
            trackBusinessInteraction(lead.id, lead.business.name, 'lead_selected');
        }
    } else if (trackingLeads.length > 0) {
        setSelectedLeadId(trackingLeads[0].id);
        // Track default lead selection
        trackBusinessInteraction(trackingLeads[0].id, trackingLeads[0].business.name, 'lead_selected');
    }
    
    // Artificial Delay
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 800 - elapsedTime);
    await new Promise(r => setTimeout(r, remainingTime));
    
    setLoading(false);
  };

  useEffect(() => {
    fetchOutreachLeads();
    checkScraperStatus();
    checkDbStatus();
  }, []);

  const activeLead = leads.find(l => l.id === selectedLeadId);

  // Reset form when lead changes
  useEffect(() => {
      if (!activeLead) return;
      setSubject(`Partnership Opportunity: ${activeLead.business.name}`);
      setEmailBody(`Hi ${activeLead.business.name},\n\nI saw that you are working on interesting projects. I'd love to connect and discuss how we can help.\n\nBest,\n[Your Name]`);
      setFollowUpNote('');
      setFollowUpDate('');
      
      // Debug logging for activeLead changes
      console.log('DEBUG: activeLead updated:', {
        id: activeLead.id,
        businessName: activeLead.business.name,
        rating: activeLead.rating,
        outcome: activeLead.outcome
      });
  }, [activeLead]);

  const handleSchedule = async () => {
      if (!activeLead || !followUpDate) return;

      // Hide sidebar when schedule is clicked
      setHideSidebar(true);

      // Track scheduling action in localStorage
      const outreachActions = JSON.parse(localStorage.getItem('outreachActions') || '[]');
      outreachActions.push({
        leadId: activeLead.id,
        leadName: activeLead.business.name,
        action: 'follow_up_scheduled',
        note: followUpNote,
        scheduledDate: followUpDate,
        timestamp: new Date().toISOString(),
        source: 'outreach_page'
      });
      localStorage.setItem('outreachActions', JSON.stringify(outreachActions));

      // Create follow-up task in database
      const dateObj = new Date(followUpDate);
      const taskTitle = `Follow up with ${activeLead.business.name}`;
      const success = await createFollowUpTask(
        activeLead.id,
        taskTitle,
        followUpNote || 'Follow up task',
        dateObj.toISOString(),
        'Medium'
      );

      if (success) {
        // Also log as activity for compatibility
        await logActivity('meeting', followUpNote || 'Follow up', activeLead.id, undefined, dateObj.toISOString());

        setNotificationMsg('Follow-up task created successfully.');
        setShowNotification(true);
        setFollowUpNote('');
        setFollowUpDate('');
        setTimeout(() => setShowNotification(false), 3000);
      } else {
        setNotificationMsg('Failed to create follow-up task. Please try again.');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
  };

  const handleSendEmail = async () => {
      if (!activeLead) return;
      
      // Direct Gmail URL instead of popup
      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(activeLead.business.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank');
      
      // Log the activity
      await logActivity('email', `Opened Gmail compose: ${subject}`, activeLead.id);
      
      setNotificationMsg('Opening Gmail compose...');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
  };

  const handleSendFromGmail = async () => {
      if (!activeLead) return;
      
      // Debug: Log current form values
      console.log('DEBUG: Gmail button clicked');
      console.log('DEBUG: Current subject:', subject);
      console.log('DEBUG: Current emailBody:', emailBody);
      console.log('DEBUG: Active lead email:', activeLead.business.email);
      
      // Track email send action in localStorage
      const outreachActions = JSON.parse(localStorage.getItem('outreachActions') || '[]');
      outreachActions.push({
        leadId: activeLead.id,
        leadName: activeLead.business.name,
        action: 'email_sent_via_gmail',
        subject: subject,
        timestamp: new Date().toISOString(),
        source: 'outreach_page'
      });
      localStorage.setItem('outreachActions', JSON.stringify(outreachActions));
      
      // Open Gmail compose URL with actual subject and body from form
      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(activeLead.business.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      console.log('DEBUG: Generated Gmail URL:', gmailUrl);
      
      // Try opening with a small delay to ensure state is updated
      setTimeout(() => {
        window.open(gmailUrl, '_blank');
      }, 100);
      
      // Log the activity
      await logActivity('email', `Sent email via Gmail: ${subject}`, activeLead.id);
      
      setNotificationMsg('Opening Gmail compose...');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      setShowEmailPopup(false);
  };

  const handleSendFromHere = async () => {
      if (!activeLead) return;
      
      // Track email send action in localStorage
      const outreachActions = JSON.parse(localStorage.getItem('outreachActions') || '[]');
      outreachActions.push({
        leadId: activeLead.id,
        leadName: activeLead.business.name,
        action: 'email_sent_from_app',
        subject: subject,
        timestamp: new Date().toISOString(),
        source: 'outreach_page'
      });
      localStorage.setItem('outreachActions', JSON.stringify(outreachActions));
      
      // Show webhook progress popup
      setShowWebhookTimer(true);
      setWebhookProgress(0);
      
      // Simulate webhook progress with 3-second timer
      const interval = setInterval(() => {
          setWebhookProgress(prev => {
              if (prev >= 100) {
                  clearInterval(interval);
                  setShowWebhookTimer(false);
                  return 100;
              }
              return prev + 3.33; // Increment by ~3.33% every 100ms for 3-second total
          });
      }, 100);
      
      try {
        // Call email webhook endpoint
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: activeLead.business.email,
            subject: subject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br>') // Convert line breaks to HTML
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Clear interval and hide timer
          clearInterval(interval);
          setShowWebhookTimer(false);
          
          // Log the activity
          await logActivity('email', `Sent email via app: ${subject}`, activeLead.id);
          
          setNotificationMsg('Email sent successfully!');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
          setShowEmailPopup(false);
        } else {
          throw new Error(result.error || 'Failed to send email');
        }
      } catch (error) {
        console.error('Email send error:', error);
        clearInterval(interval);
        setShowWebhookTimer(false);
        
        setNotificationMsg('Failed to send email. Please try again.');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
  };

  // Email webhook timer state
  const [showWebhookTimer, setShowWebhookTimer] = useState(false);
  const [webhookProgress, setWebhookProgress] = useState(0);

  const handleOutcome = async (newStatus: string) => {
      console.log('=== DEBUG handleOutcome START ===');
      console.log('DEBUG: newStatus:', newStatus);
      console.log('DEBUG: activeLead:', activeLead);
      console.log('DEBUG: activeLead.rating:', activeLead?.rating);
      console.log('DEBUG: activeLead.outcome:', activeLead?.outcome);
      
      if (!activeLead) {
          console.log('DEBUG: No active lead, returning');
          return;
      }
      
      // Strict Validation for Conversion
      if (newStatus === 'Converted') {
          console.log('DEBUG: Validation for Conversion started');
          if (!activeLead.rating) {
              console.log('DEBUG: Rating validation failed - no rating');
              setNotificationMsg('Please rate the interaction quality first.');
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
              return;
          }
          if (!activeLead.outcome || (activeLead.outcome !== 'Good Fit' && activeLead.outcome !== 'Bad Fit' && activeLead.outcome !== 'Interested')) {
              console.log('DEBUG: Outcome validation failed - invalid outcome:', activeLead.outcome);
              setNotificationMsg('Please select an outcome (Good Fit / Bad Fit) first.');
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
              return;
          }
          console.log('DEBUG: Validation passed');
      }

      // Track outcome action in database
      await logOutreachTracking(
        activeLead.id,
        activeLead.business.name,
        'status_changed',
        { newStatus, timestamp: new Date().toISOString() },
        'outreach_page'
      );
      
      if (newStatus === 'Converted') {
          console.log('DEBUG: Converting lead - transferring from outreach_tracking to offers table');
          
          // Add entry to offers table with rating and fit status
          const offerSuccess = await createOffer(
            activeLead.id,
            `Deal with ${activeLead.business.name}`,
            0,
            'Proposal',
            10,
            activeLead.rating || 0, // log_quality_rating
            activeLead.outcome || 'Good Fit' // bad_fit_good_fit
          );
          
          if (!offerSuccess) {
            setNotificationMsg('Failed to create offer.');
            setShowNotification(true);
            return;
          }

          // Delete from outreach_tracking table as requested
          const deleteSuccess = await deleteOutreachTracking(activeLead.id);
          if (!deleteSuccess) {
            console.warn('Warning: Offer created but failed to remove lead from Outreach Tracking list');
            // Don't return error, continue with success flow
          }

          // Signal for UI update
          window.dispatchEvent(new StorageEvent('storage', { key: 'offersUpdated' }));
      }
      
      // Update the lead status in main table
      const statusToUpdate = newStatus === 'Converted' ? 'Negotiations' : newStatus;
      const result = await updateLeadStatus(activeLead.id, statusToUpdate as any);
      
      if (!result.success) {
          setNotificationMsg(`Error: ${result.error}`);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
          return;
      }
      
      let msg = 'Lead updated.';
      if (newStatus === 'Converted') msg = 'Lead converted! Offer created & moved to Negotiations.';
      if (newStatus === 'Bad Fit') msg = 'Lead archived as Bad Fit.';
      if (newStatus === 'Closed') msg = 'Lead moved to Closed.';

      setNotificationMsg(msg);
      setShowNotification(true);
      
      // Refresh list or remove
      if (newStatus !== 'Converted' && newStatus !== 'Negotiations') {
        setLeads(prev => prev.filter(l => l.id !== activeLead.id));
        setSelectedLeadId(null);
      } else {
        await fetchOutreachLeads();
      }
      
      setTimeout(() => setShowNotification(false), 3000);
  };

  const getSocialIcon = (platform: string) => {
      switch (platform) {
          case 'linkedin': return <Linkedin className="w-5 h-5" />;
          case 'twitter': return <Twitter className="w-5 h-5" />;
          case 'instagram': return <Instagram className="w-5 h-5" />;
          case 'facebook': return <Facebook className="w-5 h-5" />;
          default: return <MessageCircle className="w-5 h-5" />;
      }
  };

  const getSocialColor = (platform: string) => {
      switch (platform) {
          case 'linkedin': return 'bg-[#0077b5] border-[#0077b5] text-white hover:bg-[#006396]';
          case 'twitter': return 'bg-black border-black text-white hover:bg-slate-800';
          case 'instagram': return 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] border-transparent text-white hover:opacity-90';
          case 'facebook': return 'bg-[#1877f2] border-[#1877f2] text-white hover:bg-[#166fe5]';
          default: return 'bg-slate-600 border-slate-600 text-white';
      }
  };

  const getSocialGradient = (platform: string) => {
      switch (platform) {
          case 'linkedin': return 'from-[#0077b5] via-[#005885] to-[#004182]';
          case 'twitter': return 'from-[#000000] via-[#1a1a1a] to-[#2d2d2d]';
          case 'instagram': return 'from-[#f09433] via-[#e1306c] to-[#bc1888]';
          case 'facebook': return 'from-[#1877f2] via-[#166fe5] to-[#0d5aa7]';
          case 'tiktok': return 'from-[#000000] via-[#ff0050] to-[#00f2ea]';
          case 'youtube': return 'from-[#ff0000] via-[#cc0000] to-[#990000]';
          case 'telegram': return 'from-[#0088cc] via-[#0077b3] to-[#005580]';
          default: return 'from-slate-600 via-slate-700 to-slate-800';
      }
  };

  if (loading) {
      return (
          <div className="flex h-screen bg-slate-50 overflow-hidden">
             {/* Sidebar Skeleton */}
             <div className="w-80 border-r border-slate-200 bg-white p-6 space-y-8 flex flex-col">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-4 items-center">
                            <Skeleton variant="circular" className="w-10 h-10" />
                            <div className="space-y-2 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-1/2" /></div>
                        </div>
                    ))}
                </div>
             </div>
             {/* Main Portal Skeleton */}
             <div className="flex-1 p-10 space-y-8 overflow-y-auto">
                <div className="flex justify-between items-start">
                    <div className="space-y-2"><Skeleton className="h-10 w-64" /><Skeleton className="h-4 w-96" /></div>
                    <div className="flex gap-4"><Skeleton className="h-12 w-32 rounded-xl" /><Skeleton className="h-12 w-32 rounded-xl" /></div>
                </div>
                <GlassCard className="p-8 space-y-6">
                    <Skeleton className="h-12 w-3/4 rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                    <div className="flex justify-end pt-4"><Skeleton className="h-12 w-48 rounded-xl" /></div>
                </GlassCard>
             </div>
          </div>
      );
  }

  // Show empty state if no leads found at all
  if (leads.length === 0) {
      return (
          <div className="flex flex-col h-screen items-center justify-center p-6 bg-slate-50">
              <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-white rounded-3xl border border-slate-200 flex items-center justify-center mx-auto mb-6 transform -rotate-3">
                    <Database className="w-10 h-10 text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">No Outreach Data</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Access your outreach history here. Start by connecting with leads in the Leads Central page.
                  </p>
                  
                  <Link to="/leads" className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold font-medium hover:bg-indigo-700 hover:scale-[1.02] transition-all">
                      <ArrowRight className="w-5 h-5" />
                      Go to Leads Central
                  </Link>
              </div>
          </div>
      );
  }

  if (!activeLead) {
      return (
          <div className="flex h-screen items-center justify-center p-10 bg-slate-50">
              <div className="text-center text-slate-400">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-slate-600">No lead selected</p>
                  <p className="text-sm mt-2">Select a lead from the sidebar to view details.</p>
              </div>
          </div>
      );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col max-w-[1600px] mx-auto pb-20 sm:pb-24"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Outreach Center</h1>
          <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm text-slate-500 hidden md:block">
                  <span>Drafting for: </span><span className="font-semibold text-indigo-600">{activeLead.business.name}</span>
              </div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0">
         
         {/* Left: Lead Selector with Card Stack */}
         <div className={`w-full lg:w-1/4 flex flex-col gap-3 sm:gap-4 overflow-y-auto pr-1.5 sm:pr-2 pb-8 sm:pb-10 max-h-[calc(100vh-200px)] transition-all duration-300 ${hideSidebar ? 'lg:opacity-0 lg:pointer-events-none lg:w-0' : ''}`}>
            {/* Outreach to Business Button */}
            <div className="mb-3 sm:mb-4">
                <button
                    onClick={() => setShowOutreachModal(true)}
                    className="w-full p-2.5 sm:p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base border-none"
                >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Outreach to Business</span>
                </button>
            </div>

            {/* Interaction Card Stack */}
            <div className="mb-4 p-3 bg-white rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Recent Interactions</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(() => {
                        const interactions = JSON.parse(localStorage.getItem('outreachInteractions') || '[]');
                        const recentInteractions = interactions.slice(-5).reverse(); // Last 5 interactions
                        return recentInteractions.length > 0 ? (
                            recentInteractions.map((interaction: any, index: number) => (
                                <div key={index} className="p-2 bg-white rounded-lg border border-slate-200 text-xs mb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        <span className="font-medium text-slate-700 truncate">{interaction.leadName}</span>
                                    </div>
                                    <div className="text-slate-500 truncate">{interaction.action.replace('_', ' ')}</div>
                                    <div className="text-[10px] text-slate-400">{new Date(interaction.timestamp).toLocaleTimeString()}</div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-2">No interactions yet</p>
                        );
                    })()}
                </div>
            </div>

            {/* Lead Cards */}
            {leads.map(lead => (
                <GlassCard
                    key={lead.id}
                    onClick={() => {
                        setSelectedLeadId(lead.id);
                        // Track lead selection/click
                        trackBusinessInteraction(lead.id, lead.business.name, 'lead_clicked');
                    }}
                    className={`p-3 sm:p-4 cursor-pointer transition-all border-l-4 group relative ${selectedLeadId === lead.id ? 'bg-white border-l-indigo-500 ring-2 ring-indigo-500/10' : 'bg-white/40 border-l-transparent hover:bg-white/60'}`}
                >
                    <div className="flex justify-start items-start">
                        <h3 className="font-bold text-slate-800 text-xs sm:text-sm">{lead.business.name}</h3>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 sm:mt-2">
                         <span className="text-[10px] sm:text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[150px]">{lead.business.website}</span>
                         {lead.status === 'New' && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></div>}
                    </div>
                </GlassCard>
            ))}
         </div>

         {/* Right: Action Center */}
         <div className={`flex-1 flex flex-col gap-6 overflow-y-auto pb-10 px-1 transition-all duration-300 ${hideSidebar ? 'lg:w-full' : ''}`}>
             {/* Show sidebar button when hidden */}
             {hideSidebar && (
                 <button
                     onClick={() => setHideSidebar(false)}
                     className="hidden lg:flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-4 transition-colors p-2 rounded-lg shadow-sm"
                 >
                     <PlusCircle className="w-4 h-4" /> Show Lead Selector
                 </button>
             )}
            
            {/* 1. Social Direct Actions */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Website Button */}
                {activeLead.business.website && (
                    <a 
                        href={activeLead.business.website.startsWith('http') ? activeLead.business.website : `https://${activeLead.business.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 transition-all group bg-white hover:border-slate-300"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                <Globe className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Website</p>
                                <p className="text-xs text-slate-400 font-medium truncate max-w-[120px]">Visit Site</p>
                            </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </a>
                )}

                {/* Social Gradients */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeLead.business.socials.map((social: SocialProfile, idx) => (
                        <a
                            key={idx}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                                relative h-32 p-10 rounded-2xl flex flex-col justify-between overflow-hidden group transition-all duration-500 hover:scale-[1.02]
                                bg-gradient-to-br ${getSocialGradient(social.platform)} text-white border-none
                            `}
                        >
                            {/* Decorative Background Pattern */}
                            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                <div className="scale-[8]">{getSocialIcon(social.platform)}</div>
                            </div>

                            <div className="flex justify-between items-start relative z-10">
                                <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                                    {getSocialIcon(social.platform)}
                                </div>
                                <ExternalLink className="w-6 h-6 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60">{social.platform}</p>
                        
                                <p className="text-sm text-white/80 mt-2 truncate max-w-[140px]">{social.url}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* 2. Email Composer */}
           {activeLead.business.email ? (
               <GlassCard className="flex-col overflow-hidden p-0 relative min-h-[350px] sm:min-h-[400px] flex">
                   <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                       <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-600 font-semibold">
                           <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                           <span className="">Compose Email</span>
                       </div>
                       <div className="text-[10px] sm:text-xs text-slate-400">
                           To: <span className="text-slate-600 font-medium">{activeLead.business.email}</span>
                       </div>
                   </div>

                   <div className="flex-1 p-4 sm:p-6 bg-slate-50 flex flex-col gap-3 sm:gap-4 m-4 sm:m-6 rounded-2xl">
                       <input
                           type="text"
                           value={subject}
                           onChange={(e) => setSubject(e.target.value)}
                           placeholder="Subject"
                           className="w-full bg-white border border-slate-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-slate-700 focus:outline-none transition-all placeholder:text-slate-400"
                       />
                       
                       <textarea
                           value={emailBody}
                           onChange={(e) => setEmailBody(e.target.value)}
                           className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-3 sm:p-4 resize-none outline-none text-slate-700 placeholder:text-slate-400 font-sans leading-relaxed text-sm transition-all"
                           placeholder="Write your email here..."
                           rows={8}
                           style={{ minHeight: '200px' }}
                       />
                   </div>
                     <div className="flex gap-2 sm:gap-3 w-full">
                           <button
                               onClick={handleSendEmail}
                               className="flex-1 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 text-sm border-none active:scale-[0.98]"
                           >
                               <Send className="w-4 h-4" /> <span>Send Email</span>
                           </button>
                       </div>
                   <div className="p-4 sm:p-6 bg-white border-t border-slate-200 flex flex-col gap-4 sm:gap-6">
                       <div className="flex flex-col gap-2 w-full">
                           <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 px-1">Create Follow-up Task</div>
                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200 transition-all">
                               <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
                                   <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 ml-2 flex-shrink-0" />
                                   <input
                                       type="date"
                                       className="bg-transparent text-[10px] sm:text-xs font-bold text-slate-700 outline-none p-1.5 sm:p-2 w-full sm:w-28 cursor-pointer"
                                       value={followUpDate}
                                       onChange={(e) => setFollowUpDate(e.target.value)}
                                   />
                               </div>
                               <div className="hidden sm:block w-px h-4 bg-slate-200"></div>
                               <input
                                   type="text"
                                   placeholder="Add note..."
                                   className="bg-transparent text-[10px] sm:text-xs text-slate-700 outline-none p-1.5 sm:p-2 flex-1 placeholder:text-slate-300 font-medium"
                                   value={followUpNote}
                                   onChange={(e) => setFollowUpNote(e.target.value)}
                               />
                               <button
                                   onClick={handleSchedule}
                                   disabled={!followUpDate}
                                   className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs bg-white text-indigo-600 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap border border-slate-200 hover:bg-indigo-50 flex-shrink-0"
                               >
                                  <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span>Schedule</span>
                               </button>
                           </div>
                       </div>

                     
                   </div>
               </GlassCard>
           ) : (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-sm italic font-medium">
                    No email address available for this business. Use social links or phone to contact.
                </div>
            )}

             {/* 3. Outcome Actions */}
             <GlassCard className="p-4 sm:p-8 border-none mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8">
                    {/* Rating Section */}
                    <div className="w-full md:w-auto md:border-r md:border-slate-100 md:pr-10">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Log Interaction Quality <span className="text-rose-500">*</span></h3>
                        <div className="flex items-center gap-3">
                           <div className="flex p-2 bg-slate-50 rounded-2xl">
                             {[1, 2, 3, 4, 5].map((star) => (
                               <button
                                   key={star}
                                   onClick={() => updateLeadStatus(activeLead.id, activeLead.status, undefined, star).then((result) => {
                                       if (result.success) {
                                           setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, rating: star } : l));
                                       }
                                   })}
                                   className="p-1 sm:p-1.5 hover:scale-110 transition-transform focus:outline-none"
                               >
                                   <Star
                                     className={`w-6 h-6 sm:w-7 sm:h-7 ${activeLead.rating && activeLead.rating >= star ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-slate-200 fill-slate-100'}`}
                                   />
                               </button>
                             ))}
                           </div>
                           <span className="text-xs font-black text-indigo-600 ml-2">
                             {activeLead.rating ? `${activeLead.rating}/5 Stars` : 'Rate'}
                           </span>
                        </div>
                    </div>

                     <div className="flex-1 w-full">
                         <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Set Outcome Status <span className="text-rose-500">*</span></h3>
                         <div className="flex flex-col gap-4">
                             <div className="flex flex-wrap gap-4">
                                  <button
                                     onClick={() => {
                                         updateLeadStatus(activeLead.id, activeLead.status, 'Bad Fit').then((result) => {
                                             if (result.success) {
                                                 setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, outcome: 'Bad Fit' } : l));
                                             }
                                         });
                                     }}
                                     className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-2
                                         ${activeLead.outcome === 'Bad Fit'
                                            ? 'bg-rose-50 text-rose-600'
                                            : 'bg-white text-slate-500 hover:text-rose-500'}
                                     `}
                                  >
                                     <Ban className="w-4 h-4" /> <span>Bad Fit</span>
                                  </button>
                                  <button
                                     onClick={() => {
                                         console.log('DEBUG: Good Fit button clicked');
                                         console.log('DEBUG: Current activeLead:', activeLead);
                                         console.log('DEBUG: Current outcome before update:', activeLead.outcome);
                                         
                                         updateLeadStatus(activeLead.id, activeLead.status, 'Good Fit').then((result) => {
                                             console.log('DEBUG: updateLeadStatus result:', result);
                                             if (result.success) {
                                                 console.log('DEBUG: Updating leads array with Good Fit outcome');
                                                 setLeads(prev => {
                                                     const updatedLeads = prev.map(l => l.id === activeLead.id ? { ...l, outcome: 'Good Fit' } : l);
                                                     console.log('DEBUG: Updated leads array:', updatedLeads);
                                                     return updatedLeads;
                                                 });
                                                 
                                                 // Force re-render by triggering a state update
                                                 setTimeout(() => {
                                                     console.log('DEBUG: Forced re-render triggered');
                                                     // Force component to re-evaluate activeLead
                                                     setSelectedLeadId(activeLead.id);
                                                 }, 100);
                                             } else {
                                                 console.error('DEBUG: Failed to update lead status:', result.error);
                                             }
                                         });
                                     }}
                                     className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-2
                                         ${activeLead.outcome === 'Good Fit'
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'bg-white text-slate-500 hover:text-indigo-600'}
                                     `}
                                  >
                                     <ThumbsUp className="w-4 h-4" /> <span>Good Fit</span>
                                  </button>
                             </div>
                             
                             <button
                                 onClick={() => handleOutcome('Converted')}
                                 className="w-full px-4 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border-none transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98]"
                             >
                                 <ArrowRight className="w-5 h-5" /> <span>Convert to deal</span>
                             </button>
                         </div>
                     </div>
                </div>
             </GlassCard>
         </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowOfferModal(false)}>
              <GlassCard className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-8 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                          <PlusCircle className="w-8 h-8 text-purple-600" />
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">Create Offer</h3>
                          <p className="text-sm text-slate-400 font-medium">Create an offer for {activeLead?.business.name}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-5">
                      <div className="space-y-1.5 px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Offer Title</label>
                          <input
                              type="text"
                              value={offerTitle}
                              onChange={(e) => setOfferTitle(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium"
                              placeholder="e.g., Senior Developer Position"
                          />
                      </div>
                      
                      <div className="space-y-1.5 px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract Value ($)</label>
                          <input
                              type="number"
                              value={offerValue}
                              onChange={(e) => setOfferValue(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium"
                              placeholder="e.g., 75000"
                          />
                      </div>
                      
                      <div className="space-y-1.5 px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage</label>
                          <select
                              value={offerStage}
                              onChange={(e) => setOfferStage(e.target.value as any)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium appearance-none"
                          >
                              <option value="Proposal">Proposal</option>
                              <option value="Qualified">Qualified</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Won">Won</option>
                              <option value="Lost">Lost</option>
                          </select>
                      </div>
                      
                      <div className="space-y-1.5 px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Win Probability (%)</label>
                          <input
                              type="number"
                              value={offerProbability}
                              onChange={(e) => setOfferProbability(parseInt(e.target.value))}
                              min="0"
                              max="100"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 px-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rating (1-5)</label>
                              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 font-medium">
                                 <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                 <input
                                      type="number"
                                      value={offerRating}
                                      onChange={(e) => setOfferRating(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                                      min="1"
                                      max="5"
                                      className="w-full bg-transparent focus:outline-none"
                                  />
                              </div>
                          </div>
                          
                          <div className="space-y-1.5 px-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Outcome Status</label>
                              <select
                                  value={offerOutcome}
                                  onChange={(e) => setOfferOutcome(e.target.value)}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium appearance-none"
                              >
                                  <option value="Interested">Interested</option>
                                  <option value="Good Fit">Good Fit</option>
                                  <option value="Bad Fit">Bad Fit</option>
                                  <option value="Not Interested">Not Interested</option>
                              </select>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex gap-4 mt-10 justify-end">
                      <button
                          onClick={() => setShowOfferModal(false)}
                          className="px-6 py-3 text-slate-500 font-bold bg-white rounded-xl border border-slate-200 transition-all"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={async () => {
                              if (!activeLead || !offerTitle || !offerValue) return;
                              
                              const result = await createOffer(
                                  activeLead.id,
                                  offerTitle,
                                  parseInt(offerValue),
                                  offerStage,
                                  offerProbability
                              );
                              
                              if ((result as any).duplicate) {
                                  alert('An offer already exists for this lead!');
                                  return;
                              }
                              
                              if ((result as any).success) {
                                  // Update lead status with Rating & Outcome, and move to Negotiations
                                  await updateLeadStatus(activeLead.id, 'Negotiations', offerOutcome, offerRating);
                                  
                                  // DELETE from outreach_tracking as requested
                                  const deleteSuccess = await deleteOutreachTracking(activeLead.id);
                                  if (!deleteSuccess) {
                                      alert("Warning: Offer created, but failed to remove lead from Outreach Tracking list. This is likely an RLS (Policy) permission issue. Please check the console for errors.");
                                  } else {
                                      // Refresh list to remove the converted lead from view
                                      await fetchOutreachLeads();
                                  }
                                  
                                  // Signal to OfferDeal component to refresh
                                  window.dispatchEvent(new StorageEvent('storage', { key: 'offersUpdated' }));
                                  
                                  // Signal to Leads component to refresh
                                  window.dispatchEvent(new StorageEvent('storage', { key: 'leadsUpdated' }));

                                  // Navigate to offers page
                                  window.location.href = '/offers';
                              } else {
                                  setNotificationMsg('Failed to create offer. Please try again.');
                                  setShowNotification(true);
                                  setTimeout(() => setShowNotification(false), 3000);
                              }
                              
                              setShowOfferModal(false);
                          }}
                          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-95"
                      >
                          Create Offer
                      </button>
                  </div>
              </GlassCard>
          </div>
      )}

      {/* Success Notification */}
      {showNotification && (
          <div className="fixed bottom-10 right-10 bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 animate-slide-in-right z-50">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                  <h4 className="font-bold text-sm text-slate-800">Success</h4>
                  <p className="text-xs text-slate-400 font-medium">{notificationMsg}</p>
              </div>
          </div>
      )}

      {/* Duplicate Warning */}
      {showDuplicateWarning && (
          <div className="fixed top-10 right-10 bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 flex items-center gap-4 animate-slide-in-right z-50">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                 <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                  <h4 className="font-bold text-sm text-slate-800">Already Exists</h4>
                  <p className="text-xs text-slate-400 font-medium">{duplicateLeadName} is already tracked</p>
              </div>
          </div>
      )}

      {/* Outreach Tracking Modal */}
      {showOutreachModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowOutreachModal(false)}>
              <GlassCard className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                          <Send className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">Outreach Portal</h3>
                          <p className="text-sm text-slate-400 font-medium">Log activity for {activeLead?.business.name}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-6">
                      {/* Outreach Type Selector */}
                      <div className="flex p-1 bg-slate-50 rounded-2xl">
                        {(['email', 'phone', 'social', 'website'] as const).map((type) => (
                           <button
                             key={type}
                             onClick={() => setOutreachType(type)}
                             className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${outreachType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                             {type}
                           </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <textarea
                            value={outreachNotes}
                            onChange={(e) => setOutreachNotes(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-medium placeholder:text-slate-300 min-h-[120px]"
                            placeholder={`Describe your ${outreachType} outreach...`}
                        />
                        
                        <div className="space-y-1.5 px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Follow-up Date (Optional)</label>
                          <input
                              type="date"
                              value={outreachDate}
                              onChange={(e) => setOutreachDate(e.target.value)}
                              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-medium"
                          />
                        </div>
                      </div>
                  </div>
                  
                  <div className="flex gap-4 mt-10 justify-end">
                      <button
                          onClick={() => {
                              setShowOutreachModal(false);
                              setOutreachType('email');
                              setOutreachNotes('');
                              setOutreachDate('');
                          }}
                          className="px-6 py-3 text-slate-500 font-bold bg-white rounded-xl border border-slate-200 transition-all"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={async () => {
                              if (!activeLead || !outreachType || !outreachNotes) return;
                              
                               const trackingResult = await logOutreachTracking(
                                 activeLead.id,
                                 activeLead.business.name,
                                 'outreach_button_clicked',
                                 {
                                   outreachType: outreachType,
                                   notes: outreachNotes,
                                   followUpDate: outreachDate
                                 },
                                 'outreach_page'
                               );
                               
                               if ((trackingResult as any).duplicate) {
                                 alert('This lead is already in the outreach tracking list!');
                                 return;
                               }
                               
                               if (!((trackingResult as any).success)) {
                                 setNotificationMsg('Failed to track outreach. Please try again.');
                                 setShowNotification(true);
                                 setTimeout(() => setShowNotification(false), 5000);
                                 return;
                               }

                              // Track outreach action in localStorage
                              const outreachActions = JSON.parse(localStorage.getItem('outreachActions') || '[]');
                              outreachActions.push({
                                leadId: activeLead.id,
                                leadName: activeLead.business.name,
                                action: 'outreach_logged',
                                outreachType: outreachType,
                                notes: outreachNotes,
                                followUpDate: outreachDate,
                                timestamp: new Date().toISOString(),
                                source: 'outreach_page'
                              });
                              localStorage.setItem('outreachActions', JSON.stringify(outreachActions));

                              // Log activity in database
                              const activityType = outreachType === 'email' ? 'email' :
                                               outreachType === 'phone' ? 'call' :
                                               outreachType === 'social' ? 'social' : 'note';
                              
                              await logActivity(
                                  activityType as any,
                                  outreachNotes,
                                  activeLead.id,
                                  undefined,
                                  outreachDate ? new Date(outreachDate).toISOString() : undefined
                              );

                              setNotificationMsg('Outreach activity logged successfully.');
                              setShowNotification(true);
                              setTimeout(() => setShowNotification(false), 3000);
                              
                              // Reset form and close modal
                              setShowOutreachModal(false);
                              setOutreachType('email');
                              setOutreachNotes('');
                              setOutreachDate('');
                          }}
                          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black uppercase tracking-widest hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-95"
                      >
                          Log Activity
                      </button>
                  </div>
              </GlassCard>
          </div>
      )}
  
      {/* Webhook Timer Popup */}
      {showWebhookTimer && (
        <div className="fixed bottom-4 left-4 bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-in-right z-50">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Sending via Webhook</h4>
            <p className="text-xs text-slate-400">Email being sent...</p>
            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-3000 ease-linear"
                style={{ width: `${webhookProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-1">{webhookProgress.toFixed(0)}%</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Outreach;
