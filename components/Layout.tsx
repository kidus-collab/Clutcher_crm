import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { Hexagon, Database, Activity as ActivityIcon, Bell, Clock, CheckCircle2 } from 'lucide-react';
import { getActivities } from '../lib/database/supabase';

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected'>('connected');
  const [scraperStatus, setScraperStatus] = useState<'active' | 'inactive'>('inactive');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [followUpTasks, setFollowUpTasks] = useState<any[]>([]);
  const location = useLocation();

  // Check DB and scraper status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const activities = await getActivities(1);
        setDbStatus('connected');
      } catch {
        setDbStatus('disconnected');
      }
      
      try {
        const port = typeof process !== 'undefined' && process.env?.PORT ? process.env.PORT : 3001;
        const res = await fetch(`http://localhost:${port}/health`);
        setScraperStatus(res.ok ? 'active' : 'inactive');
      } catch {
        setScraperStatus('inactive');
      }
    };
    checkStatus();
  }, []);

  // Fetch follow-up tasks for notifications
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasks = await getActivities(20, true);
        setFollowUpTasks(tasks.filter((t: any) => t.type === 'follow_up'));
      } catch {
        setFollowUpTasks([]);
      }
    };
    fetchTasks();
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Header - Logo on left, status buttons on right */}
      <div className="md:hidden sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl px-3 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Hexagon className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-white tracking-wider text-sm uppercase">Clutcher</span>
        </div>
        
        {/* Status buttons on right */}
        <div className="flex items-center gap-1.5">
          {/* Database Status */}
          <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
            dbStatus === 'connected'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <Database className="w-3 h-3" />
            <span className="text-[9px] font-medium">
              {dbStatus === 'connected' ? 'DB' : 'No DB'}
            </span>
          </div>
          
          {/* Scraper Status */}
          <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
            scraperStatus === 'active'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <ActivityIcon className="w-3 h-3" />
            <span className="text-[9px] font-medium uppercase">
              {scraperStatus === 'active' ? 'On' : 'Off'}
            </span>
          </div>
          
          {/* Notifications */}
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {followUpTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {followUpTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation - Directly below header (no gap) */}
      <div className="md:hidden sticky top-[46px] z-40 bg-slate-900/95 backdrop-blur-xl">
        <Sidebar isMobile={true} />
      </div>
      
      {/* Desktop Sidebar - Fixed on left */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 md:ml-20 lg:ml-64 relative min-h-screen">
        {/* Subtle decorative gradients for the main content area */}
        <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-0"></div>
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;