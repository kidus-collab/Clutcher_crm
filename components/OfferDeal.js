import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import GlassCard from './ui/GlassCard';
import { FileSignature, Send, CheckCircle2, Briefcase, MoreHorizontal, Star, Mail, Linkedin, Twitter, Instagram, Facebook, Globe, Archive, RotateCcw, Trash2, MessageCircle, Loader2, PlusCircle } from 'lucide-react';
import { getOffers, updateOfferStage, deleteOffer, updateLeadStatus, getLeads, createOffer, supabase, createLeadFinancial } from '../lib/database/supabase';
const OfferDeal = () => {
    const [offerDeals, setOfferDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [notificationType, setNotificationType] = useState('success');
    const [inputValues, setInputValues] = useState({});
    // Forex & Currency State
    const [currency, setCurrency] = useState('USD');
    const [exchangeRate, setExchangeRate] = useState(120); // Default fallback
    const [rateLoading, setRateLoading] = useState(false);
    // State for UI interactions
    const [activeMenu, setActiveMenu] = useState(null);
    const [selectedChannels, setSelectedChannels] = useState({});
    const menuRef = useRef(null);
    // Create Offer Modal State
    const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
    const [newOfferTitle, setNewOfferTitle] = useState('');
    const [newOfferValue, setNewOfferValue] = useState('');
    const [newOfferStage, setNewOfferStage] = useState('Proposal');
    const [newOfferProbability, setNewOfferProbability] = useState(50);
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [availableLeads, setAvailableLeads] = useState([]);
    useEffect(() => {
        fetchOffers();
        fetchExchangeRate();
        fetchAvailableLeads();
        // Listen for storage events
        const handleStorageChange = (e) => {
            if (e.key === 'offersUpdated') {
                fetchOffers();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
    // Initialize inputValues when offers are loaded
    useEffect(() => {
        if (offerDeals.length > 0) {
            const initialValues = {};
            offerDeals.forEach(offer => {
                if (offer.value > 0) {
                    initialValues[offer.id] = currency === 'ETB'
                        ? (offer.value * exchangeRate).toFixed(2)
                        : offer.value.toString();
                }
            });
            setInputValues(initialValues);
            console.log('DEBUG: Initialized inputValues with:', initialValues);
        }
    }, [offerDeals, currency, exchangeRate]);
    const fetchAvailableLeads = async () => {
        const leads = await getLeads();
        // Filter leads that have 'Negotiations' status and don't already have offers
        const leadsWithoutOffers = leads.filter(lead => !offerDeals.some(offer => offer.leadId === lead.id) &&
            lead.status === 'Negotiations');
        setAvailableLeads(leadsWithoutOffers);
    };
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
    // ... (rest of useEffects)
    // ... inside OfferDeal component
    // Handle currency toggle with value conversion
    const toggleCurrency = (newCurrency) => {
        if (newCurrency === currency)
            return;
        const rate = exchangeRate || 1;
        const inputs = { ...inputValues };
        // Convert all existing input values
        Object.keys(inputs).forEach(key => {
            const val = parseFloat(inputs[key]);
            if (!isNaN(val)) {
                if (newCurrency === 'ETB') {
                    // USD -> ETB
                    inputs[key] = (val * rate).toFixed(2);
                }
                else {
                    // ETB -> USD
                    inputs[key] = (val / rate).toFixed(2);
                }
            }
        });
        setInputValues(inputs);
        setCurrency(newCurrency);
    };
    const fetchOffers = async () => {
        setLoading(true);
        try {
            const offers = await getOffers();
            // Show all offers regardless of stage
            const activeOffers = offers;
            const transformedOffers = activeOffers.map(offer => {
                const leadId = offer.leadId;
                const business = offer.lead?.business || {};
                const socials = business.socials || [];
                // --- NEW TUNED WIN PROBABILITY ---
                // Formula: (Time Efficiency + Good Fit + Interaction Quality) / 100
                // 1. Time Efficiency (Max 40)
                // Duration from Lead Creation to Offer Creation (Outreach Duration)
                const leadCreated = offer.lead?.createdAt ? new Date(offer.lead.createdAt).getTime() : new Date(offer.createdAt).getTime();
                const offerCreated = new Date(offer.createdAt).getTime();
                const outreachDurationHours = (offerCreated - leadCreated) / (1000 * 3600);
                // Decay: The lesser the hour, the higher the score.
                // Assume "Perfect" is < 24 hours. Lose points after that.
                // 40 points if < 24h. Lose 1 point per 6 hours after.
                // Drops to 0 after ~11 days (264 hours).
                const timeScore = Math.max(0, 40 - Math.max(0, (outreachDurationHours - 24) / 6));
                // 2. Good Fit / Outcome (Max 30) - Using badFitGoodFit from offers table
                const fitStatus = offer.badFitGoodFit || 'Pending';
                let outcomeScore = 0;
                if (fitStatus === 'Good Fit')
                    outcomeScore = 30;
                else if (fitStatus === 'Interested')
                    outcomeScore = 15;
                else if (fitStatus === 'Bad Fit')
                    outcomeScore = -10; // Penalty for bad fit
                // 3. Interaction Quality / Rating (Max 30) - Using logQualityRating from offers table
                const rating = offer.logQualityRating || 0;
                const ratingScore = (rating / 5) * 30;
                // Total Probability
                let probability = timeScore + outcomeScore + ratingScore;
                // Clamp and normalize
                probability = Math.min(99, Math.ceil(probability));
                // Ensure at least 5% if it exists
                probability = Math.max(5, probability);
                return {
                    id: offer.id,
                    company: business.name || 'Unknown Company',
                    title: offer.title,
                    value: offer.value || 0,
                    probability: probability,
                    leadId: leadId,
                    leadEmail: business.email || '',
                    leadPhone: business.phone || '',
                    leadRating: rating,
                    leadSocials: socials.map((social) => ({
                        platform: social.platform,
                        url: social.url
                    })),
                    leadWebsite: business.website || '',
                    originalLead: offer.lead
                };
            });
            setOfferDeals(transformedOffers);
        }
        catch (error) {
            console.error('Error fetching offers:', error);
            setOfferDeals([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleInputChange = (id, value) => {
        if (!/^\d*\.?\d*$/.test(value))
            return; // Allow decimals
        setInputValues(prev => ({ ...prev, [id]: value }));
    };
    const handleChannelSelect = (dealId, channel) => {
        setSelectedChannels(prev => ({ ...prev, [dealId]: channel }));
    };
    const handleArchive = async (deal) => {
        console.log('DEBUG: Starting archive process for:', deal.company, 'ID:', deal.id);
        // Archive to Closed Leads
        // User request: "if archive to close leads button is touched... Place the lead in converted column"
        // So we update status to 'Converted' instead of 'Closed'.
        // Calculate duration from when lead was added to when archived
        let duration = 0;
        if (deal.originalLead?.createdAt) {
            duration = Math.ceil((new Date().getTime() - new Date(deal.originalLead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        console.log('DEBUG: Calculated duration:', duration, 'days');
        console.log('DEBUG: Deal data for closed_leads:', {
            lead_id: deal.leadId,
            business_name: deal.company,
            duration: duration,
            rating: deal.leadRating || 0,
            pipeline_value: deal.value || 0,
            outcome: 'Converted'
        });
        // Add entry to closed_leads table FIRST
        if (deal.leadId) {
            try {
                console.log('DEBUG: Attempting to add to closed_leads table');
                const { data: closedData, error: closedError } = await supabase
                    .from('closed_leads')
                    .insert({
                    lead_id: deal.leadId,
                    business_name: deal.company,
                    duration: duration,
                    rating: deal.leadRating || 0,
                    pipeline_value: deal.value || 0,
                    outcome: 'Converted'
                });
                if (closedError) {
                    console.error('DEBUG: Failed to add to closed_leads:', closedError);
                    console.error('DEBUG: Error details:', JSON.stringify(closedError, null, 2));
                    setNotificationType('archive');
                    setNotification(`Failed to archive ${deal.company}: ${closedError.message}`);
                    setTimeout(() => setNotification(null), 5000);
                    return;
                }
                else {
                    console.log('DEBUG: Successfully added to closed_leads:', closedData);
                }
            }
            catch (error) {
                console.error('DEBUG: Exception during closed_leads insertion:', error);
                setNotificationType('archive');
                setNotification(`Failed to archive ${deal.company}: Exception occurred`);
                setTimeout(() => setNotification(null), 5000);
                return;
            }
            // Update lead status to Converted
            console.log('DEBUG: Updating lead status to Converted');
            const statusResult = await updateLeadStatus(deal.leadId, 'Converted');
            if (!statusResult.success) {
                console.error('DEBUG: Failed to update lead status:', statusResult.error);
            }
            else {
                console.log('DEBUG: Successfully updated lead status to Converted');
            }
        }
        // NOW DELETE FROM OFFERS TABLE - This is the key fix!
        console.log('DEBUG: Attempting to delete from offers table');
        const { data: deleteData, error: deleteError } = await supabase
            .from('offers')
            .delete()
            .eq('id', deal.id);
        if (deleteError) {
            console.error('DEBUG: Failed to delete from offers table:', deleteError);
            console.error('DEBUG: Delete error details:', JSON.stringify(deleteError, null, 2));
            setNotificationType('archive');
            setNotification(`Failed to remove from offers: ${deleteError.message}`);
            setTimeout(() => setNotification(null), 5000);
            return;
        }
        else {
            console.log('DEBUG: Successfully deleted from offers table:', deleteData);
        }
        // Update local state to remove the deal
        console.log('DEBUG: Removing deal from local state');
        setOfferDeals(prev => prev.filter(d => d.id !== deal.id));
        setNotificationType('archive');
        setNotification(`${deal.company} has been moved to Converted column and archived.`);
        setTimeout(() => setNotification(null), 4000);
    };
    const handleRestore = async (deal) => {
        // Move back to Pipeline (e.g. Contacted stage)
        const success = await updateOfferStage(deal.id, 'Contacted');
        if (success) {
            // Just update local state if we were filtering, but here we might keep it?
            // User code removed it. Let's assume 'Contacted' means it goes to the general pipeline and leaves this 'Offer' view if this view is only for 'Proposal'/'Qualified'.
            // If our DB query returns all, we might just update the stage.
            // But to match user behavior of "removing" from this view:
            setOfferDeals(prev => prev.filter(d => d.id !== deal.id));
            setNotificationType('success');
            setNotification(`${deal.company} restored to Pipeline.`);
            setTimeout(() => setNotification(null), 4000);
            setActiveMenu(null);
        }
    };
    const handleDelete = async (deal) => {
        const success = await deleteOffer(deal.id);
        if (success) {
            setOfferDeals(prev => prev.filter(d => d.id !== deal.id));
            setNotificationType('archive');
            setNotification(`${deal.company} deleted.`);
            setTimeout(() => setNotification(null), 4000);
            setActiveMenu(null);
        }
    };
    const getChannelIcon = (type) => {
        switch (type) {
            case 'email': return _jsx(Mail, { className: "w-4 h-4" });
            case 'linkedin': return _jsx(Linkedin, { className: "w-4 h-4" });
            case 'twitter': return _jsx(Twitter, { className: "w-4 h-4" });
            case 'instagram': return _jsx(Instagram, { className: "w-4 h-4" });
            case 'facebook': return _jsx(Facebook, { className: "w-4 h-4" });
            case 'message': return _jsx(MessageCircle, { className: "w-4 h-4" });
            case 'website': return _jsx(Globe, { className: "w-4 h-4" });
            default: return _jsx(Globe, { className: "w-4 h-4" });
        }
    };
    // Helper to get actual USD value for saving
    const getValueForSave = (deal) => {
        const inputVal = inputValues[deal.id];
        console.log('=== DEBUG getValueForSave START ===');
        console.log('deal.id:', deal.id);
        console.log('inputValues[deal.id]:', inputVal);
        console.log('deal.value (from DB):', deal.value);
        console.log('currency:', currency);
        console.log('exchangeRate:', exchangeRate);
        // If no input, use deal.value (which is USD)
        if (!inputVal) {
            console.log('No input value, using deal.value:', deal.value);
            console.log('=== DEBUG getValueForSave END ===');
            return deal.value;
        }
        const numVal = parseFloat(inputVal);
        console.log('Parsed numVal:', numVal);
        console.log('isNaN(numVal):', isNaN(numVal));
        // If current mode is ETB, convert back to USD
        let result;
        if (currency === 'ETB') {
            result = Math.round(numVal / exchangeRate);
            console.log('Converting ETB to USD:', numVal, '/', exchangeRate, '=', result);
        }
        else {
            result = Math.round(numVal);
            console.log('Using USD value directly:', result);
        }
        console.log('Final getValueForSave result:', result);
        console.log('=== DEBUG getValueForSave END ===');
        return result;
    };
    // Note: getDisplayValue is no longer needed in the same way if inputs are converted on toggle,
    // but we still need to initialize them or handle the default display.
    // Actually, standard input `value={inputValues[id]}` is enough if we initialize it.
    // But deals start with `deal.value` (USD).
    // On render, if `deal.value` exists and `inputValues` is empty, we show `deal.value` * rate.
    // So we might need to initialize `inputValues` on load? 
    // BETTER: Keep `getDisplayValue` but simpler.
    const getDisplayValue = (deal) => {
        if (inputValues[deal.id] !== undefined)
            return inputValues[deal.id];
        if (deal.value <= 0)
            return '';
        if (currency === 'ETB') {
            return (deal.value * exchangeRate).toFixed(2);
        }
        return deal.value.toString();
    };
    // ... (rest of handlers)
    const handleSendOffer = async (deal) => {
        console.log('=== DEBUG handleSendOffer START ===');
        console.log('Deal object:', JSON.stringify(deal, null, 2));
        const amountUSD = getValueForSave(deal);
        // Debug logging
        console.log('handleSendOffer called for deal:', deal.company);
        console.log('getValueForSave returned:', amountUSD);
        console.log('inputValues for this deal:', inputValues[deal.id]);
        console.log('deal.value from database:', deal.value);
        console.log('amountUSD type:', typeof amountUSD);
        console.log('amountUSD value:', amountUSD);
        // Default to email, then website, then social
        const defaultChannel = deal.leadEmail ? 'email' : (deal.leadWebsite ? 'website' : deal.leadSocials?.[0]?.platform || 'email');
        const channel = selectedChannels[deal.id] || defaultChannel;
        // Check if contract value is entered
        if (!amountUSD || amountUSD <= 0) {
            console.log('Contract value validation failed - amountUSD:', amountUSD);
            setNotificationType('archive');
            setNotification(`Please enter a contract value for ${deal.company} before sending the offer.`);
            setTimeout(() => setNotification(null), 4000);
            console.log('=== DEBUG handleSendOffer END (VALIDATION FAILED) ===');
            return;
        }
        console.log('Contract value validation passed - amountUSD:', amountUSD);
        try {
            // Route to external channel based on selection
            let externalUrl = '';
            if (channel === 'email' && deal.leadEmail) {
                externalUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(deal.leadEmail)}&su=${encodeURIComponent(`Offer: ${deal.title}`)}&body=${encodeURIComponent(`We'd like to offer you: ${deal.title}. Contract value: $${amountUSD}. Please let us know if you're interested.`)}`;
            }
            else if (channel === 'website' && deal.leadWebsite) {
                externalUrl = deal.leadWebsite.startsWith('http') ? deal.leadWebsite : `https://${deal.leadWebsite}`;
            }
            else if (channel !== 'email' && channel !== 'website') {
                // Find the social media URL for the selected platform
                const socialProfile = deal.leadSocials?.find((social) => social.platform === channel);
                if (socialProfile?.url) {
                    externalUrl = socialProfile.url;
                }
            }
            // Open external channel if we have a URL
            if (externalUrl) {
                window.open(externalUrl, '_blank');
            }
            // Update the offer table to track the channel used
            if (!supabase) {
                console.error('Supabase client not initialized');
                console.log('=== DEBUG handleSendOffer END (NO SUPABASE) ===');
                return;
            }
            // Validate amountUSD before proceeding
            if (typeof amountUSD !== 'number' || isNaN(amountUSD)) {
                console.error('=== INVALID amountUSD ===');
                console.error('amountUSD is not a valid number:', amountUSD, typeof amountUSD);
                setNotificationType('archive');
                setNotification(`Invalid contract value for ${deal.company}. Please enter a valid number.`);
                setTimeout(() => setNotification(null), 4000);
                return;
            }
            // Only update fields that exist in the offers table schema
            // The offers table only has: id, lead_id, title, stage, value, probability, created_at, updated_at
            const updateData = {
                value: amountUSD
            };
            console.log('=== DATABASE UPDATE START ===');
            console.log('Updating offer with data:', JSON.stringify(updateData, null, 2));
            console.log('Offer ID to update:', deal.id);
            console.log('amountUSD being saved:', amountUSD);
            console.log('amountUSD type:', typeof amountUSD);
            const { data: updateResult, error: updateError } = await supabase
                .from('offers')
                .update(updateData)
                .eq('id', deal.id)
                .select();
            console.log('=== DATABASE UPDATE RESULT ===');
            console.log('Update result:', JSON.stringify(updateResult, null, 2));
            console.log('Update error:', JSON.stringify(updateError, null, 2));
            console.log('Update data sent:', JSON.stringify(updateData, null, 2));
            if (updateError) {
                console.error('=== DATABASE UPDATE FAILED ===');
                console.error('Failed to update offer value:', updateError);
                console.error('Error details:', {
                    message: updateError.message,
                    code: updateError.code,
                    details: updateError.details,
                    hint: updateError.hint
                });
                setNotificationType('archive');
                setNotification(`Failed to save contract value for ${deal.company}: ${updateError.message}`);
                setTimeout(() => setNotification(null), 5000);
                return;
            }
            else {
                console.log('=== DATABASE UPDATE SUCCESS ===');
                console.log('Successfully updated offer with value:', amountUSD);
                console.log('Updated offer record:', JSON.stringify(updateResult?.[0], null, 2));
                console.log('Value in updated record:', updateResult?.[0]?.value);
            }
            console.log('=== DATABASE UPDATE END ===');
            // Update offer stage to 'Contacted' to reflect that we've reached out
            const offerSuccess = await updateOfferStage(deal.id, 'Contacted');
            if (offerSuccess) {
                // Update lead status to reflect contact
                if (deal.leadId) {
                    await updateLeadStatus(deal.leadId, 'Contacted');
                }
                // Create financial record for this offer
                console.log('=== CREATING FINANCIAL RECORD ===');
                console.log('Creating financial record for lead:', deal.leadId);
                console.log('Offer ID:', deal.id);
                console.log('Contract value:', amountUSD);
                console.log('Currency:', currency);
                const financialResult = await createLeadFinancial(deal.leadId, deal.id, // Link to the offer
                amountUSD, // Contract value in USD
                currency, // Use selected currency (USD or ETB)
                'Net 30', // Default payment terms
                'Fixed', // Default contract type
                `Offer sent via ${channel} on ${new Date().toLocaleDateString()}`);
                if (financialResult.success) {
                    console.log('Financial record created successfully');
                }
                else {
                    console.error('Failed to create financial record:', financialResult.error);
                    // Don't fail the whole operation, just log the error
                }
                setNotificationType('success');
                setNotification(`Offer sent via ${channel}: ${deal.company} - $${amountUSD.toLocaleString()}`);
                setTimeout(() => setNotification(null), 4000);
            }
        }
        catch (error) {
            console.error('=== ERROR IN handleSendOffer ===');
            console.error('Error sending offer:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
            setNotificationType('archive');
            setNotification(`Failed to send offer via ${channel}.`);
            setTimeout(() => setNotification(null), 4000);
        }
        console.log('=== DEBUG handleSendOffer END ===');
    };
    return (_jsxs("div", { className: "p-6 lg:p-10 min-h-screen animate-fade-in max-w-[1600px] mx-auto", children: [_jsxs("div", { className: "mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3", children: [_jsx(FileSignature, { className: "w-6 h-6 text-indigo-500" }), "Offer Management"] }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Set value and send closing offers to warm leads." }), _jsxs("div", { className: "mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit border border-emerald-100", children: [_jsx("div", { className: `w-1.5 h-1.5 rounded-full bg-emerald-500 ${rateLoading ? 'animate-pulse' : ''}` }), rateLoading ? 'Fetching Rate...' : `1 USD = ${exchangeRate.toFixed(2)} ETB`] })] }), _jsxs("div", { className: "flex bg-white p-1 rounded-xl border border-slate-200", children: [_jsx("button", { onClick: () => toggleCurrency('USD'), className: `px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === 'USD' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`, children: "USD ($)" }), _jsx("button", { onClick: () => toggleCurrency('ETB'), className: `px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === 'ETB' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`, children: "ETB (Br)" })] })] }), _jsx("div", { className: "mb-6", children: _jsxs("button", { onClick: () => setShowCreateOfferModal(true), className: "px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2", children: [_jsx(PlusCircle, { className: "w-5 h-5" }), " Create New Offer"] }) }), loading ? (_jsx("div", { className: "flex justify-center items-center py-20", children: _jsx(Loader2, { className: "w-8 h-8 text-indigo-500 animate-spin" }) })) : offerDeals.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: offerDeals.map((deal) => {
                    const rating = deal.leadRating || 3;
                    const activeChannel = selectedChannels[deal.id] || (deal.leadEmail ? 'email' : (deal.leadWebsite ? 'website' : deal.leadSocials?.[0]?.platform || 'email'));
                    const displayValue = getDisplayValue(deal);
                    return (_jsxs(GlassCard, { className: "p-0 flex flex-col group hover:scale-[1.01] transition-transform overflow-visible", children: [_jsxs("div", { className: "p-6 border-b border-slate-200 bg-white relative", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200", children: deal.company.substring(0, 1) }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(activeMenu === deal.id ? null : deal.id);
                                                        }, className: `p-2 rounded-lg hover:bg-slate-100 transition-colors ${activeMenu === deal.id ? 'bg-slate-100 text-indigo-600' : 'text-slate-400'}`, children: _jsx(MoreHorizontal, { className: "w-5 h-5" }) }), activeMenu === deal.id && (_jsxs("div", { ref: menuRef, className: "absolute right-0 top-10 w-48 bg-white rounded-xl border border-slate-200 py-2 z-20 animate-fade-in origin-top-right overflow-hidden", children: [_jsxs("button", { onClick: () => handleRestore(deal), className: "w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-colors border-b border-slate-50", children: [_jsx(RotateCcw, { className: "w-4 h-4" }), " Restore"] }), _jsxs("button", { onClick: () => handleDelete(deal), className: "w-full text-left px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-colors", children: [_jsx(Trash2, { className: "w-4 h-4" }), " Delete"] })] }))] })] }), _jsx("h3", { className: "text-lg font-bold text-slate-800", children: deal.company }), _jsxs("p", { className: "text-xs text-slate-500 mt-1 flex items-center gap-1", children: [_jsx(Briefcase, { className: "w-3 h-3" }), " ", deal.title] })] }), _jsxs("div", { className: "p-6 flex-1 bg-slate-50 space-y-6", children: [_jsxs("div", { children: [_jsxs("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block", children: ["Contract Value (", currency, ")"] }), _jsxs("div", { className: "relative group/input", children: [_jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-indigo-500 flex items-center justify-center font-bold text-xs", children: currency === 'USD' ? '$' : 'Br' }), _jsx("input", { type: "text", placeholder: "0", value: displayValue, onChange: (e) => handleInputChange(deal.id, e.target.value), className: "w-full bg-white border border-slate-200 rounded-xl py-3 pl-9 pr-4 text-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" })] })] }), _jsxs("div", { className: "bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-xs text-slate-500 font-medium", children: "Win Probability" }), _jsxs("span", { className: "text-sm font-bold text-emerald-600", children: [deal.probability, "%"] })] }), _jsx("div", { className: "w-full h-1.5 bg-slate-200 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-emerald-500 rounded-full", style: { width: `${deal.probability}%` } }) }), _jsxs("div", { className: "flex items-center gap-1.5 pt-1", children: [_jsx("div", { className: "flex", children: [1, 2, 3, 4, 5].map((star) => (_jsx(Star, { className: `w-3 h-3 ${star <= rating ? 'text-amber-400 fill-current' : 'text-slate-300'}` }, `star_${deal.id}_${star}`))) }), _jsx("span", { className: "text-[10px] text-slate-400 font-medium", children: "Based on Lead Quality" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block", children: "Select Channel" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [deal.leadEmail && (_jsxs("button", { onClick: () => handleChannelSelect(deal.id, 'email'), className: `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border
                                                ${activeChannel === 'email'
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-200'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                                            `, children: [_jsx(Mail, { className: "w-3.5 h-3.5" }), " Email"] })), deal.leadWebsite && (_jsxs("button", { onClick: () => handleChannelSelect(deal.id, 'website'), className: `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border
                                                ${activeChannel === 'website'
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-200'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                                            `, children: [_jsx(Globe, { className: "w-3.5 h-3.5" }), " Website"] })), deal.leadSocials?.map((social, i) => (_jsxs("button", { onClick: () => handleChannelSelect(deal.id, social.platform), className: `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border capitalize
                                                ${activeChannel === social.platform
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-200'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                                            `, children: [getChannelIcon(social.platform), " ", social.platform] }, `social_${deal.id}_${i}_${social.platform}`)))] })] })] }), _jsxs("div", { className: "p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3", children: [_jsxs("button", { onClick: () => handleSendOffer(deal), className: "w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95", children: [_jsx(Send, { className: "w-4 h-4" }), " Send offer"] }), _jsxs("button", { onClick: () => handleArchive(deal), className: "w-full py-2 text-xs font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center gap-1.5", children: [_jsx(Archive, { className: "w-3.5 h-3.5" }), " Archive to Closed Leads"] })] })] }, deal.id));
                }) })) : (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 opacity-60", children: [_jsx("div", { className: "w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6", children: _jsx(FileSignature, { className: "w-10 h-10 text-slate-300" }) }), _jsx("h3", { className: "text-xl font-bold text-slate-700", children: "No Pending Offers" }), _jsxs("p", { className: "text-slate-500 mt-2 max-w-sm text-center", children: ["Great job! You've cleared the offer queue. Go to ", _jsx("span", { className: "font-bold text-indigo-500", children: "Outreach" }), " and convert more leads to deals."] })] })), notification && (_jsxs("div", { className: "fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-xl flex items-center gap-3 animate-slide-in-right z-50 max-w-md", children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notificationType === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`, children: notificationType === 'success' ? _jsx(CheckCircle2, { className: "w-5 h-5 text-emerald-400" }) : _jsx(Archive, { className: "w-5 h-5 text-rose-400" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-bold text-sm", children: notificationType === 'success' ? 'Success' : 'Archived' }), _jsx("p", { className: "text-xs text-slate-400", children: notification })] })] })), showCreateOfferModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 max-w-md w-full p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center", children: _jsx(PlusCircle, { className: "w-6 h-6 text-purple-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Create New Offer" }), _jsx("p", { className: "text-sm text-slate-500", children: "Create an offer for a lead" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Select Lead" }), _jsxs("select", { value: selectedLeadId, onChange: (e) => setSelectedLeadId(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500", children: [_jsx("option", { value: "", children: "Choose a lead..." }), availableLeads.map((lead) => (_jsxs("option", { value: lead.id, children: [lead.business.name, " - ", lead.status] }, lead.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Offer Title" }), _jsx("input", { type: "text", value: newOfferTitle, onChange: (e) => setNewOfferTitle(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500", placeholder: "e.g., Senior Developer Position" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Contract Value ($)" }), _jsx("input", { type: "number", value: newOfferValue, onChange: (e) => setNewOfferValue(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500", placeholder: "e.g., 75000" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Stage" }), _jsxs("select", { value: newOfferStage, onChange: (e) => setNewOfferStage(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500", children: [_jsx("option", { value: "Proposal", children: "Proposal" }), _jsx("option", { value: "Qualified", children: "Qualified" }), _jsx("option", { value: "Contacted", children: "Contacted" }), _jsx("option", { value: "Won", children: "Won" }), _jsx("option", { value: "Lost", children: "Lost" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Win Probability (%)" }), _jsx("input", { type: "number", value: newOfferProbability, onChange: (e) => setNewOfferProbability(parseInt(e.target.value)), min: "0", max: "100", className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" })] })] }), _jsxs("div", { className: "flex gap-3 mt-6 justify-end", children: [_jsx("button", { onClick: () => {
                                        setShowCreateOfferModal(false);
                                        setNewOfferTitle('');
                                        setNewOfferValue('');
                                        setNewOfferStage('Proposal');
                                        setNewOfferProbability(50);
                                        setSelectedLeadId('');
                                    }, className: "px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors", children: "Cancel" }), _jsx("button", { onClick: async () => {
                                        if (!selectedLeadId || !newOfferTitle || !newOfferValue)
                                            return;
                                        const success = await createOffer(selectedLeadId, newOfferTitle, parseInt(newOfferValue), newOfferStage, newOfferProbability);
                                        if (success) {
                                            // Update lead status to reflect offer creation
                                            await updateLeadStatus(selectedLeadId, 'Negotiations');
                                            // Get the newly created offer to link with financial record
                                            const offers = await getOffers();
                                            const newOffer = offers.find(o => o.leadId === selectedLeadId);
                                            if (newOffer) {
                                                // Create financial record for this new offer
                                                const financialResult = await createLeadFinancial(selectedLeadId, newOffer.id, // Link to the new offer
                                                parseInt(newOfferValue), // Contract value
                                                'USD', // Default currency for new offers
                                                'Net 30', // Default payment terms
                                                'Fixed', // Default contract type
                                                `Offer created on ${new Date().toLocaleDateString()}`);
                                                if (financialResult.success) {
                                                    console.log('Financial record created for new offer');
                                                }
                                                else {
                                                    console.error('Failed to create financial record for new offer:', financialResult.error);
                                                }
                                            }
                                            // Signal to refresh offers
                                            window.dispatchEvent(new StorageEvent('storage', { key: 'offersUpdated' }));
                                            // Reset form and close modal
                                            setShowCreateOfferModal(false);
                                            setNewOfferTitle('');
                                            setNewOfferValue('');
                                            setNewOfferStage('Proposal');
                                            setNewOfferProbability(50);
                                            setSelectedLeadId('');
                                            // Show success notification
                                            setNotificationType('success');
                                            setNotification('Offer created successfully!');
                                            setTimeout(() => setNotification(null), 4000);
                                        }
                                        else {
                                            setNotificationType('archive');
                                            setNotification('Failed to create offer. Please try again.');
                                            setTimeout(() => setNotification(null), 4000);
                                        }
                                    }, className: "px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium", children: "Create Offer" })] })] }) }))] }));
};
export default OfferDeal;
