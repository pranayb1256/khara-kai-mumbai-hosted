'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Globe, 
  Loader2, 
  Share2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Zap
} from 'lucide-react';
import { Claim } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShareModal } from './ShareModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ClaimCardProps {
  claim: Claim;
}

const statusConfig = {
  verified: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    bgSolid: 'bg-emerald-500',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Verified True',
  },
  debunked: {
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    bgSolid: 'bg-rose-500',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800',
    label: 'False / Debunked',
  },
  uncertain: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    bgSolid: 'bg-amber-500',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Uncertain',
  },
  pending: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    bgSolid: 'bg-blue-500',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    label: 'Verifying...',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    bgSolid: 'bg-blue-500',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    label: 'Processing...',
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    bgSolid: 'bg-emerald-500',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Confirmed',
  },
  contradicted: {
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    bgSolid: 'bg-rose-500',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800',
    label: 'Contradicted',
  },
  unconfirmed: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    bgSolid: 'bg-amber-500',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Unconfirmed',
  },
};

type StatusKey = keyof typeof statusConfig;

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim }) => {
  const [lang, setLang] = useState<'en' | 'hi' | 'mr'>('en');
  const [showEvidence, setShowEvidence] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const status = claim.status as StatusKey;
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  const isLoading = status === 'pending' || status === 'in_progress';
  const hasEvidence = claim.evidence && Array.isArray(claim.evidence) && claim.evidence.length > 0;
  const hasExplanation = claim.explanation || claim.explanations;
  const explanation = claim.explanation || claim.explanations;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-lg',
          config.border
        )}
      >
        {/* Status Stripe */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", config.bgSolid)} />

        <div className="p-5 pl-7">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <motion.span 
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase",
                  config.badge
                )}
                animate={isLoading ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0 }}
              >
                <Icon className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                {config.label}
              </motion.span>
              
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
              </span>

              {claim.priority && claim.priority >= 7 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                  <Zap className="w-3 h-3" />
                  High Priority
                </span>
              )}

              {/* Recency Badge */}
              {claim.extracted?.recency?.isOldNews && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                  📅 Old News
                </span>
              )}
              {claim.extracted?.recency?.isCurrentEvent && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  🔴 Current Event
                </span>
              )}
              {claim.extracted?.recency?.daysSinceLatestEvidence !== undefined && 
               claim.extracted?.recency?.daysSinceLatestEvidence !== null && (
                <span className="text-xs text-gray-400">
                  Evidence: {claim.extracted.recency.daysSinceLatestEvidence === 0 
                    ? 'Today' 
                    : claim.extracted.recency.daysSinceLatestEvidence === 1 
                      ? 'Yesterday'
                      : `${claim.extracted.recency.daysSinceLatestEvidence} days ago`}
                </span>
              )}
            </div>
            
            {claim.confidence !== undefined && claim.confidence !== null && !isLoading && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-gray-700">
                    {(claim.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                    Confidence
                  </span>
                </div>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${claim.confidence * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className={cn("h-full rounded-full", config.bgSolid)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Claim Text */}
          <div className="mb-4">
            <p className="text-lg font-medium text-gray-900 leading-relaxed">
              {claim.text}
            </p>
          </div>

          {/* Explanation Section */}
          <AnimatePresence>
            {hasExplanation && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-linear-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>AI Analysis</span>
                  </div>
                  <div className="flex bg-white rounded-lg p-0.5 shadow-sm border border-gray-200">
                    {(['en', 'hi', 'mr'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-md font-medium transition-all",
                          lang === l 
                            ? "bg-linear-to-r from-blue-600 to-violet-600 text-white shadow-sm" 
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        )}
                      >
                        {l === 'en' ? 'EN' : l === 'hi' ? 'हिं' : 'मरा'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {(explanation as Record<string, string>)?.[lang] || (explanation as Record<string, string>)?.['en'] || 'Analysis not available.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evidence Section (Collapsible) */}
          {hasEvidence && !isLoading && (
            <div className="mb-4">
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>View Sources ({(claim.evidence as unknown[]).length})</span>
              </button>
              
              <AnimatePresence>
                {showEvidence && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    {(claim.evidence as Array<{ snippet?: string; excerpt?: string; url?: string; source?: string }>).slice(0, 5).map((evidence, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {evidence.snippet || evidence.excerpt || 'No description'}
                          </p>
                          {evidence.url && (
                            <a 
                              href={evidence.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Source
                            </a>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] font-medium text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded">
                          {evidence.source || 'source'}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400">
              ID: {claim.id.slice(0, 8)}...
            </div>
            <button 
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </motion.div>

      <ShareModal 
        claim={claim} 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
      />
    </>
  );
};
