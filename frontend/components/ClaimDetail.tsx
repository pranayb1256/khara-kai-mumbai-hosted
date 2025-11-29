'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Globe, 
  Loader2,
  ExternalLink,
  Clock,
  Zap,
  Image as ImageIcon,
  FileText,
  Shield,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { Claim } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface ClaimDetailProps {
  claim: Claim;
}

const statusConfig = {
  verified: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800 border-green-200',
    label: 'CONFIRMED',
    description: 'This claim has been verified as true',
  },
  debunked: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800 border-red-200',
    label: 'CONTRADICTED',
    description: 'This claim has been debunked as false',
  },
  uncertain: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'UNCERTAIN',
    description: 'Unable to conclusively verify this claim',
  },
  pending: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'VERIFYING',
    description: 'Verification in progress...',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'PROCESSING',
    description: 'AI analysis in progress...',
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800 border-green-200',
    label: 'CONFIRMED',
    description: 'This claim has been verified as true',
  },
  contradicted: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800 border-red-200',
    label: 'CONTRADICTED',
    description: 'This claim has been debunked as false',
  },
  unconfirmed: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'UNCONFIRMED',
    description: 'Unable to conclusively verify this claim',
  },
};

type StatusKey = keyof typeof statusConfig;

export const ClaimDetail: React.FC<ClaimDetailProps> = ({ claim }) => {
  const [lang, setLang] = useState<'en' | 'hi' | 'mr'>('en');
  const [activeTab, setActiveTab] = useState<'analysis' | 'evidence' | 'media'>('analysis');

  const status = claim.status as StatusKey;
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  const isLoading = status === 'pending' || status === 'in_progress';
  const hasEvidence = claim.evidence && Array.isArray(claim.evidence) && claim.evidence.length > 0;
  const hasExplanation = claim.explanation || claim.explanations;
  const explanation = claim.explanation || claim.explanations;
  const hasMedia = claim.media && Array.isArray(claim.media) && claim.media.length > 0;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(claim.text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className={`${config.bg} ${config.border} border-b px-6 py-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className={`w-12 h-12 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center`}
              animate={isLoading ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
            >
              <Icon className={`w-6 h-6 ${config.color}`} />
            </motion.div>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.badge}`}>
                {config.label}
              </span>
              <p className="text-sm text-gray-600 mt-1">{config.description}</p>
            </div>
          </div>
          
          {claim.confidence !== undefined && claim.confidence !== null && !isLoading && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {(claim.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 uppercase font-medium tracking-wider">
                Confidence
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claim Content */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-2">
            {claim.priority && claim.priority >= 7 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" /> High Priority
              </span>
            )}
            <button 
              onClick={copyToClipboard}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-lg text-gray-900 font-medium leading-relaxed">
          {claim.text}
        </p>

        {/* Recency Badges */}
        {(claim.extracted?.recency?.isOldNews || claim.extracted?.recency?.isCurrentEvent) && (
          <div className="flex items-center gap-2 mt-4">
            {claim.extracted?.recency?.isOldNews && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                📅 Old News
              </span>
            )}
            {claim.extracted?.recency?.isCurrentEvent && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                🔴 Current Event
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex">
          {[
            { id: 'analysis', label: 'AI Analysis', icon: FileText },
            { id: 'evidence', label: 'Evidence', icon: Shield, count: hasEvidence ? (claim.evidence as unknown[]).length : 0 },
            { id: 'media', label: 'Media', icon: ImageIcon, count: hasMedia ? (claim.media as unknown[]).length : 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {hasExplanation && !isLoading ? (
                <>
                  {/* Language Switcher */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Globe className="w-4 h-4 text-orange-500" />
                      <span>Explanation Language</span>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      {[
                        { id: 'en', label: 'English', flag: '🇬🇧' },
                        { id: 'hi', label: 'हिंदी', flag: '🇮🇳' },
                        { id: 'mr', label: 'मराठी', flag: '🇮🇳' },
                      ].map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setLang(l.id as typeof lang)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            lang === l.id 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {l.flag} {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {(explanation as Record<string, string>)?.[lang] || (explanation as Record<string, string>)?.['en'] || 'Analysis not available.'}
                    </p>
                  </div>
                </>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">AI analysis in progress...</p>
                  <p className="text-gray-400 text-sm mt-1">This usually takes a few seconds</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No analysis available yet.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {hasEvidence ? (
                (claim.evidence as Array<{ snippet?: string; excerpt?: string; url?: string; source?: string; title?: string }>).map((evidence, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-orange-200 transition-colors"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {evidence.title && (
                        <h4 className="font-semibold text-gray-900 mb-1">{evidence.title}</h4>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {evidence.snippet || evidence.excerpt || 'No description available'}
                      </p>
                      {evidence.url && (
                        <a 
                          href={evidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 mt-2 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Source
                        </a>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-gray-500 uppercase bg-white px-2 py-1 rounded-md border border-gray-200">
                      {evidence.source || 'Source'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium">No evidence collected yet</p>
                  <p className="text-sm mt-1">Evidence will appear here once verification is complete</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'media' && (
            <motion.div
              key="media"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {hasMedia ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(claim.media as string[]).map((url, idx) => (
                    <div 
                      key={idx}
                      className="aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-orange-300 transition-colors cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={url} 
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" fill="%23f3f4f6"><rect width="200" height="150"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14">Image unavailable</text></svg>';
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium">No media attached</p>
                  <p className="text-sm mt-1">Images and videos will appear here if available</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Moderator Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <ThumbsUp className="w-4 h-4" />
              Helpful
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <ThumbsDown className="w-4 h-4" />
              Not Helpful
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <Flag className="w-4 h-4" />
              Report
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Twitter className="w-4 h-4" />
              Share
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Claim ID */}
      <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 text-xs text-gray-500 font-mono">
        Claim ID: {claim.id}
      </div>
    </motion.div>
  );
};
