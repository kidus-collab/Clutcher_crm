import React, { useState, useEffect } from 'react';
import GlassCard from './ui/GlassCard';
import { Search, Globe, Mail, Phone, Linkedin, Twitter, Check, Loader2, Plus, Sparkles, AlertCircle, Trash2, Download } from 'lucide-react';
import { Business } from '../types';
import { scrapeBusinesses } from '../lib/api/scrape';
import { saveBusiness, addToLeads, getBusinesses, getLeads } from '../lib/database/supabase';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "./ui/pagination";

const FindCustomers: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [results, setResults] = useState<Business[]>([]);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
    const [hasSearched, setHasSearched] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Load saved results from localStorage on component mount
    useEffect(() => {
        const savedResults = localStorage.getItem('searchResults');
        const savedHasSearched = localStorage.getItem('hasSearched');
        const savedQuery = localStorage.getItem('searchQuery');
        
        if (savedResults) {
            try {
                const parsedResults = JSON.parse(savedResults);
                // Update results with database IDs if they exist
                setResults(parsedResults);
            } catch (e) {
                console.error('Error parsing saved results:', e);
            }
        }
        
        if (savedHasSearched === 'true') {
            setHasSearched(true);
        }
        
        if (savedQuery) {
            setQuery(savedQuery);
        }
        
        // Check which businesses are already in leads and sync IDs
        checkExistingLeads();
    }, []);

    // Save results to localStorage whenever they change
    useEffect(() => {
        if (results.length > 0) {
            localStorage.setItem('searchResults', JSON.stringify(results));
            localStorage.setItem('hasSearched', 'true');
        }
    }, [results]);

    // Save query to localStorage whenever it changes
    useEffect(() => {
        if (query) {
            localStorage.setItem('searchQuery', query);
        }
    }, [query]);

    // Check which businesses are already in leads and update localStorage results with database IDs
    const checkExistingLeads = async () => {
        try {
            const leads = await getLeads();
            const businessIds = new Set(leads.map(l => l.business.id));
            setAddedIds(businessIds);
            console.log('Businesses already in leads:', Array.from(businessIds));
            
            // Update localStorage results with database IDs for consistency
            const savedResults = localStorage.getItem('searchResults');
            if (savedResults) {
                try {
                    const parsedResults = JSON.parse(savedResults);
                    const updatedResults = parsedResults.map((biz: Business) => {
                        // Find if this business is already in leads by website (unique identifier)
                        const existingLead = leads.find(l => l.business.website === biz.website);
                        if (existingLead) {
                            // Update business ID to match database ID - this is the key fix
                            return { ...biz, id: existingLead.business.id };
                        }
                        return biz;
                    });
                    
                    // Update both results and localStorage with consistent IDs
                    setResults(updatedResults);
                    localStorage.setItem('searchResults', JSON.stringify(updatedResults));
                } catch (e) {
                    console.error('Error updating results with database IDs:', e);
                }
            }
        } catch (err) {
            console.error('Error checking existing leads:', err);
        }
    };

    const handleScrape = async () => {
        if (!query.trim()) return;
        
        setIsScraping(true);
        setError(null);
        setResults([]);
        setHasSearched(true);
        setCurrentPage(1); // Reset to first page
        
        try {
            const response = await scrapeBusinesses({ 
                query: query.trim(),
                saveToDatabase: true 
            });
            
            if (response.success) {
                setResults(response.data);
                if (response.data.length === 0) {
                    setError('No businesses found. Try a different search query.');
                }
            } else {
                setError(response.error || 'Failed to search. Please try again.');
            }
        } catch (err) {
            console.error('Scrape error:', err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsScraping(false);
        }
    };


    const handleAddToLeads = async (business: Business) => {
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
            const saved = await saveBusiness(businessData);
            if (!saved) {
                throw new Error('Failed to save business to database');
            }
            
            console.log('Business saved to database with ID:', saved.id);
            
            // Then add it to leads using the saved business ID
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
                    const updated = prev.map(b =>
                        b.website === business.website
                            ? { ...b, id: saved.id } // Use database ID
                            : b
                    );
                    // Update localStorage with the database ID
                    localStorage.setItem('searchResults', JSON.stringify(updated));
                    return updated;
                });
                
                console.log('Successfully added to leads:', lead);
                
                // Trigger a refresh in the Leads component
                localStorage.setItem('leadsUpdated', Date.now().toString());
                
                // Show success message
                setError(null);
            } else {
                throw new Error('Failed to add business to leads');
            }
        } catch (err) {
            console.error('Error adding to leads:', err);
            setError(`Failed to add ${business.name} to leads: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setAddingIds(prev => {
                const next = new Set(prev);
                next.delete(business.id);
                return next;
            });
        }
    };

    const handleRemoveFromResults = (businessId: string) => {
        setResults(prev => {
            const newResults = prev.filter(b => b.id !== businessId);
            // Update localStorage
            if (newResults.length === 0) {
                localStorage.removeItem('searchResults');
                localStorage.removeItem('hasSearched');
            } else {
                localStorage.setItem('searchResults', JSON.stringify(newResults));
            }
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
        localStorage.removeItem('searchResults');
        localStorage.removeItem('hasSearched');
        localStorage.removeItem('searchQuery');
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

    // Pagination Logic
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const paginatedResults = results.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Find Customers</h1>
                <p className="text-slate-500 mt-1 text-sm">Use our AI agent to find businesses and scrape their contact details.</p>
            </div>

            {/* Input Area */}
            <GlassCard className="p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleScrape();
                                }
                            }}
                            placeholder="e.g. 100 clinics in Addis Ababa, or Software companies in San Francisco..."
                            className="w-full h-32 p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none font-medium text-lg text-slate-700 placeholder:text-slate-300"
                        />
                        <div className="absolute top-4 right-4">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 justify-end md:w-56">
                        <div className="text-xs text-slate-400 px-1">
                            <p className="flex items-center gap-1.5 mb-1"><Check className="w-3 h-3 text-emerald-500" /> AI-Powered Search</p>
                            <p className="flex items-center gap-1.5 mb-1"><Check className="w-3 h-3 text-emerald-500" /> Finds Business Info</p>
                            <p className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Extracts Verified Contacts</p>
                        </div>
                        <button 
                            onClick={handleScrape}
                            disabled={isScraping || !query.trim()}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isScraping ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" /> Find Businesses
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Empty State (Before Search) */}
            {!hasSearched && !isScraping && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Start Your Search</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        Enter a query like "50 restaurants in New York" or "Tech startups in Berlin" and our AI will find matching businesses.
                    </p>
                </div>
            )}

            {/* Loading State */}
            {isScraping && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Searching...</h3>
                    <p className="text-sm text-slate-500">Our AI is finding businesses for you. This may take a moment.</p>
                </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
                <div className="animate-fade-in pb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800">Results ({results.length})</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClearResults}
                                className="text-sm text-slate-600 font-medium hover:text-slate-700"
                            >
                                Clear Results
                            </button>
                            <button
                                onClick={handleExportXLSX}
                                className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
                            >
                                <Download className="w-4 h-4" /> Export Excel
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {paginatedResults.map((biz) => {
                            const isAdded = addedIds.has(biz.id);
                            const isAdding = addingIds.has(biz.id);
                            return (
                                <GlassCard key={biz.id} className="p-5 flex flex-col h-full group border-l-4 border-l-transparent hover:border-l-indigo-500 transition-all relative">
                                    {/* Remove Button */}
                                    <button 
                                        onClick={() => handleRemoveFromResults(biz.id)}
                                        className="absolute top-3 right-3 p-1.5 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove from results"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100">
                                            {biz.name.substring(0, 1)}
                                        </div>
                                        <div className="flex gap-2">
                                            {biz.socials?.map((soc, i) => (
                                                <a key={i} href={soc.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                                                    {soc.platform === 'linkedin' ? <Linkedin className="w-3.5 h-3.5" /> : 
                                                     soc.platform === 'twitter' ? <Twitter className="w-3.5 h-3.5" /> : 
                                                     <Globe className="w-3.5 h-3.5" />}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-slate-800 text-lg">{biz.name}</h3>
                                    <a href={`https://${biz.website}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline mb-3 block">{biz.website}</a>
                                    
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{biz.description}</p>
                                    
                                    <div className="space-y-2 mb-6">
                                        {biz.email && (
                                            <div className="flex items-center text-sm text-slate-600">
                                                <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                <span className="truncate">{biz.email}</span>
                                            </div>
                                        )}
                                        {biz.phone && (
                                            <div className="flex items-center text-sm text-slate-600">
                                                <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                <span>{biz.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-100">
                                        <button 
                                            onClick={() => handleAddToLeads(biz)}
                                            disabled={isAdded || isAdding}
                                            className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                                                ${isAdded 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'}
                                            `}
                                        >
                                            {isAdding ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
                                            ) : isAdded ? (
                                                <><Check className="w-4 h-4 mr-2" /> Added to Leads</>
                                            ) : (
                                                <><Plus className="w-4 h-4 mr-2" /> Add to Leads</>
                                            )}
                                        </button>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
            
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-8">
                             <Pagination className="bg-white/80 backdrop-blur-sm p-2 rounded-xl shadow-sm border border-slate-200 inline-flex w-auto">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            // Simple logic to show start, end, and current around
                                            return page === 1 || 
                                                   page === totalPages || 
                                                   (page >= currentPage - 1 && page <= currentPage + 1);
                                        })
                                        .map((page, i, filteredPages) => {
                                            const showEllipsisBefore = i > 0 && page > filteredPages[i-1] + 1;
                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsisBefore && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            isActive={currentPage === page}
                                                            onClick={() => setCurrentPage(page)}
                                                            className="cursor-pointer"
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                </React.Fragment>
                                            );
                                        })}
                                    
                                    <PaginationItem>
                                        <PaginationNext 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FindCustomers;