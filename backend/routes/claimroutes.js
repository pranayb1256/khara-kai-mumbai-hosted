import express from 'express';
import { ingest, getClaim, listClaims } from '../controllers/claim.controller.js';

const router = express.Router();

router.post('/ingest', ingest);
router.get('/:id', getClaim);
router.get('/', listClaims);

export default router;
