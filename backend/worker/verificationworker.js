// backend/workers/verificationWorker.js
import dotenv from 'dotenv';
dotenv.config();
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { supabase } from '../config/supabaseClient.js';
import { verifyClaim } from '../services/verificationServices.js';
import { notifyVerificationComplete } from '../services/whatsappBot.js';

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});
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

    // Build recency info for storage
    const recencyInfo = result.recency ? {
      status: result.recency.status,
      isCurrentEvent: result.recency.isCurrentEvent,
      isOldNews: result.recency.isOldNews,
      daysSinceLatestEvidence: result.recency.daysSinceLatestEvidence,
      latestEvidenceDate: result.recency.latestEvidenceDate,
      warning: result.recency.warning
    } : null;

    // Append recency warning to explanations if exists
    const explanationsWithRecency = { ...result.explanations };
    if (result.recency?.warning) {
      if (explanationsWithRecency.en) {
        explanationsWithRecency.en = result.recency.warning + '\n\n' + explanationsWithRecency.en;
      }
      if (explanationsWithRecency.hi && result.recency.isOldNews) {
        explanationsWithRecency.hi = '⚠️ यह पुरानी खबर लगती है जो फिर से शेयर की जा रही है।\n\n' + explanationsWithRecency.hi;
      }
      if (explanationsWithRecency.mr && result.recency.isOldNews) {
        explanationsWithRecency.mr = '⚠️ ही जुनी बातमी पुन्हा शेअर केली जात आहे असे दिसते.\n\n' + explanationsWithRecency.mr;
      }
    }

    // write results back to supabase: status, confidence, evidence, priority, explanations, recency
    const existingExtracted = claim.extracted && typeof claim.extracted === 'object' ? claim.extracted : {};
    await supabase.from('claims').update({
      status: result.status,
      confidence: result.confidence,
      evidence: result.evidence,
      priority: result.priority,
      explanations: explanationsWithRecency,
      extracted: {
        ...existingExtracted,
        recency: recencyInfo
      }
    }).eq('id', claimId);

    console.log(`Claim ${claimId} verified -> ${result.status} (conf ${result.confidence}, recency: ${result.recency?.status || 'unknown'})`);
    if (recencyInfo) {
      console.log(`  Recency: isOldNews=${recencyInfo.isOldNews}, daysSince=${recencyInfo.daysSinceLatestEvidence}, warning=${recencyInfo.warning ? 'yes' : 'no'}`);
    }

    // Notify WhatsApp users when verification completes
    try {
      await notifyVerificationComplete(claimId);
    } catch (notifyErr) {
      console.warn('[Worker] WhatsApp notification failed:', notifyErr.message);
    }

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
worker.on('ready', () => {
  console.log(`✅ Worker ready and listening on queue: ${queueName}`);
});
worker.on('error', err => {
  console.error('Worker error:', err.message);
});

console.log(`🚀 Verification worker starting on queue: ${queueName}`);
console.log(`   Redis URL: ${process.env.REDIS_URL?.substring(0, 30)}...`);
