import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import GlassCard from './ui/GlassCard';
import { Sparkles, Search, Users, Send, FileSignature, CheckSquare, KanbanSquare, ArrowRight, Zap, Target, Rocket, ShieldCheck, Cpu, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
const Guide = () => {
    const sections = [
        {
            icon: Search,
            title: 'Find Leads',
            desc: 'The Engine of Growth. Use our AI agent to target industries and regions. Extract verified emails and social handles with natural language queries.',
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            icon: Send,
            title: 'Outreach Center',
            desc: 'Multi-channel engagement hub. Seamlessly switch between Email, LinkedIn, and Twitter. Track lead posture and response rates in real-time.',
            color: 'text-indigo-500',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20'
        },
        {
            icon: FileSignature,
            title: 'Offer Management',
            desc: 'The Closing Suite. Set contract values, choose high-conversion channels, and send formal closing offers directly to your qualified prospects.',
            color: 'text-violet-500',
            bg: 'bg-violet-50 dark:bg-violet-900/20'
        },
        {
            icon: CheckSquare,
            title: 'Closed Leads Archive',
            desc: 'Success Repository. Store every conversion and build deep case studies. Analyze historical win/loss data to refine your future sales strategy.',
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20'
        },
        {
            icon: KanbanSquare,
            title: 'Visual Pipeline',
            desc: 'Command & Control. A tactile overview of every active deal. Monitor velocity, probability, and move deals through stages with a single click.',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-900/20'
        }
    ];
    const workflowSteps = [
        { step: '01', title: 'Target & Scrape', task: 'Use "Find Leads" to populate your database with verified prospects.', icon: Cpu },
        { step: '02', title: 'Qualify', task: 'Review scraped data in "Leads" and move the best fits to the Pipeline.', icon: Target },
        { step: '03', title: 'Engage', task: 'Execute multi-channel outreach via the Hub to spark conversations.', icon: Send },
        { step: '04', title: 'Convert', task: 'Send formal offers and closing contracts via "Offer Management".', icon: FileSignature },
        { step: '05', title: 'Archive', task: 'Record wins in "Success Archive" to build historical case studies.', icon: Trophy }
    ];
    return (_jsxs("div", { className: "p-8 lg:p-12 space-y-16 animate-fade-in pb-32 max-w-[1600px] mx-auto transition-colors duration-500", children: [_jsxs("div", { className: "text-center space-y-6", children: [_jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, className: "inline-flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 px-6 py-2 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm", children: [_jsx(Sparkles, { className: "w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" }), _jsx("span", { className: "text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest", children: "Getting Started" })] }), _jsxs("h1", { className: "text-5xl font-black text-slate-900 dark:text-white tracking-tighter", children: ["Master the ", _jsx("span", { className: "text-indigo-600", children: "Clutcher" }), " Ecosystem"] }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium text-lg leading-relaxed", children: "Welcome to the next generation of business intelligence. Clutcher is designed to streamline the entire sales lifecycle from discovery to closing." })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6", children: sections.map((item, idx) => (_jsxs(GlassCard, { className: "p-8 flex flex-col items-center text-center group", hoverEffect: true, children: [_jsx("div", { className: `${item.bg} p-5 rounded-3xl mb-6 shadow-neo-flat-sm dark:shadow-neo-flat-sm-dark border border-white dark:border-slate-800 transition-transform group-hover:scale-110`, children: _jsx(item.icon, { className: `w-8 h-8 ${item.color}`, strokeWidth: 2.5 }) }), _jsx("h3", { className: "text-lg font-black text-slate-900 dark:text-white mb-3 tracking-tight leading-tight", children: item.title }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-500 leading-relaxed font-medium", children: item.desc })] }, idx))) }), _jsxs("div", { className: "space-y-10", children: [_jsxs("div", { className: "flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6", children: [_jsx("div", { className: "p-3 bg-slate-900 dark:bg-white rounded-2xl text-white dark:text-slate-900 shadow-xl", children: _jsx(Zap, { className: "w-6 h-6 text-indigo-500" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-black text-slate-900 dark:text-white tracking-tight", children: "The Clutcher Method" }), _jsx("p", { className: "text-slate-500 font-bold uppercase tracking-widest text-xs mt-1", children: "Recommended Workflow Pipeline" })] })] }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-6", children: workflowSteps.map((step, idx) => (_jsxs("div", { className: "relative group", children: [_jsxs(GlassCard, { className: "p-6 h-full border-none shadow-neo-flat dark:shadow-neo-flat-dark flex flex-col items-center text-center lg:items-start lg:text-left overflow-hidden", children: [_jsx("div", { className: "absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity", children: _jsx(step.icon, { className: "w-16 h-16 text-indigo-500" }) }), _jsx("div", { className: "text-4xl font-black text-indigo-500/20 dark:text-indigo-500/10 mb-2 leading-none", children: step.step }), _jsx("h4", { className: "text-lg font-black text-slate-800 dark:text-white mb-2", children: step.title }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed", children: step.task })] }), idx < workflowSteps.length - 1 && (_jsx("div", { className: "hidden lg:block absolute top-1/2 -right-4 translate-y-[-50%] z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700", children: _jsx(ArrowRight, { className: "w-4 h-4 text-indigo-500" }) }))] }, idx))) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8 pt-8", children: [_jsxs(GlassCard, { className: "p-6 border-l-4 border-l-indigo-500", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(Rocket, { className: "w-5 h-5 text-indigo-500" }), _jsx("h5", { className: "font-black text-slate-800 dark:text-white text-sm", children: "Pro Tip: Scraping" })] }), _jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed", children: ["Be as specific as possible in your queries. Use ", "Software Agencies in London with >20 employees", " for best AI accuracy."] })] }), _jsxs(GlassCard, { className: "p-6 border-l-4 border-l-emerald-500", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(ShieldCheck, { className: "w-5 h-5 text-emerald-500" }), _jsx("h5", { className: "font-black text-slate-800 dark:text-white text-sm", children: "Best Practice: Pipeline" })] }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed", children: "Always assign an Estimated Value to deals in the Proposal stage. This feeds into the Success Archive for revenue tracking." })] }), _jsxs(GlassCard, { className: "p-6 border-l-4 border-l-amber-500", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(Users, { className: "w-5 h-5 text-amber-500" }), _jsx("h5", { className: "font-black text-slate-800 dark:text-white text-sm", children: "Team Growth" })] }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed", children: "Archive every deal, win or loss. The Success Archive creates a training manual for future sales recruits." })] })] })] }));
};
export default Guide;
