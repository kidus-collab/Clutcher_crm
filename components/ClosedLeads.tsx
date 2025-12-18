import React, { useState } from 'react';
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
  Award
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

  React.useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const data = await getClosedLeads();
    setLeads(data);
    setLoading(false);
  };

  // Filter leads for closed/converted outcome
  const closedLeads = leads; // All leads from closed_leads table are already closed
  const filteredLeads = closedLeads.filter(lead => {
    const matchesSearch =
      lead.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.business.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.business.email && lead.business.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });
  
  const convertedLeads = filteredLeads.filter(l => l.outcome === 'Converted' && l.caseStudy);

  // Analytical Data Calculations
  const wonCount = filteredLeads.filter(l => l.outcome === 'Converted').length;
  const lostCount = filteredLeads.filter(l => l.outcome === 'Bad Fit').length;
  const otherCount = filteredLeads.filter(l => l.outcome !== 'Converted' && l.outcome !== 'Bad Fit').length;

  const outcomeData = [
    { name: 'Deals Won', value: wonCount, fill: '#10b981' },
    { name: 'Bad Fit', value: lostCount, fill: '#f43f5e' },
    { name: 'Other Archive', value: otherCount, fill: '#94a3b8' },
  ];

  const valueHarvestData = [
    { month: 'Jan', won: 12000, lost: 5000 },
    { month: 'Feb', won: 18000, lost: 8000 },
    { month: 'Mar', won: 15000, lost: 12000 },
    { month: 'Apr', won: 25000, lost: 3000 },
  ];

  const handleBack = () => {
    setSelectedCaseStudy(null);
  };

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
                  <CheckSquare className="w-7 h-7 text-emerald-500" /> 
                  Success Archive
              </h1>
              <p className="text-slate-500 text-sm mt-1">Deep analysis of historical cycles and business success stories.</p>
            </div>
            
            <div className="bg-slate-200/50 p-1 rounded-xl flex items-center backdrop-blur-md border border-slate-200/30">
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
                <BarChart3 className="w-4 h-4" /> Performance
              </button>
              <button 
                onClick={() => setActiveView('case-studies')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'case-studies' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BookOpen className="w-4 h-4" /> Case Studies
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
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest mb-6 w-fit bg-white/50 px-4 py-2 rounded-xl border border-slate-100 backdrop-blur-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Success Stories
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
            className="pl-10 pr-4 py-2 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full transition-all"
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
                  <GlassCard className="lg:col-span-8 p-10 border-none bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-4xl font-bold border border-white/20 shadow-inner">
                                {selectedCaseStudy.business.name.substring(0, 1)}
                            </div>
                            <div className="text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-[0.2em]">Verified Win</span>
                                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full border border-indigo-500/30 uppercase tracking-[0.2em]">B2B Enterprise</span>
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
                                      <Zap className="w-3.5 h-3.5" /> Business Challenge
                                    </h4>
                                    <p className="text-lg leading-relaxed text-indigo-50 font-medium">
                                        {selectedCaseStudy.caseStudy?.challenge}
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-3 flex items-center gap-2">
                                    <Trophy className="w-3.5 h-3.5" /> Outcome & Growth
                                  </h4>
                                  <p className="text-sm text-indigo-100/80 leading-relaxed italic">
                                     {selectedCaseStudy.caseStudy?.impact}
                                  </p>
                                </div>
                            </div>
                            
                            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 flex flex-col justify-between shadow-2xl">
                                <div className="space-y-8">
                                    <div>
                                        <div className="text-5xl font-black tracking-tighter text-white mb-1">
                                          ${(selectedCaseStudy.estimatedValue || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Contract Value Realized</div>
                                    </div>
                                    <div>
                                        <div className="text-5xl font-black tracking-tighter text-white mb-1">
                                          {selectedCaseStudy.daysInStage} <span className="text-2xl font-bold opacity-50">days</span>
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Sales Cycle Velocity</div>
                                    </div>
                                </div>
                                <div className="mt-8 flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-400/10 px-4 py-2 rounded-xl w-fit">
                                   <ArrowUpRight className="w-5 h-5" /> Successful Conversion
                                </div>
                            </div>
                        </div>
                      </div>
                  </GlassCard>

                  <div className="lg:col-span-4 space-y-6">
                      <GlassCard className="p-8 h-full flex flex-col">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Executive Post-Mortem
                          </h3>
                          <div className="space-y-8 flex-1">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <div className="text-xs font-bold text-slate-800">Quality Grade</div>
                                    <div className="text-[10px] text-slate-400 font-medium">Historical relevance</div>
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
                                    <Mail className="w-4 h-4 text-indigo-500" />
                                    <Globe className="w-4 h-4 text-emerald-500" />
                                 </div>
                              </div>
                          </div>
                          <div className="mt-10 pt-8 border-t border-slate-100">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Proposed Solution</h4>
                              <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                 "{selectedCaseStudy.caseStudy?.solution}"
                              </p>
                          </div>
                      </GlassCard>
                  </div>
              </div>

              {/* The Process Roadmap */}
              <GlassCard className="p-12 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-12 flex items-center gap-3">
                      <Layers className="w-7 h-7 text-indigo-600" /> 
                      The Conversion Journey
                  </h3>
                  
                  <div className="relative">
                      <div className="hidden lg:block absolute top-10 left-0 right-0 h-1 bg-slate-100 rounded-full z-0"></div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
                          {(selectedCaseStudy.caseStudy?.milestones || []).map((step, i) => (
                              <div key={i} className="group flex flex-col items-center text-center lg:items-start lg:text-left">
                                  <div className={`
                                      w-20 h-20 rounded-[2.5rem] flex items-center justify-center border-[6px] border-white shadow-xl mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6
                                      ${i === (selectedCaseStudy.caseStudy?.milestones.length || 0) - 1 ? 'bg-emerald-500 text-white animate-pulse-fast' : 'bg-indigo-600 text-white shadow-indigo-200'}
                                  `}>
                                      {i === 0 ? <Search className="w-8 h-8" /> : 
                                       i === 1 ? <Mail className="w-8 h-8" /> : 
                                       i === 2 ? <Briefcase className="w-8 h-8" /> : 
                                       <CheckCircle2 className="w-8 h-8" />}
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
                    <GlassCard key={lead.id} className="p-5 group hover:bg-white/70 transition-all border-l-4 border-l-emerald-500 opacity-75">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center w-full md:w-1/3">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg mr-4 shrink-0 shadow-inner">
                                    {lead.business.name.substring(0, 1)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 italic opacity-60 line-through">{lead.business.name}</h3>
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
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                  {lead.status === 'Converted' ? 'WON' : 'CLOSED'}
                                </span>
                            </div>
                            <div className="flex items-center justify-end w-full md:w-1/3 gap-3">
                                {lead.caseStudy && (
                                  <button 
                                    onClick={() => {
                                      setSelectedCaseStudy(lead);
                                      setActiveView('case-studies');
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-all border border-indigo-100"
                                  >
                                    <Rocket className="w-3.5 h-3.5" /> Story Details
                                  </button>
                                )}
                                <button className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                ))}
                {filteredLeads.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                    <CheckSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No leads archived yet</p>
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
                      <div className="p-2 bg-emerald-50 w-fit rounded-xl text-emerald-600 mb-3"><Award className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{wonCount}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Conversions</div>
                  </GlassCard>
                  <GlassCard className="p-6">
                      <div className="p-2 bg-rose-50 w-fit rounded-xl text-rose-600 mb-3"><TrendingDown className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">{lostCount}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Loss Rate Archive</div>
                  </GlassCard>
                  <GlassCard className="p-6">
                      <div className="p-2 bg-indigo-50 w-fit rounded-xl text-indigo-600 mb-3"><Timer className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">18.4d</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg. Close Speed</div>
                  </GlassCard>
                  <GlassCard className="p-6">
                      <div className="p-2 bg-amber-50 w-fit rounded-xl text-amber-600 mb-3"><Star className="w-5 h-5" /></div>
                      <div className="text-2xl font-bold text-slate-800">3.8/5</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Historical Grade</div>
                  </GlassCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GlassCard className="p-8 h-[400px] flex flex-col">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-8 uppercase tracking-widest text-xs">
                          <PieIcon className="w-4 h-4 text-emerald-500" /> Outcome Efficiency
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
                          <DollarSign className="w-4 h-4 text-emerald-500" /> Revenue vs Leakage
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
                          className="p-0 overflow-hidden group hover:shadow-2xl transition-all cursor-pointer flex flex-col border-none shadow-xl"
                          onClick={() => setSelectedCaseStudy(lead)}
                        >
                            <div className="h-40 bg-gradient-to-br from-indigo-500 via-indigo-700 to-slate-900 p-8 flex items-end relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-2xl border border-white/20 relative z-10">
                                    {lead.business.name.substring(0, 1)}
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col bg-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">{lead.business.name}</h3>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Won</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-3 mb-8 font-medium leading-relaxed">
                                    {lead.caseStudy?.challenge || "Analyzing complex business workflows to drive scalable growth."}
                                </p>
                                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <Timer className="w-4 h-4 text-indigo-400" />
                                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          {lead.daysInStage} Day Win
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
                    <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No Success Stories Recorded</p>
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