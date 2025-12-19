import React, { useEffect, useState } from 'react';
import GlassCard from './ui/GlassCard';
import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import { 
  Search, 
  Filter, 
  MoreVertical,
  Globe,
  Mail,
  Linkedin,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  BarChart3,
  Users,
  PieChart as PieIcon,
  TrendingUp,
  Target,
  Table as TableIcon,
  ChevronRight,
  Clock,
  DollarSign,
  Activity,
  Zap,
  TrendingDown,
  Timer,
  Send,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Star,
  FileSignature,
  PlusCircle,
  Building,
  UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLeads, updateLeadStatus, deleteLead, createOffer, saveBusiness, addToLeads, getOutreachTrackingLeads, getOffersLeads, getClosedLeads, supabase, logOutreachTracking } from '../lib/database/supabase';
import { Lead, Business, SocialProfile } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  Line
} from 'recharts';

// Function to format date and time with spaces and UTC+3 Nairobi timezone
const formatDateTime = (dateString: string) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Format date part
    const datePart = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Format time part
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    return `${datePart} ${timePart} UTC+3 (Nairobi)`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'board' | 'table' | 'analytics'>('board');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add Lead Modal State
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadWebsite, setNewLeadWebsite] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadDescription, setNewLeadDescription] = useState('');
  
  // Social media fields
  const [newLeadTwitter, setNewLeadTwitter] = useState('');
  const [newLeadInstagram, setNewLeadInstagram] = useState('');
  const [newLeadTiktok, setNewLeadTiktok] = useState('');
  const [newLeadLinkedin, setNewLeadLinkedin] = useState('');
  const [newLeadTelegram, setNewLeadTelegram] = useState('');
  
  // Filter State
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTimeRange, setFilterTimeRange] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');

  const fetchLeads = async () => {
    const startTime = Date.now();
    setLoading(true);
    
    // Fetch all datasets
    const allRawLeads = await getLeads();
    const closedLeads = await getClosedLeads();
    const outreachTrackingLeads = await getOutreachTrackingLeads();
    const offersLeads = await getOffersLeads();
    
    // Create specific sets of IDs for leads that are in later stages
    const processedIds = new Set([
        ...outreachTrackingLeads.map(l => l.id),
        ...offersLeads.map(l => l.id),
        ...closedLeads.map(l => l.id)
    ]);
    
    // Active 'New' leads are those in the main table but NOT in any tracking table
    const activeRegularLeads = allRawLeads.filter(l => !processedIds.has(l.id));
    
    // Combine all leads for filtering
    const allLeads = [...activeRegularLeads, ...closedLeads, ...outreachTrackingLeads, ...offersLeads];
    setLeads(allLeads);
    
    // Artificial Delay
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 800 - elapsedTime);
    await new Promise(r => setTimeout(r, remainingTime));
    
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
    
    // Also check for updates when window gains focus (user navigates back to this tab)
    const handleFocus = () => {
      fetchLeads();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Filter logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.business.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.business.email && lead.business.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter - keep generic check or remove if status is deprecated
    // For now, we trust the category separation
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    
    // Time range filter
    let matchesTimeRange = true;
    if (filterTimeRange) {
      const leadDate = new Date(lead.createdAt || '');
      const now = new Date();
      
      switch (filterTimeRange) {
        case 'today':
          matchesTimeRange = leadDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesTimeRange = leadDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesTimeRange = leadDate >= monthAgo;
          break;
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          matchesTimeRange = leadDate >= quarterAgo;
          break;
      }
    }
    
    // Outcome filter
    const matchesOutcome = !filterOutcome || lead.outcome === filterOutcome;
    
    return matchesSearch && matchesStatus && matchesTimeRange && matchesOutcome;
  });

  // Organize columns using specific data sources
  // 'New' is filtered by NOT being in others (as done in fetchLeads activeRegularLeads)
  // But since 'filteredLeads' combines them all, we need to separate them again by source/status
  // In fetchLeads, we assigned them implicit sources via the functions, but raw leads from getLeads might still have old status? 
  // We should rely on `processedIds` equivalent logic if possible, or just checking if they are the tracking leads
  
  // Since we don't have processedIds here easily without recomputing, we can rely on the fact that:
  // outreachTrackingLeads have source='Outreach Tracking'
  // offersLeads have source='Offer'
  // closedLeads have source='Closed'
  // activeRegularLeads have source='Scraper' (or original source)
  
  // So 'New' = source NOT IN ('Outreach Tracking', 'Offer', 'Closed')
  
  const columns = {
    'New': filteredLeads.filter(l => l.source !== 'Outreach Tracking' && l.source !== 'Offer' && l.source !== 'Closed'),
    'No Reply': filteredLeads.filter(l => l.source === 'Outreach Tracking'),
    'Negotiations': filteredLeads.filter(l => l.source === 'Offer'),
    'Converted': filteredLeads.filter(l => l.source === 'Closed'),
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'New': return 'bg-blue-500';
          case 'No Reply': return 'bg-slate-400';
          case 'Negotiations': return 'bg-indigo-500';
          case 'Converted': return 'bg-emerald-500';
          default: return 'bg-slate-400';
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'New': return 'text-blue-600 bg-blue-50 border-blue-100';
          case 'No Reply': return 'text-slate-600 bg-slate-50 border-slate-100';
          case 'Negotiations': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
          case 'Converted': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
          default: return 'text-slate-600 bg-slate-50 border-slate-100';
      }
  };

  const getStatusBg = (status: string) => {
      switch(status) {
          case 'New': return 'bg-blue-50/50 border-blue-100';
          case 'No Reply': return 'bg-slate-50/50 border-slate-100';
          case 'Negotiations': return 'bg-indigo-50/50 border-indigo-100';
          case 'Converted': return 'bg-emerald-50/50 border-emerald-100';
          default: return 'bg-slate-50/50 border-slate-100';
      }
  };

  const handleDragEnd = async (result: any) => {
     // Drag and drop logic... if moving out of New, we might need to handle it?
     // Users usually use buttons. Drag drop might update status but we want to avoid that if status is removed.
     // For now, leaving as is, assuming user uses buttons.
  };

  // ... (handleDeleteLead, etc)

  const handleOutreach = async (lead: Lead) => {
      // Local storage for cross-component updates (legacy/optional)
      const outreachClicks = JSON.parse(localStorage.getItem('outreachClicks') || '[]');
      outreachClicks.push({
        leadId: lead.id,
        leadName: lead.business.name,
        timestamp: new Date().toISOString(),
        source: 'leads_page'
      });
      localStorage.setItem('outreachClicks', JSON.stringify(outreachClicks));
      
      // Add entry to outreach_tracking table
      try {
        const trackingResult = await logOutreachTracking(
          lead.id,
          lead.business.name,
          'outreach_button_clicked',
          {
            button_clicked: 'outreach_button',
            timestamp: new Date().toISOString()
          },
          'leads_page'
        );
        
        if (trackingResult.duplicate) {
          alert('This lead is already in the outreach tracking list!');
          return;
        }
        
        if (!trackingResult.success) {
          console.error('Failed to track outreach button click');
          alert('Error: Failed to add to outreach tracking. Please run the SQL command to enable public access to outreach_tracking table.');
        } else {
          console.log('Successfully tracked outreach button click for:', lead.business.name);
          
          // No longer update status to 'No Reply'
          // We solely rely on the presence in outreach_tracking table
          
          // Refresh leads data
          await fetchLeads();
          console.log('Lead view refreshed');
        }
      } catch (error) {
        console.error('Exception during outreach tracking:', error);
        alert('Exception during tracking. Check console for details.');
      }
  };



  // --- Analytical Calculations ---
  const COLORS: Record<string, string> = {
      'New': '#3b82f6',
      'No Reply': '#94a3b8',
      'Negotiations': '#6366f1',
      'Converted': '#10b981'
  };

  // Outcome Summary - update calculations based on user requirements
  const interestedCount = columns.Negotiations.length;
  const noReplyCount = columns['No Reply'].length;
  const badFitCount = leads.filter(l => l.outcome === 'Bad Fit').length;

  // Sophisticated Pipeline Health
  const funnelData = [
    { name: 'Total Scoped', value: leads.length, fill: '#f1f5f9' },
    { name: 'Initial Contact', value: columns.New.length + columns['No Reply'].length, fill: '#94a3b8' },
    { name: 'Qualified', value: leads.filter(l => l.outcome === 'Interested').length, fill: '#6366f1' },
    { name: 'In Discussion', value: columns.Negotiations.length, fill: '#8b5cf6' },
    { name: 'Converted', value: columns.Converted.length, fill: '#10b981' },
  ];

  // Engagement Intensity Data - Calculate actual outreach data by day
  const calculateOutreachData = () => {
    const outreachLeads = leads.filter(l => l.source === 'Outreach Tracking');
    const dayData: Record<string, { touches: number, conversions: number }> = {};
    
    // Initialize all days of the week
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    daysOfWeek.forEach(day => {
      dayData[day] = { touches: 0, conversions: 0 };
    });
    
    // Count outreach by day
    outreachLeads.forEach(lead => {
      if (lead.createdAt) {
        const date = new Date(lead.createdAt);
        const dayName = daysOfWeek[date.getDay()];
        if (dayData[dayName]) {
          dayData[dayName].touches++;
          if (lead.outcome === 'Interested') {
            dayData[dayName].conversions++;
          }
        }
      }
    });
    
    // Convert to array format for chart (only show weekdays)
    return [
      { day: 'Mon', ...dayData['Mon'] },
      { day: 'Tue', ...dayData['Tue'] },
      { day: 'Wed', ...dayData['Wed'] },
      { day: 'Thu', ...dayData['Thu'] },
      { day: 'Fri', ...dayData['Fri'] },
    ];
  };

  const intensityData = calculateOutreachData();

  const handleAddLead = async () => {
    // Validation: Business name is mandatory, and at least one of website, email, or social media
    if (!newLeadName || (!newLeadWebsite && !newLeadEmail && !newLeadTwitter && !newLeadInstagram && !newLeadTiktok && !newLeadLinkedin && !newLeadTelegram)) {
      alert('Business name is required and at least one of website, email, or social media must be provided');
      return;
    }
    
    try {
      // Create social media array
      const socials: SocialProfile[] = [];
      if (newLeadTwitter) socials.push({ platform: 'twitter' as const, url: newLeadTwitter, handle: `@${newLeadTwitter}` });
      if (newLeadInstagram) socials.push({ platform: 'instagram' as const, url: newLeadInstagram, handle: `@${newLeadInstagram}` });
      if (newLeadTiktok) socials.push({ platform: 'tiktok' as const, url: newLeadTiktok, handle: `@${newLeadTiktok}` });
      if (newLeadLinkedin) socials.push({ platform: 'linkedin' as const, url: newLeadLinkedin, handle: newLeadLinkedin });
      if (newLeadTelegram) socials.push({ platform: 'telegram' as const, url: newLeadTelegram, handle: `@${newLeadTelegram}` });
      
      // Create business first
      const business = await saveBusiness({
        name: newLeadName,
        website: newLeadWebsite,
        email: newLeadEmail,
        phone: newLeadPhone,
        description: newLeadDescription,
        socials: socials
      });
      
      if (!business) {
        alert('Failed to create business. Please try again.');
        return;
      }
      
      // Create lead for business
      const lead = await addToLeads(business.id);
      
      if (!lead) {
        alert('Failed to create lead. Please try again.');
        return;
      }
      
      // Update leads list
      setLeads(prev => [...prev, lead]);
      
      // Close modal
      setShowAddLeadModal(false);
      setNewLeadName('');
      setNewLeadWebsite('');
      setNewLeadEmail('');
      setNewLeadPhone('');
      setNewLeadDescription('');
      setNewLeadTwitter('');
      setNewLeadInstagram('');
      setNewLeadTiktok('');
      setNewLeadLinkedin('');
      setNewLeadTelegram('');
      
      // Show success notification
      alert('Lead created successfully!');
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('An error occurred while adding lead.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    setIsDeleting(true);
    
    try {
      const success = await deleteLead(leadId);
      
      if (success) {
        // Remove lead from UI across all columns
        setLeads(prev => prev.filter(l => l.id !== leadId));
        setDeleteConfirmId(null);
      } else {
        alert('Failed to delete lead. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('An error occurred while deleting lead.');
    } finally {
      setIsDeleting(false);
    }
  };



  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-screen flex flex-col p-3 sm:p-4 lg:p-10 overflow-hidden max-w-[1600px] mx-auto"
    >
      {/* Header Section */}
      <div className="shrink-0 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Leads Central</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Advanced prospect intelligence & pipeline oversight.</p>
            <button
                onClick={() => setShowAddLeadModal(true)}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all mt-3 sm:mt-4 text-sm sm:text-base border-none"
            >
                <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                <span>Add Lead</span>
            </button>
          </div>
          <div className="flex gap-2 sm:gap-3">
             <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search prospects..."
                 className="pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-sm text-slate-700 focus:outline-none w-32 sm:w-48 transition-all"
               />
             </div>
             <div className="relative">
               <button
                 onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                 className="p-1.5 sm:p-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 sm:gap-2"
               >
                 <Filter className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                 <span className="text-[10px] sm:text-xs font-medium">Filter</span>
               </button>
               
               {/* Filter Dropdown */}
               {showFilterDropdown && (
                 <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 z-50 p-4">
                   <h4 className="font-bold text-slate-800 text-sm mb-3">Filter Leads</h4>
                   
                   {/* Status Filter */}
                   <div className="mb-4">
                     <label className="block text-xs font-medium text-slate-700 mb-2">Status</label>
                     <select
                       value={filterStatus}
                       onChange={(e) => setFilterStatus(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                       <option value="">All Status</option>
                       <option value="New">New</option>
                       <option value="No Reply">No Reply</option>
                       <option value="Negotiations">Negotiations</option>
                       <option value="Converted">Converted</option>
                     </select>
                   </div>
                   
                   {/* Time Range Filter */}
                   <div className="mb-4">
                     <label className="block text-xs font-medium text-slate-700 mb-2">Time Range</label>
                     <select
                       value={filterTimeRange}
                       onChange={(e) => setFilterTimeRange(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                       <option value="">All Time</option>
                       <option value="today">Today</option>
                       <option value="week">This Week</option>
                       <option value="month">This Month</option>
                       <option value="quarter">This Quarter</option>
                     </select>
                   </div>
                   
                   {/* Outcome Filter */}
                   <div className="mb-4">
                     <label className="block text-xs font-medium text-slate-700 mb-2">Outcome</label>
                     <select
                       value={filterOutcome}
                       onChange={(e) => setFilterOutcome(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                       <option value="">All Outcomes</option>
                       <option value="Interested">Interested</option>
                       <option value="No Reply">No Reply</option>
                       <option value="Bad Fit">Bad Fit</option>
                     </select>
                   </div>
                   
                   {/* Clear Filters Button */}
                   <div className="flex gap-2">
                     <button
                       onClick={() => {
                         setFilterStatus('');
                         setFilterTimeRange('');
                         setFilterOutcome('');
                         setShowFilterDropdown(false);
                       }}
                       className="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                     >
                       Clear
                     </button>
                     <button
                       onClick={() => setShowFilterDropdown(false)}
                       className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                     >
                       Apply
                     </button>
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Sub-Nav Toggle */}
        <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-8 border-b border-slate-200 relative overflow-x-auto">
          <button
            onClick={() => setActiveTab('board')}
            className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors relative z-10 whitespace-nowrap ${activeTab === 'board' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" /> <span>Board</span>
            {activeTab === 'board' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors relative z-10 whitespace-nowrap ${activeTab === 'table' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <TableIcon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" /> <span>List</span>
            {activeTab === 'table' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors relative z-10 whitespace-nowrap ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <BarChart3 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" /> <span>Analytics</span>
            {activeTab === 'analytics' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="flex-1 overflow-hidden">
              {activeTab === 'board' && (
                <div className="h-full overflow-x-auto pb-6 flex gap-6 px-1">
                  {[1, 2, 3, 4].map(col => (
                    <div key={col} className="w-[320px] flex flex-col h-full space-y-4">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <div className="space-y-4">
                        {[1, 2, 3].map(card => (
                          <div key={card} className="bg-white p-5 rounded-2xl border border-slate-200 h-32 space-y-3">
                            <div className="flex justify-between"><Skeleton variant="circular" className="w-10 h-10" /><Skeleton className="w-4 h-6" /></div>
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2 mt-auto" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'table' && (
                <div className="space-y-4 p-2">
                  <div className="flex gap-4 px-6 py-4"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/6" /><Skeleton className="h-4 w-1/6" /><Skeleton className="h-4 w-1/6" /><Skeleton className="h-4 w-1/6" /></div>
                  {[1, 2, 3, 4, 5].map(row => (
                    <div key={row} className="bg-white p-4 rounded-2xl border border-slate-200 h-16 flex items-center gap-4">
                      <Skeleton variant="circular" className="w-10 h-10" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'analytics' && (
                <div className="space-y-8 p-4">
                  <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-12" /></div>)}
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 h-[450px] bg-white rounded-2xl border border-slate-200 p-8"><Skeleton className="h-full w-full" /></div>
                    <div className="space-y-6"><div className="h-48 bg-indigo-500/10 rounded-2xl border border-indigo-200 p-6"><Skeleton className="h-full w-full" /></div><div className="h-48 bg-white rounded-2xl border border-slate-200 p-6"><Skeleton className="h-full w-full" /></div></div>
                  </div>
                </div>
              )}
          </div>
        )}

        {!loading && activeTab === 'board' && (
          <div className="h-full overflow-x-auto pb-4 sm:pb-6 scrollbar-hide">
            <div className="flex h-full gap-3 sm:gap-6 min-w-max px-1">
                {Object.entries(columns).map(([status, leads]) => (
                    <div key={status} className="w-[280px] sm:w-[320px] flex flex-col h-full">
                        <div className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 flex justify-between items-center border ${getStatusBg(status)}`}>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${getStatusColor(status)} shadow-sm`}></div>
                                <span className="font-bold text-slate-700 text-[10px] sm:text-xs uppercase tracking-wider">{status}</span>
                            </div>
                            <span className="bg-white px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold text-slate-500 border border-slate-200">
                                {leads.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1.5 sm:pr-2 scrollbar-hide pb-16 sm:pb-20">
                            {leads.map((lead) => {
                                // Determine correct route based on column status
                                const getRouteForLead = (leadStatus: string, leadSource: string) => {
                                    if (leadStatus === 'Negotiations' || leadSource === 'Offer') {
                                        return `/offers?lead=${lead.id}`;
                                    } else if (leadStatus === 'Converted' || leadSource === 'Closed') {
                                        return `/closed?lead=${lead.id}`;
                                    } else {
                                        return `/outreach?lead=${lead.id}`;
                                    }
                                };

                                const route = getRouteForLead(lead.status, lead.source || '');
                                
                                return (
                                <GlassCard
                                    key={lead.id}
                                    className="p-3.5 sm:p-5 group relative border-l-4 hover:transition-all cursor-pointer overflow-visible"
                                    hoverEffect
                                    onClick={() => navigate(route)}
                                    style={{ borderLeftColor: COLORS[status] || 'transparent' }}
                                >
                                    <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                                        <div className="flex items-center gap-2.5 sm:gap-3">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm">
                                                {lead.business.name.substring(0, 1)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight group-hover:text-indigo-600 transition-colors">{lead.business.name}</h3>
                                                <div className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] text-slate-400 font-medium">
                                                   <Globe className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" /> {lead.business.website}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(lead.id); }}
                                          className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                                          title="Delete Lead"
                                        >
                                            <MoreVertical className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/60 mt-2">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" /> {formatDateTime(lead.lastContact)}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                            {lead.status === 'New' ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOutreach(lead);
                                                }}
                                                className="flex items-center gap-1 hover:text-indigo-800 transition-colors"
                                              >
                                                Outreach <ArrowRight className="w-3 h-3" />
                                              </button>
                                            ) : lead.status === 'Negotiations' ? (
                                              <>View Offers <ArrowRight className="w-3 h-3" /></>
                                            ) : lead.status === 'Converted' ? (
                                              <>View Closed <ArrowRight className="w-3 h-3" /></>
                                            ) : (
                                              <>Outreach <ArrowRight className="w-3 h-3" /></>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'table' && (
          <div className="h-full flex flex-col animate-fade-in overflow-hidden">
            <div className="overflow-x-auto h-full scrollbar-hide py-1 sm:py-2">
                <table className="w-full text-left border-separate border-spacing-y-1 sm:border-spacing-y-2 px-1">
                  <thead>
                    <tr className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-3 sm:px-6 py-2 sm:py-4">Prospect</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4">Status</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">Value</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">Days</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">Outcome</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                       // Determine correct route based on column status
                       const getRouteForLead = (leadStatus: string, leadSource: string) => {
                           if (leadStatus === 'Negotiations' || leadSource === 'Offer') {
                               return `/offers?lead=${lead.id}`;
                           } else if (leadStatus === 'Converted' || leadSource === 'Closed') {
                               return `/closed?lead=${lead.id}`;
                           } else {
                               return `/outreach?lead=${lead.id}`;
                           }
                       };

                       const route = getRouteForLead(lead.status, lead.source || '');
                       
                       return (
                      <tr key={lead.id} className="group transition-all" onClick={() => navigate(route)}>
                       <td className="px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-l border-slate-200 rounded-l-xl sm:rounded-l-2xl group-hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-2.5 sm:gap-4">
                             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm">
                                 {lead.business.name.substring(0, 1)}
                             </div>
                             <div className="min-w-0 flex-1">
                               <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate">{lead.business.name}</h3>
                               <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block">{lead.business.website}</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all">
                          <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border ${getStatusBadge(lead.status)}`}>
                            {lead.status}
                          </span>
                       </td>
                       <td className="px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all hidden sm:table-cell">
                          <span className="text-xs font-bold text-slate-700">${(lead.estimatedValue || 0).toLocaleString()}</span>
                       </td>
                       <td className="px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all hidden sm:table-cell text-xs font-medium text-slate-500">
                          {lead.daysInStage || 0}d
                       </td>
                       <td className="px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all hidden sm:table-cell">
                          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded ${lead.outcome === 'Interested' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                             {lead.outcome || 'Pending'}
                          </span>
                       </td>
                       <td className="px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-r border-slate-200 rounded-r-xl sm:rounded-r-2xl transition-all text-right">
                          <button className="p-1.5 sm:p-2 text-slate-300 hover:text-indigo-600">
                             <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                         </button>
                       </td>
                      </tr>
                       );
                    })}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'analytics' && (
          <div className="h-full overflow-y-auto pr-2 scrollbar-hide pb-20 animate-fade-in space-y-8 pt-4">
             
             {/* 1. Outcome Summary Cards */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <GlassCard className="p-4 sm:p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Interested</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-bold text-emerald-600 tracking-tighter">{interestedCount}</span>
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">leads</span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4 sm:p-6 border-l-4 border-l-amber-500 flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">No Reply</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-bold text-amber-500 tracking-tighter">{noReplyCount}</span>
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">leads</span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4 sm:p-6 border-l-4 border-l-slate-400 flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bad Fit</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-bold text-slate-500 tracking-tighter">{badFitCount}</span>
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">leads</span>
                        </div>
                    </div>
                </GlassCard>
             </div>

             {/* 2. Advanced Performance Charts */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Visual Pipeline Funnel */}
                <GlassCard className="lg:col-span-2 p-8 h-[450px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-indigo-500" /> Interaction Quality Funnel
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Lifecycle Conversion Analysis</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-[10px] font-bold text-slate-500">Volume</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} margin={{ left: 20, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                                <Tooltip cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Performance KPIs Sidebar */}
                <div className="space-y-6">
                    <GlassCard className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-none">
                        <div className="flex items-center gap-3 mb-4 opacity-80 uppercase text-[10px] font-bold tracking-[0.2em]">
                            <TrendingUp className="w-4 h-4" /> Growth
                        </div>
                        <div className="text-4xl font-bold tracking-tighter mb-1">
                            {columns.New.length + columns['No Reply'].length > 0
                                ? Math.round((columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) * 100)
                                : 0}%
                        </div>
                        <p className="text-indigo-100 text-xs font-medium">Negotiations Rate</p>
                        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                            <div className="text-center">
                                <div className="text-sm font-bold">
                                    {(() => {
                                        const newLeads = columns.New;
                                        const negotiationLeads = columns.Negotiations;
                                        if (newLeads.length === 0 || negotiationLeads.length === 0) return 'N/A';
                                        
                                        const totalDays = newLeads.reduce((sum, lead) => {
                                            if (lead.createdAt) {
                                                const createdDate = new Date(lead.createdAt);
                                                const today = new Date();
                                                return sum + Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                                            }
                                            return sum;
                                        }, 0);
                                        
                                        return newLeads.length > 0 ? (totalDays / newLeads.length).toFixed(1) + 'd' : 'N/A';
                                    })()}
                                </div>
                                <div className="text-[9px] opacity-70 uppercase">First Reply</div>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="text-center">
                                <div className="text-sm font-bold">
                                    {columns.New.length + columns['No Reply'].length > 0
                                        ? Math.round((columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) * 100)
                                        : 0}%
                                </div>
                                <div className="text-[9px] opacity-70 uppercase">CTR</div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Health Summary</h4>
                       <div className="space-y-4">
                           <div className="flex justify-between items-center">
                               <span className="text-sm font-medium text-slate-600">Fresh Momentum</span>
                               <span className={`text-sm font-bold ${
                                   columns.New.length > 0 ?
                                       (columns.Converted.length / columns.New.length) >= 1 ? 'text-emerald-500' : 'text-amber-500'
                                       : 'text-slate-400'
                               }`}>
                                   {columns.New.length > 0 ?
                                       (columns.Converted.length / columns.New.length) >= 1 ? 'Strong' : 'Weak'
                                       : 'N/A'
                                   }
                               </span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-100 rounded-full">
                               <div className={`h-full rounded-full ${
                                   columns.New.length > 0 ?
                                       (columns.Converted.length / columns.New.length) >= 1 ? 'bg-emerald-500' : 'bg-amber-500'
                                       : 'bg-slate-200'
                               }`} style={{
                                   width: columns.New.length > 0 ?
                                       Math.min((columns.Converted.length / columns.New.length) * 100, 100) + '%'
                                       : '0%'
                               }}></div>
                           </div>
                           <div className="flex justify-between items-center">
                               <span className="text-sm font-medium text-slate-600">Reply Consistency</span>
                               <span className={`text-sm font-bold ${
                                   columns.New.length + columns['No Reply'].length > 0 ?
                                       (columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) >= 0.5 ? 'text-emerald-500' : 'text-amber-500'
                                       : 'text-slate-400'
                               }`}>
                                   {columns.New.length + columns['No Reply'].length > 0 ?
                                       (columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) >= 0.5 ? 'Strong' : 'Weak'
                                       : 'N/A'
                                   }
                               </span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-100 rounded-full">
                               <div className={`h-full rounded-full ${
                                   columns.New.length + columns['No Reply'].length > 0 ?
                                       (columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) >= 0.5 ? 'bg-emerald-500' : 'bg-amber-500'
                                       : 'bg-slate-200'
                               }`} style={{
                                   width: columns.New.length + columns['No Reply'].length > 0 ?
                                       Math.min((columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) * 100, 100) + '%'
                                       : '0%'
                               }}></div>
                           </div>
                       </div>
                   </GlassCard>
                </div>

                {/* Activity Volume vs. Success Index */}
                <GlassCard className="lg:col-span-3 p-8 h-[380px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-rose-500" /> Outreach Intensity & Yield
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Correlation of Daily Touches to Converted Interest</p>
                        </div>
                    </div>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={intensityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 10}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Area type="monotone" dataKey="touches" name="Total Touches" stroke="#6366f1" fill="#6366f1" fillOpacity={0.05} strokeWidth={2} />
                                <Line type="stepAfter" dataKey="conversions" name="Interest Signal" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
             </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Add New Lead</h3>
                <p className="text-sm text-slate-500">Create a new lead to track</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter business name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  value={newLeadWebsite}
                  onChange={(e) => setNewLeadWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter website URL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newLeadDescription}
                  onChange={(e) => setNewLeadDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows={3}
                  placeholder="Enter business description"
                />
              </div>
              
              {/* Social Media Fields */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">Social Media</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Twitter</label>
                    <input
                      type="text"
                      value={newLeadTwitter}
                      onChange={(e) => setNewLeadTwitter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={newLeadInstagram}
                      onChange={(e) => setNewLeadInstagram(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">TikTok</label>
                    <input
                      type="text"
                      value={newLeadTiktok}
                      onChange={(e) => setNewLeadTiktok(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">LinkedIn</label>
                    <input
                      type="text"
                      value={newLeadLinkedin}
                      onChange={(e) => setNewLeadLinkedin(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Profile URL or username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Telegram</label>
                    <input
                      type="text"
                      value={newLeadTelegram}
                      onChange={(e) => setNewLeadTelegram(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => {
                  setShowAddLeadModal(false);
                  setNewLeadName('');
                  setNewLeadWebsite('');
                  setNewLeadEmail('');
                  setNewLeadPhone('');
                  setNewLeadDescription('');
                  setNewLeadTwitter('');
                  setNewLeadInstagram('');
                  setNewLeadTiktok('');
                  setNewLeadLinkedin('');
                  setNewLeadTelegram('');
                }}
                className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
              >
                <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                Add Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
               <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-rose-600" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-800">Delete Lead</h3>
               <p className="text-sm text-slate-500">This action cannot be undone</p>
             </div>
           </div>
           
           <p className="text-slate-600 mb-6">
             Are you sure you want to delete this lead? This will permanently remove lead and all associated data.
           </p>
           
           <div className="flex gap-3 justify-end">
             <button
               onClick={() => setDeleteConfirmId(null)}
               disabled={isDeleting}
               className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
             >
               Cancel
             </button>
             <button
               onClick={() => handleDeleteLead(deleteConfirmId)}
               disabled={isDeleting}
               className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
               {isDeleting ? (
                 <>
                   <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 animate-spin" />
                   Deleting...
                 </>
               ) : (
                 <>
                   <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                   Delete Lead
                 </>
               )}
             </button>
           </div>
         </div>
       </div>
     )}
    </motion.div>
  );
};

export default Leads;
