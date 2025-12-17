// Types
export interface SocialProfile {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook';
  url: string;
  handle: string;
}

export interface Business {
  id: string;
  name: string;
  website: string;
  email: string;
  phone: string;
  socials: SocialProfile[];
  description?: string;
}

// Jina API response types
export interface JinaSearchResponse {
  code: number;
  status: number;
  data: JinaResult[];
}

export interface JinaResult {
  title: string;
  description: string;
  url: string;
  content: string;
}

// ============================================
// EXTRACTION UTILITIES
// ============================================

/**
 * Extract email from text content
 */
function extractEmail(text: string): string {
  if (!text) return '';
  // Match common email patterns, excluding image/file extensions
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches) return '';
  
  // Filter out common false positives
  const validEmail = matches.find(email => 
    !email.endsWith('.png') && 
    !email.endsWith('.jpg') && 
    !email.endsWith('.gif') &&
    !email.includes('example.com') &&
    !email.includes('yourdomain')
  );
  return validEmail || '';
}

/**
 * Extract phone number from text content
 */
function extractPhone(text: string): string {
  if (!text) return '';
  // Match international and local phone formats
  const phonePatterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g,
  ];
  
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches && matches[0]) {
      const phone = matches[0].trim().replace(/\s+/g, ' ');
      // Must be at least 10 digits
      if (phone.replace(/\D/g, '').length >= 10) {
        return phone;
      }
    }
  }
  return '';
}

/**
 * Extract social media links from content
 */
function extractSocials(text: string): SocialProfile[] {
  const socials: SocialProfile[] = [];
  if (!text) return socials;
  
  // LinkedIn
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9-]+)/i);
  if (linkedinMatch) {
    socials.push({
      platform: 'linkedin',
      url: `https://linkedin.com/company/${linkedinMatch[1]}`,
      handle: linkedinMatch[1]
    });
  }
  
  // Twitter/X
  const twitterMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
  if (twitterMatch && twitterMatch[1] !== 'intent' && twitterMatch[1] !== 'share') {
    socials.push({
      platform: 'twitter',
      url: `https://twitter.com/${twitterMatch[1]}`,
      handle: `@${twitterMatch[1]}`
    });
  }
  
  // Instagram
  const instagramMatch = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
  if (instagramMatch && instagramMatch[1] !== 'p' && instagramMatch[1] !== 'explore') {
    socials.push({
      platform: 'instagram',
      url: `https://instagram.com/${instagramMatch[1]}`,
      handle: `@${instagramMatch[1]}`
    });
  }
  
  // Facebook
  const facebookMatch = text.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/i);
  if (facebookMatch && facebookMatch[1] !== 'sharer' && facebookMatch[1] !== 'share') {
    socials.push({
      platform: 'facebook',
      url: `https://facebook.com/${facebookMatch[1]}`,
      handle: facebookMatch[1]
    });
  }
  
  return socials;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Clean business name from title
 */
function cleanBusinessName(title: string): string {
  if (!title) return '';
  
  let name = title;

  // 1. Remove "Who is", "About", prefix
  name = name.replace(/^(Who is|About|Welcome to)\s+/i, '');

  // 2. Remove common separators and everything after them ( | - : )
  // But be careful not to remove "Co-Op" or hyphenated names
  // We look for separators followed by common SEO terms or location hints
  name = name.replace(/\s+[-|:–]\s+(Home|Official|Website|Site|Contact|About|Page|Welcome|The Best|Top|List).*$/i, '');
  
  // 3. Remove location suffixes if they strictly follow a separator
  // e.g. "Acme Corp - New York" -> "Acme Corp"
   name = name.replace(/\s+[-|:–]\s+(New York|London|Dubai|Addis Ababa|Ethiopia|USA|UK|Inc|LLC|Ltd).*$/i, '');
  
  // 4. Handle "Descriptor - Name" (e.g. "Digital Marketing - M Booth")
  // If the last part is short and capitalized, it might be the name
  if (name.includes(' - ')) {
      const parts = name.split(' - ');
      const lastPart = parts[parts.length - 1];
      // If last part is capitalised and shorter than first part, assume it's the name
      if (lastPart.length < parts[0].length && /^[A-Z]/.test(lastPart)) {
          // Check if first part looks like a description (contains "Marketing", "Agency")
          if (/Agency|Marketing|Solutions|Consulting|Services|Experts/i.test(parts[0])) {
               name = lastPart;
          }
      }
  }

  // 5. Remove generic SEO suffixes that might remain
  name = name.replace(/\s(LLC|Inc|Ltd|Pvt)\.?\s*$/i, ' $1'); // Normalize suffix spacing
  name = name.split('|')[0].trim();
  // Don't blindly split by hyphen anymore as it breaks "Co-Op" or "Multi-Word-Name" unless we are sure
  // name = name.split('–')[0].trim(); 
  
  // 5. Final fallback cleanup
  name = name.trim();

  // 6. Hard filter for length and news-like structure
  // If still too long (> 50 chars) or contains news verbs, likely not a business name
  if (name.length > 50 || /\b(Launches|Secures|Announces|Expands|Reports|vs|Review)\b/i.test(name)) {
      // Try to salvage by taking the first few words if it looks like "Company X Launches..."
      // But safer to just return substring or empty if it's clearly garbage
      if (name.length > 50) return name.substring(0, 50) + '...';
  }

  // 7. Filter generic "Log in" titles
  if (/Log in|Sign up|Welcome back/i.test(name)) return '';

  return name;
}

