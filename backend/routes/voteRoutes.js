import express from 'express';
const router = express.Router();
import {
  submitVote,
  getVoteStatsHandler,
  getUserVote,
  removeVote,
  getVoteReasons,
  getBulkVoteStats
} from '../controllers/vote.controller.js';
import { strictRateLimiterMiddleware } from '../middleware/rateLimiter.js';

// Submit/update vote (with rate limiting)
router.post('/claims/:claimId/votes', strictRateLimiterMiddleware, submitVote);

// Get vote stats for a claim
router.get('/claims/:claimId/votes', getVoteStatsHandler);

// Get user's vote on a claim
router.get('/claims/:claimId/votes/me', getUserVote);

// Remove user's vote
router.delete('/claims/:claimId/votes', removeVote);

// Get vote reasons breakdown
router.get('/claims/:claimId/votes/reasons', getVoteReasons);

// Bulk get vote stats
router.post('/votes/bulk', getBulkVoteStats);

export default router;
