import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchWithJina } from './scraper.ts';

// Load environment variables
dotenv.config({ path: '.env.local' });
// Also try loading from .env if .env.local doesn't exist
dotenv.config();

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

// Scrape Endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    console.log(`\n🔎 Scraping request received: "${query}"`);
    const results = await searchWithJina(query);
    
    console.log(`📤 Returning ${results.length} results\n`);
    
    return res.json({
      success: true,
      data: results,
      count: results.length
    });
    
  } catch (error) {
    console.error('❌ Scraping error:', error);
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
