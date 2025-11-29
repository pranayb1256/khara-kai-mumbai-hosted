/**
 * Vote Controller - Community Voting System
 * Handles vote submission, retrieval, and statistics
 */

import { supabase } from '../config/supabaseClient.js';

/**
 * Submit or update a vote on a claim
 */
const submitVote = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { voteType, reason } = req.body;
    const userId = req.user?.id || req.ip; // Use IP as fallback for anonymous users
    
    if (!['agree', 'disagree'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type. Must be "agree" or "disagree"'
      });
    }
    
    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('claim_id', claimId)
      .eq('user_id', userId)
      .single();
    
    let vote;
    
    if (existingVote) {
      // Update existing vote
      const { data, error } = await supabase
        .from('votes')
        .update({
          vote_type: voteType,
          reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVote.id)
        .select()
        .single();
      
      if (error) throw error;
      vote = data;
    } else {
      // Create new vote
      const { data, error } = await supabase
        .from('votes')
        .insert({
          claim_id: claimId,
          user_id: userId,
          vote_type: voteType,
          reason: reason || null,
          is_expert: req.user?.isExpert || false
        })
        .select()
        .single();
      
      if (error) throw error;
      vote = data;
    }
    
    // Update claim vote counts
    await updateClaimVoteCounts(claimId);
    
    // Get updated stats
    const stats = await getVoteStats(claimId);
    
    res.status(200).json({
      success: true,
      message: existingVote ? 'Vote updated successfully' : 'Vote submitted successfully',
      data: {
        vote,
        stats
      }
    });
    
  } catch (error) {
    console.error('Submit vote error:', error);
    next(error);
  }
};

/**
 * Get voting statistics for a claim
 */
const getVoteStats = async (claimId) => {
  // Get vote counts
  const { data: votes, error } = await supabase
    .from('votes')
    .select('vote_type, is_expert, created_at')
    .eq('claim_id', claimId);
  
  if (error) throw error;
  
  const agrees = votes.filter(v => v.vote_type === 'agree').length;
  const disagrees = votes.filter(v => v.vote_type === 'disagree').length;
  const totalVotes = votes.length;
  const expertVotes = votes.filter(v => v.is_expert).length;
  
  // Calculate consensus
  let communityConsensus = 'inconclusive';
  let consensusStrength = 0;
  
  if (totalVotes >= 5) {
    const agreeRatio = agrees / totalVotes;
    consensusStrength = Math.round(Math.abs(agreeRatio - 0.5) * 200);
    
    if (agreeRatio >= 0.7) {
      communityConsensus = 'verified';
    } else if (agreeRatio <= 0.3) {
      communityConsensus = 'fake';
    } else if (totalVotes >= 10 && agreeRatio > 0.4 && agreeRatio < 0.6) {
      communityConsensus = 'disputed';
    }
  }
  
  // Calculate recent trend (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentVotes = votes.filter(v => v.created_at > oneDayAgo);
  const recentAgrees = recentVotes.filter(v => v.vote_type === 'agree').length;
  const recentDisagrees = recentVotes.filter(v => v.vote_type === 'disagree').length;
  
  let recentTrend = 'stable';
  if (recentAgrees > recentDisagrees * 1.5) {
    recentTrend = 'up';
  } else if (recentDisagrees > recentAgrees * 1.5) {
    recentTrend = 'down';
  }
  
  return {
    agrees,
    disagrees,
    totalVotes,
    communityConsensus,
    consensusStrength,
    expertVotes,
    recentTrend
  };
};

/**
 * Get vote stats endpoint
 */
const getVoteStatsHandler = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const stats = await getVoteStats(claimId);
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Get vote stats error:', error);
    next(error);
  }
};

/**
 * Get user's vote on a claim
 */
const getUserVote = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const userId = req.user?.id || req.ip;
    
    const { data: vote, error } = await supabase
      .from('votes')
      .select('*')
      .eq('claim_id', claimId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.status(200).json({
      hasVoted: !!vote,
      voteType: vote?.vote_type || null,
      reason: vote?.reason || null
    });
    
  } catch (error) {
    console.error('Get user vote error:', error);
    next(error);
  }
};

/**
 * Remove user's vote
 */
const removeVote = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const userId = req.user?.id || req.ip;
    
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('claim_id', claimId)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Update claim vote counts
    await updateClaimVoteCounts(claimId);
    
    res.status(200).json({
      success: true,
      message: 'Vote removed successfully'
    });
    
  } catch (error) {
    console.error('Remove vote error:', error);
    next(error);
  }
};

/**
 * Get vote reasons breakdown
 */
const getVoteReasons = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { type } = req.query; // 'agree' or 'disagree' or undefined for both
    
    let query = supabase
      .from('votes')
      .select('vote_type, reason')
      .eq('claim_id', claimId)
      .not('reason', 'is', null);
    
    if (type) {
      query = query.eq('vote_type', type);
    }
    
    const { data: votes, error } = await query;
    
    if (error) throw error;
    
    // Group by reason
    const reasonCounts = votes.reduce((acc, vote) => {
      const key = `${vote.vote_type}:${vote.reason}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    // Format response
    const agreeReasons = [];
    const disagreeReasons = [];
    
    Object.entries(reasonCounts).forEach(([key, count]) => {
      const [voteType, reason] = key.split(':');
      const item = { reason, count };
      
      if (voteType === 'agree') {
        agreeReasons.push(item);
      } else {
        disagreeReasons.push(item);
      }
    });
    
    // Sort by count
    agreeReasons.sort((a, b) => b.count - a.count);
    disagreeReasons.sort((a, b) => b.count - a.count);
    
    res.status(200).json({
      agreeReasons,
      disagreeReasons
    });
    
  } catch (error) {
    console.error('Get vote reasons error:', error);
    next(error);
  }
};

/**
 * Update claim vote counts (helper function)
 */
const updateClaimVoteCounts = async (claimId) => {
  const stats = await getVoteStats(claimId);
  
  await supabase
    .from('claims')
    .update({
      vote_agrees: stats.agrees,
      vote_disagrees: stats.disagrees,
      vote_total: stats.totalVotes,
      community_consensus: stats.communityConsensus,
      updated_at: new Date().toISOString()
    })
    .eq('id', claimId);
};

/**
 * Bulk get vote stats for multiple claims
 */
const getBulkVoteStats = async (req, res, next) => {
  try {
    const { claimIds } = req.body;
    
    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'claimIds must be a non-empty array'
      });
    }
    
    if (claimIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 claims per request'
      });
    }
    
    const statsMap = {};
    
    for (const claimId of claimIds) {
      statsMap[claimId] = await getVoteStats(claimId);
    }
    
    res.status(200).json(statsMap);
    
  } catch (error) {
    console.error('Bulk get vote stats error:', error);
    next(error);
  }
};

export {
    submitVote,
    getVoteStatsHandler,
    getUserVote,
    removeVote,
    getVoteReasons,
    getBulkVoteStats

}