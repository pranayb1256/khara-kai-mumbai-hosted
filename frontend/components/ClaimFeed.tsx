'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getClaims, Claim } from '@/lib/api';
import { ClaimCard } from './ClaimCard';
import { ClaimFeedSkeleton } from './Skeleton';
import { 
  Loader2, 
  RefreshCw, 
  Filter, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'all' | 'verified' | 'debunked' | 'pending' | 'uncertain';
type StatusType = 'verified' | 'debunked' | 'pending' | 'uncertain' | 'confirmed' | 'contradicted' | 'in_progress' | 'unconfirmed';

const filterConfig: Record<FilterType, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'All', icon: TrendingUp, color: 'text-gray-600' },
  verified: { label: 'Verified', icon: CheckCircle, color: 'text-emerald-600' },
  debunked: { label: 'Debunked', icon: XCircle, color: 'text-rose-600' },
  pending: { label: 'Pending', icon: Clock, color: 'text-blue-600' },
  uncertain: { label: 'Uncertain', icon: AlertTriangle, color: 'text-amber-600' },
};

export const ClaimFeed = ({ keyProp }: { keyProp: number }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);
    
    try {
      const data = await getClaims();
      setClaims(data || []);
    } catch (err) {
      console.error('Failed to fetch claims', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch claims');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => fetchClaims(true), 10000);
    return () => clearInterval(interval);
  }, [keyProp, fetchClaims]);

  const filteredClaims = claims.filter(c => {
    // Filter by status
    if (filter !== 'all') {
      // Handle different status mappings
      const statusMap: Record<string, string[]> = {
        verified: ['verified', 'confirmed'],
        debunked: ['debunked', 'contradicted'],
        pending: ['pending', 'in_progress'],
        uncertain: ['uncertain', 'unconfirmed'],
      };
      const matchingStatuses = statusMap[filter] || [filter];
      if (!matchingStatuses.includes(c.status)) return false;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return c.text.toLowerCase().includes(query);
    }
    
    return true;
  });

  // Stats
  const stats = {
    total: claims.length,
    verified: claims.filter(c => ['verified', 'confirmed'].includes(c.status)).length,
    debunked: claims.filter(c => ['debunked', 'contradicted'].includes(c.status)).length,
    pending: claims.filter(c => ['pending', 'in_progress'].includes(c.status)).length,
  };

  if (loading && claims.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <ClaimFeedSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              Recent Verifications
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {claims.length} total
              </span>
              {refreshing && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Real-time fact-checking results from our AI verification system
            </p>
          </div>
          
          <button 
            onClick={() => fetchClaims(true)} 
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 font-medium">Total Claims</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-600">{stats.verified}</div>
            <div className="text-xs text-emerald-700 font-medium">Verified True</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <div className="text-2xl font-bold text-rose-600">{stats.debunked}</div>
            <div className="text-xs text-rose-700 font-medium">Debunked</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-xs text-blue-700 font-medium">Processing</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search claims..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          {(Object.keys(filterConfig) as FilterType[]).map((f) => {
            const config = filterConfig[f];
            const Icon = config.icon;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f 
                    ? 'bg-blue-100 text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${filter === f ? 'text-blue-600' : config.color}`} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700">
          <p className="font-medium">Error loading claims</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => fetchClaims()}
            className="mt-3 text-sm font-medium underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm"
        >
          <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">No claims found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : 'Try changing the filter or submit a new claim.'
            }
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setFilter('all'); }}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div layout className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      
      {/* Load More / Pagination placeholder */}
      {filteredClaims.length >= 50 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Showing first 50 claims. More claims available.
          </p>
        </div>
      )}
    </div>
  );
};
