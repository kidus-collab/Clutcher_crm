import React, { useEffect, useState } from 'react';
import GlassCard from './ui/GlassCard';
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
import { getLeads, updateLeadStatus, logActivity, createFollowUpTask, createOffer, supabase, logOutreachTracking, addClosedLead, getOutreachTrackingLeads, deleteOutreachTracking } from '../lib/database/supabase';
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

  useEffect(() => {
    fetchOutreachLeads();
    checkScraperStatus();
    checkDbStatus();
  }, []);



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
    setLoading(false);
  };

  const activeLead = leads.find(l => l.id === selectedLeadId);

  // Reset form when lead changes
  useEffect(() => {
      if (!activeLead) return;
      setSubject(`Partnership Opportunity: ${activeLead.business.name}`);
      setEmailBody(`Hi ${activeLead.business.name},\n\nI saw that you are working on interesting projects. I'd love to connect and discuss how we can help.\n\nBest,\n[Your Name]`);
      setFollowUpNote('');
      setFollowUpDate('');
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
      
      // Track email send action in localStorage
      const outreachActions = JSON.parse(localStorage.getItem('outreachActions') || '[]');
      outreachActions.push({
        leadId: activeLead.id,
        leadName: activeLead.business.name,
        action: 'email_sent',
        subject: subject,
        timestamp: new Date().toISOString(),
        source: 'outreach_page'
      });
      localStorage.setItem('outreachActions', JSON.stringify(outreachActions));
      
      // In a real app, this would call an email API
      await logActivity('email', `Sent email: ${subject}`, activeLead.id);
      
      setNotificationMsg('Email logged successfully.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
  };

  const handleOutcome = async (newStatus: string) => {
      if (!activeLead) return;
      
      // Strict Validation for Conversion
      if (newStatus === 'Converted') {
          if (!activeLead.rating) {
              setNotificationMsg('Please rate the interaction quality first.');
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
              return;
          }
          if (!activeLead.outcome || (activeLead.outcome !== 'Good Fit' && activeLead.outcome !== 'Bad Fit' && activeLead.outcome !== 'Interested')) {
              setNotificationMsg('Please select an outcome (Good Fit / Bad Fit) first.');
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
              return;
          }
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
          console.log('DEBUG: Converting lead - adding to offers and closed_leads tables');
          // Calculate duration from when lead was added to when it was closed
          const duration = activeLead.createdAt ?
            Math.ceil((new Date().getTime() - new Date(activeLead.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

          // Add entry to offers table
          const offerSuccess = await createOffer(
            activeLead.id,
            `Deal with ${activeLead.business.name}`,
            0,
            'Proposal',
            10
          );
          
          if (!offerSuccess) {
            setNotificationMsg('Failed to create offer.');
            setShowNotification(true);
            return;
          }

          // Add entry to closed_leads table
          const closedSuccess = await addClosedLead(
            activeLead.id,
            activeLead.business.name,
            duration,
            activeLead.rating || 0,
            activeLead.estimatedValue || 0,
            activeLead.outcome || 'Converted'
          );
          
          if (!closedSuccess) {
            setNotificationMsg('Failed to add closed lead.');
            setShowNotification(true);
            return;
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
          <div className="flex h-screen items-center justify-center bg-slate-50">
             <div className="flex flex-col items-center gap-3">
               <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
               <p className="text-slate-500 font-medium">Loading outreach profile...</p>
             </div>
          </div>
      );
  }

  // Show empty state if no leads found at all
  if (leads.length === 0) {
      return (
          <div className="flex flex-col h-screen items-center justify-center p-6 bg-slate-50">
              <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-6 transform -rotate-3">
                    <Database className="w-10 h-10 text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">No Outreach Data</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Access your outreach history here. Start by connecting with leads in the Leads Central page.
                  </p>
                  
                  <Link to="/leads" className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold font-medium shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] transition-all">
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
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col max-w-[1600px] mx-auto pb-20 sm:pb-24">
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
                    className="w-full p-2.5 sm:p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Outreach to Business</span>
                </button>
            </div>

            {/* Interaction Card Stack */}
            <div className="mb-4 p-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Recent Interactions</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(() => {
                        const interactions = JSON.parse(localStorage.getItem('outreachInteractions') || '[]');
                        const recentInteractions = interactions.slice(-5).reverse(); // Last 5 interactions
                        return recentInteractions.length > 0 ? (
                            recentInteractions.map((interaction: any, index: number) => (
                                <div key={index} className="p-2 bg-white/60 rounded-lg border border-white/40 text-xs">
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
                    className={`p-3 sm:p-4 cursor-pointer transition-all border-l-4 group relative ${selectedLeadId === lead.id ? 'bg-white border-l-indigo-500 shadow-md' : 'bg-white/40 border-l-transparent hover:bg-white/60'}`}
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
                     className="hidden lg:flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-4 transition-colors"
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
                        className="flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all group bg-white border-slate-200 hover:border-indigo-300 hover:shadow-indigo-500/10"
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
                                relative h-40 p-8 rounded-[2.5rem] flex flex-col justify-between overflow-hidden shadow-2xl group transition-all duration-500 hover:scale-[1.02]
                                bg-gradient-to-br ${getSocialGradient(social.platform)} text-white
                            `}
                        >
                            {/* Decorative Background Pattern */}
                            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                <div className="scale-[8]">{getSocialIcon(social.platform)}</div>
                            </div>

                            <div className="flex justify-between items-start relative z-10">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                                    {getSocialIcon(social.platform)}
                                </div>
                                <ExternalLink className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{social.platform}</p>
                                <p className="text-xl font-black tracking-tight mt-1">{social.handle}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* 2. Email Composer */}
           {activeLead.business.email ? (
               <GlassCard className="flex-col overflow-hidden p-0 relative min-h-[350px] sm:min-h-[400px] flex">
                   <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-white/50 backdrop-blur-md flex justify-between items-center">
                       <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-600 font-semibold">
                           <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                           <span className="">Compose Email</span>
                       </div>
                       <div className="text-[10px] sm:text-xs text-slate-400">
                           To: <span className="text-slate-600 font-medium">{activeLead.business.email}</span>
                       </div>
                   </div>

                   <div className="flex-1 p-4 sm:p-6 bg-white/30 flex flex-col gap-3 sm:gap-4">
                       <input
                           type="text"
                           value={subject}
                           onChange={(e) => setSubject(e.target.value)}
                           placeholder="Subject"
                           className="w-full bg-white/50 border border-slate-200 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                       />
                       
                       <textarea
                           value={emailBody}
                           onChange={(e) => setEmailBody(e.target.value)}
                           className="flex-1 w-full bg-white/50 border border-slate-200 rounded-lg p-3 sm:p-4 resize-none outline-none text-slate-700 placeholder:text-slate-400 font-sans leading-relaxed text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                           placeholder="Write your email here..."
                       />
                   </div>

                   <div className="p-3 sm:p-4 bg-white/80 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
                       <div className="flex flex-col gap-1.5 w-full md:w-auto">
                           <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide ml-1">Create Follow-up Task</div>
                           <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100/80 p-1.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                               <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 ml-2" />
                               <input
                                   type="date"
                                   className="bg-transparent text-[10px] sm:text-xs font-bold text-slate-700 outline-none p-1 w-20 sm:w-24 cursor-pointer"
                                   value={followUpDate}
                                   onChange={(e) => setFollowUpDate(e.target.value)}
                               />
                               <div className="w-px h-3.5 sm:h-4 bg-slate-300 mx-1"></div>
                               <input
                                   type="text"
                                   placeholder="Add note..."
                                   className="bg-transparent text-[10px] sm:text-xs text-slate-700 outline-none p-1 w-32 sm:w-48 md:w-64 placeholder:text-slate-400"
                                   value={followUpNote}
                                   onChange={(e) => setFollowUpNote(e.target.value)}
                               />
                               <button
                                   onClick={handleSchedule}
                                   disabled={!followUpDate}
                                   className="ml-1 flex items-center gap-1.5 text-[10px] sm:text-xs bg-white text-indigo-600 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-lg font-bold shadow-sm border border-slate-200 hover:bg-indigo-50 hover:border-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                               >
                                  <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span className="">Schedule</span>
                               </button>
                           </div>
                       </div>

                       <div className="flex gap-2 sm:gap-3 w-full md:w-auto mt-3 md:mt-0">
                           <button className="flex-1 md:flex-none px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 text-slate-600 rounded-lg sm:rounded-xl font-medium hover:bg-slate-50 transition-all text-sm">
                               <span className="">Save Draft</span>
                           </button>
                           <button
                               onClick={handleSendEmail}
                               className="flex-1 md:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                           >
                               <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="">Send Email</span>
                           </button>
                       </div>
                   </div>
               </GlassCard>
           ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-sm italic">
                    No email address available for this business. Use social links or phone to contact.
                </div>
            )}

             {/* 3. Outcome Actions */}
             <GlassCard className="p-4 sm:p-6 border-t-4 border-t-indigo-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                    {/* Rating Section */}
                    <div className="w-full md:w-auto md:border-r md:border-slate-200 md:pr-4 sm:md:pr-6">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-1.5 sm:mb-2">Log Interaction Quality <span className="text-rose-500">*</span></h3>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                           <div className="flex">
                             {[1, 2, 3, 4, 5].map((star) => (
                               <button
                                   key={star}
                                   onClick={() => updateLeadStatus(activeLead.id, activeLead.status, undefined, star).then(() => {
                                       setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, rating: star } : l));
                                   })}
                                   className="p-0.5 sm:p-1 hover:scale-110 transition-transform focus:outline-none"
                               >
                                   <Star
                                     className={`w-5 h-5 sm:w-6 sm:h-6 ${activeLead.rating && activeLead.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`}
                                   />
                               </button>
                             ))}
                           </div>
                           <span className="text-[10px] sm:text-xs font-bold text-slate-400 ml-1">
                             {activeLead.rating ? `${activeLead.rating}/5 Stars` : 'Rate'}
                           </span>
                        </div>
                    </div>

                     <div className="flex-1 w-full">
                         <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-1.5 sm:mb-2">Set Outcome Status <span className="text-rose-500">*</span></h3>
                         <div className="flex flex-col gap-2.5 sm:gap-3">
                             <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                  <button
                                     onClick={() => {
                                         updateLeadStatus(activeLead.id, activeLead.status, 'Bad Fit').then(() => {
                                             setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, outcome: 'Bad Fit' } : l));
                                         });
                                     }}
                                     className={`flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center gap-1.5
                                         ${activeLead.outcome === 'Bad Fit'
                                            ? 'bg-rose-100 border-rose-300 text-rose-700 ring-1 ring-rose-300'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500'}
                                     `}
                                  >
                                     <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span>Bad Fit</span>
                                  </button>
                                  <button
                                     onClick={() => {
                                         updateLeadStatus(activeLead.id, activeLead.status, 'Good Fit' as any).then(() => {
                                             setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, outcome: 'Good Fit' } : l));
                                         });
                                     }}
                                     className={`flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center gap-1.5
                                         ${activeLead.outcome === 'Good Fit'
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700 ring-1 ring-indigo-300'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}
                                     `}
                                  >
                                     <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span>Good Fit</span>
                                  </button>
                             </div>
                             
                             <button
                                 onClick={() => handleOutcome('Converted')}
                                 className="w-full px-2.5 sm:px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-[0.98]"
                             >
                                 <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Convert to deal</span>
                             </button>
                         </div>
                     </div>
                </div>
             </GlassCard>
         </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <PlusCircle className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">Create Offer</h3>
                          <p className="text-sm text-slate-500">Create an offer for {activeLead?.business.name}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Offer Title</label>
                          <input
                              type="text"
                              value={offerTitle}
                              onChange={(e) => setOfferTitle(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="e.g., Senior Developer Position"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value ($)</label>
                          <input
                              type="number"
                              value={offerValue}
                              onChange={(e) => setOfferValue(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="e.g., 75000"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                          <select
                              value={offerStage}
                              onChange={(e) => setOfferStage(e.target.value as any)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                              <option value="Proposal">Proposal</option>
                              <option value="Qualified">Qualified</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Won">Won</option>
                              <option value="Lost">Lost</option>
                          </select>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Win Probability (%)</label>
                          <input
                              type="number"
                              value={offerProbability}
                              onChange={(e) => setOfferProbability(parseInt(e.target.value))}
                              min="0"
                              max="100"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Quality Rating (1-5)</label>
                              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-3 py-2">
                                 <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                 <input
                                      type="number"
                                      value={offerRating}
                                      onChange={(e) => setOfferRating(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                                      min="1"
                                      max="5"
                                      className="w-full focus:outline-none"
                                  />
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Outcome Status</label>
                              <select
                                  value={offerOutcome}
                                  onChange={(e) => setOfferOutcome(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              >
                                  <option value="Interested">Interested</option>
                                  <option value="Good Fit">Good Fit</option>
                                  <option value="Bad Fit">Bad Fit</option>
                                  <option value="Not Interested">Not Interested</option>
                              </select>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6 justify-end">
                      <button
                          onClick={() => setShowOfferModal(false)}
                          className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
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
                              
                              if (result.duplicate) {
                                  alert('An offer already exists for this lead!');
                                  return;
                              }
                              
                              if (result.success) {
                                  // Update lead status with Rating & Outcome, and move to Negotiations
                                  await updateLeadStatus(activeLead.id, 'Negotiations', offerOutcome as any, offerRating);
                                  
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
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-500/20"
                      >
                          Create Offer
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Success Notification */}
      {showNotification && (
          <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-right z-50">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                 <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                  <h4 className="font-bold text-sm">Success</h4>
                  <p className="text-xs text-slate-400">{notificationMsg}</p>
              </div>
          </div>
      )}

      {/* Duplicate Warning */}
      {showDuplicateWarning && (
          <div className="fixed top-10 right-10 bg-amber-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-right z-50">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                 <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                  <h4 className="font-bold text-sm">Already Exists</h4>
                  <p className="text-xs text-white/90">{duplicateLeadName} is already in the outreach tracking list</p>
              </div>
          </div>
      )}

      {/* Outreach Tracking Modal */}
      {showOutreachModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Send className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">Outreach to Business</h3>
                          <p className="text-sm text-slate-500">Log outreach activity for {activeLead?.business.name}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-6">
                      {/* Email Outreach Form */}
                      {outreachType === 'email' && (
                          <div className="space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Mail className="w-6 h-6 text-blue-600" />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800">Email Outreach</h4>
                                      <p className="text-sm text-slate-500">Send a professional email to {activeLead?.business.name}</p>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Subject</label>
                                  <input
                                      type="text"
                                      value={emailSubject}
                                      onChange={(e) => setEmailSubject(e.target.value)}
                                      className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
                                      placeholder="Enter email subject..."
                                  />
                              </div>
                              
                              <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-2">Email Body</label>
                                   <textarea
                                       value={outreachEmailBody}
                                       onChange={(e) => setOutreachEmailBody(e.target.value)}
                                       className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm resize-none"
                                       rows={4}
                                       placeholder="Compose your email message..."
                                   />
                               </div>
                          </div>
                      )}

                      {/* Phone Outreach Form */}
                      {outreachType === 'phone' && (
                          <div className="space-y-4 bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                      <Phone className="w-6 h-6 text-green-600" />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800">Phone Call</h4>
                                      <p className="text-sm text-slate-500">Log a phone call with {activeLead?.business.name}</p>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Call Notes</label>
                                  <textarea
                                      value={callNotes}
                                      onChange={(e) => setCallNotes(e.target.value)}
                                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm resize-none"
                                      rows={4}
                                      placeholder="Describe the phone call..."
                                  />
                              </div>
                          </div>
                      )}

                      {/* Social Media Outreach Form */}
                      {outreachType === 'social' && (
                          <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                      <MessageCircle className="w-6 h-6 text-purple-600" />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800">Social Media Outreach</h4>
                                      <p className="text-sm text-slate-500">Connect on social media with {activeLead?.business.name}</p>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Platform</label>
                                  <select
                                      value={socialPlatform}
                                      onChange={(e) => setSocialPlatform(e.target.value as any)}
                                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm"
                                  >
                                      <option value="linkedin">LinkedIn</option>
                                      <option value="twitter">Twitter</option>
                                      <option value="tiktok">TikTok</option>
                                      <option value="youtube">YouTube</option>
                                      <option value="instagram">Instagram</option>
                                      <option value="telegram">Telegram</option>
                                  </select>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                                  <textarea
                                      value={socialMessage}
                                      onChange={(e) => setSocialMessage(e.target.value)}
                                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm resize-none"
                                      rows={4}
                                      placeholder="Compose your social media message..."
                                  />
                              </div>
                          </div>
                      )}

                      {/* Website Outreach Form */}
                      {outreachType === 'website' && (
                          <div className="space-y-4 bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-100">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                      <Globe className="w-6 h-6 text-orange-600" />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800">Website Contact</h4>
                                      <p className="text-sm text-slate-500">Contact through website for {activeLead?.business.name}</p>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Action Type</label>
                                  <select
                                      value={websiteAction}
                                      onChange={(e) => setWebsiteAction(e.target.value as any)}
                                      className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/80 backdrop-blur-sm"
                                  >
                                      <option value="contact">General Contact</option>
                                      <option value="inquiry">Business Inquiry</option>
                                  </select>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                                  <textarea
                                      value={websiteMessage}
                                      onChange={(e) => setWebsiteMessage(e.target.value)}
                                      className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/80 backdrop-blur-sm resize-none"
                                      rows={4}
                                      placeholder="Describe your website contact..."
                                  />
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="flex gap-3 mt-6 justify-end">
                      <button
                          onClick={() => {
                              setShowOutreachModal(false);
                              setOutreachType('email');
                              setOutreachNotes('');
                              setOutreachDate('');
                              setEmailSubject('');
                              setOutreachEmailBody('');
                              setSocialPlatform('linkedin');
                              setSocialMessage('');
                              setCallNotes('');
                              setWebsiteAction('contact');
                              setWebsiteMessage('');
                          }}
                          className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={async () => {
                              if (!activeLead || !outreachType || !outreachNotes) return;
                                                            // Add entry to outreach_tracking table
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
                               
                               if (trackingResult.duplicate) {
                                 alert('This lead is already in the outreach tracking list!');
                                 return;
                               }
                               
                               if (!trackingResult.success) {
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
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-500/20"
                      >
                          Log Outreach
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );


};

export default Outreach;
