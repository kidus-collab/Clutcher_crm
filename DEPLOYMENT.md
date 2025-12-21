# Clutcher Deployment Guide

## Overview
This guide covers deploying the Clutcher application with client-side caching to Vercel.

## Caching Implementation

### Client-Side Caching (IndexedDB)
- **Storage**: IndexedDB in browser
- **TTL**: 24 hours per search query
- **Auto-cleanup**: Every hour (removes expired entries)
- **Features**: 
  - Automatic cache hit/miss detection
  - Cache statistics and health monitoring
  - Manual cache invalidation
  - Cache size monitoring

### Server-Side Caching (Vercel Edge)
- **HTTP Headers**: 24-hour cache for static assets
- **API Responses**: Cache headers for search results
- **Invalidation**: Manual via API endpoints

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Vercel CLI** (`npm install -g vercel`)
3. **Vercel Account** (create at [vercel.com](https://vercel.com))
4. **Environment Variables** in `.env.local`:
   ```
   VITE_API_URL=https://your-app.vercel.app/api
   JINA_API_KEY=your_jina_api_key
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Deployment Steps

### Option 1: Automated Deployment Script
```bash
# Make the script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### Option 2: Manual Deployment
```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# 3. Deploy to Vercel
vercel --prod

# 4. Set environment variables in Vercel dashboard
# Go to your Vercel project > Settings > Environment Variables
# Add all variables from .env.local
```

## Vercel Configuration

The `vercel.json` file includes:
- **Build configuration** for both frontend and server
- **API routes** pointing to serverless functions
- **Cache headers** for optimal performance
- **Environment variable mapping**

## Cache Management

### Accessing Cache Manager
1. Open the deployed application
2. Click the "Cache" button in the sidebar
3. View cache statistics and health
4. Clear cache manually if needed

### Cache Features
- **Statistics**: Total entries, size, oldest/newest entries
- **Health indicators**: Cache size warnings, empty cache alerts
- **Manual controls**: Clear all cache, refresh statistics
- **Auto-cleanup**: Expired entries removed hourly

## Environment Variables

### Required for Production
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Deployed API endpoint | `https://your-app.vercel.app/api` |
| `JINA_API_KEY` | Jina AI API key | `jina_xxxxxxxxx` |
| `GEMINI_API_KEY` | Gemini API key | `AIzaSyxxxxxxxx` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |

### Vercel-Specific
These are automatically mapped in `vercel.json`:
- `@api_url` → `VITE_API_URL`
- `@jina_api_key` → `JINA_API_KEY`
- And so on...

## Performance Optimization

### Cache Strategy
1. **First Load**: Check IndexedDB cache
2. **Cache Hit**: Return cached results instantly
3. **Cache Miss**: Call API, store results
4. **Background**: Auto-cleanup expired entries

### Browser Support
- **Chrome/Edge**: IndexedDB fully supported
- **Firefox**: IndexedDB fully supported
- **Safari**: IndexedDB fully supported
- **Mobile**: Full support on iOS/Android

## Troubleshooting

### Cache Issues
```javascript
// Clear cache programmatically
indexedDB.deleteDatabase('SearchCacheDB');

// Check cache status
const stats = await getCacheStats();
console.log('Cache stats:', stats);
```

### Common Issues
1. **Cache not working**: Check browser IndexedDB support
2. **Large cache size**: Clear cache via Cache Manager
3. **Stale data**: Cache expires after 24 hours automatically
4. **Deployment errors**: Verify all environment variables

### Performance Tips
1. **Monitor cache size**: Keep under 10MB for optimal performance
2. **Regular cleanup**: Cache auto-cleans hourly
3. **API limits**: Respect rate limits for Jina/Gemini APIs
4. **Browser storage**: IndexedDB typically allows 50MB+ per origin

## Monitoring

### Cache Health Indicators
- 🟢 **Healthy**: < 5MB, recent entries
- 🟡 **Warning**: 5-10MB or old entries
- 🔴 **Critical**: > 10MB or stale data

### Logs and Debugging
```bash
# Vercel logs
vercel logs

# Local development
npm run dev
```

## Security Considerations

1. **API Keys**: Never commit to version control
2. **Environment Variables**: Use Vercel's encrypted storage
3. **Cache Data**: Stored locally, not transmitted to server
4. **HTTPS**: All API calls use HTTPS in production

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] API endpoints respond correctly
- [ ] Cache works in browser
- [ ] Cache Manager accessible
- [ ] Search results cache properly
- [ ] Manual cache clear works
- [ ] Environment variables configured
- [ ] Performance is acceptable
- [ ] Mobile responsive works

## Support

For deployment issues:
1. Check Vercel dashboard for deployment logs
2. Verify environment variables are set
3. Test with different browsers
4. Clear browser cache if needed

## Updates and Maintenance

### Cache Updates
- Cache schema changes may require clearing existing cache
- New deployments automatically respect cache headers
- Monitor cache size regularly

### Application Updates
```bash
# Redeploy with latest changes
git pull origin main
./scripts/deploy.sh
```

---

**Note**: This caching implementation provides both performance and reliability benefits while maintaining data freshness through automatic expiration and manual invalidation options.