// ============================================
// QUERY PARSING & OPTIMIZATION (With GLM-4)
// ============================================

interface ParsedQuery {
  topic: string;
  location: string;
  count: number;
}

/**
 * Call GLM-4 to optimize the search query
 */
/**
 * Call Gemini API to optimize the search query
 */
async function optimizeQueryWithGemini(rawQuery: string): Promise<string> {
   const apiKey = process.env.GEMINI_API_KEY;
   const exclusionKeywords = " -blog -review -guide -top -best -article -list -directory";
   
   if (!apiKey) {
       console.log('⚠️ GEMINI_API_KEY missing, using raw query with exclusions');
       return rawQuery + exclusionKeywords;
   }

   try {
       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({
               contents: [{
                   parts: [{
                       text: `You are an expert Search Query Optimizer for a B2B lead generation scraper. Your goal is to convert a user's broad or natural language request into a specific, high-intent search query that will find official business websites and contact pages. 

Rules:
1. Focus on finding "official site", "companies", or "agencies" keywords.
2. Include the specific location if mentioned.
3. Remove conversational filler ("find me", "look for").
4. ALWAYS append these exclusion keywords to filter out noise: -blog -review -guide -top -best -article -list -directory
5. Return ONLY the single optimized query string.

Example:
User: "Tourism Ethiopia"
Output: "tour operators travel agencies Ethiopia official site -blog -review -guide -top -best -article -list -directory"

User: "Dental clinics in Berlin"
Output: "dentists dental clinics Berlin companies -blog -review -guide -top -best -article -list -directory"

User: "${rawQuery}"`
                   }]
               }]
           })
       });

       if (!response.ok) {
           console.error('❌ Gemini API Error:', await response.text());
           return rawQuery;
       }

       const data = await response.json();
       const optimized = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawQuery;
       // Remove any quotes if the LLM added them
       return optimized.replace(/^"|"$/g, '');
   } catch (error) {
       console.error('❌ Failed to optimize query with Gemini:', error);
       return rawQuery; 
   }
}


/**
 * Parse user query to extract count
 */
function parseCount(query: string): number {
  const match = query.match(/^(\d+)\s+|\s+(\d+)\s+/);
  if (match) {
      let val = parseInt(match[1] || match[2], 10);
      return Math.min(val, 1000); // Cap at 1000 instead of 50
  }
  return 20; // Default increased to 20
}

// ============================================
// JINA SEARCH
// ============================================

/**
 * Search using Jina AI's web search
 */
async function searchJina(query: string): Promise<JinaResult[]> {
  const jinaApiKey = process.env.JINA_API_KEY;
  
  if (!jinaApiKey) {
    console.error('❌ JINA_API_KEY is not set!');
    return [];
  }

  const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
  console.log(`🔍 Jina Search: ${query}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${jinaApiKey}`,
        'X-Return-Format': 'json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Jina API Error (${response.status}): ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`✅ Jina returned ${data.data?.length || 0} results`);
    
    return data.data || [];
  } catch (error) {
    console.error(`❌ Jina fetch error:`, error);
    return [];
  }
}

