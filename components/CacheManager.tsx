import React, { useState, useEffect } from 'react';
import GlassCard from './ui/GlassCard';
import { Database, Trash2, RefreshCw, Clock, HardDrive, AlertTriangle } from 'lucide-react';
import { clearCache, getCacheStats } from '../lib/api/scrape';

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

const CacheManager: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all cached search results? This will remove all saved searches and you\'ll need to search again.')) {
      return;
    }

    setLoading(true);
    try {
      await clearCache();
      await loadStats();
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadStats();
    setLoading(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (!stats) {
    return (
      <div className="p-4 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading cache statistics...
      </div>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          Cache Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh cache stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading}
            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
            title="Clear all cache"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <span className="text-xs text-indigo-600 font-medium">ENTRIES</span>
          </div>
          <div className="text-2xl font-bold text-indigo-900">{stats.totalEntries}</div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            <span className="text-xs text-emerald-600 font-medium">SIZE</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900">{formatBytes(stats.totalSize)}</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="text-xs text-amber-600 font-medium">OLDEST</span>
          </div>
          <div className="text-sm font-bold text-amber-900">
            {stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleDateString() : 'N/A'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">NEWEST</span>
          </div>
          <div className="text-sm font-bold text-purple-900">
            {stats.newestEntry ? new Date(stats.newestEntry).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* Cache Health Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Cache Health</h3>
          {stats.totalEntries === 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Empty Cache</span>
            </div>
          )}
          {stats.totalSize > 10 * 1024 * 1024 && ( // > 10MB
            <div className="flex items-center gap-1 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Large Cache</span>
            </div>
          )}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              stats.totalSize > 10 * 1024 * 1024 ? 'bg-rose-500' : 
              stats.totalSize > 5 * 1024 * 1024 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ 
              width: `${Math.min(100, (stats.totalSize / (10 * 1024 * 1024)) * 100)}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0 MB</span>
          <span>10 MB</span>
        </div>
      </div>

      {/* Detailed Information */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="text-sm font-medium text-slate-700">Detailed Information</span>
          <RefreshCw className={`w-4 h-4 text-slate-600 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
        
        {showDetails && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Total Entries:</span>
                <span className="font-medium text-slate-800 ml-2">{stats.totalEntries}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Size:</span>
                <span className="font-medium text-slate-800 ml-2">{formatBytes(stats.totalSize)}</span>
              </div>
              <div>
                <span className="text-slate-500">Oldest Entry:</span>
                <span className="font-medium text-slate-800 ml-2">{formatDate(stats.oldestEntry)}</span>
              </div>
              <div>
                <span className="text-slate-500">Newest Entry:</span>
                <span className="font-medium text-slate-800 ml-2">{formatDate(stats.newestEntry)}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Cache Information</h4>
              <div className="text-xs text-slate-600 space-y-1">
                <p>• Cache stores search results for 24 hours</p>
                <p>• Automatic cleanup runs every hour</p>
                <p>• Cache is stored locally in your browser</p>
                <p>• Clear cache if you experience issues with stale data</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
        <button
          onClick={handleClearAll}
          disabled={loading}
          className="flex-1 py-2 px-4 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Cache
        </button>
      </div>
    </GlassCard>
  );
};

export default CacheManager;