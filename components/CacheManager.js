import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import GlassCard from './ui/GlassCard';
import { Database, Trash2, RefreshCw, Clock, HardDrive, AlertTriangle } from 'lucide-react';
import { clearCache, getCacheStats } from '../lib/api/scrape';
const CacheManager = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    useEffect(() => {
        loadStats();
    }, []);
    const loadStats = async () => {
        try {
            const cacheStats = await getCacheStats();
            setStats(cacheStats);
        }
        catch (error) {
            console.error('Failed to load cache stats:', error);
        }
    };
    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear all cached search results? This will remove all saved searches and you\'ll need to search again.')) {
            return;
        }
        setLoading(true);
        try {
            await clearCache();
            await loadStats();
            alert('Cache cleared successfully!');
        }
        catch (error) {
            console.error('Failed to clear cache:', error);
            alert('Failed to clear cache. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleRefresh = async () => {
        setLoading(true);
        await loadStats();
        setLoading(false);
    };
    const formatBytes = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const formatDate = (timestamp) => {
        if (!timestamp)
            return 'N/A';
        return new Date(timestamp).toLocaleString();
    };
    if (!stats) {
        return (_jsxs("div", { className: "p-4 text-center text-slate-500", children: [_jsx(RefreshCw, { className: "w-6 h-6 animate-spin mx-auto mb-2" }), "Loading cache statistics..."] }));
    }
    return (_jsxs(GlassCard, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("h2", { className: "text-lg font-bold text-slate-800 flex items-center gap-2", children: [_jsx(Database, { className: "w-5 h-5 text-indigo-600" }), "Cache Management"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: handleRefresh, disabled: loading, className: "p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50", title: "Refresh cache stats", children: _jsx(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }) }), _jsx("button", { onClick: handleClearAll, disabled: loading, className: "p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50", title: "Clear all cache", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6", children: [_jsxs("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-indigo-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx(Database, { className: "w-5 h-5 text-indigo-600" }), _jsx("span", { className: "text-xs text-indigo-600 font-medium", children: "ENTRIES" })] }), _jsx("div", { className: "text-2xl font-bold text-indigo-900", children: stats.totalEntries })] }), _jsxs("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx(HardDrive, { className: "w-5 h-5 text-emerald-600" }), _jsx("span", { className: "text-xs text-emerald-600 font-medium", children: "SIZE" })] }), _jsx("div", { className: "text-2xl font-bold text-emerald-900", children: formatBytes(stats.totalSize) })] }), _jsxs("div", { className: "bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx(Clock, { className: "w-5 h-5 text-amber-600" }), _jsx("span", { className: "text-xs text-amber-600 font-medium", children: "OLDEST" })] }), _jsx("div", { className: "text-sm font-bold text-amber-900", children: stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleDateString() : 'N/A' })] }), _jsxs("div", { className: "bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx(RefreshCw, { className: "w-5 h-5 text-purple-600" }), _jsx("span", { className: "text-xs text-purple-600 font-medium", children: "NEWEST" })] }), _jsx("div", { className: "text-sm font-bold text-purple-900", children: stats.newestEntry ? new Date(stats.newestEntry).toLocaleDateString() : 'N/A' })] })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-700", children: "Cache Health" }), stats.totalEntries === 0 && (_jsxs("div", { className: "flex items-center gap-1 text-amber-600", children: [_jsx(AlertTriangle, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs", children: "Empty Cache" })] })), stats.totalSize > 10 * 1024 * 1024 && ( // > 10MB
                            _jsxs("div", { className: "flex items-center gap-1 text-rose-600", children: [_jsx(AlertTriangle, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs", children: "Large Cache" })] }))] }), _jsx("div", { className: "w-full bg-slate-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all ${stats.totalSize > 10 * 1024 * 1024 ? 'bg-rose-500' :
                                stats.totalSize > 5 * 1024 * 1024 ? 'bg-amber-500' : 'bg-emerald-500'}`, style: {
                                width: `${Math.min(100, (stats.totalSize / (10 * 1024 * 1024)) * 100)}%`
                            } }) }), _jsxs("div", { className: "flex justify-between text-xs text-slate-500 mt-1", children: [_jsx("span", { children: "0 MB" }), _jsx("span", { children: "10 MB" })] })] }), _jsxs("div", { children: [_jsxs("button", { onClick: () => setShowDetails(!showDetails), className: "w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-slate-700", children: "Detailed Information" }), _jsx(RefreshCw, { className: `w-4 h-4 text-slate-600 transition-transform ${showDetails ? 'rotate-180' : ''}` })] }), showDetails && (_jsxs("div", { className: "mt-4 p-4 bg-slate-50 rounded-lg space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "Total Entries:" }), _jsx("span", { className: "font-medium text-slate-800 ml-2", children: stats.totalEntries })] }), _jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "Total Size:" }), _jsx("span", { className: "font-medium text-slate-800 ml-2", children: formatBytes(stats.totalSize) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "Oldest Entry:" }), _jsx("span", { className: "font-medium text-slate-800 ml-2", children: formatDate(stats.oldestEntry) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "Newest Entry:" }), _jsx("span", { className: "font-medium text-slate-800 ml-2", children: formatDate(stats.newestEntry) })] })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-700 mb-2", children: "Cache Information" }), _jsxs("div", { className: "text-xs text-slate-600 space-y-1", children: [_jsx("p", { children: "\u2022 Cache stores search results for 24 hours" }), _jsx("p", { children: "\u2022 Automatic cleanup runs every hour" }), _jsx("p", { children: "\u2022 Cache is stored locally in your browser" }), _jsx("p", { children: "\u2022 Clear cache if you experience issues with stale data" })] })] })] }))] }), _jsxs("div", { className: "mt-6 flex gap-3", children: [_jsxs("button", { onClick: handleRefresh, disabled: loading, className: "flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }), "Refresh Stats"] }), _jsxs("button", { onClick: handleClearAll, disabled: loading, className: "flex-1 py-2 px-4 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2", children: [_jsx(Trash2, { className: "w-4 h-4" }), "Clear All Cache"] })] })] }));
};
export default CacheManager;
