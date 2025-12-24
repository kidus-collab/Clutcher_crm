import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Users, Send, Zap, Search, CheckSquare, FileSignature } from 'lucide-react';
const Sidebar = ({ isMobile = false }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/find', icon: Search, label: 'Find Customers' },
        { path: '/leads', icon: Users, label: 'Leads' },
        { path: '/outreach', icon: Send, label: 'Outreach' },
        { path: '/offers', icon: FileSignature, label: 'Offers' },
        { path: '/closed', icon: CheckSquare, label: 'Closed Leads' },
        { path: '/pipeline', icon: KanbanSquare, label: 'Pipeline' },
    ];
    if (isMobile) {
        return (_jsx("aside", { className: "h-full w-full flex flex-row items-center justify-between bg-slate-900/95 backdrop-blur-3xl border-t border-white/5 text-slate-300 shadow-2xl overflow-x-auto", children: _jsx("nav", { className: "flex-1 flex flex-row justify-around items-center px-2 py-2", children: navItems.map((item) => (_jsxs(Link, { to: item.path, className: `
                flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 group relative min-w-[3.5rem]
                ${isActive(item.path)
                        ? 'text-white'
                        : 'text-slate-500 hover:text-white'}
              `, children: [isActive(item.path) && (_jsx("div", { className: "absolute bottom-0 w-8 h-1 bg-indigo-500 rounded-t-lg shadow-[0_0_10px_rgba(99,102,241,0.5)]" })), _jsx(item.icon, { className: `w-6 h-6 mb-1 transition-colors ${isActive(item.path) ? 'text-indigo-400' : 'currentColor'}`, strokeWidth: 1.5 }), _jsx("span", { className: "text-[10px] font-medium tracking-wide", children: item.label.split(' ')[0] })] }, item.path))) }) }));
    }
    return (_jsxs("aside", { className: "h-screen w-20 lg:w-64 fixed left-0 top-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-3xl border-r border-white/5 text-slate-300 shadow-2xl transition-all duration-300", children: [_jsxs("div", { className: "h-32 flex items-center justify-center px-6 border-b border-white/5", children: [_jsxs("div", { className: "hidden lg:flex flex-row items-center justify-center gap-4", children: [_jsxs("div", { className: "relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all hover:scale-110 hover:shadow-[0_0_40px_rgba(168,85,247,0.8)] duration-300 group", children: [_jsx("div", { className: "absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400 to-pink-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" }), _jsx("div", { className: "relative z-10", children: _jsx(Zap, { className: "w-9 h-9 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]", strokeWidth: 2.5 }) })] }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "font-black text-white tracking-widest text-2xl leading-none uppercase bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent", children: "Clutcher" }), _jsx("span", { className: "text-[10px] text-slate-400 font-medium tracking-widest uppercase", children: "Platform" })] })] }), _jsx("div", { className: "lg:hidden flex items-center justify-center", children: _jsxs("div", { className: "relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] group hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] transition-all hover:scale-105 duration-300", children: [_jsx("div", { className: "absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-pink-400 opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-300" }), _jsx(Zap, { className: "w-7 h-7 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)] relative z-10", strokeWidth: 2.5 })] }) })] }), _jsx("nav", { className: "flex-1 py-8 flex flex-col gap-1.5 px-4", children: navItems.map((item) => (_jsxs(Link, { to: item.path, className: `
              flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
              ${isActive(item.path)
                        ? 'bg-gradient-to-r from-indigo-600/20 to-transparent text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] border-l-4 border-indigo-500'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white transition-colors'}
            `, children: [_jsx(item.icon, { className: `w-5 h-5 transition-colors ${isActive(item.path) ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`, strokeWidth: isActive(item.path) ? 2 : 1.5 }), _jsx("span", { className: `hidden lg:block ml-3.5 text-sm tracking-wide ${isActive(item.path) ? 'font-bold' : 'font-medium'}`, children: item.label })] }, item.path))) }), _jsx("div", { className: "p-6 hidden lg:block", children: _jsxs("div", { className: "bg-white/5 rounded-2xl p-4 border-none shadow-neo-xs ", children: [_jsx("p", { className: "text-xs text-white font-bold opacity-80", children: "Clutcher v1.0" }), _jsx("p", { className: "text-[10px] text-slate-400 mt-1 font-medium italic", children: "Simple. Functional." })] }) })] }));
};
export default Sidebar;
