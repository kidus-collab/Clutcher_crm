
import React, { useState, useEffect } from 'react';
import {
  PIPELINE_STAGES
} from '../constants';
import { Deal, Activity } from '../types';
import GlassCard from './ui/GlassCard';
import {
  KanbanSquare,
  ListTree,
  MoreVertical,
  Plus,
  X,
  Check,
  Calendar,
  DollarSign,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  Clock
} from 'lucide-react';
import { getOffers, getActivities, logActivity } from '../lib/database/supabase';

const Pipeline: React.FC = () => {
  const [viewMode, setViewMode] = useState<'board' | 'timeline'>('board');
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate random estimated close date within 1-4 weeks from now
  const generateEstCloseDate = (createdAt?: string) => {
    if (!createdAt) {
      // If no creation date, generate random date within 1-4 weeks
      const daysFromNow = Math.floor(Math.random() * 28) + 7; // 7-35 days
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysFromNow);
      return estDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    // If creation date exists, estimate 2-4 weeks from creation
    const created = new Date(createdAt);
    const daysFromCreation = Math.floor(Math.random() * 14) + 14; // 14-28 days
    const estDate = new Date(created);
    estDate.setDate(estDate.getDate() + daysFromCreation);
    return estDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const offersData = await getOffers();
        const activitiesData = await getActivities(20);
        setDeals(offersData);
        setActivities(activitiesData);
      } catch (error) {
        console.error('Error fetching pipeline data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to format stage names for display
  const formatStageName = (stage: string) => {
    switch(stage) {
      case 'Contacted': return 'Contacted (Outreach)';
      case 'Proposal': return 'Proposal (Follow up)';
      case 'Won': return 'Won / Closed';
      default: return stage;
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.20))] flex flex-col p-4 lg:p-6 overflow-hidden relative">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 shrink-0 z-10 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pipeline</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            <span className="text-indigo-600">{deals.length} active deals</span> with total value of <span className="text-slate-700 font-semibold">${deals.reduce((acc, curr) => acc + (curr.value || 0), 0).toLocaleString()}</span>
          </p>
        </div>
        
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="bg-white/40 p-1 rounded-xl flex space-x-1 border border-white/50 shadow-sm backdrop-blur-md">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${viewMode === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'}`}
            >
              <KanbanSquare className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Board</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${viewMode === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'}`}
            >
              <ListTree className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Timeline</span>
            </button>
          </div>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 transition-all flex items-center border border-slate-700 whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} /> New Deal
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 z-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-slate-400">Loading pipeline data...</div>
          </div>
        ) : viewMode === 'board' ? (
          /* KANBAN BOARD */
          <div className="flex space-x-4 h-full min-w-max px-2">
            {PIPELINE_STAGES.map((stage) => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const stageValue = stageDeals.reduce((acc, val) => acc + (val.value || 0), 0);
              
              return (
                <div key={stage} className="w-[280px] flex flex-col h-full group">
                  <div className="flex justify-between items-center mb-3 px-1 sticky top-0 bg-transparent">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${stageDeals.length > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                        {formatStageName(stage)}
                      </span>
                      <div className="text-[9px] text-slate-400 font-bold ml-3.5 mt-0.5">
                        ${stageValue.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/40 border border-white/50 px-2 py-0.5 rounded-full">{stageDeals.length}</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1.5 space-y-2.5 pb-20 scrollbar-hide">
                    {stageDeals.map((deal) => (
                      <GlassCard 
                        key={deal.id} 
                        className="p-4 group/card relative border-l-4 border-l-transparent hover:border-l-indigo-500 transition-all" 
                        hoverEffect
                        onClick={() => setSelectedDeal(deal)}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{deal.company}</span>
                            <MoreVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer hover:text-indigo-600" />
                         </div>
                         <h4 className="font-bold text-slate-800 text-sm mb-0.5 leading-snug truncate">{deal.title}</h4>
                         <div className="text-base font-bold text-slate-700 mb-3 tracking-tight flex items-baseline gap-0.5">
                            <span className="text-[10px] text-slate-400 font-normal">$</span>{deal.value.toLocaleString()}
                         </div>
                         <div className="flex justify-between items-center border-t border-slate-100/50 pt-2.5 mt-auto">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-500 font-bold">{deal.probability}% Prob.</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold bg-slate-100/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                               <Clock className="w-2.5 h-2.5" /> {deal.lastContact}
                            </span>
                         </div>
                      </GlassCard>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="h-40 border-2 border-dashed border-slate-200/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/30">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-slate-300" />
                        </div>
                        <span className="text-xs font-medium">No deals here</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TIMELINE VIEW (JOURNEY) */
          <div className="h-full overflow-y-auto px-4 lg:px-10 relative max-w-5xl mx-auto pb-20 scrollbar-hide">
            {/* Central Line */}
            <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-200 to-transparent transform lg:-translate-x-1/2"></div>
            
            <div className="space-y-16 py-10">
              {PIPELINE_STAGES.map((stage, idx) => {
                 const stageDeals = deals.filter(d => d.stage === stage);
                 const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                 
                 return (
                   <div key={stage} className={`flex items-start relative ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} flex-row`}>
                      
                      {/* Timeline Node */}
                      <div className="absolute left-8 lg:left-1/2 top-6 w-5 h-5 bg-white rounded-full border-[3px] border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)] transform -translate-x-1/2 z-10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      </div>
                      
                      {/* Empty side for spacing on desktop */}
                      <div className="hidden lg:block w-1/2"></div>
                      
                      {/* Content Card */}
                      <div className={`w-full pl-20 lg:pl-0 lg:w-1/2 ${idx % 2 === 0 ? 'lg:pr-16' : 'lg:pl-16'}`}>
                        <GlassCard className="p-0 overflow-hidden group hover:shadow-xl transition-shadow">
                           <div className="p-6 border-b border-slate-100/50 bg-gradient-to-b from-white/80 to-white/40">
                             <div className="flex items-center justify-between mb-2">
                               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                 {formatStageName(stage)}
                                 <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Stage {idx + 1}</span>
                               </h3>
                               <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{stageDeals.length} Deals</span>
                             </div>
                             <div className="flex items-center gap-4 text-xs text-slate-500">
                               <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {totalValue.toLocaleString()} Value</span>
                               <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Avg. 12 days</span>
                             </div>
                           </div>
                           
                           <div className="p-2 bg-white/30">
                             {stageDeals.length > 0 ? (
                               <div className="space-y-1">
                                 {stageDeals.slice(0, 3).map(deal => (
                                   <div 
                                      key={deal.id} 
                                      onClick={() => setSelectedDeal(deal)}
                                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white transition-colors cursor-pointer group/item border border-transparent hover:border-slate-100 hover:shadow-sm"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">
                                            {deal.company.substring(0,1)}
                                        </div>
                                        <div>
                                          <p className="text-sm text-slate-700 font-semibold">{deal.title}</p>
                                          <p className="text-xs text-slate-400">{deal.company}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="block text-sm font-medium text-slate-700">${deal.value.toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-400">{deal.lastContact}</span>
                                      </div>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <div className="p-6 text-center">
                                 <p className="text-sm text-slate-400 font-light">No deals active in this stage.</p>
                               </div>
                             )}
                           </div>
                        </GlassCard>
                      </div>
                   </div>
                 )
              })}
            </div>
          </div>
        )}
      </div>

      {/* DEAL DETAIL SLIDE-OVER DRAWER */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedDeal(null)}
          ></div>
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl h-full shadow-2xl border-l border-white/50 animate-slide-in-right overflow-y-auto">
            
            {/* Timeline at Top */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 z-20 px-8 py-6">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-800 leading-tight">{selectedDeal.title}</h2>
                   <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                     <Building2 className="w-4 h-4" /> 
                     <span>{selectedDeal.company}</span>
                     <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                     <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-xs">Active</span>
                   </div>
                 </div>
                 <button 
                   onClick={() => setSelectedDeal(null)} 
                   className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              {/* Progress Timeline Stepper */}
              <div className="relative">
                 <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-100 rounded">
                    <div 
                      className="h-full bg-indigo-500 rounded transition-all duration-500"
                      style={{ 
                        width: `${(PIPELINE_STAGES.indexOf(selectedDeal.stage) / (PIPELINE_STAGES.length - 1)) * 100}%` 
                      }}
                    ></div>
                 </div>
                 
                 <div className="relative flex justify-between">
                   {PIPELINE_STAGES.map((stage, i) => {
                     const currentStageIndex = PIPELINE_STAGES.indexOf(selectedDeal.stage);
                     const isCompleted = i < currentStageIndex;
                     const isCurrent = i === currentStageIndex;
                     
                     return (
                       <div key={stage} className="flex flex-col items-center group">
                          <div 
                            className={`
                              w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300
                              ${isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' : 
                                isCurrent ? 'bg-white border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)] scale-110' : 
                                'bg-white border-slate-200 text-slate-300'}
                            `}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                            {isCurrent && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>}
                          </div>
                          <span 
                            className={`
                              mt-2 text-[10px] uppercase font-bold tracking-wider transition-colors max-w-[60px] text-center leading-tight
                              ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-600' : 'text-slate-300'}
                            `}
                          >
                            {formatStageName(stage)}
                          </span>
                       </div>
                     );
                   })}
                 </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-8 space-y-8">
               <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Deal Value</span>
                     <span className="text-xl font-bold text-slate-800">${(selectedDeal.value || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Probability</span>
                     <span className="text-xl font-bold text-slate-800">{selectedDeal.probability || 0}%</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Close</span>
                     <span className="text-xl font-bold text-slate-800">{generateEstCloseDate(selectedDeal.createdAt)}</span>
                  </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                   <div>
                     <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Building2 className="w-4 h-4 text-indigo-500" /> Actions
                     </h3>
                     <div className="mt-3 flex gap-2">
                       <button
                         onClick={async () => {
                           if (selectedDeal?.leadId) {
                             await logActivity('email', `Email sent to ${selectedDeal.lead?.business?.name || selectedDeal.company}`, selectedDeal.leadId);
                             // Refresh activities
                             const updatedActivities = await getActivities(20);
                             setActivities(updatedActivities);
                           }
                         }}
                         className="flex-1 py-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors"
                       >
                         <Mail className="w-3.5 h-3.5" /> Email
                       </button>
                       <button
                         onClick={async () => {
                           if (selectedDeal?.leadId) {
                             await logActivity('call', `Call with ${selectedDeal.lead?.business?.name || selectedDeal.company}`, selectedDeal.leadId);
                             // Refresh activities
                             const updatedActivities = await getActivities(20);
                             setActivities(updatedActivities);
                           }
                         }}
                         className="flex-1 py-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors"
                       >
                         <Phone className="w-3.5 h-3.5" /> Call
                       </button>
                     </div>
                   </div>

                   <div>
                     <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-indigo-500" /> Next Steps
                     </h3>
                     <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100/50">
                          <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-amber-400"></div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">Follow up on proposal</p>
                            <p className="text-xs text-slate-500 mt-1">Est. close: {generateEstCloseDate(selectedDeal.createdAt)}</p>
                          </div>
                        </div>
                     </div>
                   </div>
                 </div>

                 <div>
                   <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Clock className="w-4 h-4 text-indigo-500" /> Activity Log
                   </h3>
                   <div className="relative border-l border-slate-200 ml-2 space-y-6 pl-6 pb-2">
                      {activities.length > 0 ? (
                        activities
                          .filter(activity =>
                            selectedDeal.leadId && activity.description.includes(selectedDeal.lead?.business?.name || selectedDeal.company)
                          )
                          .slice(0, 5)
                          .map((activity, i) => {
                            const getActivityIcon = (type: string) => {
                              switch(type) {
                                case 'email': return Mail;
                                case 'call': return Phone;
                                case 'meeting': return Calendar;
                                default: return ArrowRight;
                              }
                            };
                            
                            const getActivityColor = (type: string) => {
                              switch(type) {
                                case 'email': return 'text-blue-600 bg-blue-100';
                                case 'call': return 'text-green-600 bg-green-100';
                                case 'meeting': return 'text-purple-600 bg-purple-100';
                                default: return 'text-indigo-600 bg-indigo-100';
                              }
                            };
                            
                            const [color, bg] = getActivityColor(activity.type).split(' ');
                            const Icon = getActivityIcon(activity.type);
                            const timeAgo = new Date(activity.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            
                            return (
                              <div key={activity.id} className="relative">
                                 <div className={`absolute -left-[33px] top-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center border-4 border-white`}>
                                   <Icon className={`w-3.5 h-3.5 ${color}`} />
                                 </div>
                                 <p className="text-sm font-medium text-slate-800">{activity.description}</p>
                                 <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-center text-slate-400 py-4">
                          <p className="text-sm">No activities logged yet</p>
                          <p className="text-xs mt-1">Use action buttons above to log activities</p>
                        </div>
                      )}
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;
