        import { supabase } from '../config/supabaseClient.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connection = new IORedis(process.env.REDIS_URL);
const queueName = process.env.BULL_QUEUE_NAME || 'verification-queue';
const verifyQueue = new Queue(queueName, { connection });

import axios from 'axios';

/**
 * ingest request body:
 * { text, media: [urls], original_source: {platform, post_id, author, url} }
 */
export const ingest = async (req, res) => {
  try {
    const { text, media = [], original_source = {} } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    // Call claim-extractor microservice (best-effort)
    let extracted = { entities: [], location: null, numbers: [] };
    try {
      const resp = await axios.post(process.env.CLAIM_EXTRACTOR_URL, { text, media });
      if (resp.data && resp.data.claims && resp.data.claims.length > 0) {
        extracted = resp.data.claims[0];
      }
    } catch (err) {
      console.warn('claim-extractor failed:', err.message);
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('claims')
      .insert([{
        text,
        extracted,
        media,
        original_source,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ error: 'failed to save claim' });
    }

    // enqueue verification job
    await verifyQueue.add('verify-claim', { claimId: data.id });

    return res.status(201).json({ claim: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

export const getClaim = async (req, res) => {
  const id = req.params.id;
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'not found' });
  res.json({ claim: data });
};

export const listClaims = async (req, res) => {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: 'db error' });
  res.json({ claims: data });
};