/**
 * Alternative: Use Jina Reader to scrape a specific URL for more content
 */
async function readUrl(url: string): Promise<string> {
  const jinaApiKey = process.env.JINA_API_KEY;
  
  if (!jinaApiKey) return '';
  
  try {
    const readerUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(readerUrl, {
      headers: {
        'Authorization': `Bearer ${jinaApiKey}`,
        'X-Return-Format': 'text',
      }
    });
    
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.log(`Could not read ${url}`);
  }
  
  return '';
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================


/**
 * Extract businesses from Jina results using Gemini
 */
async function extractBusinessesFromResults(results: JinaResult[]): Promise<Business[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || results.length === 0) return [];

  console.log(`🤖 Extracting data from ${results.length} results using Gemini...`);

  // Prepare the input text (limit to reasonable size to avoid massive token usage if many results)
  // We'll take title, description, and the first 2000 chars of content for each result
  const contentToAnalyze = results.map((r, i) => 
      `Result ${i + 1}:
       URL: ${r.url}
       Title: ${r.title}
       Description: ${r.description}
       Content Snippet: ${(r.content || '').substring(0, 2000)}`
  ).join('\n\n----------------\n\n');

  try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              contents: [{
                  parts: [{
                      text: `You are an expert extraction algorithm for a sales engine. Analyze the provided search results and extract the company's official contact information, social media links, and business name. 

Rules:
1. If a result is a blog post, a review (e.g. "Top 10..."), a directory listing multiple companies, or a 'Contact Us' page for a different site, IGNORE IT.
2. Only extract data for a DETAILS page of a specific business or the OFFICIAL website.
3. Return an empty array [] if no specific business listing is found.
4. Input contains multiple search results. Extract data for ALL valid businesses found.
5. Return the results in the following JSON format:

{
"type": "ARRAY",
"items": {
  "type": "OBJECT",
  "properties": {
    "businessName": { "type": "STRING", "description": "The official registered name." },
    "officialWebsite": { "type": "STRING", "description": "The primary official website URL." },
    "phoneNumber": { "type": "STRING", "description": "The main contact phone number." },
    "emailAddress": { "type": "STRING", "description": "The primary business email." },
    "address": { "type": "STRING", "description": "The full physical address." },
    "socialMedia": {
      "type": "OBJECT",
      "properties": {
        "facebook": { "type": "STRING" },
        "linkedin": { "type": "STRING" },
        "instagram": { "type": "STRING" },
        "twitter": { "type": "STRING" }
      }
    },
    "yearFounded": { "type": "INTEGER" },
    "description": { "type": "STRING", "description": "Short description of the business." }
  },
  "required": ["businessName"]
}
}

Return ONLY the raw JSON array (e.g. [{...}, {...}]). Do not use markdown notation.

Input Data:
${contentToAnalyze}`
                  }]
              }]
          })
      });

      if (!response.ok) {
          console.error('❌ Gemini Extraction Error:', await response.text());
          return [];
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
      
      // Clean up markdown code blocks if present
      const cleanJson = textResponse.replace(/^```json\s*|\s*```$/g, '');
      
      try {
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed)) {
              // Map to Business interface
              return parsed.map((item: any, idx: number) => ({
                  id: `gemini-${Date.now()}-${idx}`,
                  name: item.businessName || 'Unknown',
                  website: item.officialWebsite || '',
                  email: item.emailAddress || '',
                  phone: item.phoneNumber || '',
                  socials: [
                      item.socialMedia?.linkedin ? { platform: 'linkedin', url: item.socialMedia.linkedin, handle: '' } : null,
                      item.socialMedia?.twitter ? { platform: 'twitter', url: item.socialMedia.twitter, handle: '' } : null,
                      item.socialMedia?.facebook ? { platform: 'facebook', url: item.socialMedia.facebook, handle: '' } : null,
                      item.socialMedia?.instagram ? { platform: 'instagram', url: item.socialMedia.instagram, handle: '' } : null,
                  ].filter(Boolean) as SocialProfile[],
                  description: item.description || ''
              }));
          }
      } catch (e) {
          console.error('❌ Failed to parse Gemini JSON:', cleanJson);
      }
      
      return [];
  } catch (error) {
      console.error('❌ Gemini Extraction Exception:', error);
      return [];
  }
}

