'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Users, TrendingUp, AlertTriangle, CheckCircle, Flag, MessageSquare } from 'lucide-react';

interface VotingStats {
  agrees: number;
  disagrees: number;
  totalVotes: number;
  communityConsensus: 'verified' | 'disputed' | 'inconclusive' | 'fake';
  consensusStrength: number;
  expertVotes: number;
  recentTrend: 'up' | 'down' | 'stable';
}

interface CommunityVotingProps {
  claimId: string;
  initialStats?: VotingStats;
  onVote?: (voteType: 'agree' | 'disagree', reason?: string) => void;
  compact?: boolean;
  showReasons?: boolean;
}

const VOTE_REASONS = {
  agree: [
    'I have seen official confirmation',
    'This matches ground reports',
    'Multiple credible sources confirm',
    'I witnessed this myself',
    'Official news outlet reported this'
  ],
  disagree: [
    'This contradicts official sources',
    'The image/video appears manipulated',
    'Location/time details are wrong',
    'I was there - this didn\'t happen',
    'This is recycled old content'
  ]
};

export default function CommunityVoting({ 
  claimId, 
  initialStats,
  onVote,
  compact = false,
  showReasons = true
}: CommunityVotingProps) {
  const [stats, setStats] = useState<VotingStats>(initialStats || {
    agrees: 0,
    disagrees: 0,
    totalVotes: 0,
    communityConsensus: 'inconclusive',
    consensusStrength: 0,
    expertVotes: 0,
    recentTrend: 'stable'
  });
  
  const [userVote, setUserVote] = useState<'agree' | 'disagree' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [pendingVote, setPendingVote] = useState<'agree' | 'disagree' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const fetchVotingStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/votes`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch voting stats:', err);
    }
  }, [claimId]);

  const checkUserVote = useCallback(async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/votes/me`);
      if (response.ok) {
        const data = await response.json();
        setUserVote(data.voteType || null);
      }
    } catch {
      // User hasn't voted yet
    }
  }, [claimId]);

  // Fetch voting stats
  useEffect(() => {
    fetchVotingStats();
    checkUserVote();
  }, [fetchVotingStats, checkUserVote]);

  const handleVoteClick = (voteType: 'agree' | 'disagree') => {
    if (userVote === voteType) {
      // Already voted this way - allow changing
      return;
    }
    
    if (showReasons) {
      setPendingVote(voteType);
      setShowVoteModal(true);
    } else {
      submitVote(voteType);
    }
  };

  const submitVote = async (voteType: 'agree' | 'disagree', reason?: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/claims/${claimId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType, reason })
      });
      
      if (response.ok) {
        await response.json();
        setUserVote(voteType);
        setStats(prev => ({
          ...prev,
          agrees: voteType === 'agree' ? prev.agrees + 1 : prev.agrees - (userVote === 'agree' ? 1 : 0),
          disagrees: voteType === 'disagree' ? prev.disagrees + 1 : prev.disagrees - (userVote === 'disagree' ? 1 : 0),
          totalVotes: userVote ? prev.totalVotes : prev.totalVotes + 1
        }));
        
        onVote?.(voteType, reason);
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
    } finally {
      setIsSubmitting(false);
      setShowVoteModal(false);
      setPendingVote(null);
      setSelectedReason('');
    }
  };

  const consensusColor = {
    verified: 'text-green-500',
    disputed: 'text-yellow-500',
    inconclusive: 'text-gray-500',
    fake: 'text-red-500'
  };

  const consensusIcon = {
    verified: <CheckCircle className="w-4 h-4" />,
    disputed: <AlertTriangle className="w-4 h-4" />,
    inconclusive: <Users className="w-4 h-4" />,
    fake: <Flag className="w-4 h-4" />
  };

  const agreePercentage = stats.totalVotes > 0 
    ? Math.round((stats.agrees / stats.totalVotes) * 100) 
    : 50;

  // Compact version for ClaimCard
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleVoteClick('agree')}
          disabled={isSubmitting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            userVote === 'agree'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{stats.agrees}</span>
        </button>
        
        <button
          onClick={() => handleVoteClick('disagree')}
          disabled={isSubmitting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            userVote === 'disagree'
              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          <span>{stats.disagrees}</span>
        </button>
        
        <div className={`flex items-center gap-1 text-xs ${consensusColor[stats.communityConsensus]}`}>
          {consensusIcon[stats.communityConsensus]}
          <span className="capitalize">{stats.communityConsensus}</span>
        </div>
      </div>
    );
  }

  // Full version for ClaimDetail
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF6B00]" />
            <h3 className="font-semibold text-white">Community Verification</h3>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            stats.communityConsensus === 'verified' ? 'bg-green-500/15 text-green-400' :
            stats.communityConsensus === 'fake' ? 'bg-red-500/15 text-red-400' :
            stats.communityConsensus === 'disputed' ? 'bg-yellow-500/15 text-yellow-400' :
            'bg-gray-500/15 text-gray-400'
          }`}>
            {consensusIcon[stats.communityConsensus]}
            <span className="capitalize">{stats.communityConsensus}</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-1">
          {stats.totalVotes} community members have reviewed this claim
        </p>
      </div>
      
      {/* Voting Bar */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-400 text-sm font-medium">{stats.agrees} Agree</span>
          <div className="flex-1 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${agreePercentage}%` }}
            />
          </div>
          <span className="text-red-400 text-sm font-medium">{stats.disagrees} Disagree</span>
        </div>
        
        {/* Vote Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => handleVoteClick('agree')}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
              userVote === 'agree'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            {userVote === 'agree' ? 'You Agreed' : 'Agree'}
          </button>
          
          <button
            onClick={() => handleVoteClick('disagree')}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
              userVote === 'disagree'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            {userVote === 'disagree' ? 'You Disagreed' : 'Disagree'}
          </button>
        </div>
      </div>
      
      {/* Stats Details */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-400 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          {showDetails ? 'Hide Details' : 'View Voting Details'}
        </button>
        
        {showDetails && (
          <div className="mt-4 space-y-3 pt-4 border-t border-[#2a2a2a]">
            {/* Expert Votes */}
            {stats.expertVotes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Expert Votes</span>
                <span className="text-[#FF6B00] font-medium">{stats.expertVotes} verified experts</span>
              </div>
            )}
            
            {/* Consensus Strength */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Consensus Strength</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#FF6B00]"
                    style={{ width: `${stats.consensusStrength}%` }}
                  />
                </div>
                <span className="text-white font-medium">{stats.consensusStrength}%</span>
              </div>
            </div>
            
            {/* Recent Trend */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Recent Trend</span>
              <span className={`flex items-center gap-1 font-medium ${
                stats.recentTrend === 'up' ? 'text-green-400' :
                stats.recentTrend === 'down' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                <TrendingUp className={`w-4 h-4 ${stats.recentTrend === 'down' ? 'rotate-180' : ''}`} />
                {stats.recentTrend === 'up' ? 'More agrees' :
                 stats.recentTrend === 'down' ? 'More disagrees' : 'Stable'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Vote Reason Modal */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-semibold text-white">
                Why do you {pendingVote}?
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Help others understand your perspective (optional)
              </p>
            </div>
            
            <div className="p-4 space-y-2">
              {VOTE_REASONS[pendingVote || 'agree'].map((reason, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                    selectedReason === reason
                      ? 'bg-[#FF6B00]/20 border border-[#FF6B00] text-white'
                      : 'bg-[#2a2a2a] border border-transparent text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  {reason}
                </button>
              ))}
              
              <button
                onClick={() => setSelectedReason('')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                  selectedReason === ''
                    ? 'bg-[#FF6B00]/20 border border-[#FF6B00] text-white'
                    : 'bg-[#2a2a2a] border border-transparent text-gray-500 hover:bg-[#333]'
                }`}
              >
                Skip - no specific reason
              </button>
            </div>
            
            <div className="p-4 border-t border-[#2a2a2a] flex gap-3">
              <button
                onClick={() => {
                  setShowVoteModal(false);
                  setPendingVote(null);
                  setSelectedReason('');
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-[#2a2a2a] text-gray-400 hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitVote(pendingVote!, selectedReason || undefined)}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  pendingVote === 'agree'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isSubmitting ? 'Submitting...' : `Submit ${pendingVote === 'agree' ? 'Agree' : 'Disagree'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
