import { openDB } from 'idb';
class IndexedDBCache {
    constructor() {
        this.db = null;
        this.DB_NAME = 'SearchCacheDB';
        this.STORE_NAME = 'searches';
        this.VERSION = 1;
        this.DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
    }
    async init() {
        if (this.db)
            return;
        try {
            this.db = await openDB(this.DB_NAME, this.VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'query' });
                        store.createIndex('by-timestamp', 'timestamp');
                        store.createIndex('by-expires', 'expires');
                    }
                },
            });
            console.log('✅ IndexedDB cache initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize IndexedDB cache:', error);
            throw error;
        }
    }
    async get(query) {
        await this.init();
        if (!this.db)
            return null;
        try {
            const cached = await this.db.get(this.STORE_NAME, query);
            if (!cached) {
                return null;
            }
            // Check if cache has expired
            if (Date.now() > cached.expires) {
                await this.delete(query);
                console.log(`🕐 Cache expired for query: "${query}"`);
                return null;
            }
            console.log(`📦 Cache hit for query: "${query}"`);
            return cached;
        }
        catch (error) {
            console.error('❌ Error getting cached result:', error);
            return null;
        }
    }
    async set(query, results, metadata) {
        await this.init();
        if (!this.db)
            return;
        if (!metadata.cacheable) {
            console.log(`⚠️ Results not cacheable for query: "${query}"`);
            return;
        }
        try {
            const cachedResult = {
                query,
                results,
                timestamp: Date.now(),
                expires: Date.now() + this.DEFAULT_TTL,
                metadata
            };
            await this.db.put(this.STORE_NAME, cachedResult);
            console.log(`💾 Cached results for query: "${query}" (${results.length} items)`);
        }
        catch (error) {
            console.error('❌ Error caching result:', error);
        }
    }
    async delete(query) {
        await this.init();
        if (!this.db)
            return;
        try {
            await this.db.delete(this.STORE_NAME, query);
            console.log(`🗑️ Deleted cache for query: "${query}"`);
        }
        catch (error) {
            console.error('❌ Error deleting cache:', error);
        }
    }
    async clear() {
        await this.init();
        if (!this.db)
            return;
        try {
            await this.db.clear(this.STORE_NAME);
            console.log('🗑️ Cleared all cache');
        }
        catch (error) {
            console.error('❌ Error clearing cache:', error);
        }
    }
    async cleanup() {
        await this.init();
        if (!this.db)
            return;
        try {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const index = store.index('by-expires');
            const now = Date.now();
            let deletedCount = 0;
            for await (const cursor of index.iterate(undefined, 'next')) {
                if (cursor.value.expires < now) {
                    await cursor.delete();
                    deletedCount++;
                }
                else {
                    break; // Since index is sorted by expires, we can stop
                }
            }
            if (deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);
            }
        }
        catch (error) {
            console.error('❌ Error cleaning up cache:', error);
        }
    }
    async getAll() {
        await this.init();
        if (!this.db)
            return [];
        try {
            const results = await this.db.getAll(this.STORE_NAME);
            return results.filter(result => Date.now() <= result.expires);
        }
        catch (error) {
            console.error('❌ Error getting all cache:', error);
            return [];
        }
    }
    async getStats() {
        await this.init();
        if (!this.db)
            return { totalEntries: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
        try {
            const results = await this.db.getAll(this.STORE_NAME);
            const validResults = results.filter(result => Date.now() <= result.expires);
            const timestamps = validResults.map(r => r.timestamp);
            const totalSize = JSON.stringify(validResults).length;
            return {
                totalEntries: validResults.length,
                totalSize,
                oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
                newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
            };
        }
        catch (error) {
            console.error('❌ Error getting cache stats:', error);
            return { totalEntries: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
        }
    }
}
// Export singleton instance
export const cache = new IndexedDBCache();
// Initialize cache on module load
cache.init().catch(console.error);
// Auto-cleanup expired entries every hour
setInterval(() => {
    cache.cleanup().catch(console.error);
}, 60 * 60 * 1000);
