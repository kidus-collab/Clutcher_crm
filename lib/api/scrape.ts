import { Business } from '../../types';
import { saveBusinesses } from '../database/supabase';

// Use environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/scrape';

export interface ScrapeRequest {
  query: string;
  saveToDatabase?: boolean;
}

export interface ScrapeResponse {
  success: boolean;
  data: Business[];
  error?: string;
  count: number;
}

/**
 * Scrape businesses by calling the backend API
 * This replaces the direct Jina call to avoid CORS
 */
export async function scrapeBusinesses(request: ScrapeRequest): Promise<ScrapeResponse> {
  try {
    if (!request.query || request.query.trim().length === 0) {
      return {
        success: false,
        data: [],
        error: 'Query is required',
        count: 0,
      };
    }

    console.log(`Calling backend scraper at ${API_URL}`);
    
    // Call the backend server
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: request.query }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Scraping failed');
    }

    const businesses: Business[] = result.data || [];

    // Optionally save to database (client-side save, though server could do this too)
    // Ideally server does this, but keeping logic here for now as requested
    if (request.saveToDatabase && businesses.length > 0) {
      try {
        const saved = await saveBusinesses(businesses);
        console.log(`Saved ${saved.length} businesses to database`);
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Don't fail the whole request if DB save fails, just log it
      }
    }

    return {
      success: true,
      data: businesses,
      count: businesses.length,
    };
  } catch (error) {
    console.error('Scrape error:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      count: 0,
    };
  }
}
