import { saveBusinesses } from '../database/supabase';
import { cache } from '../cache/indexedDBCache';
// Use environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/scrape';
/**
 * Scrape businesses by calling the backend API with caching support
 * This replaces the direct Jina call to avoid CORS
 */
export async function scrapeBusinesses(request) {
    try {
        if (!request.query || request.query.trim().length === 0) {
            return {
                success: false,
                data: [],
                error: 'Query is required',
                count: 0,
            };
        }
        const normalizedQuery = request.query.trim().toLowerCase();
        const useCache = request.useCache !== false; // Default to true
        // Check cache first (if enabled)
        if (useCache) {
            try {
                const cachedResult = await cache.get(normalizedQuery);
                if (cachedResult) {
                    console.log(`📦 Using cached results for query: "${request.query}"`);
                    // Optionally save to database if requested
                    if (request.saveToDatabase && cachedResult.results.length > 0) {
                        try {
                            const saved = await saveBusinesses(cachedResult.results);
                            console.log(`Saved ${saved.length} businesses to database from cache`);
                        }
                        catch (dbError) {
                            console.error('Database save error from cache:', dbError);
                        }
                    }
                    return {
                        success: true,
                        data: cachedResult.results,
                        count: cachedResult.results.length,
                        fromCache: true,
                        metadata: {
                            query: cachedResult.query,
                            timestamp: new Date(cachedResult.timestamp).toISOString(),
                            processingTime: cachedResult.metadata.processingTime,
                            cacheable: cachedResult.metadata.cacheable,
                            cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
                        }
                    };
                }
            }
            catch (cacheError) {
                console.error('Cache read error:', cacheError);
                // Continue with API call if cache fails
            }
        }
        console.log(`Calling backend scraper at ${API_URL}`);
        // Call the backend server
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: request.query,
                useCache: useCache
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Scraping failed');
        }
        const businesses = result.data || [];
        // Cache the results (if cacheable and enabled)
        if (useCache && result.metadata?.cacheable && businesses.length > 0) {
            try {
                await cache.set(normalizedQuery, businesses, {
                    processingTime: result.metadata.processingTime || 0,
                    count: businesses.length,
                    cacheable: result.metadata.cacheable
                });
                console.log(`💾 Cached results for query: "${request.query}"`);
            }
            catch (cacheError) {
                console.error('Cache write error:', cacheError);
            }
        }
        // Optionally save to database (client-side save, though server could do this too)
        // Ideally server does this, but keeping logic here for now as requested
        if (request.saveToDatabase && businesses.length > 0) {
            try {
                const saved = await saveBusinesses(businesses);
                console.log(`Saved ${saved.length} businesses to database`);
            }
            catch (dbError) {
                console.error('Database save error:', dbError);
                // Don't fail the whole request if DB save fails, just log it
            }
        }
        return {
            success: true,
            data: businesses,
            count: businesses.length,
            fromCache: false,
            metadata: result.metadata
        };
    }
    catch (error) {
        console.error('Scrape error:', error);
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            count: 0,
        };
    }
}
/**
 * Clear cache for a specific query or all cache
 */
export async function clearCache(query) {
    try {
        if (query) {
            await cache.delete(query.trim().toLowerCase());
            console.log(`🗑️ Cleared cache for query: "${query}"`);
        }
        else {
            await cache.clear();
            console.log('🗑️ Cleared all cache');
        }
        return { success: true };
    }
    catch (error) {
        console.error('Cache clear error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
/**
 * Get cache statistics
 */
export async function getCacheStats() {
    try {
        return await cache.getStats();
    }
    catch (error) {
        console.error('Cache stats error:', error);
        return null;
    }
}
