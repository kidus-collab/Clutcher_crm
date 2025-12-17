import React, { useEffect, useState, useRef } from 'react';
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
  Bell
} from 'lucide-react';
import GlassCard from './ui/GlassCard';
import { supabase, getDashboardStats, getActivities, getLeads, logActivity, getFollowUpTasks, updateFollowUpTaskStatus, deleteFollowUpTask, createFollowUpTask } from '../lib/database/supabase';
import { Activity } from '../types';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ closed: 0, unclosed: 0, outreach: 0, total: 0 });
  const [reminders, setReminders] = useState<Activity[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<any[]>([]);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [chartData, setChartData] = useState<{name: string, value: number}[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: '', time: '' });
  const [loading, setLoading] = useState(true);
  const [scraperStatus, setScraperStatus] = useState<'active' | 'inactive' | 'checking'>('checking');
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    checkScraperStatus();
    
    // Close notification dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkScraperStatus = async () => {
    try {
      // Use the same port as defined in server/index.ts
      const serverPort = process.env.PORT || 3001;
      const response = await fetch(`http://localhost:${serverPort}/health`);
      if (response.ok) {
        const data = await response.json();
        setScraperStatus(data.serverStarted ? 'active' : 'inactive');
      } else {
        setScraperStatus('inactive');
      }
    } catch (error) {
      setScraperStatus('inactive');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all leads for accurate calculations
    const leadsData = await getLeads();
    setLeads(leadsData);
    const totalLeads = leadsData.length;
    
    // Calculate KPIs based on actual lead status
    const closedLeads = leadsData.filter(l => l.status === 'Converted').length;
    const unclosedLeads = leadsData.filter(l => l.status === 'New').length;
    const outreachLeads = leadsData.filter(l => l.status === 'No Reply' || (l.status as any) === 'Outreach').length;
    
    // Update stats with calculated values
    setStats({
      closed: closedLeads,
      unclosed: unclosedLeads,
      outreach: outreachLeads,
      total: totalLeads
    });

    // 2. Fetch Activities (Reminders)
    const activities = await getActivities(5, true); // Get upcoming only
    setReminders(activities);

    // 3. Fetch Follow-up Tasks
    const followUps = await getFollowUpTasks();
    // Filter for pending tasks only
    const pendingFollowUps = followUps.filter(task => task.status === 'Pending');
    // Sort by scheduled date (earliest to farthest)
    const sortedFollowUps = pendingFollowUps.sort((a, b) =>
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
    setFollowUpTasks(sortedFollowUps);

    // 4. Process Chart Data (Conversion Rate over time)
    const processedChart = processChartData(leadsData);
    setChartData(processedChart);
    
    setLoading(false);
  };

  const processChartData = (leads: any[]) => {
    // Group by month for conversion tracking
    const groups: Record<string, { total: number, converted: number }> = {};
    
    // Sort by date
    leads.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

    leads.forEach(l => {
       if (!l.createdAt) return;
       const date = new Date(l.createdAt);
       const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
       
       if(!groups[key]) groups[key] = { total: 0, converted: 0 };
       
       groups[key].total++;
       if(l.status === 'Converted') {
         groups[key].converted++;
       }
    });

    return Object.keys(groups).map(name => ({
        name,
        value: groups[name].total > 0 ? Math.round((groups[name].converted / groups[name].total) * 100) : 0
    }));
  };

  const handleAddReminder = async () => {
    if (!newReminder.title || !newReminder.date) return;
    
    try {
      // Create as a general follow-up task without a specific lead
      const timestamp = new Date(`${newReminder.date}T${newReminder.time || '12:00'}`).toISOString();
      
      // For general reminders, we'll use an empty string as leadId
      // This is a limitation of current schema, but it works for now
      const success = await createFollowUpTask(
        '', // Empty lead ID for general reminders
        newReminder.title,
        newReminder.title, // Use title as both task title and notes
        timestamp,
        'Medium' // Default priority
      );
      
      if (success) {
        setIsReminderModalOpen(false);
        setNewReminder({ title: '', date: '', time: '' });
        fetchData(); // Refresh list
      } else {
        throw new Error('Failed to create reminder task');
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      // You could show an error message to user here
    }
  };

  const totalLeads = leads.length;
  const closedLeadsCount = leads.filter(l => l.status === 'Closed' || l.status === 'Converted').length;
  const activeLeadsCount = totalLeads - closedLeadsCount;

  // Filter for unclosed leads (excluding 'Closed' and 'Converted')
  const unclosedLeads = leads.filter(l => l.status !== 'Closed' && l.status !== 'Converted');

  const KPIS = [
    { label: 'Archived', value: closedLeadsCount, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Pipeline', value: activeLeadsCount, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'New Today', value: 12, icon: PlusCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Outreach Sent', value: 350, icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const UPCOMING_FOLLOWUPS = [
    { company: 'Cyberdyne Systems', time: '10:00 AM', status: 'High', date: 24 },
    { company: 'Weyland-Yutani', time: '2:30 PM', status: 'Medium', date: 24 },
    { company: 'Stark Ind', time: 'Tomorrow', status: 'Critical', date: 25 },
    { company: 'The Continental', time: 'Friday', status: 'Low', date: 26 },
  ];

  // Calendar Logic
  const daysInMonth = 31;
  const currentDay = 24;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in pb-32 min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Overview</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Welcome back, John. Here's your performance snapshot.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-xl border border-white/40 shadow-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-700">+12% from last week</span>
          </div>
          <button className="p-2.5 bg-white/60 rounded-xl border border-white/40 shadow-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIS.map((kpi, idx) => (
          <GlassCard key={idx} className="p-5" hoverEffect>
            <div className="flex items-center gap-4">
              <div className={`${kpi.bg} p-3 rounded-xl`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> Lead Velocity
            </h2>
            <select className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-500 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/10">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#cbd5e1'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#6366f1', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Refined Unclosed Leads Card to match the user's provided screenshot style */}
        <GlassCard className="p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-400/80 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} />
            </div>
            <h2 className="font-bold text-[#1e293b] text-xl tracking-tight">Unclosed Leads</h2>
          </div>
          
          <div className="space-y-8">
            {unclosedLeads.slice(0, 4).map((lead) => (
              <div 
                key={lead.id} 
                className="flex items-center gap-4 group cursor-pointer"
                onClick={() => navigate('/outreach')}
              >
                <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-500 font-medium text-lg shrink-0 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  {lead.business.name.substring(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#1e293b] truncate leading-tight">{lead.business.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {lead.status} • {lead.lastContact.toUpperCase()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200 transition-colors group-hover:text-indigo-400 shrink-0" strokeWidth={2} />
              </div>
            ))}
            
            {unclosedLeads.length === 0 && (
              <div className="py-10 text-center text-slate-300 text-sm font-medium">
                No active leads found.
              </div>
            )}
          </div>
          
          <button 
            onClick={() => navigate('/outreach')}
            className="w-full mt-10 py-4 bg-[#f8fafc] text-[#475569] rounded-2xl text-[13px] font-bold hover:bg-slate-100 transition-all border border-slate-100/50"
          >
            View All Activity
          </button>
        </GlassCard>
      </div>

      {/* CALENDAR VIEW SECTION */}
      <div className="pt-4 pb-10">
        <GlassCard className="p-8 border-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" /> Engagement Calendar
              </h2>
              <p className="text-sm text-slate-400 font-medium mt-1">Manage your outreach follow-ups and meetings.</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <button className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-slate-700 px-2 min-w-[120px] text-center uppercase tracking-widest">October 2024</span>
              <button className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-800"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Calendar Grid */}
            <div className="lg:col-span-3 overflow-x-auto">
              <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm min-w-[600px]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">{day}</div>
                ))}
                {calendarDays.map(day => {
                  const hasFollowUp = UPCOMING_FOLLOWUPS.some(f => f.date === day);
                  const isToday = day === currentDay;
                  
                  return (
                    <div key={day} className={`bg-white min-h-[100px] p-2 relative group transition-colors hover:bg-indigo-50/30 ${isToday ? 'bg-indigo-50/10' : ''}`}>
                      <span className={`text-[10px] font-bold ${isToday ? 'bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                        {day}
                      </span>
                      {hasFollowUp && (
                        <div className="mt-2 space-y-1">
                          {UPCOMING_FOLLOWUPS.filter(f => f.date === day).map((f, i) => (
                            <div key={i} className={`text-[9px] p-1.5 rounded-md font-bold truncate ${f.status === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                              {f.company}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Breakdown Sidebar */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Upcoming Tasks
              </h3>
              <div className="space-y-3">
                {UPCOMING_FOLLOWUPS.map((task, i) => (
                  <div key={i} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${task.status === 'Critical' ? 'bg-rose-100 text-rose-600' : task.status === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {task.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{task.time}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{task.company}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Follow-up via Outreach Hub</p>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <PlusCircle className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
