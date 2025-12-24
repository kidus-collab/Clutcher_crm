import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { PIPELINE_STAGES } from '../constants';
import GlassCard from './ui/GlassCard';
import { KanbanSquare, ListTree, MoreVertical, Plus, X, Check, Calendar, DollarSign, Building2, Mail, Phone, ArrowRight, Clock, RotateCcw, Archive } from 'lucide-react';
import { getOffers, getActivities, logActivity, getConsolidatedDeals, syncConsolidatedDeals, createDirectDeal, getLeads, getClosedLeads, supabase, addClosedLead } from '../lib/database/supabase';
const Pipeline = () => {
    const [viewMode, setViewMode] = useState('board');
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [deals, setDeals] = useState([]);
    const [offers, setOffers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    // New Deal Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newDealTitle, setNewDealTitle] = useState('');
    const [newDealCompany, setNewDealCompany] = useState('');
    const [newDealValue, setNewDealValue] = useState('');
    const [newDealStage, setNewDealStage] = useState('New');
    const [newDealProbability, setNewDealProbability] = useState(10);
    const [availableLeads, setAvailableLeads] = useState([]);
    // Forex & Currency State
    const [currency, setCurrency] = useState('USD');
    const [exchangeRate, setExchangeRate] = useState(120); // Default fallback
    const [rateLoading, setRateLoading] = useState(false);
    // Generate estimated close date (date.now + 1 day)
    const generateEstCloseDate = (createdAt) => {
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + 1);
        return estDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    // Get next step based on deal stage
    const getNextStep = (stage) => {
        switch (stage) {
            case 'Qualified': return 'Cold Approach lead';
            case 'Contacted': return 'Followup Proposal';
            case 'Proposal': return 'Follow up until close';
            case 'Won': return 'Revisit win in Closed leads archive';
            default: return 'Follow up on proposal';
        }
    };
    // Fetch exchange rate
    const fetchExchangeRate = async () => {
        setRateLoading(true);
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            if (data && data.rates && data.rates.ETB) {
                setExchangeRate(data.rates.ETB);
            }
        }
        catch (e) {
            console.error("Failed to fetch rates, using fallback", e);
        }
        finally {
            setRateLoading(false);
        }
    };
    // Fetch available leads for new deal creation
    const fetchAvailableLeads = async () => {
        const leads = await getLeads();
        // Filter leads that don't already have deals
        const leadsWithoutDeals = leads.filter(lead => !deals.some(deal => deal.leadId === lead.id));
        setAvailableLeads(leadsWithoutDeals);
    };
    // Handle currency toggle with value conversion
    const toggleCurrency = (newCurrency) => {
        if (newCurrency === currency)
            return;
        const rate = exchangeRate || 1;
        // Convert new deal value if it exists
        if (newDealValue) {
            const numVal = parseFloat(newDealValue);
            if (!isNaN(numVal)) {
                if (newCurrency === 'ETB') {
                    // USD -> ETB
                    setNewDealValue((numVal * rate).toFixed(2));
                }
                else {
                    // ETB -> USD
                    setNewDealValue((numVal / rate).toFixed(2));
                }
            }
        }
        setCurrency(newCurrency);
    };
    // Get display value based on currency
    const getDisplayValue = (value) => {
        if (currency === 'ETB') {
            return (value * exchangeRate).toFixed(2);
        }
        return value.toString();
    };
    // Get value for saving (always in USD)
    const getValueForSave = () => {
        const numVal = parseFloat(newDealValue);
        if (isNaN(numVal))
            return 0;
        // If current mode is ETB, convert back to USD
        if (currency === 'ETB') {
            return Math.round(numVal / exchangeRate);
        }
        return Math.round(numVal);
    };
    // Create new deal
    const handleCreateDeal = async () => {
        if (!newDealTitle || !newDealCompany || !newDealValue)
            return;
        try {
            const valueUSD = getValueForSave();
            // Create direct deal in database
            const deal = await createDirectDeal(newDealTitle, newDealCompany, valueUSD, newDealStage, newDealProbability);
            if (deal) {
                // Refresh deals
                const fetchData = async () => {
                    setLoading(true);
                    try {
                        const consolidatedDealsData = await getConsolidatedDeals();
                        const offersData = await getOffers();
                        const activitiesData = await getActivities(20);
                        setDeals(consolidatedDealsData);
                        setOffers(offersData);
                        setActivities(activitiesData);
                    }
                    catch (error) {
                        console.error('Error fetching pipeline data:', error);
                    }
                    finally {
                        setLoading(false);
                    }
                };
                fetchData();
                // Reset form and close modal
                setShowCreateModal(false);
                setNewDealTitle('');
                setNewDealCompany('');
                setNewDealValue('');
                setNewDealStage('New');
                setNewDealProbability(10);
            }
        }
        catch (error) {
            console.error('Error creating deal:', error);
        }
    };
    // Archive deal to closed_leads and mark as Won
    const handleArchiveDeal = async (deal) => {
        if (!deal.leadId) {
            console.error('Cannot archive deal: no leadId found');
            return;
        }
        try {
            // Calculate duration from lead creation to now
            const leadData = await getLeadById(deal.leadId);
            let duration = 0;
            if (leadData?.createdAt) {
                duration = Math.ceil((new Date().getTime() - new Date(leadData.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            }
            // Add to closed_leads table
            const archiveSuccess = await addClosedLead(deal.leadId, deal.company, duration, leadData?.rating || 0, deal.value || 0, 'Converted');
            if (archiveSuccess) {
                // Update the deal stage to 'Won' in offers table if it exists there
                if (deal.id.startsWith('offer_')) {
                    const offerId = deal.id.replace('offer_', '');
                    if (supabase) {
                        await supabase
                            .from('offers')
                            .update({ stage: 'Won' })
                            .eq('id', offerId);
                    }
                }
                // Refresh data
                const fetchData = async () => {
                    setLoading(true);
                    try {
                        const consolidatedDealsData = await getConsolidatedDeals();
                        const offersData = await getOffers();
                        const activitiesData = await getActivities(20);
                        setDeals(consolidatedDealsData);
                        setOffers(offersData);
                        setActivities(activitiesData);
                    }
                    catch (error) {
                        console.error('Error fetching pipeline data:', error);
                    }
                    finally {
                        setLoading(false);
                    }
                };
                fetchData();
            }
        }
        catch (error) {
            console.error('Error archiving deal:', error);
        }
    };
    // Helper function to get lead by ID
    const getLeadById = async (leadId) => {
        if (!supabase)
            return null;
        const { data, error } = await supabase
            .from('leads')
            .select(`
        *,
        businesses (*)
      `)
            .eq('id', leadId)
            .single();
        if (error || !data) {
            console.error('Error fetching lead:', error);
            return null;
        }
        return {
            ...data,
            business: data.businesses || {}
        };
    };
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Use consolidated deals function that pulls from multiple sources
                const consolidatedDealsData = await getConsolidatedDeals();
                const offersData = await getOffers();
                const activitiesData = await getActivities(20);
                // Also fetch closed leads to show in Won stage
                const closedLeadsData = await getClosedLeads();
                // Transform closed leads to deal format for Won stage
                const archivedDeals = closedLeadsData
                    .filter(lead => lead.outcome === 'Converted') // Only show successfully archived leads
                    .map(lead => ({
                    id: `closed_${lead.id}`, // Prefix to avoid ID conflicts
                    leadId: lead.id,
                    title: `Archived: ${lead.business.name}`,
                    company: lead.business.name,
                    value: lead.pipelineValue || lead.estimatedValue || 0,
                    stage: 'Won',
                    lastContact: lead.lastContact || lead.createdAt,
                    probability: 100, // Archived leads are 100% successful
                    originalLead: lead
                }));
                // Combine consolidated deals and archived leads
                const allDeals = [...consolidatedDealsData, ...archivedDeals];
                console.log(`Pipeline: Fetched ${allDeals.length} total deals (${consolidatedDealsData.length} consolidated + ${archivedDeals.length} archived)`);
                console.log('Consolidated deals breakdown:', {
                    new: consolidatedDealsData.filter(d => d.stage === 'New').length,
                    qualified: consolidatedDealsData.filter(d => d.stage === 'Qualified').length,
                    contacted: consolidatedDealsData.filter(d => d.stage === 'Contacted').length,
                    proposal: consolidatedDealsData.filter(d => d.stage === 'Proposal').length,
                    won: archivedDeals.length
                });
                setDeals(allDeals);
                setOffers(offersData);
                setActivities(activitiesData);
                // Fetch available leads for new deal creation
                await fetchAvailableLeads();
                // Fetch exchange rate
                await fetchExchangeRate();
            }
            catch (error) {
                console.error('Error fetching pipeline data:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    // Helper to format stage names for display
    const formatStageName = (stage) => {
        switch (stage) {
            case 'New': return 'Qualified';
            case 'Qualified': return 'Contacted (Outreach)';
            case 'Proposal': return 'Proposal (Follow up)';
            case 'Won': return 'Won / Closed';
            default: return stage;
        }
    };
    return (_jsxs("div", { className: "h-[calc(100vh-theme(spacing.20))] flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden relative", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start md:items-center mb-3 sm:mb-4 shrink-0 z-10 gap-3 sm:gap-4", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h1", { className: "text-xl sm:text-2xl font-bold text-slate-800 tracking-tight", children: "Pipeline" }), _jsx("p", { className: "text-slate-400 text-xs sm:text-sm italic font-light mt-1", children: "Visual representation of the whole CRM pipeline" }), _jsxs("p", { className: "text-slate-500 text-[10px] sm:text-xs font-medium mt-1", children: [_jsxs("span", { className: "text-indigo-600", children: [offers.length, " active deals"] }), " with total value of ", _jsxs("span", { className: "text-slate-700 font-semibold", children: [currency === 'ETB' ? 'Br' : '$', currency === 'ETB' ? getDisplayValue(offers.reduce((acc, curr) => acc + (curr.value || 0), 0)) : offers.reduce((acc, curr) => acc + (curr.value || 0), 0).toLocaleString()] })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:space-x-3 flex-shrink-0", children: [_jsxs("div", { className: "bg-white p-1 rounded-lg sm:rounded-xl flex gap-1 sm:space-x-1 border border-slate-200", children: [_jsxs("button", { onClick: () => setViewMode('board'), className: `p-1 sm:p-1.5 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${viewMode === 'board' ? 'bg-slate-100 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`, children: [_jsx(KanbanSquare, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4", strokeWidth: 2.5 }), _jsx("span", { className: "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider", children: "Board" })] }), _jsxs("button", { onClick: () => setViewMode('timeline'), className: `p-1 sm:p-1.5 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${viewMode === 'timeline' ? 'bg-slate-100 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`, children: [_jsx(ListTree, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4", strokeWidth: 2.5 }), _jsx("span", { className: "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider", children: "Timeline" })] })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "bg-slate-900 hover:bg-slate-800 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center border border-slate-700 whitespace-nowrap", children: [_jsx(Plus, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-1.5", strokeWidth: 2.5 }), " ", _jsx("span", { children: "New Deal" })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:space-x-3 flex-shrink-0", children: [_jsxs("div", { className: "bg-white p-1 rounded-lg border border-slate-200 flex items-center mx-auto", children: [_jsx("button", { onClick: () => toggleCurrency('USD'), className: `px-3 py-1 rounded-lg text-xs font-bold transition-all ${currency === 'USD' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`, children: "$" }), _jsx("button", { onClick: () => toggleCurrency('ETB'), className: `px-3 py-1 rounded-lg text-xs font-bold transition-all ${currency === 'ETB' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`, children: "Br" })] }), _jsxs("button", { onClick: async () => {
                                    setLoading(true);
                                    try {
                                        const success = await syncConsolidatedDeals();
                                        if (success) {
                                            // Refresh the data
                                            const fetchData = async () => {
                                                setLoading(true);
                                                try {
                                                    const consolidatedDealsData = await getConsolidatedDeals();
                                                    const offersData = await getOffers();
                                                    const activitiesData = await getActivities(20);
                                                    console.log(`Pipeline: Fetched ${consolidatedDealsData.length} consolidated deals from multiple sources`);
                                                    console.log('Consolidated deals breakdown:', {
                                                        new: consolidatedDealsData.filter(d => d.stage === 'New').length,
                                                        qualified: consolidatedDealsData.filter(d => d.stage === 'Qualified').length,
                                                        contacted: consolidatedDealsData.filter(d => d.stage === 'Contacted').length,
                                                        proposal: consolidatedDealsData.filter(d => d.stage === 'Proposal').length
                                                    });
                                                    setDeals(consolidatedDealsData);
                                                    setOffers(offersData);
                                                    setActivities(activitiesData);
                                                }
                                                catch (error) {
                                                    console.error('Error fetching pipeline data:', error);
                                                }
                                                finally {
                                                    setLoading(false);
                                                }
                                            };
                                            fetchData();
                                        }
                                    }
                                    catch (error) {
                                        console.error('Error syncing deals:', error);
                                    }
                                    finally {
                                        setLoading(false);
                                    }
                                }, className: "bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center border border-indigo-600 whitespace-nowrap ml-2", title: "Sync Deals: Synchronizes data from leads, outreach tracking, and follow-up tasks into the deals table. This ensures all pipeline data is consolidated and up-to-date.", children: [_jsx(RotateCcw, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-1.5", strokeWidth: 2.5 }), " ", _jsx("span", { children: "Sync Deals" })] })] })] }), _jsx("div", { className: "flex-1 overflow-x-auto overflow-y-hidden pb-4 z-0", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "text-center text-slate-400", children: "Loading pipeline data..." }) })) : viewMode === 'board' ? (
                /* KANBAN BOARD */
                _jsx("div", { className: "flex gap-2 sm:gap-4 h-full min-w-max px-1 sm:px-2", children: PIPELINE_STAGES.filter(stage => stage !== 'Contacted').map((stage) => {
                        const stageDeals = deals.filter(d => d.stage === stage);
                        const stageValue = stageDeals.reduce((acc, val) => acc + (val.value || 0), 0);
                        return (_jsxs("div", { className: "w-[240px] sm:w-[280px] flex flex-col h-full group", children: [_jsxs("div", { className: "flex justify-between items-center mb-2 sm:mb-3 px-1 sticky top-0 bg-transparent", children: [_jsxs("div", { children: [_jsxs("span", { className: "text-[10px] sm:text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2", children: [_jsx("div", { className: `w-1.5 h-1.5 rounded-full ${stageDeals.length > 0 ? 'bg-indigo-500' : 'bg-slate-300'}` }), formatStageName(stage)] }), stage === 'Won' && (_jsxs("div", { className: "text-[8px] sm:text-[9px] text-slate-400 font-bold ml-2.5 sm:ml-3.5 mt-0.5", children: ["$", stageValue.toLocaleString()] }))] }), _jsx("span", { className: "text-[9px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 sm:px-2 py-0.5 rounded-full", children: stageDeals.length })] }), _jsxs("div", { className: "flex-1 overflow-y-auto pr-1 sm:pr-1.5 space-y-2 sm:space-y-2.5 pb-16 sm:pb-20 scrollbar-hide", children: [stageDeals.map((deal) => (_jsxs(GlassCard, { className: "p-3 sm:p-4 group/card relative border-l-4 border-l-transparent hover:border-l-indigo-500 transition-all shadow-sm", onClick: () => setSelectedDeal(deal), children: [_jsxs("div", { className: "flex justify-between items-start mb-2 sm:mb-3", children: [_jsx("span", { className: "text-[9px] sm:text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-wider", children: deal.company }), _jsx(MoreVertical, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-slate-300 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer hover:text-indigo-600" })] }), _jsx("h4", { className: "font-bold text-slate-800 text-xs sm:text-sm mb-0.5 leading-snug truncate", children: deal.title }), stage === 'Won' && (_jsxs("div", { className: "text-sm sm:text-base font-bold text-slate-700 mb-2 sm:mb-3 tracking-tight flex items-baseline gap-0.5", children: [_jsx("span", { className: "text-[9px] sm:text-[10px] text-slate-400 font-normal", children: "$" }), currency === 'ETB' ? getDisplayValue(deal.value) : deal.value.toLocaleString(), currency === 'ETB' && _jsx("span", { className: "text-[9px] sm:text-[10px] text-slate-400 font-normal", children: " Br" })] })), _jsxs("div", { className: "flex justify-between items-center border-t border-slate-100/50 pt-2 sm:pt-2.5 mt-auto", children: [stage !== 'Won' && (_jsx("div", { className: "flex items-center gap-1.5 sm:space-x-2", children: _jsxs("span", { className: "text-[9px] sm:text-[10px] text-slate-500 font-bold", children: [deal.probability, "% Prob."] }) })), _jsxs("span", { className: "text-[8px] sm:text-[9px] text-slate-400 font-bold bg-slate-100/50 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-1", children: [_jsx(Clock, { className: "w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3" }), " ", deal.lastContact] })] })] }, deal.id))), stageDeals.length === 0 && (_jsxs("div", { className: "h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center", children: _jsx(Plus, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-slate-300" }) }), _jsx("span", { className: "text-xs font-medium", children: "No deals here" })] }))] })] }, stage));
                    }) })) : (
                /* TIMELINE VIEW (JOURNEY) */
                _jsxs("div", { className: "h-full overflow-y-auto px-3 sm:px-4 lg:px-10 relative max-w-5xl mx-auto pb-16 sm:pb-20 scrollbar-hide", children: [_jsx("div", { className: "absolute left-6 sm:left-8 lg:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-200 to-transparent transform lg:-translate-x-1/2" }), _jsx("div", { className: "space-y-12 sm:space-y-16 py-6 sm:py-10", children: PIPELINE_STAGES.filter(stage => stage !== 'Contacted').map((stage, idx) => {
                                const stageDeals = deals.filter(d => d.stage === stage);
                                const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                                return (_jsxs("div", { className: `flex items-start relative ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} flex-row`, children: [_jsx("div", { className: "absolute left-6 sm:left-8 lg:left-1/2 top-6 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full border-[2px] sm:border-[3px] border-indigo-500 transform -translate-x-1/2 z-10 flex items-center justify-center", children: _jsx("div", { className: "w-0.5 h-0.5 sm:w-1 sm:h-1 md:w-1.5 md:h-1.5 lg:w-2 lg:h-2 bg-indigo-500 rounded-full" }) }), _jsx("div", { className: "hidden lg:block w-1/2" }), _jsx("div", { className: `w-full pl-16 sm:pl-20 lg:pl-0 lg:w-1/2 ${idx % 2 === 0 ? 'lg:pr-16' : 'lg:pl-16'}`, children: _jsxs(GlassCard, { className: "p-0 overflow-hidden group shadow-sm", children: [_jsxs("div", { className: "p-4 sm:p-6 border-b border-slate-200 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("h3", { className: "text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2", children: [formatStageName(stage), _jsxs("span", { className: "px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide font-semibold", children: ["Stage ", idx + 1] })] }), _jsxs("span", { className: "text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full", children: [stageDeals.length, " Deals"] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-4 text-xs text-slate-500", children: [_jsxs("span", { className: "flex items-center gap-1", children: [currency === 'ETB' ? 'Br' : _jsx(DollarSign, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3" }), " ", currency === 'ETB' ? getDisplayValue(totalValue) : totalValue.toLocaleString(), " Value"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3" }), " Avg. 12 days"] })] })] }), _jsx("div", { className: "p-1.5 sm:p-2 bg-slate-50", children: stageDeals.length > 0 ? (_jsx("div", { className: "space-y-1", children: stageDeals.slice(0, 3).map(deal => (_jsxs("div", { onClick: () => setSelectedDeal(deal), className: "flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group/item border border-transparent hover:border-slate-200 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-1.5 sm:space-x-3", children: [_jsx("div", { className: "w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600", children: deal.company.substring(0, 1) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs sm:text-sm text-slate-700 font-semibold truncate", children: deal.title }), _jsx("p", { className: "text-[9px] sm:text-xs text-slate-400", children: deal.company })] })] }), _jsxs("div", { className: "text-right", children: [stage === 'Won' && (_jsxs("span", { className: "block text-xs sm:text-sm font-medium text-slate-700", children: [currency === 'ETB' ? 'Br' : '$', currency === 'ETB' ? getDisplayValue(deal.value) : deal.value.toLocaleString()] })), _jsx("span", { className: "text-[9px] sm:text-[10px] text-slate-400", children: deal.lastContact })] })] }, deal.id))) })) : (_jsx("div", { className: "p-6 text-center", children: _jsx("p", { className: "text-sm text-slate-400 font-light", children: "No deals active in this stage." }) })) })] }) })] }, stage));
                            }) })] })) }), showCreateModal && (_jsxs("div", { className: "fixed inset-0 z-[100] flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-slate-900/20 transition-opacity", onClick: () => setShowCreateModal(false) }), _jsxs("div", { className: "relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 m-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Create New Deal" }), _jsx("p", { className: "text-sm text-slate-500 mt-1", children: "Add a new deal directly to the pipeline" })] }), _jsx("button", { onClick: () => setShowCreateModal(false), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Deal Title" }), _jsx("input", { type: "text", value: newDealTitle, onChange: (e) => setNewDealTitle(e.target.value), className: "w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "Enter deal title" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Company Name" }), _jsx("input", { type: "text", value: newDealCompany, onChange: (e) => setNewDealCompany(e.target.value), className: "w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "Enter company name" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Deal Value" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", value: newDealValue, onChange: (e) => setNewDealValue(e.target.value), className: "flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "Enter deal value" }), _jsxs("select", { value: currency, onChange: (e) => toggleCurrency(e.target.value), className: "px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent", children: [_jsx("option", { value: "USD", children: "USD" }), _jsx("option", { value: "ETB", children: "ETB" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Stage" }), _jsxs("select", { value: newDealStage, onChange: (e) => setNewDealStage(e.target.value), className: "w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent", children: [_jsx("option", { value: "New", children: "New" }), _jsx("option", { value: "Qualified", children: "Qualified" }), _jsx("option", { value: "Contacted", children: "Contacted" }), _jsx("option", { value: "Proposal", children: "Proposal" }), _jsx("option", { value: "Won", children: "Won" }), _jsx("option", { value: "Lost", children: "Lost" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx("button", { onClick: () => setShowCreateModal(false), className: "px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleCreateDeal, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors", children: "Create Deal" })] })] })] })), selectedDeal && (_jsxs("div", { className: "fixed inset-0 z-[100] flex justify-end", children: [_jsx("div", { className: "absolute inset-0 bg-slate-900/20 transition-opacity", onClick: () => setSelectedDeal(null) }), _jsxs("div", { className: "relative w-full max-w-2xl bg-white h-full shadow-xl border-l border-slate-200 animate-slide-in-right overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-white border-b border-slate-200 z-20 px-8 py-6", children: [_jsxs("div", { className: "flex justify-between items-start mb-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-slate-800 leading-tight", children: selectedDeal.title }), _jsxs("div", { className: "flex items-center gap-2 mt-1 text-slate-500 text-sm", children: [_jsx(Building2, { className: "w-4 h-4" }), _jsx("span", { children: selectedDeal.company }), _jsx("span", { className: "w-1 h-1 bg-slate-300 rounded-full mx-1" }), _jsx("span", { className: "text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-xs", children: "Active" })] })] }), _jsx("button", { onClick: () => setSelectedDeal(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" }) })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute top-3 left-0 right-0 h-0.5 bg-slate-100 rounded", children: _jsx("div", { className: "h-full bg-indigo-500 rounded transition-all duration-500", style: {
                                                        width: `${(PIPELINE_STAGES.indexOf(selectedDeal.stage) / (PIPELINE_STAGES.length - 1)) * 100}%`
                                                    } }) }), _jsx("div", { className: "relative flex justify-between", children: PIPELINE_STAGES.map((stage, i) => {
                                                    const currentStageIndex = PIPELINE_STAGES.indexOf(selectedDeal.stage);
                                                    const isCompleted = i < currentStageIndex;
                                                    const isCurrent = i === currentStageIndex;
                                                    return (_jsxs("div", { className: "flex flex-col items-center group", children: [_jsxs("div", { className: `
                              w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300
                              ${isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' :
                                                                    isCurrent ? 'bg-white border-indigo-500 scale-110' :
                                                                        'bg-white border-slate-200 text-slate-300'}
                            `, children: [isCompleted && _jsx(Check, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5", strokeWidth: 3 }), isCurrent && _jsx("div", { className: "w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3 bg-indigo-500 rounded-full animate-pulse" })] }), _jsx("span", { className: `
                              mt-2 text-[10px] uppercase font-bold tracking-wider transition-colors max-w-[60px] text-center leading-tight
                              ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-600' : 'text-slate-300'}
                            `, children: formatStageName(stage) })] }, stage));
                                                }) })] })] }), _jsxs("div", { className: "p-8 space-y-8", children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center", children: [_jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-1", children: "Deal Value" }), _jsxs("span", { className: "text-xl font-bold text-slate-800", children: ["$", currency === 'ETB' ? getDisplayValue(selectedDeal.value || 0) : (selectedDeal.value || 0).toLocaleString(), currency === 'ETB' && _jsx("span", { className: "text-sm text-slate-400", children: " Br" })] })] }), _jsxs("div", { className: "p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center", children: [_jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-1", children: "Probability" }), _jsxs("span", { className: "text-xl font-bold text-slate-800", children: [selectedDeal.probability || 0, "%"] })] }), _jsxs("div", { className: "p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center", children: [_jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-1", children: "Est. Close" }), _jsx("span", { className: "text-xl font-bold text-slate-800", children: generateEstCloseDate(selectedDeal.createdAt) })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-8", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-bold text-slate-800 mb-4 flex items-center gap-2", children: [_jsx(Building2, { className: "w-4 h-4 text-indigo-500" }), " Actions"] }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsxs("button", { onClick: async () => {
                                                                            if (selectedDeal?.leadId) {
                                                                                await logActivity('email', `Email sent to ${selectedDeal.lead?.business?.name || selectedDeal.company}`, selectedDeal.leadId);
                                                                                // Refresh activities
                                                                                const updatedActivities = await getActivities(20);
                                                                                setActivities(updatedActivities);
                                                                            }
                                                                        }, className: "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors", children: [_jsx(Mail, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), " Email"] }), _jsxs("button", { onClick: async () => {
                                                                            if (selectedDeal?.leadId) {
                                                                                await logActivity('call', `Call with ${selectedDeal.lead?.business?.name || selectedDeal.company}`, selectedDeal.leadId);
                                                                                // Refresh activities
                                                                                const updatedActivities = await getActivities(20);
                                                                                setActivities(updatedActivities);
                                                                            }
                                                                        }, className: "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors", children: [_jsx(Phone, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), " Call"] }), selectedDeal.stage === 'Won' && (_jsxs("button", { onClick: () => handleArchiveDeal(selectedDeal), className: "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-600 hover:bg-emerald-100 transition-colors", children: [_jsx(Archive, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" }), " Archive to Closed Leads"] }))] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-bold text-slate-800 mb-4 flex items-center gap-2", children: [_jsx(Calendar, { className: "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-indigo-500" }), " Next Steps"] }), _jsx("div", { className: "space-y-3", children: _jsxs("div", { className: "flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200", children: [_jsx("div", { className: "mt-0.5 w-4 h-4 rounded-full border-2 border-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-800", children: getNextStep(selectedDeal.stage) }), _jsxs("p", { className: "text-xs text-slate-500 mt-1", children: ["Est. close: ", generateEstCloseDate(selectedDeal.createdAt)] })] })] }) })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs sm:text-sm font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2", children: [_jsx(Clock, { className: "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-indigo-500" }), " Activity Log"] }), _jsx("div", { className: "relative border-l border-slate-200 ml-1.5 sm:ml-2 space-y-4 sm:space-y-6 pl-4 sm:pl-6 pb-2", children: activities.length > 0 ? (activities
                                                            .filter(activity => selectedDeal.leadId && activity.description.includes(selectedDeal.lead?.business?.name || selectedDeal.company))
                                                            .slice(0, 5)
                                                            .map((activity, i) => {
                                                            const getActivityIcon = (type) => {
                                                                switch (type) {
                                                                    case 'email': return Mail;
                                                                    case 'call': return Phone;
                                                                    case 'meeting': return Calendar;
                                                                    default: return ArrowRight;
                                                                }
                                                            };
                                                            const getActivityColor = (type) => {
                                                                switch (type) {
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
                                                            return (_jsxs("div", { className: "relative", children: [_jsx("div", { className: `absolute -left-[28px] sm:-left-[33px] top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full ${bg} flex items-center justify-center border-3 sm:border-4 border-slate-50`, children: _jsx(Icon, { className: `w-2 h-2 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 ${color}` }) }), _jsx("p", { className: "text-xs sm:text-sm font-medium text-slate-800", children: activity.description }), _jsx("p", { className: "text-[9px] sm:text-xs text-slate-400 mt-0.5", children: timeAgo })] }, activity.id));
                                                        })) : (_jsxs("div", { className: "text-center text-slate-400 py-4", children: [_jsx("p", { className: "text-sm", children: "No activities logged yet" }), _jsx("p", { className: "text-xs mt-1", children: "Use action buttons above to log activities" })] })) })] })] })] })] })] }))] }));
};
export default Pipeline;
