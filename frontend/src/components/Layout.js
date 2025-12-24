import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { Hexagon, Database, Activity as ActivityIcon, Bell } from 'lucide-react';
import { getActivities } from '../lib/database/supabase';
const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [dbStatus, setDbStatus] = useState('connected');
    const [scraperStatus, setScraperStatus] = useState('inactive');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [followUpTasks, setFollowUpTasks] = useState([]);
    const location = useLocation();
    // Check DB and scraper status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const activities = await getActivities(1);
                setDbStatus('connected');
            }
            catch {
                setDbStatus('disconnected');
            }
            try {
                const port = typeof process !== 'undefined' && process.env?.PORT ? process.env.PORT : 3001;
                const res = await fetch(`http://localhost:${port}/health`);
                setScraperStatus(res.ok ? 'active' : 'inactive');
            }
            catch {
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
                setFollowUpTasks(tasks.filter((t) => t.type === 'follow_up'));
            }
            catch {
                setFollowUpTasks([]);
            }
        };
        fetchTasks();
    }, [location.pathname]);
    return (_jsxs("div", { className: "flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900", children: [_jsxs("div", { className: "md:hidden sticky top-0 z-50 bg-slate-900/95 px-3 py-2.5 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl", children: _jsx(Hexagon, { className: "w-4 h-4 text-white", strokeWidth: 2.5 }) }), _jsx("span", { className: "font-bold text-white tracking-wider text-sm uppercase", children: "Clutcher" })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("div", { className: `px-2 py-1 rounded-lg border-none flex items-center gap-1 ${dbStatus === 'connected'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'}`, children: [_jsx(Database, { className: "w-3 h-3" }), _jsx("span", { className: "text-[9px] font-bold", children: dbStatus === 'connected' ? 'DB' : 'No DB' })] }), _jsxs("div", { className: `px-2 py-1 rounded-lg border-none flex items-center gap-1 ${scraperStatus === 'active'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'}`, children: [_jsx(ActivityIcon, { className: "w-3 h-3" }), _jsx("span", { className: "text-[9px] font-bold uppercase", children: scraperStatus === 'active' ? 'On' : 'Off' })] }), _jsxs("button", { onClick: () => setIsNotificationOpen(!isNotificationOpen), className: "p-1.5 bg-white rounded-lg text-slate-500 hover:text-indigo-600 transition-colors relative", children: [_jsx(Bell, { className: "w-4 h-4" }), followUpTasks.length > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold", children: followUpTasks.length }))] })] })] }), _jsx("div", { className: "md:hidden sticky top-[46px] z-40 bg-slate-900/95", children: _jsx(Sidebar, { isMobile: true }) }), _jsx("div", { className: "hidden md:block", children: _jsx(Sidebar, {}) }), _jsxs("main", { className: "flex-1 md:ml-20 lg:ml-64 relative min-h-screen", children: [_jsx("div", { className: "fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-0" }), _jsx("div", { className: "relative z-10", children: _jsx(Outlet, {}) })] })] }));
};
export default Layout;
