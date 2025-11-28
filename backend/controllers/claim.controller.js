import { supabase } from '../config/supabaseClient.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 1000);
  }
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

const queueName = process.env.BULL_QUEUE_NAME || 'verification-queue';
const verifyQueue = new Queue(queueName, { connection });

/**
 * Ingest a new claim for verification
 * POST /api/claims/ingest
 */
export const ingest = async (req, res, next) => {
  try {
    const { text, media = [], original_source = {} } = req.body;

    // Call claim-extractor microservice (best-effort)
    let extracted = { entities: [], location: null, numbers: [] };
    if (process.env.CLAIM_EXTRACTOR_URL) {
      try {
        const resp = await axios.post(process.env.CLAIM_EXTRACTOR_URL, { text, media }, {
          timeout: 5000,
        });
        if (resp.data && resp.data.claims && resp.data.claims.length > 0) {
          extracted = resp.data.claims[0];
        }
      } catch (err) {
        console.warn('claim-extractor failed:', err.message);
      }
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('claims')
      .insert([{
        text,
        extracted,
        media,
        original_source,
        status: 'pending',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to save claim to database' 
      });
    }

    // Enqueue verification job
    try {
      await verifyQueue.add('verify-claim', { claimId: data.id }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });
    } catch (queueError) {
      console.error('Failed to enqueue verification job:', queueError.message);
      // Update status to indicate queue failure
      await supabase.from('claims').update({ status: 'pending' }).eq('id', data.id);
    }

    return res.status(201).json({ 
      success: true,
      claim: data,
      message: 'Claim submitted successfully. Verification in progress.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a specific claim by ID
 * GET /api/claims/:id
 */
export const getClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false,
        error: 'Claim not found' 
      });
    }

    return res.json({ 
      success: true,
      claim: data 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List claims with optional filters and pagination
 * GET /api/claims
 */
export const listClaims = async (req, res, next) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      status, 
      search 
    } = req.query;

    let query = supabase
      .from('claims')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply search filter (text search)
    if (search) {
      query = query.ilike('text', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase list error', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch claims' 
      });
    }

    return res.json({ 
      success: true,
      claims: data || [],
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (offset + limit) < (count || 0),
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Search claims
 * GET /api/claims/search
 */
export const searchClaims = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters',
      });
    }

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .ilike('text', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase search error', error);
      return res.status(500).json({ 
        success: false,
        error: 'Search failed' 
      });
    }

    return res.json({ 
      success: true,
      claims: data || [],
      query: q,
    });
  } catch (err) {
    next(err);
  }
};
