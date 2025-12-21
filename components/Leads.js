import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import GlassCard from './ui/GlassCard';
import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import { Search, Filter, MoreVertical, Globe, LayoutGrid, BarChart3, Target, Table as TableIcon, ChevronRight, Timer, Loader2, Trash2, AlertTriangle, X, CheckCircle2, PlusCircle, UserPlus, Eye, Handshake, CheckCheck, MessageSquare, Calendar, Award, RefreshCw, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLeads, deleteLead, saveBusiness, addToLeads, getOutreachTrackingLeads, getOffersLeads, getClosedLeads, supabase, logOutreachTracking } from '../lib/database/supabase';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid, Area, ComposedChart, Line } from 'recharts';
// Function to format date and time with spaces and UTC+3 Nairobi timezone
const formatDateTime = (dateString) => {
    if (!dateString)
        return '';
    try {
        const date = new Date(dateString);
        // Format date part
        const datePart = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        // Format time part
        const timePart = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return `${datePart} ${timePart} UTC+3 (Nairobi)`;
    }
    catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};
// Success notification popup component
const SuccessNotification = ({ isVisible, message, onClose }) => {
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(5); // 5 seconds countdown
    useEffect(() => {
        if (!isVisible)
            return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
            setProgress((prev) => {
                if (prev >= 100)
                    return 100;
                return prev + 20; // Increment by 20% every second (5 seconds = 100%)
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isVisible, onClose]);
    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            if (target.closest('.notification-popup'))
                return;
            onClose();
        };
        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isVisible, onClose]);
    if (!isVisible)
        return null;
    return (_jsx(motion.div, { initial: { opacity: 0, y: -50, scale: 0.8 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -50, scale: 0.8 }, transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
        }, className: "fixed top-4 right-4 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 max-w-sm border border-emerald-600 notification-popup", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(CheckCircle2, { className: "w-6 h-6 text-emerald-100" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-bold text-emerald-50", children: "Success!" }), _jsx("p", { className: "text-emerald-100 text-sm mt-1", children: message }), _jsx("div", { className: "mt-3 bg-emerald-600/30 rounded-full h-1.5 overflow-hidden", children: _jsx(motion.div, { className: "h-full bg-emerald-100 rounded-full", initial: { width: 0 }, animate: { width: `${progress}%` }, transition: { duration: 0.5 } }) }), _jsxs("div", { className: "flex items-center gap-1 mt-2", children: [_jsx(Timer, { className: "w-3 h-3 text-emerald-100" }), _jsxs("span", { className: "text-xs text-emerald-100", children: ["Closing in ", timeLeft, "s"] })] })] }), _jsx("button", { onClick: onClose, className: "flex-shrink-0 text-emerald-100 hover:text-white transition-colors", children: _jsx(X, { className: "w-4 h-4" }) })] }) }));
};
const Leads = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('board');
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Add Lead Modal State
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [newLeadName, setNewLeadName] = useState('');
    const [newLeadWebsite, setNewLeadWebsite] = useState('');
    const [newLeadEmail, setNewLeadEmail] = useState('');
    const [newLeadPhone, setNewLeadPhone] = useState('');
    const [newLeadDescription, setNewLeadDescription] = useState('');
    // Social media fields
    const [newLeadTwitter, setNewLeadTwitter] = useState('');
    const [newLeadInstagram, setNewLeadInstagram] = useState('');
    const [newLeadTiktok, setNewLeadTiktok] = useState('');
    const [newLeadLinkedin, setNewLeadLinkedin] = useState('');
    const [newLeadTelegram, setNewLeadTelegram] = useState('');
    // Filter State
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTimeRange, setFilterTimeRange] = useState('');
    const [filterOutcome, setFilterOutcome] = useState('');
    // Success notification state
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const fetchLeads = async () => {
        const startTime = Date.now();
        setLoading(true);
        // Fetch all datasets
        const allRawLeads = await getLeads();
        const closedLeads = await getClosedLeads();
        const outreachTrackingLeads = await getOutreachTrackingLeads();
        const offersLeads = await getOffersLeads();
        // Create specific sets of IDs for leads that are in later stages
        const processedIds = new Set([
            ...outreachTrackingLeads.map(l => l.id),
            ...offersLeads.map(l => l.id),
            ...closedLeads.map(l => l.id)
        ]);
        // Active 'New' leads are those in the main table but NOT in any tracking table
        const activeRegularLeads = allRawLeads.filter(l => !processedIds.has(l.id));
        // DEBUG: Log details of each lead category
        console.log('DEBUG: Raw leads from getLeads():', allRawLeads.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
        console.log('DEBUG: Outreach tracking leads:', outreachTrackingLeads.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
        console.log('DEBUG: Offers leads:', offersLeads.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
        console.log('DEBUG: Closed leads:', closedLeads.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
        // DEBUG: Check for any leads with "No Reply" status in activeRegularLeads
        const noReplyInActive = activeRegularLeads.filter(l => l.status === 'No Reply');
        if (noReplyInActive.length > 0) {
            console.log('DEBUG: Found leads with "No Reply" status in activeRegularLeads:', noReplyInActive.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
        }
        // Combine all leads for filtering
        const allLeads = [...activeRegularLeads, ...closedLeads, ...outreachTrackingLeads, ...offersLeads];
        setLeads(allLeads);
        // Artificial Delay
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 800 - elapsedTime);
        await new Promise(r => setTimeout(r, remainingTime));
        setLoading(false);
    };
    useEffect(() => {
        fetchLeads();
        // Also check for updates when window gains focus (user navigates back to this tab)
        const handleFocus = () => {
            fetchLeads();
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);
    // Filter logic
    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.business.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lead.business.email && lead.business.email.toLowerCase().includes(searchQuery.toLowerCase()));
        // Status filter - keep generic check or remove if status is deprecated
        // For now, we trust the category separation
        const matchesStatus = !filterStatus || lead.status === filterStatus;
        // Time range filter
        let matchesTimeRange = true;
        if (filterTimeRange) {
            const leadDate = new Date(lead.createdAt || '');
            const now = new Date();
            switch (filterTimeRange) {
                case 'today':
                    matchesTimeRange = leadDate.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchesTimeRange = leadDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    matchesTimeRange = leadDate >= monthAgo;
                    break;
                case 'quarter':
                    const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    matchesTimeRange = leadDate >= quarterAgo;
                    break;
            }
        }
        // Outcome filter
        const matchesOutcome = !filterOutcome || lead.outcome === filterOutcome;
        return matchesSearch && matchesStatus && matchesTimeRange && matchesOutcome;
    });
    // Organize columns using specific data sources
    // 'New' is filtered by NOT being in others (as done in fetchLeads activeRegularLeads)
    // But since 'filteredLeads' combines them all, we need to separate them again by source/status
    // In fetchLeads, we assigned them implicit sources via the functions, but raw leads from getLeads might still have old status? 
    // We should rely on `processedIds` equivalent logic if possible, or just checking if they are the tracking leads
    // Since we don't have processedIds here easily without recomputing, we can rely on the fact that:
    // outreachTrackingLeads have source='Outreach Tracking'
    // offersLeads have source='Offer'
    // closedLeads have source='Closed'
    // activeRegularLeads have source='Scraper' (or original source)
    // So 'New' = source NOT IN ('Outreach Tracking', 'Offer', 'Closed')
    // DEBUG: Log leads being assigned to each column
    const newLeads = filteredLeads.filter(l => l.source !== 'Outreach Tracking' &&
        l.source !== 'Offer' &&
        l.source !== 'Closed' &&
        l.status !== 'No Reply' // Explicitly exclude leads with "No Reply" status
    );
    const noReplyLeads = filteredLeads.filter(l => l.source === 'Outreach Tracking');
    const negotiationsLeads = filteredLeads.filter(l => l.source === 'Offer');
    const convertedLeads = filteredLeads.filter(l => l.source === 'Closed');
    // DEBUG: Check for leads with "No Reply" status in the New column
    const noReplyInNew = newLeads.filter(l => l.status === 'No Reply');
    if (noReplyInNew.length > 0) {
        console.log('DEBUG: Found leads with "No Reply" status in New column:', noReplyInNew.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
    }
    else {
        console.log('DEBUG: No leads with "No Reply" status found in New column - fix successful!');
    }
    // DEBUG: Log all leads with their status and source for debugging
    console.log('DEBUG: All leads with status and source:', filteredLeads.map(l => ({ id: l.id, name: l.business.name, status: l.status, source: l.source })));
    const columns = {
        'New': newLeads,
        'No Reply': noReplyLeads,
        'Negotiations': negotiationsLeads,
        'Converted': convertedLeads,
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-500';
            case 'No Reply': return 'bg-slate-400';
            case 'Negotiations': return 'bg-indigo-500';
            case 'Converted': return 'bg-emerald-500';
            default: return 'bg-slate-400';
        }
    };
    const getStatusBadge = (status) => {
        switch (status) {
            case 'New': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'No Reply': return 'text-slate-600 bg-slate-50 border-slate-100';
            case 'Negotiations': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
            case 'Converted': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };
    const getStatusBg = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-50/50 border-blue-100';
            case 'No Reply': return 'bg-slate-50/50 border-slate-100';
            case 'Negotiations': return 'bg-indigo-50/50 border-indigo-100';
            case 'Converted': return 'bg-emerald-50/50 border-emerald-100';
            default: return 'bg-slate-50/50 border-slate-100';
        }
    };
    const handleDragEnd = async (result) => {
        // Drag and drop logic... if moving out of New, we might need to handle it?
        // Users usually use buttons. Drag drop might update status but we want to avoid that if status is removed.
        // For now, leaving as is, assuming user uses buttons.
    };
    // ... (handleDeleteLead, etc)
    const handleOutreach = async (lead) => {
        // Local storage for cross-component updates (legacy/optional)
        const outreachClicks = JSON.parse(localStorage.getItem('outreachClicks') || '[]');
        outreachClicks.push({
            leadId: lead.id,
            leadName: lead.business.name,
            timestamp: new Date().toISOString(),
            source: 'leads_page'
        });
        localStorage.setItem('outreachClicks', JSON.stringify(outreachClicks));
        // Add entry to outreach_tracking table
        try {
            const trackingResult = await logOutreachTracking(lead.id, lead.business.name, 'outreach_button_clicked', {
                button_clicked: 'outreach_button',
                timestamp: new Date().toISOString()
            }, 'leads_page');
            if (trackingResult.duplicate) {
                setSuccessMessage('This lead is already in the outreach tracking list!');
                setShowSuccessNotification(true);
                return;
            }
            if (!trackingResult.success) {
                console.error('Failed to track outreach button click');
                setSuccessMessage('Error: Failed to add to outreach tracking. Please run the SQL command to enable public access to outreach_tracking table.');
                setShowSuccessNotification(true);
            }
            else {
                console.log('Successfully tracked outreach button click for:', lead.business.name);
                // No longer update status to 'No Reply'
                // We solely rely on the presence in outreach_tracking table
                // Refresh leads data
                await fetchLeads();
                console.log('Lead view refreshed');
            }
        }
        catch (error) {
            console.error('Exception during outreach tracking:', error);
            setSuccessMessage('Exception during tracking. Check console for details.');
            setShowSuccessNotification(true);
        }
    };
    const handleLeadCardClick = async (lead) => {
        // Add lead to outreach_tracking table
        try {
            const trackingResult = await logOutreachTracking(lead.id, lead.business.name, 'lead_card_clicked', {
                button_clicked: 'lead_card',
                timestamp: new Date().toISOString()
            }, 'leads_page');
            if (trackingResult.duplicate) {
                console.log('Lead already in outreach tracking');
                return;
            }
            if (!trackingResult.success) {
                console.error('Failed to track lead card click');
                return;
            }
            // Only update the source to 'Outreach Tracking' to move it to the correct column
            // Don't change the status - keep it as 'New'
            if (supabase) {
                const { error: sourceError } = await supabase
                    .from('leads')
                    .update({ source: 'Outreach Tracking' })
                    .eq('id', lead.id);
                if (sourceError) {
                    console.error('Failed to update lead source:', sourceError);
                }
                else {
                    console.log('Lead source updated to Outreach Tracking:', lead.business.name);
                }
            }
            // Refresh leads data to show updated source
            await fetchLeads();
        }
        catch (error) {
            console.error('Exception during lead card click handling:', error);
        }
    };
    // --- Analytical Calculations ---
    const COLORS = {
        'New': '#3b82f6',
        'No Reply': '#94a3b8',
        'Negotiations': '#6366f1',
        'Converted': '#10b981'
    };
    // Outcome Summary - update calculations based on user requirements
    const interestedCount = columns.Negotiations.length;
    const noReplyCount = columns['No Reply'].length;
    const badFitCount = leads.filter(l => l.outcome === 'Bad Fit').length;
    // Sophisticated Pipeline Health
    const funnelData = [
        { name: 'Total Scoped', value: leads.length, fill: '#f1f5f9' },
        { name: 'Initial Contact', value: columns.New.length + columns['No Reply'].length, fill: '#94a3b8' },
        { name: 'Qualified', value: leads.filter(l => l.outcome === 'Interested').length, fill: '#6366f1' },
        { name: 'In Discussion', value: columns.Negotiations.length, fill: '#8b5cf6' },
        { name: 'Converted', value: columns.Converted.length, fill: '#10b981' },
    ];
    // Engagement Intensity Data - Calculate actual outreach data by day
    const calculateOutreachData = () => {
        const outreachLeads = leads.filter(l => l.source === 'Outreach Tracking');
        const dayData = {};
        // Initialize all days of the week
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        daysOfWeek.forEach(day => {
            dayData[day] = { touches: 0, conversions: 0 };
        });
        // Count outreach by day
        outreachLeads.forEach(lead => {
            if (lead.createdAt) {
                const date = new Date(lead.createdAt);
                const dayName = daysOfWeek[date.getDay()];
                if (dayData[dayName]) {
                    dayData[dayName].touches++;
                    if (lead.outcome === 'Interested') {
                        dayData[dayName].conversions++;
                    }
                }
            }
        });
        // Convert to array format for chart (only show weekdays)
        return [
            { day: 'Mon', ...dayData['Mon'] },
            { day: 'Tue', ...dayData['Tue'] },
            { day: 'Wed', ...dayData['Wed'] },
            { day: 'Thu', ...dayData['Thu'] },
            { day: 'Fri', ...dayData['Fri'] },
        ];
    };
    const intensityData = calculateOutreachData();
    const handleAddLead = async () => {
        // Validation: Business name is mandatory, and at least one of website, email, or social media
        if (!newLeadName || (!newLeadWebsite && !newLeadEmail && !newLeadTwitter && !newLeadInstagram && !newLeadTiktok && !newLeadLinkedin && !newLeadTelegram)) {
            setSuccessMessage('Business name is required and at least one of website, email, or social media must be provided');
            setShowSuccessNotification(true);
            return;
        }
        try {
            // Create social media array
            const socials = [];
            if (newLeadTwitter)
                socials.push({ platform: 'twitter', url: newLeadTwitter, handle: `@${newLeadTwitter}` });
            if (newLeadInstagram)
                socials.push({ platform: 'instagram', url: newLeadInstagram, handle: `@${newLeadInstagram}` });
            if (newLeadTiktok)
                socials.push({ platform: 'tiktok', url: newLeadTiktok, handle: `@${newLeadTiktok}` });
            if (newLeadLinkedin)
                socials.push({ platform: 'linkedin', url: newLeadLinkedin, handle: newLeadLinkedin });
            if (newLeadTelegram)
                socials.push({ platform: 'telegram', url: newLeadTelegram, handle: `@${newLeadTelegram}` });
            // Create business first (with enhanced redundancy checks)
            const business = await saveBusiness({
                name: newLeadName,
                website: newLeadWebsite,
                email: newLeadEmail,
                phone: newLeadPhone,
                description: newLeadDescription,
                socials: socials
            });
            if (!business) {
                setSuccessMessage('Failed to create business. Please try again.');
                setShowSuccessNotification(true);
                return;
            }
            // Create lead for business (with redundancy check)
            const lead = await addToLeads(business.id);
            if (!lead) {
                // Check if this is a duplicate lead scenario
                const existingLeads = leads.filter(l => l.business.id === business.id);
                if (existingLeads.length > 0) {
                    setSuccessMessage(`This business already exists as a lead: "${existingLeads[0].business.name}". Lead not created to avoid duplicates.`);
                    setShowSuccessNotification(true);
                }
                else {
                    setSuccessMessage('Failed to create lead. Please try again.');
                    setShowSuccessNotification(true);
                }
                return;
            }
            // Update leads list
            setLeads(prev => [...prev, lead]);
            // Close modal
            setShowAddLeadModal(false);
            setNewLeadName('');
            setNewLeadWebsite('');
            setNewLeadEmail('');
            setNewLeadPhone('');
            setNewLeadDescription('');
            setNewLeadTwitter('');
            setNewLeadInstagram('');
            setNewLeadTiktok('');
            setNewLeadLinkedin('');
            setNewLeadTelegram('');
            // Show success notification
            setSuccessMessage(`Lead "${newLeadName}" created successfully!`);
            setShowSuccessNotification(true);
        }
        catch (error) {
            console.error('Error adding lead:', error);
            setSuccessMessage('An error occurred while adding lead. Please try again.');
            setShowSuccessNotification(true);
        }
    };
    const handleDeleteLead = async (leadId) => {
        setIsDeleting(true);
        try {
            const success = await deleteLead(leadId);
            if (success) {
                // Remove lead from UI across all columns
                setLeads(prev => prev.filter(l => l.id !== leadId));
                setDeleteConfirmId(null);
            }
            else {
                alert('Failed to delete lead. Please try again.');
            }
        }
        catch (error) {
            console.error('Error deleting lead:', error);
            alert('An error occurred while deleting lead.');
        }
        finally {
            setIsDeleting(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 }, className: "h-screen flex flex-col p-3 sm:p-4 lg:p-10 overflow-hidden max-w-[1600px] mx-auto", children: [_jsxs("div", { className: "shrink-0 mb-4 sm:mb-6", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start gap-3 sm:gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight", children: "Leads Central" }), _jsx("p", { className: "text-slate-500 text-xs sm:text-sm mt-1", children: "Advanced prospect intelligence & pipeline oversight." }), _jsxs("button", { onClick: () => setShowAddLeadModal(true), className: "flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all mt-3 sm:mt-4 text-sm sm:text-base border-none", children: [_jsx(UserPlus, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" }), _jsx("span", { children: "Add Lead" })] })] }), _jsxs("div", { className: "flex gap-2 sm:gap-3", children: [_jsxs("div", { className: "relative group", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search prospects...", className: "pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-sm text-slate-700 focus:outline-none w-32 sm:w-48 transition-all" })] }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setShowFilterDropdown(!showFilterDropdown), className: "p-1.5 sm:p-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 sm:gap-2", children: [_jsx(Filter, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), _jsx("span", { className: "text-[10px] sm:text-xs font-medium", children: "Filter" })] }), showFilterDropdown && (_jsxs("div", { className: "absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 z-50 p-4", children: [_jsx("h4", { className: "font-bold text-slate-800 text-sm mb-3", children: "Filter Leads" }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-xs font-medium text-slate-700 mb-2", children: "Status" }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500", children: [_jsx("option", { value: "", children: "All Status" }), _jsx("option", { value: "New", children: "New" }), _jsx("option", { value: "No Reply", children: "No Reply" }), _jsx("option", { value: "Negotiations", children: "Negotiations" }), _jsx("option", { value: "Converted", children: "Converted" })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-xs font-medium text-slate-700 mb-2", children: "Time Range" }), _jsxs("select", { value: filterTimeRange, onChange: (e) => setFilterTimeRange(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500", children: [_jsx("option", { value: "", children: "All Time" }), _jsx("option", { value: "today", children: "Today" }), _jsx("option", { value: "week", children: "This Week" }), _jsx("option", { value: "month", children: "This Month" }), _jsx("option", { value: "quarter", children: "This Quarter" })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-xs font-medium text-slate-700 mb-2", children: "Outcome" }), _jsxs("select", { value: filterOutcome, onChange: (e) => setFilterOutcome(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500", children: [_jsx("option", { value: "", children: "All Outcomes" }), _jsx("option", { value: "Interested", children: "Interested" }), _jsx("option", { value: "No Reply", children: "No Reply" }), _jsx("option", { value: "Bad Fit", children: "Bad Fit" })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => {
                                                                            setFilterStatus('');
                                                                            setFilterTimeRange('');
                                                                            setFilterOutcome('');
                                                                            setShowFilterDropdown(false);
                                                                        }, className: "flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors", children: "Clear" }), _jsx("button", { onClick: () => setShowFilterDropdown(false), className: "flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors", children: "Apply" })] })] }))] })] })] }), _jsxs("div", { className: "mt-6 sm:mt-8 flex items-center gap-4 sm:gap-8 border-b border-slate-200 relative overflow-x-auto", children: [_jsxs("button", { onClick: () => setActiveTab('board'), className: `pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors relative z-10 whitespace-nowrap ${activeTab === 'board' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`, children: [_jsx(LayoutGrid, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), " ", _jsx("span", { children: "Board" }), activeTab === 'board' && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full" }))] }), _jsxs("button", { onClick: () => setActiveTab('table'), className: `pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors relative z-10 whitespace-nowrap ${activeTab === 'table' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`, children: [_jsx(TableIcon, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), " ", _jsx("span", { children: "List" }), activeTab === 'table' && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full" }))] }), _jsxs("button", { onClick: () => setActiveTab('analytics'), className: `pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors relative z-10 whitespace-nowrap ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`, children: [_jsx(BarChart3, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), " ", _jsx("span", { children: "Analytics" }), activeTab === 'analytics' && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full" }))] })] })] }), _jsxs("div", { className: "flex-1 overflow-hidden relative", children: [loading && (_jsxs("div", { className: "flex-1 overflow-hidden", children: [activeTab === 'board' && (_jsx("div", { className: "h-full overflow-x-auto pb-6 flex gap-6 px-1", children: [1, 2, 3, 4].map(col => (_jsxs("div", { className: "w-[320px] flex flex-col h-full space-y-4", children: [_jsx(Skeleton, { className: "h-12 w-full rounded-xl" }), _jsx("div", { className: "space-y-4", children: [1, 2, 3].map(card => (_jsxs("div", { className: "bg-white p-5 rounded-2xl border border-slate-200 h-32 space-y-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx(Skeleton, { variant: "circular", className: "w-10 h-10" }), _jsx(Skeleton, { className: "w-4 h-6" })] }), _jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/2 mt-auto" })] }, card))) })] }, col))) })), activeTab === 'table' && (_jsxs("div", { className: "space-y-4 p-2", children: [_jsxs("div", { className: "flex gap-4 px-6 py-4", children: [_jsx(Skeleton, { className: "h-4 w-1/4" }), _jsx(Skeleton, { className: "h-4 w-1/6" }), _jsx(Skeleton, { className: "h-4 w-1/6" }), _jsx(Skeleton, { className: "h-4 w-1/6" }), _jsx(Skeleton, { className: "h-4 w-1/6" })] }), [1, 2, 3, 4, 5].map(row => (_jsxs("div", { className: "bg-white p-4 rounded-2xl border border-slate-200 h-16 flex items-center gap-4", children: [_jsx(Skeleton, { variant: "circular", className: "w-10 h-10" }), _jsx(Skeleton, { className: "h-4 flex-1" }), _jsx(Skeleton, { className: "h-4 w-20" }), _jsx(Skeleton, { className: "h-4 w-20" })] }, row)))] })), activeTab === 'analytics' && (_jsxs("div", { className: "space-y-8 p-4", children: [_jsx("div", { className: "grid grid-cols-3 gap-6", children: [1, 2, 3].map(i => _jsxs("div", { className: "h-24 bg-white rounded-2xl border border-slate-200 p-4", children: [_jsx(Skeleton, { className: "h-4 w-20 mb-2" }), _jsx(Skeleton, { className: "h-8 w-12" })] }, i)) }), _jsxs("div", { className: "grid grid-cols-3 gap-6", children: [_jsx("div", { className: "col-span-2 h-[450px] bg-white rounded-2xl border border-slate-200 p-8", children: _jsx(Skeleton, { className: "h-full w-full" }) }), _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "h-48 bg-indigo-500/10 rounded-2xl border border-indigo-200 p-6", children: _jsx(Skeleton, { className: "h-full w-full" }) }), _jsx("div", { className: "h-48 bg-white rounded-2xl border border-slate-200 p-6", children: _jsx(Skeleton, { className: "h-full w-full" }) })] })] })] }))] })), !loading && activeTab === 'board' && (_jsx("div", { className: "h-full overflow-x-auto pb-4 sm:pb-6 scrollbar-hide", children: _jsx("div", { className: "flex h-full gap-3 sm:gap-6 min-w-max px-1", children: Object.entries(columns).map(([status, leads]) => (_jsxs("div", { className: "w-[280px] sm:w-[320px] flex flex-col h-full", children: [_jsxs("div", { className: `p-2.5 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 flex justify-between items-center border ${getStatusBg(status)}`, children: [_jsxs("div", { className: "flex items-center gap-1.5 sm:gap-2", children: [_jsx("div", { className: `w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${getStatusColor(status)} shadow-sm` }), _jsx("span", { className: "font-bold text-slate-700 text-[10px] sm:text-xs uppercase tracking-wider", children: status })] }), _jsx("span", { className: "bg-white px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold text-slate-500 border border-slate-200", children: leads.length })] }), _jsx("div", { className: "flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1.5 sm:pr-2 scrollbar-hide pb-16 sm:pb-20", children: leads.map((lead) => {
                                                    // Determine correct route based on column status
                                                    const getRouteForLead = (leadStatus, leadSource) => {
                                                        if (leadStatus === 'Negotiations' || leadSource === 'Offer') {
                                                            return `/offers?lead=${lead.id}`;
                                                        }
                                                        else if (leadStatus === 'Converted' || leadSource === 'Closed') {
                                                            return `/closed?lead=${lead.id}`;
                                                        }
                                                        else {
                                                            return `/outreach?lead=${lead.id}`;
                                                        }
                                                    };
                                                    const route = getRouteForLead(lead.status, lead.source || '');
                                                    return (_jsxs(GlassCard, { className: "p-3.5 sm:p-5 group relative border-l-4 hover:transition-all cursor-pointer overflow-visible", hoverEffect: true, onClick: () => {
                                                            // For New column leads, add to outreach_tracking when card is clicked
                                                            if (status === 'New') {
                                                                handleLeadCardClick(lead);
                                                            }
                                                            else {
                                                                navigate(route);
                                                            }
                                                        }, style: { borderLeftColor: COLORS[status] || 'transparent' }, children: [_jsxs("div", { className: "flex justify-between items-start mb-2.5 sm:mb-3", children: [_jsxs("div", { className: "flex items-center gap-2.5 sm:gap-3", children: [_jsx("div", { className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm", children: lead.business.name.substring(0, 1) }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-800 text-xs sm:text-sm leading-tight group-hover:text-indigo-600 transition-colors", children: lead.business.name }), _jsxs("div", { className: "flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] text-slate-400 font-medium", children: [_jsx(Globe, { className: "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" }), " ", lead.business.website] })] })] }), _jsx("button", { onClick: (e) => { e.stopPropagation(); setDeleteConfirmId(lead.id); }, className: "text-slate-300 hover:text-rose-600 transition-colors p-1", title: "Delete Lead", children: _jsx(MoreVertical, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }) })] }), _jsxs("div", { className: "flex items-center justify-between pt-4 border-t border-slate-100/60 mt-2", children: [_jsxs("div", { className: "flex items-center gap-1 text-[10px] font-bold text-slate-400", children: [_jsx(Calendar, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" }), " ", formatDateTime(lead.lastContact)] }), _jsx("div", { className: "flex items-center gap-1 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all", children: lead.status === 'New' ? (_jsxs("button", { onClick: async (e) => {
                                                                                e.stopPropagation();
                                                                                await handleOutreach(lead);
                                                                                navigate(`/outreach?lead=${lead.id}`);
                                                                            }, className: "flex items-center gap-1 hover:text-indigo-800 transition-colors", children: [_jsx(Megaphone, { className: "w-3 h-3" }), " Outreach"] })) : lead.status === 'No Reply' ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-3 h-3" }), " Follow Up"] })) : lead.status === 'Negotiations' ? (_jsxs(_Fragment, { children: [_jsx(Handshake, { className: "w-3 h-3" }), " View Offers"] })) : lead.status === 'Converted' ? (_jsxs(_Fragment, { children: [_jsx(CheckCheck, { className: "w-3 h-3" }), " View Closed"] })) : (_jsxs(_Fragment, { children: [_jsx(Eye, { className: "w-3 h-3" }), " View Closed"] })) })] })] }, lead.id));
                                                }) })] }, status))) }) })), !loading && activeTab === 'table' && (_jsx("div", { className: "h-full flex flex-col animate-fade-in overflow-hidden", children: _jsx("div", { className: "overflow-x-auto h-full scrollbar-hide py-1 sm:py-2", children: _jsxs("table", { className: "w-full text-left border-separate border-spacing-y-1 sm:border-spacing-y-2 px-1", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest", children: [_jsx("th", { className: "px-3 sm:px-6 py-2 sm:py-4", children: "Prospect" }), _jsx("th", { className: "px-3 sm:px-6 py-2 sm:py-4", children: "Status" }), _jsx("th", { className: "px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell", children: "Value" }), _jsx("th", { className: "px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell", children: "Days" }), _jsx("th", { className: "px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell", children: "Outcome" }), _jsx("th", { className: "px-3 sm:px-6 py-2 sm:py-4 text-right", children: "Actions" })] }) }), _jsx("tbody", { children: filteredLeads.map((lead) => {
                                                    // Determine correct route based on column status
                                                    const getRouteForLead = (leadStatus, leadSource) => {
                                                        if (leadStatus === 'Negotiations' || leadSource === 'Offer') {
                                                            return `/offers?lead=${lead.id}`;
                                                        }
                                                        else if (leadStatus === 'Converted' || leadSource === 'Closed') {
                                                            return `/closed?lead=${lead.id}`;
                                                        }
                                                        else {
                                                            return `/outreach?lead=${lead.id}`;
                                                        }
                                                    };
                                                    const route = getRouteForLead(lead.status, lead.source || '');
                                                    return (_jsxs("tr", { className: "group transition-all", onClick: () => navigate(route), children: [_jsx("td", { className: "px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-l border-slate-200 rounded-l-xl sm:rounded-l-2xl group-hover:bg-slate-50 transition-all", children: _jsxs("div", { className: "flex items-center gap-2.5 sm:gap-4", children: [_jsx("div", { className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm", children: lead.business.name.substring(0, 1) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h3", { className: "font-bold text-slate-800 text-xs sm:text-sm truncate", children: lead.business.name }), _jsx("span", { className: "text-[9px] sm:text-[10px] text-slate-400 truncate block", children: lead.business.website })] })] }) }), _jsx("td", { className: "px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all", children: _jsx("span", { className: `px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border ${getStatusBadge(lead.status)}`, children: lead.status }) }), _jsx("td", { className: "px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all hidden sm:table-cell", children: _jsxs("span", { className: "text-xs font-bold text-slate-700", children: ["$", (lead.estimatedValue || 0).toLocaleString()] }) }), _jsxs("td", { className: "px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all hidden sm:table-cell text-xs font-medium text-slate-500", children: [lead.daysInStage || 0, "d"] }), _jsx("td", { className: "px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-slate-200 transition-all hidden sm:table-cell", children: _jsx("span", { className: `text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded ${lead.outcome === 'Interested' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`, children: lead.outcome || 'Pending' }) }), _jsx("td", { className: "px-3 sm:px-6 py-2 sm:py-4 bg-white border-y border-r border-slate-200 rounded-r-xl sm:rounded-r-2xl transition-all text-right", children: _jsx("button", { className: "p-1.5 sm:p-2 text-slate-300 hover:text-indigo-600", children: _jsx(ChevronRight, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" }) }) })] }, lead.id));
                                                }) })] }) }) })), !loading && activeTab === 'analytics' && (_jsxs("div", { className: "h-full overflow-y-auto pr-2 scrollbar-hide pb-20 animate-fade-in space-y-8 pt-4", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6", children: [_jsx(GlassCard, { className: "p-4 sm:p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between", children: _jsxs("div", { children: [_jsx("h4", { className: "text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1", children: "Interested" }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "text-3xl sm:text-4xl font-bold text-emerald-600 tracking-tighter", children: interestedCount }), _jsx("span", { className: "text-[10px] sm:text-xs font-semibold text-slate-400", children: "leads" })] })] }) }), _jsx(GlassCard, { className: "p-4 sm:p-6 border-l-4 border-l-amber-500 flex flex-col justify-between", children: _jsxs("div", { children: [_jsx("h4", { className: "text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1", children: "No Reply" }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "text-3xl sm:text-4xl font-bold text-amber-500 tracking-tighter", children: noReplyCount }), _jsx("span", { className: "text-[10px] sm:text-xs font-semibold text-slate-400", children: "leads" })] })] }) }), _jsx(GlassCard, { className: "p-4 sm:p-6 border-l-4 border-l-slate-400 flex flex-col justify-between", children: _jsxs("div", { children: [_jsx("h4", { className: "text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1", children: "Bad Fit" }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "text-3xl sm:text-4xl font-bold text-slate-500 tracking-tighter", children: badFitCount }), _jsx("span", { className: "text-[10px] sm:text-xs font-semibold text-slate-400", children: "leads" })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6", children: [_jsxs(GlassCard, { className: "lg:col-span-2 p-8 h-[450px] flex flex-col", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsxs("div", { children: [_jsxs("h3", { className: "font-bold text-slate-800 flex items-center gap-2", children: [_jsx(Target, { className: "w-4 h-4 text-indigo-500" }), " Interaction Quality Funnel"] }), _jsx("p", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1", children: "Lifecycle Conversion Analysis" })] }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-indigo-500" }), _jsx("span", { className: "text-[10px] font-bold text-slate-500", children: "Volume" })] }) })] }), _jsx("div", { className: "flex-1", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: funnelData, margin: { left: 20, right: 20 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#f1f5f9" }), _jsx(XAxis, { dataKey: "name", axisLine: false, tickLine: false, tick: { fill: '#94a3b8', fontSize: 10, fontWeight: 700 } }), _jsx(Tooltip, { cursor: { fill: 'rgba(99, 102, 241, 0.05)' }, contentStyle: { borderRadius: '12px', border: '1px solid #e2e8f0' } }), _jsx(Bar, { dataKey: "value", radius: [8, 8, 0, 0], barSize: 60, children: funnelData.map((entry, index) => (_jsx(Cell, { fill: entry.fill }, `cell-${index}`))) })] }) }) })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(GlassCard, { className: "p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-none", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4 opacity-80 uppercase text-[10px] font-bold tracking-[0.2em]", children: [_jsx(Award, { className: "w-4 h-4" }), " Performance"] }), _jsxs("div", { className: "text-4xl font-bold tracking-tighter mb-1", children: [columns.New.length + columns['No Reply'].length > 0
                                                                        ? Math.round((columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) * 100)
                                                                        : 0, "%"] }), _jsx("p", { className: "text-indigo-100 text-xs font-medium", children: "Negotiations Rate" }), _jsxs("div", { className: "mt-6 pt-4 border-t border-white/10 flex items-center justify-between", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-sm font-bold", children: (() => {
                                                                                    const newLeads = columns.New;
                                                                                    const negotiationLeads = columns.Negotiations;
                                                                                    if (newLeads.length === 0 || negotiationLeads.length === 0)
                                                                                        return 'N/A';
                                                                                    const totalDays = newLeads.reduce((sum, lead) => {
                                                                                        if (lead.createdAt) {
                                                                                            const createdDate = new Date(lead.createdAt);
                                                                                            const today = new Date();
                                                                                            return sum + Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                                                                                        }
                                                                                        return sum;
                                                                                    }, 0);
                                                                                    return newLeads.length > 0 ? (totalDays / newLeads.length).toFixed(1) + 'd' : 'N/A';
                                                                                })() }), _jsx("div", { className: "text-[9px] opacity-70 uppercase", children: "First Reply" })] }), _jsx("div", { className: "w-px h-6 bg-white/10" }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "text-sm font-bold", children: [columns.New.length + columns['No Reply'].length > 0
                                                                                        ? Math.round((columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) * 100)
                                                                                        : 0, "%"] }), _jsx("div", { className: "text-[9px] opacity-70 uppercase", children: "CTR" })] })] })] }), _jsxs(GlassCard, { className: "p-6", children: [_jsx("h4", { className: "text-xs font-bold text-slate-400 uppercase tracking-widest mb-4", children: "Pipeline Health Summary" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-sm font-medium text-slate-600", children: "Fresh Momentum" }), _jsx("span", { className: `text-sm font-bold ${columns.New.length > 0 ?
                                                                                    (columns.Converted.length / columns.New.length) >= 1 ? 'text-emerald-500' : 'text-amber-500'
                                                                                    : 'text-slate-400'}`, children: columns.New.length > 0 ?
                                                                                    (columns.Converted.length / columns.New.length) >= 1 ? 'Strong' : 'Weak'
                                                                                    : 'N/A' })] }), _jsx("div", { className: "w-full h-1.5 bg-slate-100 rounded-full", children: _jsx("div", { className: `h-full rounded-full ${columns.New.length > 0 ?
                                                                                (columns.Converted.length / columns.New.length) >= 1 ? 'bg-emerald-500' : 'bg-amber-500'
                                                                                : 'bg-slate-200'}`, style: {
                                                                                width: columns.New.length > 0 ?
                                                                                    Math.min((columns.Converted.length / columns.New.length) * 100, 100) + '%'
                                                                                    : '0%'
                                                                            } }) }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-sm font-medium text-slate-600", children: "Reply Consistency" }), _jsx("span", { className: `text-sm font-bold ${columns.New.length + columns['No Reply'].length > 0 ?
                                                                                    (columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) >= 0.5 ? 'text-emerald-500' : 'text-amber-500'
                                                                                    : 'text-slate-400'}`, children: columns.New.length + columns['No Reply'].length > 0 ?
                                                                                    (columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) >= 0.5 ? 'Strong' : 'Weak'
                                                                                    : 'N/A' })] }), _jsx("div", { className: "w-full h-1.5 bg-slate-100 rounded-full", children: _jsx("div", { className: `h-full rounded-full ${columns.New.length + columns['No Reply'].length > 0 ?
                                                                                (columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) >= 0.5 ? 'bg-emerald-500' : 'bg-amber-500'
                                                                                : 'bg-slate-200'}`, style: {
                                                                                width: columns.New.length + columns['No Reply'].length > 0 ?
                                                                                    Math.min((columns.Negotiations.length / (columns.New.length + columns['No Reply'].length)) * 100, 100) + '%'
                                                                                    : '0%'
                                                                            } }) })] })] })] }), _jsxs(GlassCard, { className: "lg:col-span-3 p-8 h-[380px] flex flex-col", children: [_jsx("div", { className: "flex justify-between items-center mb-8", children: _jsxs("div", { children: [_jsxs("h3", { className: "font-bold text-slate-800 flex items-center gap-2", children: [_jsx(MessageSquare, { className: "w-4 h-4 text-rose-500" }), " Outreach Intensity & Yield"] }), _jsx("p", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1", children: "Correlation of Daily Touches to Converted Interest" })] }) }), _jsx("div", { className: "flex-1", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(ComposedChart, { data: intensityData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#f1f5f9" }), _jsx(XAxis, { dataKey: "day", axisLine: false, tickLine: false, tick: { fill: '#94a3b8', fontSize: 11, fontWeight: 700 } }), _jsx(YAxis, { axisLine: false, tickLine: false, tick: { fill: '#cbd5e1', fontSize: 10 } }), _jsx(Tooltip, { contentStyle: { borderRadius: '12px', border: 'none' } }), _jsx(Area, { type: "monotone", dataKey: "touches", name: "Total Touches", stroke: "#6366f1", fill: "#6366f1", fillOpacity: 0.05, strokeWidth: 2 }), _jsx(Line, { type: "stepAfter", dataKey: "conversions", name: "Interest Signal", stroke: "#10b981", strokeWidth: 3, dot: { r: 4, fill: '#10b981' } })] }) }) })] })] })] }))] }), showAddLeadModal && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4", onClick: () => setShowAddLeadModal(false), children: _jsxs(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.8, opacity: 0 }, transition: {
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                duration: 0.4
                            }, onClick: (e) => e.stopPropagation(), className: "bg-white rounded-lg sm:rounded-xl border border-slate-200 max-w-md w-full p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center", children: _jsx(UserPlus, { className: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-indigo-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Add New Lead" }), _jsx("p", { className: "text-sm text-slate-500", children: "Create a new lead to track" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Business Name *" }), _jsx("input", { type: "text", value: newLeadName, onChange: (e) => setNewLeadName(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Enter business name" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Website" }), _jsx("input", { type: "text", value: newLeadWebsite, onChange: (e) => setNewLeadWebsite(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Enter website URL" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Email" }), _jsx("input", { type: "email", value: newLeadEmail, onChange: (e) => setNewLeadEmail(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Enter email address" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Phone" }), _jsx("input", { type: "tel", value: newLeadPhone, onChange: (e) => setNewLeadPhone(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Enter phone number" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Description" }), _jsx("textarea", { value: newLeadDescription, onChange: (e) => setNewLeadDescription(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none", rows: 3, placeholder: "Enter business description" })] }), _jsxs("div", { className: "border-t border-slate-200 pt-4 mt-4", children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-3", children: "Social Media" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-600 mb-1", children: "Twitter" }), _jsx("input", { type: "text", value: newLeadTwitter, onChange: (e) => setNewLeadTwitter(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "@username" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-600 mb-1", children: "Instagram" }), _jsx("input", { type: "text", value: newLeadInstagram, onChange: (e) => setNewLeadInstagram(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "@username" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-600 mb-1", children: "TikTok" }), _jsx("input", { type: "text", value: newLeadTiktok, onChange: (e) => setNewLeadTiktok(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "@username" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-600 mb-1", children: "LinkedIn" }), _jsx("input", { type: "text", value: newLeadLinkedin, onChange: (e) => setNewLeadLinkedin(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Profile URL or username" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-600 mb-1", children: "Telegram" }), _jsx("input", { type: "text", value: newLeadTelegram, onChange: (e) => setNewLeadTelegram(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "@username" })] })] })] })] }), _jsxs("div", { className: "flex gap-3 mt-6 justify-end", children: [_jsx("button", { onClick: () => {
                                                setShowAddLeadModal(false);
                                                setNewLeadName('');
                                                setNewLeadWebsite('');
                                                setNewLeadEmail('');
                                                setNewLeadPhone('');
                                                setNewLeadDescription('');
                                                setNewLeadTwitter('');
                                                setNewLeadInstagram('');
                                                setNewLeadTiktok('');
                                                setNewLeadLinkedin('');
                                                setNewLeadTelegram('');
                                            }, className: "px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors", children: "Cancel" }), _jsxs("button", { onClick: handleAddLead, className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2", children: [_jsx(PlusCircle, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" }), "Add Lead"] })] })] }) })), deleteConfirmId && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onClick: () => setDeleteConfirmId(null), children: _jsxs(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.8, opacity: 0 }, transition: {
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                duration: 0.4
                            }, onClick: (e) => e.stopPropagation(), className: "bg-white rounded-xl border border-slate-200 max-w-md w-full p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center", children: _jsx(AlertTriangle, { className: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-rose-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Delete Lead" }), _jsx("p", { className: "text-sm text-slate-500", children: "This action cannot be undone" })] })] }), _jsx("p", { className: "text-slate-600 mb-6", children: "Are you sure you want to delete this lead? This will permanently remove lead and all associated data." }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx("button", { onClick: () => setDeleteConfirmId(null), disabled: isDeleting, className: "px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50", children: "Cancel" }), _jsx("button", { onClick: () => handleDeleteLead(deleteConfirmId), disabled: isDeleting, className: "px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50", children: isDeleting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 animate-spin" }), "Deleting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Trash2, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" }), "Delete Lead"] })) })] })] }) }))] }), _jsx(SuccessNotification, { isVisible: showSuccessNotification, message: successMessage, onClose: () => setShowSuccessNotification(false) })] }));
};
export default Leads;
