// backend/workers/verificationWorker.js
import dotenv from 'dotenv';
dotenv.config();
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { supabase } from '../config/supabaseClient.js';
import { verifyClaim } from '../services/verificationService.js';

const connection = new IORedis(process.env.REDIS_URL);
const queueName = process.env.BULL_QUEUE_NAME || 'verification-queue';

const worker = new Worker(queueName, async job => {
  const { claimId } = job.data;
  console.log('Worker processing claimId', claimId);

  // fetch claim row from supabase
  const { data: claim, error } = await supabase.from('claims').select('*').eq('id', claimId).single();
  if (error || !claim) {
    throw new Error('Claim not found in supabase: ' + (error?.message || ''));
  }

  // set in_progress
  await supabase.from('claims').update({ status: 'in_progress' }).eq('id', claimId);

  try {
    const result = await verifyClaim(claim);

    // write results back to supabase: status, confidence, evidence, priority, explanations, nli
    await supabase.from('claims').update({
      status: result.status,
      confidence: result.confidence,
      evidence: result.evidence,
      priority: result.priority,
      explanations: result.explanations,
      extracted: claim.extracted || claim.extracted, // keep existing
      // attach the nli rationale if present for audit
      // (store under a diagnostics field or in evidence)
    }).eq('id', claimId);

    console.log(`Claim ${claimId} verified -> ${result.status} (conf ${result.confidence})`);

    // Optional: auto-publish if high priority & high confidence
    const autoPublishThreshold = parseFloat(process.env.AUTO_PUBLISH_CONFIDENCE || '0.85');
    if (result.priority >= 7 && result.confidence >= autoPublishThreshold && result.status !== 'unconfirmed') {
      // implement publisher.enqueuePublishJob(...) to send to twitter/telegram/whatsapp
      console.log('Auto-publish criteria met (not implemented): should publish to channels.');
    }

    return Promise.resolve();
  } catch (err) {
    console.error('verificationWorker error', err.message || err);
    // mark as unconfirmed
    await supabase.from('claims').update({ status: 'unconfirmed' }).eq('id', claimId);
    throw err;
  }
}, { connection });

worker.on('completed', job => {
  console.log('Job completed', job.id);
});
worker.on('failed', (job, err) => {
  console.error('Job failed', job?.id, err?.message);
});
