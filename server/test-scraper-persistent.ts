
import dotenv from 'dotenv';
import path from 'path';
import { searchWithJina } from './scraper.ts';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
    // Request a small but > 1 page count to test looping (e.g. 7 or 12)
    // Assuming base search returns ~5-10 results
    const query = "12 software companies in Ethiopia";
    console.log(`Testing query: "${query}"`);
    
    // Check if the loop keeps running until it hits 12
    const results = await searchWithJina(query);
    
    console.log(`\nFinal Results Count: ${results.length}`);
    results.forEach((b, i) => {
        console.log(`${i+1}. ${b.name} (${b.website})`);
    });
}

runTest();
