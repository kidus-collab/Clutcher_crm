/**
 * Extract email from text content
 */
function extractEmail(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? matches[0] : '';
}
/**
 * Extract phone number from text content
 */
function extractPhone(text) {
    const phoneRegex = /(\+?[\d\s\-().]{10,})/g;
    const matches = text.match(phoneRegex);
    if (matches) {
        // Clean up the first match
        return matches[0].trim().replace(/\s+/g, ' ');
    }
    return '';
}
/**
 * Extract social media links from content
 */
function extractSocials(text, url) {
    const socials = [];
    // LinkedIn
    const linkedinMatch = text.match(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9-]+)/i);
    if (linkedinMatch) {
        socials.push({
            platform: 'linkedin',
            url: `https://linkedin.com/company/${linkedinMatch[1]}`,
            handle: linkedinMatch[1]
        });
    }
    // Twitter/X
    const twitterMatch = text.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
    if (twitterMatch) {
        socials.push({
            platform: 'twitter',
            url: `https://twitter.com/${twitterMatch[1]}`,
            handle: `@${twitterMatch[1]}`
        });
    }
    // Instagram
    const instagramMatch = text.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
    if (instagramMatch) {
        socials.push({
            platform: 'instagram',
            url: `https://instagram.com/${instagramMatch[1]}`,
            handle: `@${instagramMatch[1]}`
        });
    }
    // Facebook
    const facebookMatch = text.match(/facebook\.com\/([a-zA-Z0-9.]+)/i);
    if (facebookMatch) {
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
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    }
    catch {
        return url;
    }
}
/**
 * Search for businesses using Jina AI
 * @param query Search query like "100 clinics in Addis Ababa"
 * @returns Array of Business objects
 */
export async function searchWithJina(query) {
    const jinaApiKey = process.env.JINA_API_KEY;
    const headers = {
        'Accept': 'application/json',
    };
    if (jinaApiKey) {
        headers['Authorization'] = `Bearer ${jinaApiKey}`;
    }
    const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
        method: 'GET',
        headers,
    });
    if (!response.ok) {
        throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
        return [];
    }
    // Convert Jina results to Business objects
    const businesses = data.data
        .filter(result => result.title && result.url)
        .map((result, index) => {
        const content = result.content || result.description || '';
        return {
            id: `jina-${Date.now()}-${index}`,
            name: result.title,
            website: extractDomain(result.url),
            email: extractEmail(content),
            phone: extractPhone(content),
            description: result.description || content.substring(0, 200),
            socials: extractSocials(content, result.url),
        };
    });
    return businesses;
}
export const jinaScraper = {
    name: 'jina',
    search: searchWithJina,
};
