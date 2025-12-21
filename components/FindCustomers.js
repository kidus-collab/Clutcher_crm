import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import GlassCard from './ui/GlassCard';
import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import { Search, Globe, Mail, Phone, Linkedin, Twitter, Check, Loader2, Plus, Sparkles, AlertCircle, Trash2, Download, Upload, FileSpreadsheet, Database, Clock } from 'lucide-react';
import { scrapeBusinesses, clearCache, getCacheStats } from '../lib/api/scrape';
import { saveBusiness, addToLeads, getLeads } from '../lib/database/supabase';
import * as XLSX from 'xlsx';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, } from "./ui/pagination";
const FindCustomers = () => {
    const [query, setQuery] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [results, setResults] = useState([]);
    const [addedIds, setAddedIds] = useState(new Set());
    const [error, setError] = useState(null);
    const [addingIds, setAddingIds] = useState(new Set());
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadedData, setUploadedData] = useState([]);
    const [showUploadedData, setShowUploadedData] = useState(false);
    // Caching state
    const [fromCache, setFromCache] = useState(false);
    const [cacheStats, setCacheStats] = useState(null);
    const [showCacheInfo, setShowCacheInfo] = useState(false);
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
    // Initialize cache and check existing leads on component mount
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                // Load cache stats
                const stats = await getCacheStats();
                setCacheStats(stats);
                // Check which businesses are already in leads and sync IDs
                await checkExistingLeads();
            }
            catch (error) {
                console.error('Initialization error:', error);
            }
            finally {
                // Initial loading delay for skeleton demo
                setTimeout(() => setLoading(false), 800);
            }
        };
        initializeComponent();
    }, []);
    // Check which businesses are already in leads
    const checkExistingLeads = async () => {
        try {
            const leads = await getLeads();
            const businessIds = new Set(leads.map(l => l.business.id));
            setAddedIds(businessIds);
            console.log('Businesses already in leads:', Array.from(businessIds));
            // Update current results with database IDs for consistency
            setResults(prev => {
                const updatedResults = prev.map((biz) => {
                    // Find if this business is already in leads by website (unique identifier)
                    const existingLead = leads.find(l => l.business.website === biz.website);
                    if (existingLead) {
                        // Update business ID to match database ID - this is the key fix
                        return { ...biz, id: existingLead.business.id };
                    }
                    return biz;
                });
                return updatedResults;
            });
        }
        catch (err) {
            console.error('Error checking existing leads:', err);
        }
    };
    const handleScrape = async () => {
        if (!query.trim())
            return;
        setIsScraping(true);
        setLoading(true);
        setError(null);
        setResults([]);
        setFromCache(false);
        setHasSearched(true);
        setCurrentPage(1); // Reset to first page
        const startTime = Date.now();
        try {
            const response = await scrapeBusinesses({
                query: query.trim(),
                saveToDatabase: true,
                useCache: true
            });
            if (response.success) {
                setResults(response.data);
                setFromCache(response.fromCache || false);
                // Update cache stats
                const stats = await getCacheStats();
                setCacheStats(stats);
                if (response.data.length === 0) {
                    setError('No businesses found. Try a different search query.');
                }
            }
            else {
                setError(response.error || 'Failed to search. Please try again.');
            }
        }
        catch (err) {
            console.error('Scrape error:', err);
            setError('Network error. Please check your connection and try again.');
        }
        finally {
            // Artificial delay for smooth skeleton transition
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 800 - elapsedTime);
            setTimeout(() => {
                setIsScraping(false);
                setLoading(false);
            }, remainingTime);
        }
    };
    const handleClearCache = async () => {
        try {
            await clearCache();
            setCacheStats(await getCacheStats());
            setError('Cache cleared successfully');
            setTimeout(() => setError(null), 2000);
        }
        catch (err) {
            console.error('Clear cache error:', err);
            setError('Failed to clear cache');
        }
    };
    const handleAddToLeads = async (business) => {
        // Check if already being added or already added (using website as unique identifier)
        const isAlreadyAdded = Array.from(addedIds).some(id => {
            const existingBusiness = results.find(b => b.id === id);
            return existingBusiness && existingBusiness.website === business.website;
        });
        if (addingIds.has(business.id) || isAlreadyAdded) {
            console.log('Business already being added or already added:', business.website);
            return;
        }
        setAddingIds(prev => new Set(prev).add(business.id));
        setError(null);
        try {
            console.log('Adding business to leads:', business);
            // Create a business object without the ID for the database operation
            const businessData = {
                name: business.name,
                website: business.website,
                email: business.email,
                phone: business.phone,
                description: business.description,
                socials: business.socials || []
            };
            // First, save the business to ensure we have a proper database record
            console.log('Saving business to database...');
            const saved = await saveBusiness(businessData);
            if (!saved) {
                console.error('Business save returned null');
                throw new Error('Failed to save business to database - saveBusiness returned null');
            }
            console.log('Business saved to database with ID:', saved.id);
            // Then add it to leads using the saved business ID
            console.log('Adding to leads with business ID:', saved.id);
            const lead = await addToLeads(saved.id);
            if (lead) {
                // Update the added IDs set with the database ID (primary identifier)
                setAddedIds(prev => {
                    const newSet = new Set(prev);
                    // Add the database ID as the primary identifier
                    newSet.add(saved.id);
                    return newSet;
                });
                // Update the results array to use the database ID for this business
                setResults(prev => {
                    const updated = prev.map(b => b.website === business.website
                        ? { ...b, id: saved.id } // Use database ID
                        : b);
                    // No more localStorage updates - cache is handled by the API layer
                    return updated;
                });
                // Also update uploaded data if this is from uploaded data
                if (showUploadedData) {
                    setUploadedData(prev => {
                        const updated = prev.map(b => b.website === business.website
                            ? { ...b, id: saved.id } // Use database ID
                            : b);
                        return updated;
                    });
                }
                console.log('Successfully added to leads:', lead);
                // Trigger a refresh in the Leads component
                localStorage.setItem('leadsUpdated', Date.now().toString());
                // Show success message
                setError(null);
            }
            else {
                console.error('addToLeads returned null');
                throw new Error('Failed to add business to leads - addToLeads returned null');
            }
        }
        catch (err) {
            console.error('Error adding to leads:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Full error details:', {
                name: business.name,
                website: business.website,
                error: err,
                errorMessage: errorMessage
            });
            setError(`Failed to add ${business.name} to leads: ${errorMessage}`);
        }
        finally {
            setAddingIds(prev => {
                const next = new Set(prev);
                next.delete(business.id);
                return next;
            });
        }
    };
    const handleRemoveFromResults = (businessId) => {
        setResults(prev => {
            const newResults = prev.filter(b => b.id !== businessId);
            return newResults;
        });
        // Also remove from addedIds if it was there
        setAddedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(businessId);
            return newSet;
        });
    };
    const handleClearResults = () => {
        setResults([]);
        setHasSearched(false);
        setQuery('');
        setFromCache(false);
    };
    const handleExportXLSX = () => {
        // Get all results (not just paginated ones)
        const dataToExport = results.length > 0 ? results : [];
        if (dataToExport.length === 0) {
            setError('No data to export. Please perform a search first.');
            return;
        }
        // Create XLSX content (simplified approach - create a tab-separated values file that Excel can open)
        const headers = ['Name', 'Website', 'Email', 'Phone', 'Description', 'Social Platforms'];
        const xlsxContent = [
            headers.join('\t'),
            ...dataToExport.map(biz => [
                biz.name.replace(/\t/g, ' '),
                biz.website,
                biz.email || '',
                biz.phone || '',
                (biz.description || '').replace(/\t/g, ' '),
                (biz.socials || []).map(s => s.platform).join('; ')
            ].join('\t'))
        ].join('\n');
        // Create blob and download
        const blob = new Blob([xlsxContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `businesses_${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Show success message
        setError(`Successfully exported ${dataToExport.length} businesses to Excel file`);
        setTimeout(() => setError(null), 3000);
    };
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        // Check if file is an Excel file
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            setError('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }
        setUploadingFile(true);
        setError(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            // Convert Excel data to Business objects
            const businesses = [];
            const headers = jsonData[0];
            // Find column indices
            const nameIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('name'));
            const websiteIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('website'));
            const emailIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('email'));
            const phoneIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('phone'));
            const descriptionIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('description'));
            // Process data rows (skip header row)
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[nameIndex])
                    continue;
                const business = {
                    id: `upload_${Date.now()}_${i}`, // Temporary ID
                    name: row[nameIndex]?.toString() || '',
                    website: row[websiteIndex]?.toString() || '',
                    email: row[emailIndex]?.toString() || '',
                    phone: row[phoneIndex]?.toString() || '',
                    description: row[descriptionIndex]?.toString() || '',
                    socials: []
                };
                businesses.push(business);
            }
            if (businesses.length === 0) {
                setError('No valid business data found in the Excel file');
            }
            else {
                setUploadedData(businesses);
                setShowUploadedData(true);
                setCurrentPage(1); // Reset pagination
                setError(`Successfully loaded ${businesses.length} businesses from Excel file`);
                setTimeout(() => setError(null), 3000);
            }
        }
        catch (err) {
            console.error('Error processing Excel file:', err);
            setError('Failed to process Excel file. Please check the file format and try again.');
        }
        finally {
            setUploadingFile(false);
            // Reset file input
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    const handleClearUploadedData = () => {
        setUploadedData([]);
        setShowUploadedData(false);
    };
    // Pagination Logic
    const totalPages = Math.ceil((showUploadedData ? uploadedData : results).length / itemsPerPage);
    const paginatedResults = (showUploadedData ? uploadedData : results).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    if (loading && !isScraping && !uploadingFile) {
        return (_jsxs("div", { className: "p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen space-y-8", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-10 w-64" }), _jsx(Skeleton, { className: "h-4 w-96" })] }), _jsx(GlassCard, { className: "p-6", children: _jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [_jsx(Skeleton, { className: "flex-1 h-32 rounded-xl" }), _jsxs("div", { className: "md:w-56 space-y-3 pt-8", children: [_jsx(Skeleton, { className: "h-4 w-full" }), _jsx(Skeleton, { className: "h-12 w-full rounded-xl" })] })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [1, 2, 3, 4, 5, 6].map(i => (_jsxs("div", { className: "bg-white p-6 rounded-2xl border border-slate-200 h-[320px] space-y-4", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx(Skeleton, { variant: "circular", className: "w-12 h-12" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Skeleton, { variant: "circular", className: "w-6 h-6" }), _jsx(Skeleton, { variant: "circular", className: "w-6 h-6" })] })] }), _jsx(Skeleton, { className: "h-6 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/2" }), _jsx(Skeleton, { className: "h-12 w-full" }), _jsx("div", { className: "pt-4 border-t border-slate-100 mt-auto", children: _jsx(Skeleton, { className: "h-10 w-full rounded-lg" }) })] }, i))) })] }));
    }
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 }, className: "p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-slate-800 tracking-tight", children: "Find Customers" }), _jsx("p", { className: "text-slate-500 mt-1 text-sm", children: "Use our AI agent to find businesses and scrape their contact details." })] }), cacheStats && (_jsxs("div", { className: "mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Database, { className: "w-4 h-4 text-indigo-600" }), _jsxs("span", { className: "text-sm text-indigo-700", children: ["Cache: ", cacheStats.totalEntries, " entries (", Math.round(cacheStats.totalSize / 1024), "KB)"] }), fromCache && (_jsxs("span", { className: "flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full", children: [_jsx(Clock, { className: "w-3 h-3" }), "From cache"] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => setShowCacheInfo(!showCacheInfo), className: "text-xs text-indigo-600 hover:text-indigo-800 font-medium", children: [showCacheInfo ? 'Hide' : 'Show', " Details"] }), _jsx("button", { onClick: handleClearCache, className: "text-xs text-rose-600 hover:text-rose-800 font-medium", children: "Clear Cache" })] })] })), showCacheInfo && cacheStats && (_jsxs(GlassCard, { className: "p-4 mb-6 bg-slate-50", children: [_jsxs("h3", { className: "text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2", children: [_jsx(Database, { className: "w-4 h-4" }), "Cache Statistics"] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-xs", children: [_jsxs("div", { className: "bg-white p-3 rounded-lg border border-slate-200", children: [_jsx("div", { className: "text-slate-500", children: "Total Entries" }), _jsx("div", { className: "text-lg font-bold text-slate-800", children: cacheStats.totalEntries })] }), _jsxs("div", { className: "bg-white p-3 rounded-lg border border-slate-200", children: [_jsx("div", { className: "text-slate-500", children: "Total Size" }), _jsxs("div", { className: "text-lg font-bold text-slate-800", children: [Math.round(cacheStats.totalSize / 1024), "KB"] })] }), _jsxs("div", { className: "bg-white p-3 rounded-lg border border-slate-200", children: [_jsx("div", { className: "text-slate-500", children: "Oldest Entry" }), _jsx("div", { className: "text-lg font-bold text-slate-800", children: cacheStats.oldestEntry ? new Date(cacheStats.oldestEntry).toLocaleDateString() : 'N/A' })] }), _jsxs("div", { className: "bg-white p-3 rounded-lg border border-slate-200", children: [_jsx("div", { className: "text-slate-500", children: "Newest Entry" }), _jsx("div", { className: "text-lg font-bold text-slate-800", children: cacheStats.newestEntry ? new Date(cacheStats.newestEntry).toLocaleDateString() : 'N/A' })] })] })] })), _jsxs(GlassCard, { className: "p-6 mb-8", children: [_jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx("textarea", { value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleScrape();
                                            }
                                        }, placeholder: "e.g. 100 clinics in Addis Ababa, or Software companies in San Francisco...", className: "w-full h-32 p-4 bg-white border border-slate-200 rounded-xl focus:outline-none font-medium text-lg text-slate-700 placeholder:text-slate-300 transition-all focus:ring-2 focus:ring-indigo-500/20" }), _jsx("div", { className: "absolute top-4 right-4", children: _jsx(Sparkles, { className: "w-5 h-5 text-indigo-400" }) })] }), _jsxs("div", { className: "flex flex-col gap-3 justify-end md:w-56", children: [_jsxs("div", { className: "text-xs text-slate-400 px-1", children: [_jsxs("p", { className: "flex items-center gap-1.5 mb-1", children: [_jsx(Check, { className: "w-3 h-3 text-emerald-500" }), " AI-Powered Search"] }), _jsxs("p", { className: "flex items-center gap-1.5 mb-1", children: [_jsx(Check, { className: "w-3 h-3 text-emerald-500" }), " Finds Business Info"] }), _jsxs("p", { className: "flex items-center gap-1.5", children: [_jsx(Check, { className: "w-3 h-3 text-emerald-500" }), " Extracts Verified Contacts"] })] }), _jsx("button", { onClick: handleScrape, disabled: isScraping || !query.trim(), className: "w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center", children: isScraping ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), " Searching..."] })) : (_jsxs(_Fragment, { children: [_jsx(Search, { className: "w-4 h-4 mr-2" }), " Find Businesses"] })) })] })] }), _jsxs("div", { className: "mt-6 pt-6 border-t border-slate-100", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileSpreadsheet, { className: "w-5 h-5 text-indigo-500" }), _jsx("h3", { className: "text-sm font-semibold text-slate-700", children: "Upload Excel File" })] }), showUploadedData && (_jsx("button", { onClick: handleClearUploadedData, className: "text-sm text-slate-600 font-medium hover:text-slate-700", children: "Clear Uploaded Data" }))] }), _jsx("div", { className: "flex flex-col md:flex-row gap-4", children: _jsxs("div", { className: "flex-1", children: [_jsxs("label", { className: "relative cursor-pointer", children: [_jsx("input", { type: "file", accept: ".xlsx,.xls", onChange: handleFileUpload, disabled: uploadingFile, className: "absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" }), _jsx("div", { className: "border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors", children: uploadingFile ? (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin text-indigo-500" }), _jsx("span", { className: "text-sm text-slate-600", children: "Processing file..." })] })) : (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx(Upload, { className: "w-5 h-5 text-slate-400" }), _jsx("span", { className: "text-sm text-slate-600", children: "Click to upload Excel file (.xlsx, .xls)" })] })) })] }), _jsx("p", { className: "text-xs text-slate-400 mt-2", children: "File should contain columns: Name, Website, Email, Phone, Description" })] }) })] })] }), error && (_jsxs("div", { className: "mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700", children: [_jsx(AlertCircle, { className: "w-5 h-5 shrink-0" }), _jsx("p", { className: "text-sm", children: error })] })), !hasSearched && !isScraping && !showUploadedData && (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4", children: _jsx(Search, { className: "w-8 h-8 text-indigo-400" }) }), _jsx("h3", { className: "text-lg font-bold text-slate-700 mb-2", children: "Start Your Search or Upload Excel File" }), _jsx("p", { className: "text-sm text-slate-500 max-w-md", children: "Enter a query like \"50 restaurants in New York\" or upload an Excel file with business leads." })] })), (isScraping || uploadingFile) && (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [isScraping ? (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-20 h-20 rounded-full border-4 border-indigo-100" }), _jsx("div", { className: "w-20 h-20 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin absolute top-0 left-0" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx(Search, { className: "w-8 h-8 text-indigo-500 animate-pulse" }) })] })) : (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-20 h-20 rounded-full border-4 border-emerald-100" }), _jsx("div", { className: "w-20 h-20 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin absolute top-0 left-0" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx(FileSpreadsheet, { className: "w-8 h-8 text-emerald-500 animate-pulse" }) })] })), _jsx("h3", { className: "text-xl font-bold text-slate-700 mb-2 mt-6", children: uploadingFile ? 'Processing File...' : 'Searching for Leads...' }), _jsx("p", { className: "text-sm text-slate-500 max-w-md", children: uploadingFile ?
                            'Processing your Excel file and extracting business data...' :
                            'Our AI is actively searching for businesses and extracting their contact information. This may take a moment depending on your query.' }), isScraping && (_jsxs("div", { className: "mt-6 space-y-2 w-full max-w-md", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-slate-500", children: [_jsx("span", { children: "Search Progress" }), _jsx("span", { children: "Processing..." })] }), _jsx("div", { className: "w-full bg-slate-200 rounded-full h-2", children: _jsx("div", { className: "bg-indigo-500 h-2 rounded-full animate-pulse", style: { width: '70%' } }) })] }))] })), (results.length > 0 || uploadedData.length > 0) && (_jsxs("div", { className: "animate-fade-in pb-12", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-bold text-slate-800", children: showUploadedData ? `Uploaded Data (${uploadedData.length})` : `Results (${results.length})` }), _jsx("div", { className: "flex gap-2", children: showUploadedData ? (_jsx("button", { onClick: handleClearUploadedData, className: "text-sm text-slate-600 font-medium hover:text-slate-700", children: "Clear Uploaded Data" })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleClearResults, className: "text-sm text-slate-600 font-medium hover:text-slate-700", children: "Clear Results" }), _jsxs("button", { onClick: handleExportXLSX, className: "text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1", children: [_jsx(Download, { className: "w-4 h-4" }), " Export Excel"] })] })) })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8", children: paginatedResults.map((biz) => {
                            const isAdded = addedIds.has(biz.id);
                            const isAdding = addingIds.has(biz.id);
                            const isUploaded = showUploadedData;
                            return (_jsxs(GlassCard, { className: "p-5 flex flex-col h-full group border-l-4 border-l-transparent hover:border-l-indigo-500 transition-all relative", children: [_jsx("button", { onClick: () => isUploaded ?
                                            setUploadedData(prev => prev.filter(b => b.id !== biz.id)) :
                                            handleRemoveFromResults(biz.id), className: "absolute top-3 right-3 p-1.5 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all", title: isUploaded ? "Remove from uploaded data" : "Remove from results", children: _jsx(Trash2, { className: "w-4 h-4" }) }), _jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg", children: biz.name.substring(0, 1) }), _jsx("div", { className: "flex gap-2", children: biz.socials?.map((soc, i) => (_jsx("a", { href: soc.url, target: "_blank", rel: "noreferrer", className: "p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors", children: soc.platform === 'linkedin' ? _jsx(Linkedin, { className: "w-3.5 h-3.5" }) :
                                                        soc.platform === 'twitter' ? _jsx(Twitter, { className: "w-3.5 h-3.5" }) :
                                                            _jsx(Globe, { className: "w-3.5 h-3.5" }) }, i))) })] }), _jsx("h3", { className: "font-bold text-slate-800 text-lg", children: biz.name }), biz.website && (_jsx("a", { href: `https://${biz.website}`, target: "_blank", rel: "noreferrer", className: "text-xs text-indigo-500 hover:underline mb-3 block", children: biz.website })), biz.description && (_jsx("p", { className: "text-xs text-slate-500 mb-4 line-clamp-2", children: biz.description })), _jsxs("div", { className: "space-y-2 mb-6", children: [biz.email && (_jsxs("div", { className: "flex items-center text-sm text-slate-600", children: [_jsx(Mail, { className: "w-3.5 h-3.5 mr-2 text-slate-400" }), _jsx("span", { className: "truncate", children: biz.email })] })), biz.phone && (_jsxs("div", { className: "flex items-center text-sm text-slate-600", children: [_jsx(Phone, { className: "w-3.5 h-3.5 mr-2 text-slate-400" }), _jsx("span", { children: biz.phone })] }))] }), _jsx("div", { className: "mt-auto pt-4 border-t border-slate-100", children: _jsx("button", { onClick: () => handleAddToLeads(biz), disabled: isAdded || isAdding, className: `w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                                                ${isAdded
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'}
                                            `, children: isAdding ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), " Adding..."] })) : isAdded ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4 mr-2" }), " Added to Leads"] })) : (_jsxs(_Fragment, { children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), " Add to Leads"] })) }) })] }, biz.id));
                        }) }), totalPages > 1 && (_jsx("div", { className: "flex justify-center mt-8", children: _jsx(Pagination, { className: "bg-white p-2 rounded-xl border border-slate-200 inline-flex w-auto", children: _jsxs(PaginationContent, { children: [_jsx(PaginationItem, { children: _jsx(PaginationPrevious, { onClick: () => setCurrentPage(p => Math.max(1, p - 1)), className: currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer" }) }), Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                        // Simple logic to show start, end, and current around
                                        return page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1);
                                    })
                                        .map((page, i, filteredPages) => {
                                        const showEllipsisBefore = i > 0 && page > filteredPages[i - 1] + 1;
                                        return (_jsxs(React.Fragment, { children: [showEllipsisBefore && (_jsx(PaginationItem, { children: _jsx(PaginationEllipsis, {}) })), _jsx(PaginationItem, { children: _jsx(PaginationLink, { isActive: currentPage === page, onClick: () => setCurrentPage(page), className: "cursor-pointer", children: page }) })] }, page));
                                    }), _jsx(PaginationItem, { children: _jsx(PaginationNext, { onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)), className: currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer" }) })] }) }) }))] }))] }));
};
export default FindCustomers;
