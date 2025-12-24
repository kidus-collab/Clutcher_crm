import React, { useState, useMemo, useCallback } from 'react';
import GlassCard from './ui/GlassCard';
import { getLeads, getClosedLeads, addClosedLead } from '../lib/database/supabase';
import { Lead } from '../types';
import {
  CheckSquare,
  Globe,
  Mail,
  Star,
  Trash2,
  BarChart3,
  LayoutList,
  Target,
  TrendingDown,
  Timer,
  PieChart as PieIcon,
  Briefcase,
  DollarSign,
  BookOpen,
  ArrowLeft,
  Zap,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Trophy,
  Search,
  CheckCircle2,
  Rocket,
  Clock,
  TrendingUp,
  Award,
  Calendar,
  CheckCheck,
  Eye,
  Handshake,
  MessageSquare,
  Users,
  FileText,
  Building2,
  Phone,
  MapPin,
  Flag,
  RefreshCw,
  Settings,
  Download,
  Upload,
  Edit,
  Save,
  Copy,
  Share,
  ExternalLink,
  User,
  Contact,
  Megaphone,
  PenTool,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Filter,
  MoreVertical,
  Plus,
  Minus,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Home,
  Archive,
  FolderOpen,
  FileCheck,
  Stamp,
  Medal,
  Crown,
  Gem,
  Sparkles,
  Heart,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const ClosedLeads: React.FC = () => {
  const [activeView, setActiveView] = useState<'list' | 'analytics' | 'case-studies'>('list');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Fetch both closed leads and converted leads from the main leads table
      const [closedLeadsData, convertedLeadsData] = await Promise.all([
        getClosedLeads(),
        getLeads().then(leads => leads.filter(lead =>
          lead.status === 'Closed' ||
          lead.outcome === 'Converted'
        ))
      ]);
      
      // Combine both data sources, prioritizing closed_leads data for successfully archived leads
      // Filter closed_leads to only show successfully archived (Converted) leads
      const successfulClosedLeads = closedLeadsData.filter(lead =>
        lead.outcome === 'Converted'
      );
      
      const allSuccessLeads = [...successfulClosedLeads, ...convertedLeadsData];
      
      // Remove duplicates based on business name or ID
      const uniqueLeads = allSuccessLeads.reduce((acc: Lead[], lead) => {
        const existingIndex = acc.findIndex(existingLead =>
          existingLead.business.name === lead.business.name ||
          existingLead.id === lead.id
        );
        
        if (existingIndex === -1) {
          acc.push(lead);
        } else {
          // Prefer the closed_leads version if it exists
          if (successfulClosedLeads.includes(lead)) {
            acc[existingIndex] = lead;
          }
        }
        
        return acc;
      }, []);
      
      setLeads(uniqueLeads);
    } catch (error) {
      console.error('Error fetching success leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads for closed/converted outcome - memoized for performance
  const filteredLeads = useMemo(() => {
    const closedLeads = leads; // All leads from closed_leads table are already closed
    return closedLeads.filter(lead => {
      const matchesSearch =
        lead.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.business.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.business.email && lead.business.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [leads, searchQuery]);
  
  const convertedLeads = useMemo(() =>
    filteredLeads.filter(l => l.outcome === 'Converted' && l.caseStudy),
    [filteredLeads]
  );

  // Analytical Data Calculations - memoized for performance
  const analyticsData = useMemo(() => {
    const wonCount = filteredLeads.filter(l => l.outcome === 'Converted').length;
    const lostCount = filteredLeads.filter(l => l.outcome === 'Bad Fit').length;
    const otherCount = filteredLeads.filter(l => l.outcome !== 'Converted' && l.outcome !== 'Bad Fit').length;

    const outcomeData = [
      { name: 'Successfully Archived', value: wonCount, fill: '#10b981' },
      { name: 'Bad Fit', value: lostCount, fill: '#f43f5e' },
      { name: 'Other Archive', value: otherCount, fill: '#94a3b8' },
    ];

    // Calculate actual value data from filtered leads
    const totalValue = filteredLeads.reduce((sum, lead) => sum + (lead.estimatedValue || lead.pipelineValue || 0), 0);
    const wonValue = filteredLeads.filter(l => l.outcome === 'Converted').reduce((sum, lead) => sum + (lead.estimatedValue || lead.pipelineValue || 0), 0);
    const lostValue = filteredLeads.filter(l => l.outcome === 'Bad Fit').reduce((sum, lead) => sum + (lead.estimatedValue || lead.pipelineValue || 0), 0);
    
    // Calculate average duration and rating
    const avgDuration = filteredLeads.length > 0
      ? filteredLeads.reduce((sum, lead) => sum + (lead.daysInStage || lead.duration || 0), 0) / filteredLeads.length
      : 0;
    const avgRating = filteredLeads.length > 0
      ? filteredLeads.reduce((sum, lead) => sum + (lead.rating || 0), 0) / filteredLeads.length
      : 0;

    // Generate monthly trend data based on actual data
    const monthlyData = filteredLeads.reduce((acc: any, lead) => {
      const date = new Date(lead.createdAt || lead.lastContact);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, won: 0, lost: 0, count: 0 };
      }
      
      if (lead.outcome === 'Converted') {
        acc[monthKey].won += lead.estimatedValue || lead.pipelineValue || 0;
      } else if (lead.outcome === 'Bad Fit') {
        acc[monthKey].lost += lead.estimatedValue || lead.pipelineValue || 0;
      }
      acc[monthKey].count += 1;
      
      return acc;
    }, {});

    const valueHarvestData = Object.values(monthlyData).slice(-6); // Last 6 months

    // Calculate conversion rate
    const conversionRate = filteredLeads.length > 0 ? (wonCount / filteredLeads.length * 100) : 0;

    // Quality distribution
    const qualityDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating: `${rating}★`,
      count: filteredLeads.filter(lead => lead.rating === rating).length,
      fill: rating >= 4 ? '#10b981' : rating >= 3 ? '#f59e0b' : rating >= 2 ? '#f97316' : '#ef4444'
    }));

    return {
      wonCount,
      lostCount,
      otherCount,
      outcomeData,
      totalValue,
      wonValue,
      lostValue,
      avgDuration,
      avgRating,
      valueHarvestData,
      conversionRate,
      qualityDistribution
    };
  }, [filteredLeads]);

  // Destructure memoized analytics data
  const {
    wonCount,
    lostCount,
    otherCount,
    outcomeData,
    totalValue,
    wonValue,
    lostValue,
    avgDuration,
    avgRating,
    valueHarvestData,
    conversionRate,
    qualityDistribution
  } = analyticsData;

  const handleBack = useCallback(() => {
    setSelectedCaseStudy(null);
  }, []);

  const toggleLeadExpansion = useCallback((leadId: string) => {
    setExpandedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Memoized Lead Item Component for performance
  const LeadItem = React.memo(({ lead }: { lead: Lead }) => (
    <GlassCard key={lead.id} className={`p-5 group hover:bg-white transition-all border-l-4 ${
      lead.outcome === 'Converted'
        ? 'border-l-emerald-500 opacity-90'
        : 'border-l-slate-400 opacity-75'
    }`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center w-full md:w-1/3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg mr-4 shrink-0">
            {lead.business.name.substring(0, 1)}
          </div>
          <div>
            <h3 className={`font-bold text-slate-700 ${
              lead.outcome === 'Converted' ? '' : 'italic opacity-60 line-through'
            }`}>{lead.business.name}</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              Archived {lead.lastContact}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-1/3 justify-start md:justify-center">
          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="text-xs font-bold text-amber-600">{lead.rating || 'N/A'} Quality</span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            lead.outcome === 'Converted'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-slate-50 text-slate-500 border-slate-100'
          }`}>
            {lead.outcome === 'Converted' ? 'SUCCESSFULLY ARCHIVED' : 'CLOSED'}
          </span>
        </div>
        <div className="flex items-center justify-end w-full md:w-1/3 gap-3">
          <button
            onClick={() => toggleLeadExpansion(lead.id)}
            className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-100 transition-all border border-slate-200"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedLeads.has(lead.id) ? 'rotate-90' : ''}`} /> More info
          </button>
          {lead.outcome === 'Converted' && (
            <button
              onClick={() => {
                setSelectedCaseStudy(lead);
                setActiveView('case-studies');
              }}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <FileText className="w-3.5 h-3.5" /> Success Story
            </button>
          )}
          <button className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* More Info Dropdown */}
      <AnimatePresence>
        {expandedLeads.has(lead.id) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-slate-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Date Added</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {formatDate(lead.createdAt)}
                </div>
              </div>
             
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Timer className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Closed Date</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {formatDate(lead.lastContact)}
                </div>
              </div>
             
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {lead.daysInStage || lead.duration || 0} days
                </div>
              </div>
             
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Pipeline Value</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  ${(lead.estimatedValue || lead.pipelineValue || 0).toLocaleString()}
                </div>
              </div>
            </div>
             
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Flag className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Outcome</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {lead.outcome || 'N/A'}
                </div>
              </div>
             
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Log Probability</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {lead.rating ? `${(lead.rating / 5 * 100).toFixed(0)}%` : 'N/A'}
                </div>
              </div>
            </div>
             
            <div className="mt-4 bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Business Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-xs text-slate-500">Website:</span>
                  <div className="font-medium text-slate-800 truncate">{lead.business.website || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Email:</span>
                  <div className="font-medium text-slate-800 truncate">{lead.business.email || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Phone:</span>
                  <div className="font-medium text-slate-800 truncate">{lead.business.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  ));

  return (
    <div className="p-6 lg:p-10 min-h-screen animate-fade-in max-w-[1600px] mx-auto overflow-hidden flex flex-col">
       {/* Main Navigation Header - Hidden if a case study is selected for a cleaner detail view */}
       <AnimatePresence mode="wait">
        {!selectedCaseStudy ? (
          <motion.div 
            key="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0"
          >
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                  <CheckCheck className="w-7 h-7 text-emerald-500" />
                  Successfully Archived Leads
              </h1>
              <p className="text-slate-500 text-sm mt-1">View and analyze successfully converted and archived leads</p>
            </div>
            
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button 
                onClick={() => setActiveView('list')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutList className="w-4 h-4" /> List
              </button>
              <button 
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'analytics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <TrendingUp className="w-4 h-4" /> Performance
              </button>
              <button 
                onClick={() => setActiveView('case-studies')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'case-studies' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText className="w-4 h-4" /> Case Studies
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button 
            key="back-button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest mb-6 w-fit bg-white px-4 py-2 rounded-xl border border-slate-100"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Success Stories
          </motion.button>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6 shrink-0">
        <div className="relative group flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived leads..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pb-20">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : selectedCaseStudy ? (
            <motion.div 
              key="detail-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Hero Impact Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <GlassCard className="lg:col-span-8 p-10 border-none bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                            <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-4xl font-bold border border-white/20">
                                {selectedCaseStudy.business.name.substring(0, 1)}
                            </div>
                            <div className="text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-[0.2em]">Successfully Archived</span>
                                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full border border-indigo-500/30 uppercase tracking-[0.2em]">Converted Lead</span>
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter mb-1">{selectedCaseStudy.business.name}</h2>
                                <p className="opacity-60 text-indigo-100 flex items-center justify-center md:justify-start gap-2 text-sm font-medium">
                                  <Globe className="w-4 h-4" /> {selectedCaseStudy.business.website}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-12">
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-300 mb-3 flex items-center gap-2">
                                      <AlertCircle className="w-3.5 h-3.5" /> Business Challenge
                                    </h4>
                                    <p className="text-lg leading-relaxed text-indigo-50 font-medium">
                                        {selectedCaseStudy.outcome === 'Converted' ? 'Successfully converted this lead through strategic outreach and negotiation.' : 'Closed lead with detailed analysis.'}
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-3 flex items-center gap-2">
                                    <Award className="w-3.5 h-3.5" /> Archive Success
                                  </h4>
                                  <p className="text-sm text-indigo-100/80 leading-relaxed italic">
                                     Successfully converted and archived with detailed performance metrics and business impact analysis.
                                  </p>
                                </div>
                            </div>
                            
                            <div className="bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div>
                                        <div className="text-5xl font-black tracking-tighter text-white mb-1">
                                          ${(selectedCaseStudy.estimatedValue || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Archived Value</div>
                                    </div>
                                    <div>
                                        <div className="text-5xl font-black tracking-tighter text-white mb-1">
                                          {selectedCaseStudy.daysInStage} <span className="text-2xl font-bold opacity-50">days</span>
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Conversion Duration</div>
                                    </div>
                                </div>
                                <div className="mt-8 flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-400/10 px-4 py-2 rounded-xl w-fit">
                                  <ArrowUpRight className="w-5 h-5" /> Successfully Archived
                                </div>
                            </div>
                        </div>
                      </div>
                  </GlassCard>

                  <div className="lg:col-span-4 space-y-6">
                      <GlassCard className="p-8 h-full flex flex-col">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" /> Archive Summary
                          </h3>
                          <div className="space-y-8 flex-1">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <div className="text-xs font-bold text-slate-800">Archive Quality</div>
                                    <div className="text-[10px] text-slate-400 font-medium">Lead performance rating</div>
                                 </div>
                                 <div className="flex items-center gap-1 text-amber-500">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="text-xl font-black">{selectedCaseStudy.rating}</span>
                                 </div>
                              </div>
                              <div className="flex items-center justify-between">
                                 <div>
                                    <div className="text-xs font-bold text-slate-800">Channel Efficiency</div>
                                    <div className="text-[10px] text-slate-400 font-medium">Primary outreach</div>
                                 </div>
                                 <div className="flex gap-2">
                                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                                    <Globe className="w-4 h-4 text-emerald-500" />
                                 </div>
                              </div>
                          </div>
                          <div className="mt-10 pt-8 border-t border-slate-100">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Archive Notes</h4>
                              <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                 This lead was successfully converted and archived with complete performance metrics and business impact documentation.
                              </p>
                          </div>
                      </GlassCard>
                  </div>
              </div>

              {/* The Process Roadmap */}
              <GlassCard className="p-12 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-12 flex items-center gap-3">
                      <Users className="w-7 h-7 text-indigo-600" />
                      The Archive Journey
                  </h3>
                  
                  <div className="relative">
                      <div className="hidden lg:block absolute top-10 left-0 right-0 h-1 bg-slate-100 rounded-full z-0"></div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
                          {[
                            { date: 'Discovery', label: 'Lead Generation', detail: 'Initial business identification and qualification' },
                            { date: 'Engagement', label: 'Active Outreach', detail: 'Strategic communication and relationship building' },
                            { date: 'Conversion', label: 'Successful Deal', detail: 'Lead conversion and business agreement' },
                            { date: 'Archive', label: 'Documentation', detail: 'Performance analysis and archival in success database' }
                          ].map((step, i) => (
                              <div key={i} className="group flex flex-col items-center text-center lg:items-start lg:text-left">
                                  <div className={`
                                      w-20 h-20 rounded-[2.5rem] flex items-center justify-center border-[6px] border-white mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6
                                      ${i === (selectedCaseStudy.caseStudy?.milestones.length || 0) - 1 ? 'bg-emerald-500 text-white animate-pulse-fast' : 'bg-indigo-600 text-white shadow-indigo-200'}
                                  `}>
                                      {i === 0 ? <Search className="w-8 h-8" /> :
                                       i === 1 ? <MessageSquare className="w-8 h-8" /> :
                                       i === 2 ? <Handshake className="w-8 h-8" /> :
                                       <CheckCheck className="w-8 h-8" />}
                                  </div>
                                  <div className="inline-flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">{step.date}</span>
                                  </div>
                                  <h4 className="text-lg font-black text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">{step.label}</h4>
                                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                                      {step.detail}
                                  </p>
                              </div>
                          ))}
                      </div>
                  </div>
              </GlassCard>
            </motion.div>
          ) : activeView === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
                {filteredLeads.map((lead) => (
                    <LeadItem key={lead.id} lead={lead} />
                ))}
                {filteredLeads.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                    <CheckSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No successfully archived leads yet</p>
                    <p className="text-xs text-slate-400 mt-2">Converted leads will appear here once archived</p>
                  </div>
                )}
            </motion.div>
          ) : activeView === 'analytics' ? (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <GlassCard className="p-6">
                      <div className="p-2 bg-emerald-50 w-fit rounded-xl text-emerald-600 mb-3"><Trophy className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{wonCount}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Successfully Archived</div>
                      <div className="text-xs text-emerald-600 font-medium mt-2">{conversionRate.toFixed(1)}% success rate</div>
                  </GlassCard>
                  <GlassCard className="p-6">
                      <div className="p-2 bg-rose-50 w-fit rounded-xl text-rose-600 mb-3"><XCircle className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{lostCount}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Loss Rate Archive</div>
                      <div className="text-xs text-rose-600 font-medium mt-2">${lostValue.toLocaleString()} value</div>
                  </GlassCard>
                  <GlassCard className="p-6">
                      <div className="p-2 bg-indigo-50 w-fit rounded-xl text-indigo-600 mb-3"><Clock className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{avgDuration.toFixed(1)}d</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg. Close Speed</div>
                      <div className="text-xs text-indigo-600 font-medium mt-2">{filteredLeads.length} total leads</div>
                  </GlassCard>
                  <GlassCard className="p-6">
                      <div className="p-2 bg-amber-50 w-fit rounded-xl text-amber-600 mb-3"><Award className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{avgRating.toFixed(1)}/5</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Archive Quality</div>
                      <div className="text-xs text-amber-600 font-medium mt-2">${wonValue.toLocaleString()} value</div>
                  </GlassCard>
              </div>

              {/* Additional Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <GlassCard className="p-6">
                      <div className="p-2 bg-purple-50 w-fit rounded-xl text-purple-600 mb-3"><TrendingUp className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">${totalValue.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Pipeline Value</div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                          <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(wonValue / totalValue * 100) || 0}%` }}
                          ></div>
                      </div>
                      <div className="text-xs text-purple-600 font-medium mt-1">{((wonValue / totalValue * 100) || 0).toFixed(1)}% realized</div>
                  </GlassCard>
                  
                  <GlassCard className="p-6">
                      <div className="p-2 bg-cyan-50 w-fit rounded-xl text-cyan-600 mb-3"><Sparkles className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">${(wonValue / (wonCount || 1)).toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg. Deal Value</div>
                      <div className="text-xs text-cyan-600 font-medium mt-2">Per conversion</div>
                  </GlassCard>
                  
                  <GlassCard className="p-6">
                      <div className="p-2 bg-orange-50 w-fit rounded-xl text-orange-600 mb-3"><Users className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{(wonCount + lostCount + otherCount)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Closed</div>
                      <div className="text-xs text-orange-600 font-medium mt-2">All time</div>
                  </GlassCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="p-8 h-[400px] flex flex-col">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-8 uppercase tracking-widest text-xs">
                          <PieIcon className="w-4 h-4 text-emerald-500" /> Archive Distribution
                      </h3>
                      <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={outcomeData}
                                      innerRadius={70}
                                      outerRadius={100}
                                      paddingAngle={8}
                                      dataKey="value"
                                  >
                                      {outcomeData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.fill} />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                  <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </GlassCard>
                  <GlassCard className="p-8 h-[400px] flex flex-col">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-8 uppercase tracking-widest text-xs">
                          <Trophy className="w-4 h-4 text-emerald-500" /> Archive Performance
                      </h3>
                      <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={valueHarvestData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 10}} />
                                  <Tooltip formatter={(v: any) => `$${(v as number).toLocaleString()}`} />
                                  <Area type="monotone" dataKey="won" name="Won Value" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
                                  <Area type="monotone" dataKey="lost" name="Lost Value" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.05} strokeWidth={2} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </GlassCard>
                  
                  <GlassCard className="p-8 h-[400px] flex flex-col">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-8 uppercase tracking-widest text-xs">
                          <Award className="w-4 h-4 text-amber-500" /> Archive Quality
                      </h3>
                      <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={qualityDistribution}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 10}} />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#8884d8">
                                      {qualityDistribution.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.fill} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </GlassCard>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="case-studies"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pt-2"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {convertedLeads.map((lead) => (
                        <GlassCard
                          key={lead.id}
                          className="p-0 overflow-hidden group hover:shadow-lg transition-all cursor-pointer flex flex-col border-none"
                          onClick={() => setSelectedCaseStudy(lead)}
                        >
                            <div className="h-40 bg-gradient-to-br from-indigo-500 via-indigo-700 to-slate-900 p-8 flex items-end relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl border border-white/20 relative z-10">
                                    {lead.business.name.substring(0, 1)}
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col bg-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">{lead.business.name}</h3>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Archived</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-3 mb-8 font-medium leading-relaxed">
                                    Successfully converted and archived with complete performance metrics and business impact analysis.
                                </p>
                                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <Clock className="w-4 h-4 text-indigo-400" />
                                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          {lead.daysInStage} Day Archive
                                       </div>
                                    </div>
                                    <div className="text-xs font-black text-indigo-600 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                        Read Story <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
                {convertedLeads.length === 0 && (
                  <div className="py-24 text-center opacity-40">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No Success Stories Available</p>
                    <p className="text-xs text-slate-400 mt-2">Successfully converted leads will have detailed success stories here</p>
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClosedLeads;