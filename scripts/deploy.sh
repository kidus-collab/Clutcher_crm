#!/bin/bash

# Clutcher Deployment Script for Vercel
echo "🚀 Starting Clutcher Deployment to Vercel..."

# Check if Vercel CLI is installed
if !command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if !vercel whoami &> /dev/null; then
    echo "📝 Please login to Vercel first:"
    vercel login
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set environment variables for production
echo "⚙️ Setting up environment variables..."

# Required environment variables
ENV_VARS=(
  "VITE_API_URL"
  "JINA_API_KEY" 
  "GEMINI_API_KEY"
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
)

# Check if .env.local exists and copy required vars
if [ -f ".env.local" ]; then
    echo "📋 Found .env.local file"
    
    # Create .env.production for deployment
    cp .env.local .env.production
    
    echo "✅ Environment file prepared for production"
else
    echo "⚠️  .env.local not found. Please create it with required variables:"
    echo "   - VITE_API_URL (your deployed API URL)"
    echo "   - JINA_API_KEY (your Jina API key)"
    echo "   - GEMINI_API_KEY (your Gemini API key)"
    echo "   - SUPABASE_URL (your Supabase URL)"
    echo "   - SUPABASE_ANON_KEY (your Supabase anonymous key)"
    exit 1
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "📊 Cache Configuration:"
    echo "   • Client-side caching: IndexedDB (24-hour TTL)"
    echo "   • Server-side caching: Vercel Edge Cache (24-hour)"
    echo "   • Cache invalidation: Manual via Cache Manager"
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. Test the deployed application"
    echo "   2. Check cache functionality in browser"
    echo "   3. Monitor cache via Cache Manager in sidebar"
    echo ""
    echo "📝 Cache Management:"
    echo "   • Cache is stored locally in browser (IndexedDB)"
    echo "   • Automatic cleanup every hour"
    echo "   • Manual clear via Cache Manager"
    echo "   • Server cache headers set for 24-hour caching"
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi

echo "🎯 Deployment process completed!"