export async function searchWithJina(rawQuery: string): Promise<Business[]> {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 SEARCH REQUEST: "${rawQuery}"`);
  console.log('='.repeat(50));
  
  // Check API key
  if (!process.env.JINA_API_KEY) {
    console.error('❌ FATAL: JINA_API_KEY environment variable is not set!');
    console.error('Please add JINA_API_KEY to your .env.local file');
    return [];
  }
  
  // 1. Parse target count
  const targetCount = parseCount(rawQuery);
  console.log(`🎯 Target Count: ${targetCount}`);
  
  // 2. Optimize Query with Gemini
  console.log('🤖 Optimizing query with Gemini...');
  const optimizedQuery = await optimizeQueryWithGemini(rawQuery);
  console.log(`✨ Optimized Query: "${optimizedQuery}"`);
  
  const allBusinesses = new Map<string, Business>();
  let attempts = 0;
  const maxAttempts = Math.max(5, Math.ceil(targetCount / 5) + 5); 
  
  // Base variations
  const baseVariations = [
      optimizedQuery,
      `${optimizedQuery} official site`,
      `${optimizedQuery} contact info`,
      `companies matching ${optimizedQuery}`
  ];

  // Dynamic loop to meet target count
  while (allBusinesses.size < targetCount && attempts < maxAttempts) {
      attempts++;
      
      // Select query: cycle through variations or generic fallback
      let queryToCheck = baseVariations[(attempts - 1) % baseVariations.length];
      
      if (attempts > baseVariations.length) {
          queryToCheck = `${optimizedQuery} page ${attempts - baseVariations.length + 1}`;
      }

      console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}: Searching for "${queryToCheck}" (Current: ${allBusinesses.size}/${targetCount})`);
      
      const results = await searchJina(queryToCheck);
      
      if (results.length === 0) {
          console.log('⚠️ No results for this query, skipping...');
          continue;
      }

      // 3. Extract using Gemini (Batch) for detailed parsing
      let extractedBusinesses = await extractBusinessesFromResults(results);

      // FALLBACK: If Gemini extraction fails or returns 0 results (e.g. key expired), use Regex method
      if (extractedBusinesses.length === 0) {
          console.log('⚠️ Gemini extraction returned no data or failed. Falling back to Regex extraction.');
          
          
          const exclusionRegex = /blog|review|guide|top\s*\d+|best|article|list|directory/i;

          for (const result of results) {
              if (allBusinesses.size >= targetCount) break;
              if (!result.url) continue;
              
              // Helper: Skip if title or URL looks like a blog/list
              if (exclusionRegex.test(result.title) || exclusionRegex.test(result.url)) {
                  continue;
              }
              
              const domain = extractDomain(result.url);
              
              // Skip if we already have this domain
              if (allBusinesses.has(domain)) continue;
              
              // Extract business info via Regex
              const content = result.content || result.description || '';
              const name = cleanBusinessName(result.title);
              
              // Skip if no usable name
              if (!name || name.length < 2) continue;
              
              const business: Business = {
                  id: `jina-${Date.now()}-${allBusinesses.size}`,
                  name: name,
                  website: domain,
                  email: extractEmail(content),
                  phone: extractPhone(content),
                  socials: extractSocials(content),
                  description: result.description?.substring(0, 300) || ''
              };
              
              // Add to list
              extractedBusinesses.push(business);
          }
      }
      
      let newAdded = 0;
      for (const business of extractedBusinesses) {
          if (allBusinesses.size >= targetCount) break;
          
          // Domain Check
          const domain = extractDomain(business.website || `http://placeholder-${Date.now()}.com`);
          if (allBusinesses.has(domain)) continue;
          
          if (!business.name || business.name === 'Unknown') continue;

          console.log(`✅ Found: ${business.name} (${business.website})`);
          allBusinesses.set(domain, business);
          newAdded++;
      }
      
      console.log(`📝 Added ${newAdded} new businesses in this batch.`);
      
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 800));
  }
  
  const results = Array.from(allBusinesses.values());
  console.log(`\n📊 TOTAL RESULTS: ${results.length}/${targetCount} requested`);
  console.log('='.repeat(50) + '\n');
  
  return results;
}