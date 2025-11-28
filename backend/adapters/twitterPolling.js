// backend/adapters/twitterPolling.js
// ESM - Node 18+
// Dependencies: axios, ioredis (optional), dotenv
import axios from 'axios';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const BEARER = process.env.TWITTER_BEARER;
const BACKEND_INGEST = process.env.BACKEND_INGEST_URL || `http://localhost:${process.env.BACKEND_PORT||4000}/api/claims/ingest`;
const QUERY = process.env.TWITTER_POLL_QUERY || 'mumbai OR bandra OR andheri flood has:images -is:retweet';
// IMPORTANT: Twitter API free tier allows only 1 request per 15 minutes!
// Set minimum to 900 seconds (15 min) to avoid rate limits
const POLL_INTERVAL = Math.max(parseInt(process.env.TWITTER_POLL_INTERVAL || '900', 10), 60); // seconds, min 60s
const MAX_RESULTS = parseInt(process.env.TWITTER_POLL_MAX_RESULTS || '10', 10);
const REDIS_URL = process.env.REDIS_URL || null;
const DEDUPE_TTL = parseInt(process.env.TWITTER_DEDUPE_TTL || `${60*60*24*7}`, 10); // seconds, default 7 days

if (!BEARER) console.warn('TWITTER_BEARER not set — polling adapter disabled.');

const SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent';
const EXPANSIONS = 'author_id,attachments.media_keys';
const TWEET_FIELDS = 'created_at,author_id,attachments,entities,possibly_sensitive';
const MEDIA_FIELDS = 'url,preview_image_url';

let redis = null;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', (e) => console.warn('Redis error (twitterPolling):', e.message || e));
  } catch (e) {
    console.warn('Could not connect to redis, continuing without it.', e.message || e);
    redis = null;
  }
}

function authHeaders() {
  return { Authorization: `Bearer ${BEARER}` };
}

function normalize(tweet, includes = {}) {
  const media = [];
  if (includes.media && Array.isArray(includes.media)) {
    includes.media.forEach(m => {
      const url = m.url || m.preview_image_url;
      if (url) media.push(url);
    });
  }
  const author = (includes.users && includes.users.length) ? includes.users[0].username || includes.users[0].id : tweet.author_id;
  return {
    text: tweet.text,
    media,
    original_source: { platform: 'twitter', post_id: tweet.id, author },
    posted_at: tweet.created_at || new Date().toISOString(),
    raw: { tweet, includes }
  };
}

async function seenAdd(id) {
  if (redis) {
    const key = `seen:twitter:${id}`;
    const added = await redis.setnx(key, '1');
    if (added === 1) {
      await redis.expire(key, DEDUPE_TTL);
      return true; // first time
    }
    return false; // already seen
  } else {
    // will be replaced by in-memory set by caller if redis is null
    return null;
  }
}

/**
 * Start polling.
 * opts: { query, intervalSeconds, maxResults }
 */
export async function startTwitterPolling(opts = {}) {
  if (!BEARER) return;
  const query = opts.query || QUERY;
  const interval = (opts.intervalSeconds || POLL_INTERVAL) * 1000;
  const max_results = opts.maxResults || MAX_RESULTS;

  console.log(`Twitter polling adapter starting. query="${query}" interval=${interval/1000}s (${Math.round(interval/1000/60)} min) max_results=${max_results}`);
  console.log('Note: Twitter API free tier allows only 1 request per 15 minutes for search/recent');

  let since_id = null;
  let backoff = 15 * 60 * 1000; // Start with 15 min backoff for rate limits
  // in-memory dedupe if no redis
  const inMemorySeen = new Set();

  while (true) {
    try {
      const params = new URLSearchParams({
        query,
        'tweet.fields': TWEET_FIELDS,
        expansions: EXPANSIONS,
        'media.fields': MEDIA_FIELDS,
        max_results: String(max_results)
      });
      if (since_id) params.append('since_id', since_id);

      const url = `${SEARCH_URL}?${params.toString()}`;
      const res = await axios.get(url, { headers: authHeaders(), timeout: 20000 });

      if (res.status === 200 && res.data && res.data.data && res.data.data.length) {
        // Twitter returns newest first? docs: tweets are reverse-chronological; we'll iterate oldest -> newest
        const tweets = res.data.data;
        const includes = res.data.includes || {};
        // sort by created_at ascending to forward in chronological order
        tweets.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        for (const tw of tweets) {
          // update since_id to highest id seen
          if (!since_id || BigInt(tw.id) > BigInt(since_id)) since_id = tw.id;

          // dedupe using redis or memory
          let firstTime = true;
          if (redis) {
            firstTime = await seenAdd(tw.id);
          } else {
            if (inMemorySeen.has(tw.id)) firstTime = false;
            else {
              inMemorySeen.add(tw.id);
              // trim set size to avoid memory growth
              if (inMemorySeen.size > 10000) {
                // crude: clear half
                const toRemove = Math.floor(inMemorySeen.size / 2);
                let i = 0;
                for (const v of inMemorySeen) {
                  inMemorySeen.delete(v);
                  if (++i >= toRemove) break;
                }
              }
            }
          }
          if (!firstTime) {
            // already forwarded
            continue;
          }

          // normalize and forward
          const normalized = normalize(tw, includes);
          try {
            await axios.post(BACKEND_INGEST, normalized, { timeout: 5000 });
            console.log(`Polled tweet ${tw.id} forwarded to ingest.`);
          } catch (e) {
            // log and continue - do not crash polling loop
            console.warn('Forward to ingest failed:', e?.message || e);
          }
        }
        // successful fetch -> reset backoff
        backoff = 1000;
      } else {
        // no tweets found, nothing to forward
        // if res.status not 200, throw to go to catch
      }

      // sleep for interval
      await new Promise(r => setTimeout(r, interval));
    } catch (err) {
      const code = err?.response?.status;
      console.error('Twitter polling error:', err?.message || err, 'status:', code || 'n/a');
      // handle rate limits or auth
      if (code === 429) {
        // Rate limited - use exponential backoff starting at 15 minutes
        // Twitter free tier: 1 request per 15 minutes for search/recent
        const retryAfter = err?.response?.headers?.['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(backoff, 15 * 60 * 1000);
        console.warn(`Rate limited by Twitter (429). Waiting ${Math.round(waitTime/1000/60)} minutes before retry.`);
        await new Promise(r => setTimeout(r, waitTime));
        backoff = Math.min(backoff * 2, 60 * 60 * 1000); // Max 1 hour backoff
      } else if (code === 403 || code === 401) {
        console.warn('Authorization error (403/401). Check token & product access. Waiting 5 minutes.');
        // long wait to avoid spamming; then try again slowly
        await new Promise(r => setTimeout(r, 5 * 60 * 1000));
      } else {
        // network / other errors - short backoff
        console.warn(`Network error. Waiting ${Math.round(backoff/1000)} seconds before retry.`);
        await new Promise(r => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 5 * 60 * 1000); // Max 5 min for network errors
      }
    }
  }
}
