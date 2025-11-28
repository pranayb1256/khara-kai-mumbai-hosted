import express from 'express';
import { ingest, getClaim, listClaims, searchClaims } from '../controllers/claim.controller.js';
import { validateClaimSubmission, validateClaimId, validateListParams } from '../middleware/validator.js';
import { strictRateLimiterMiddleware } from '../middleware/rateLimiter.js';

const router = express.Router();

// Submit a new claim for verification
router.post('/ingest', strictRateLimiterMiddleware, validateClaimSubmission, ingest);

// Search claims
router.get('/search', validateListParams, searchClaims);

// Get a specific claim by ID
router.get('/:id', validateClaimId, getClaim);

// List all claims with optional filters
router.get('/', validateListParams, listClaims);

export default router;
