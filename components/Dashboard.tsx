import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Users,
  Send,
  Calendar as CalendarIcon,
  Clock,
  Check,
  CheckCircle2,
  CheckSquare,
  PlusCircle,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Activity as ActivityIcon
} from 'lucide-react';
import GlassCard from './ui/GlassCard';
import { 
  supabase, 
  getDashboardStats, 
  getActivities, 
  getLeads, 
  logActivity, 
  getFollowUpTasks, 
  updateFollowUpTaskStatus, 
  deleteFollowUpTask, 
  createFollowUpTask, 
  getOffers, 
  getOutreachSentCount 
} from '../lib/database/supabase';
import { Activity } from '../types';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [stats, setStats] = useState({ closed: 0, unclosed: 0, outreach: 0, total: 0 });
  const [reminders, setReminders] = useState<Activity[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<any[]>([]);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [chartData, setChartData] = useState<{name: string, value: number}[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: '', time: '' });
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [outreachCount, setOutreachCount] = useState(0);
  
  // Add task modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', priority: 'Medium' as 'Low' | 'Medium' | 'High' });
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Exchange rate state
  const [showUSD, setShowUSD] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(120); // 1 USD = 120 ETB

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    // Fetch Data
    const leadsData = await getLeads();
    setLeads(leadsData);
    
    const offersData = await getOffers();
    setOffers(offersData);
    
    const outreachSentValue = await getOutreachSentCount();
    setOutreachCount(outreachSentValue);

    const upcomingActivities = await getActivities(5, true);
    setReminders(upcomingActivities);

    const followUps = await getFollowUpTasks();
    const pendingFollowUps = followUps.filter(task => task.status === 'Pending');
    setFollowUpTasks(pendingFollowUps.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    ));

    // Stats Calculation
    const totalLeads = leadsData.length;
    const closedLeads = leadsData.filter(l => l.status === 'Converted').length;
    const unclosedLeadsCount = leadsData.filter(l => l.status === 'New').length;
    const outreachLeads = leadsData.filter(l => l.status === 'No Reply' || (l.status as any) === 'Outreach').length;

    setStats({
      closed: closedLeads,
      unclosed: unclosedLeadsCount,
      outreach: outreachLeads,
      total: totalLeads
    });

    // Chart Data
    setChartData(processChartData(leadsData));
    
    // Artificial Delay for Smoothness
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 800 - elapsedTime);
    await new Promise(r => setTimeout(r, remainingTime));
    
    setLoading(false);
  };

  const processChartData = (leadsList: any[]) => {
    const groups: Record<string, { total: number, converted: number }> = {};
    const sortedLeads = [...leadsList].sort((a, b) => 
      new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
    );

    sortedLeads.forEach(l => {
       if (!l.createdAt) return;
       const date = new Date(l.createdAt);
       const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
       if(!groups[key]) groups[key] = { total: 0, converted: 0 };
       groups[key].total++;
       if(l.status === 'Converted') groups[key].converted++;
    });

    return Object.keys(groups).map(name => ({
        name,
        value: groups[name].total > 0 ? Math.round((groups[name].converted / groups[name].total) * 100) : 0
    }));
  };

  // Weekly Stats
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const closedThisWeek = leads.filter(l =>
    l.status === 'Converted' && new Date(l.createdAt || '') > oneWeekAgo
  ).length;
  
  const totalRevenue = offers.reduce((sum, offer) => sum + (offer.value || 0), 0);
  
  const leadsThisWeek = leads.filter(l =>
    new Date(l.createdAt || '') > oneWeekAgo
  ).length;
  
  const closedThisWeekPercentage = leads.length > 0 ? Math.round((closedThisWeek / leads.length) * 100) : 0;

  // Handlers
  const handleAddTask = async () => {
    if (!newTask.title || !newTask.date) return;
    try {
      const timestamp = new Date(newTask.date).toISOString();
      const success = await createFollowUpTask('', newTask.title, newTask.title, timestamp, newTask.priority);
      if (success) {
        setIsAddTaskModalOpen(false);
        setNewTask({ title: '', date: '', priority: 'Medium' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setCompletingTaskIds(prev => new Set(prev).add(taskId));
    setTimeout(async () => {
      const success = await deleteFollowUpTask(taskId);
      if (success) setFollowUpTasks(prev => prev.filter(task => task.id !== taskId));
      setCompletingTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }, 300);
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const formatMonthYear = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const changeMonth = (direction: number) => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  
  const getTasksForDate = (day: number) => {
    return followUpTasks.filter(task => {
      const taskDate = new Date(task.scheduledDate);
      return taskDate.getDate() === day && 
             taskDate.getMonth() === currentMonth.getMonth() && 
             taskDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const unclosedLeads = leads.filter(l => l.status !== 'Converted');

  const KPIS = [
    {
      label: 'Total Revenue',
      value: showUSD ? `$${totalRevenue.toLocaleString()}` : `${(totalRevenue * exchangeRate).toLocaleString()} Br`,
      icon: CheckSquare,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      percentage: totalRevenue > 0 ? '+12%' : '+0%',
      toggle: (
        <button
          onClick={(e) => { e.stopPropagation(); setShowUSD(!showUSD); }}
          className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold hover:bg-emerald-200 transition-colors"
        >
          {showUSD ? 'BIRR' : 'USD'}
        </button>
      )
    },
    { 
      label: 'Closed This Week', 
      value: closedThisWeek, 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      percentage: `${closedThisWeekPercentage}%`
    },
    { 
      label: 'Outreach Sent', 
      value: outreachCount, 
      icon: Send, 
      color: 'text-white', 
      bg: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
      percentage: outreachCount > 0 ? '+10%' : '+0%',
      isPremium: true
    },
    {
      label: 'Leads This Week',
      value: leadsThisWeek,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      percentage: leadsThisWeek > 0 ? '+15%' : '+0%'
    }
  ];

  const calendarDays: (number | null)[] = [];
  const daysInMonthCnt = getDaysInMonth(currentMonth);
  const firstDayOfMonthIdx = getFirstDayOfMonth(currentMonth);
  for (let i = 0; i < firstDayOfMonthIdx; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonthCnt; i++) calendarDays.push(i);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 pb-20 sm:pb-24 min-h-full">
        <div className="py-2 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 h-32 flex flex-col justify-between">
              <div className="flex justify-between">
                <Skeleton variant="circular" className="w-10 h-10" />
                <Skeleton className="w-12 h-5 rounded-full" />
              </div>
              <div>
                <Skeleton className="w-24 h-4 mb-2" />
                <Skeleton className="w-16 h-8" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 h-[300px]">
            <div className="flex justify-between mb-6">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-6" />
            </div>
            <Skeleton className="w-full h-full rounded-xl" />
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 h-[300px]">
            <Skeleton className="w-32 h-6 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
                  <div className="space-y-2 w-full"><Skeleton className="w-3/4 h-4" /><Skeleton className="w-1/2 h-3" /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 pb-20 sm:pb-24 min-h-full"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="py-2">
           <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Overview</h1>
           <p className="text-slate-500 text-xs mt-1 font-medium">Welcome back, Here's your performance snapshot.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPIS.map((kpi, idx) => (
          <GlassCard
            key={idx}
            className={`p-4 sm:p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 group overflow-hidden relative ${kpi.isPremium ? 'border-none' : ''}`}
          >
            {kpi.isPremium && <div className={`absolute inset-0 ${kpi.bg} z-0 opacity-100`}></div>}
            <div className="relative z-10 font-sans">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${kpi.isPremium ? 'bg-white/20' : kpi.bg} group-hover:rotate-12 transition-transform duration-500`}>
                  <kpi.icon className={`w-3 h-3 sm:w-4 sm:h-5 md:w-5 md:h-5 lg:w-6 lg:h-6 ${kpi.isPremium ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : kpi.color}`} />
                </div>
                <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 ${kpi.isPremium ? 'bg-white/20' : 'bg-slate-50'} rounded-full border ${kpi.isPremium ? 'border-white/20' : 'border-slate-100'}`}>
                  <span className={`text-[8px] sm:text-[10px] font-bold ${kpi.isPremium ? 'text-white' : 'text-slate-600'}`}>{kpi.percentage}</span>
                  <TrendingUp className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 ${kpi.isPremium ? 'text-white' : 'text-emerald-500'}`} />
                </div>
              </div>
              <div className="flex justify-between items-center mb-1">
                <h3 className={`text-xs sm:text-sm font-bold ${kpi.isPremium ? 'text-white/80' : 'text-slate-500'} uppercase tracking-widest`}>{kpi.label}</h3>
                {kpi.toggle}
              </div>
              <div className={`text-2xl sm:text-4xl font-bold ${kpi.isPremium ? 'text-white' : 'text-slate-800'} tracking-tighter`}>{kpi.value}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <GlassCard className="lg:col-span-2 p-3 sm:p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 sm:mb-5">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-indigo-500" /> Conversion Rate
            </h2>
            <select className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 px-2 sm:px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/10">
              <option>Last 7 Days</option><option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[200px] sm:min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#cbd5e1'}} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} itemStyle={{ color: '#6366f1', fontWeight: 600 }} formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6 border-none">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-emerald-400/80 flex items-center justify-center">
              <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 text-emerald-500" strokeWidth={3} />
            </div>
            <h2 className="font-bold text-[#1e293b] text-base sm:text-lg tracking-tight">Unclosed Leads</h2>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {unclosedLeads.slice(0, 4).map((lead) => (
              <div key={lead.id} className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => navigate('/outreach')}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-500 font-medium text-xs sm:text-sm shrink-0 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  {lead.business.name.substring(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1e293b] truncate leading-tight">{lead.business.name}</p>
                  <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{lead.status} • {lead.lastContact.toUpperCase()}</p>
                </div>
                <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-slate-200 transition-colors group-hover:text-indigo-400 shrink-0" strokeWidth={2} />
              </div>
            ))}
            {unclosedLeads.length === 0 && <div className="py-6 sm:py-8 text-center text-slate-300 text-xs font-medium">No active leads found.</div>}
          </div>
          <button onClick={() => navigate('/outreach')} className="w-full mt-6 sm:mt-8 py-2.5 sm:py-3 bg-[#f8fafc] text-[#475569] rounded-xl sm:rounded-2xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-200">
            View All Activity
          </button>
        </GlassCard>
      </div>

      <div className="pt-4 pb-8">
        <GlassCard className="p-4 sm:p-6 border-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-indigo-500" /> Follow Up Calendar
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Manage your outreach follow-ups and meetings.</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 p-1 sm:p-1.5 rounded-xl border border-slate-200">
              <button onClick={() => changeMonth(-1)} className="p-1 sm:p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-800"><ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" /></button>
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 px-1.5 sm:px-2 min-w-[80px] sm:min-w-[100px] text-center uppercase tracking-widest">{formatMonthYear(currentMonth)}</span>
              <button onClick={() => changeMonth(1)} className="p-1 sm:p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-800"><ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="lg:col-span-3 overflow-x-auto">
              <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 min-w-[320px] sm:min-w-[500px]">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (<div key={day} className="bg-slate-50 py-1.5 sm:py-2 text-center text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{day}</div>))}
                {calendarDays.map((day, index) => {
                  if (day === null) return <div key={`empty-${index}`} className="bg-slate-50 min-h-[60px] sm:min-h-[80px] p-1 sm:p-2"></div>;
                  const tasksForDay = getTasksForDate(day);
                  const isToday = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear() && day === new Date().getDate();
                  return (
                    <div key={day} className={`bg-white min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 relative group transition-colors hover:bg-indigo-50/30 ${isToday ? 'bg-indigo-50/10' : ''}`}>
                      <span className={`text-[7px] sm:text-[8px] font-bold ${isToday ? 'bg-indigo-600 text-white w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>{day}</span>
                      {tasksForDay.length > 0 && (
                        <div className="mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
                          {tasksForDay.slice(0, 2).map((task, i) => (
                            <div key={i} className={`text-[6px] sm:text-[7px] p-0.5 sm:p-1 rounded-md font-bold truncate cursor-pointer hover:opacity-80 transition-opacity ${task.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`} title={task.taskTitle}>{task.taskTitle}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" /> Follow Up Tasks</h3>
              <div className="space-y-1.5 sm:space-y-2">
                {followUpTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className={`bg-white border border-slate-200 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all group cursor-pointer relative overflow-hidden ${completingTaskIds.has(task.id) ? 'opacity-50 scale-95' : ''}`}>
                    <button onClick={() => handleDeleteTask(task.id)} className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500 hover:border-emerald-500 hover:text-white"><Check className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-slate-400 group-hover:text-white" /></button>
                    <div className="flex justify-between items-start mb-1.5 sm:mb-2 pl-6 sm:pl-7">
                      <span className={`text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-widest ${task.priority === 'High' ? 'bg-rose-100 text-rose-600' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>{task.priority}</span>
                      <span className="text-[7px] sm:text-[8px] text-slate-400 font-bold">{new Date(task.scheduledDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors pl-6 sm:pl-7">{task.taskTitle}</p>
                    <p className="text-[7px] sm:text-[8px] text-slate-400 mt-0.5 sm:mt-1 font-medium pl-6 sm:pl-7">{task.lead?.business?.name || 'General Task'}</p>
                  </div>
                ))}
                {followUpTasks.length === 0 && <div className="text-center py-4 sm:py-6 text-slate-400 text-xs">No follow-up tasks scheduled</div>}
              </div>
              <button onClick={() => setIsAddTaskModalOpen(true)} className="w-full py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2"><PlusCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" /> Add Task</button>
            </div>
          </div>
        </GlassCard>
      </div>

      {isAddTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl max-w-md w-full p-3 sm:p-5 border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center"><PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-indigo-600" /></div>
              <div><h3 className="text-sm sm:text-base font-bold text-slate-800">Add Follow Up Task</h3><p className="text-xs text-slate-500">Create a new follow-up task</p></div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Task Title</label><input type="text" value={newTask.title} onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-200 rounded-lg focus:outline-none text-sm" placeholder="Enter task title..." /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Date</label><input type="date" value={newTask.date} onChange={(e) => setNewTask(prev => ({ ...prev, date: e.target.value }))} className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-200 rounded-lg focus:outline-none text-sm" /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Priority</label><select value={newTask.priority} onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as 'Low' | 'Medium' | 'High' }))} className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-200 rounded-lg focus:outline-none text-sm"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
            </div>
            <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-5 justify-end">
              <button onClick={() => setIsAddTaskModalOpen(false)} className="px-3 py-1.5 sm:px-4 sm:py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-xs sm:text-sm font-bold">Cancel</button>
              <button onClick={handleAddTask} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-xs sm:text-sm">Add Task</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard;
