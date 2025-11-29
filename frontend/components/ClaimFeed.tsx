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
  all: { label: 'All', icon: TrendingUp, color: 'text-gray-500' },
  verified: { label: 'Verified', icon: CheckCircle, color: 'text-green-600' },
  debunked: { label: 'Debunked', icon: XCircle, color: 'text-red-600' },
  pending: { label: 'Pending', icon: Clock, color: 'text-blue-600' },
  uncertain: { label: 'Uncertain', icon: AlertTriangle, color: 'text-amber-600' },
};

interface ClaimFeedProps {
  keyProp: number;
  selectedClaim?: Claim | null;
  onClaimSelect?: (claim: Claim) => void;
}

export const ClaimFeed = ({ keyProp, selectedClaim, onClaimSelect }: ClaimFeedProps) => {
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
      // Auto-select first claim if none selected
      if (data && data.length > 0 && !selectedClaim && onClaimSelect) {
        onClaimSelect(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch claims', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch claims');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClaim, onClaimSelect]);

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
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <ClaimFeedSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">Live Claims</h3>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {claims.length} total
          </span>
          {refreshing && (
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
          )}
        </div>
        
        <button 
          onClick={() => fetchClaims(true)} 
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search claims..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
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
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {(Object.keys(filterConfig) as FilterType[]).map((f) => {
          const config = filterConfig[f];
          const Icon = config.icon;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${filter === f ? config.color : ''}`} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <p className="font-medium">Error loading claims</p>
          <p className="text-sm mt-1 text-red-600">{error}</p>
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
          className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200"
        >
          <Filter className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-900">No claims found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : 'Try changing the filter or submit a new claim.'
            }
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setFilter('all'); }}
              className="mt-4 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredClaims.map((claim) => (
              <ClaimCard 
                key={claim.id} 
                claim={claim} 
                isSelected={selectedClaim?.id === claim.id}
                onClick={() => onClaimSelect?.(claim)}
                compact
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      
      {/* Load More placeholder */}
      {filteredClaims.length >= 50 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            Showing first 50 claims. More available.
          </p>
        </div>
      )}
    </div>
  );
};
