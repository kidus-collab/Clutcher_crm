import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchWithJina } from './scraper';

// Load environment variables
dotenv.config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    jinaConfigured: !!process.env.JINA_API_KEY,
    serverStarted: true // Explicit flag indicating server has started
  });
});

// Scrape Endpoint with caching support
app.post('/api/scrape', async (req, res) => {
  try {
    const { query, useCache = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    console.log(`\n🔎 Scraping request received: "${query}"`);
    const startTime = Date.now();
    const results = await searchWithJina(query);
    const processingTime = Date.now() - startTime;
    
    console.log(`📤 Returning ${results.length} results in ${processingTime}ms\n`);
    
    // Add cache headers for client-side caching
    const response = {
      success: true,
      data: results,
      count: results.length,
      metadata: {
        query,
        timestamp: new Date().toISOString(),
        processingTime,
        cacheable: true,
        cacheTTL: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      }
    };
    
    // Set cache headers for HTTP caching
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'ETag': `"${query}-${results.length}"`,
      'Last-Modified': new Date().toUTCString()
    });
    
    return res.json(response);
    
  } catch (error) {
    console.error('❌ Scraping error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Cache invalidation endpoint
app.delete('/api/cache', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (query) {
      // In client-side caching, this signals the client to clear specific query cache
      console.log(`🗑️ Cache invalidation request for query: "${query}"`);
      return res.json({
        success: true,
        message: `Cache invalidated for query: ${query}`,
        query
      });
    } else {
      // Clear all cache
      console.log('🗑️ Global cache invalidation request');
      return res.json({
        success: true,
        message: 'All cache invalidated'
      });
    }
  } catch (error) {
    console.error('❌ Cache invalidation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 SCRAPER SERVER STARTED');
  console.log('='.repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔑 JINA_API_KEY: ${process.env.JINA_API_KEY ? '✅ Configured' : '❌ NOT SET'}`);
  console.log('='.repeat(50) + '\n');
  
  if (!process.env.JINA_API_KEY) {
    console.log('⚠️  WARNING: JINA_API_KEY is not set!');
    console.log('   Add it to your .env.local file:');
    console.log('   JINA_API_KEY=your_api_key_here\n');
  }
});
