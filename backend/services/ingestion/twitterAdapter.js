// backend/services/ingestion/twitterStream.js
import axios from 'axios';
import https from 'https';

const BEARER = process.env.TWITTER_BEARER; // required
const BACKEND_INGEST = process.env.BACKEND_BASE_URL || 'http://localhost:4000'; // your backend

if (!BEARER) {
  console.warn('TWITTER_BEARER not set. Twitter stream disabled.');
}

const STREAM_URL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=created_at,author_id,attachments,entities&expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url';
const RULES_URL = 'https://api.twitter.com/2/tweets/search/stream/rules';

const httpsAgent = new https.Agent({ keepAlive: true });

async function getCurrentRules() {
  const r = await axios.get(RULES_URL, { headers: { Authorization: `Bearer ${BEARER}` } });
  return r.data;
}

async function setRules(rulesToAdd = []) {
  // rulesToAdd: [{value: 'flood and mumbai', tag: 'flood-mumbai'}]
  const body = { add: rulesToAdd };
  await axios.post(RULES_URL, body, { headers: { Authorization: `Bearer ${BEARER}`, 'Content-Type': 'application/json' } });
}

async function deleteAllRules() {
  const current = await getCurrentRules();
  if (!current?.data) return;
  const ids = current.data.map(r => r.id);
  if (ids.length === 0) return;
  await axios.post(RULES_URL, { delete: { ids } }, { headers: { Authorization: `Bearer ${BEARER}`, 'Content-Type': 'application/json' } });
}

/** Normalize and forward tweet to /api/claims/ingest */
async function forwardTweetToIngest(tweetPayload) {
  /* Build normalized post:
    {
      platform: 'twitter',
      post_id: tweet.id,
      author: tweet.author_id,
      text: tweet.text,
      media: [url1, url2],
      posted_at: tweet.created_at,
      raw: tweetPayload
    }
  */
  try {
    const tweet = tweetPayload.data;
    const includes = tweetPayload.includes || {};
    let mediaUrls = [];
    if (includes.media && includes.media.length) {
      mediaUrls = includes.media.map(m => m.url || m.preview_image_url).filter(Boolean);
    }

    const post = {
      platform: 'twitter',
      post_id: tweet.id,
      author: tweet.author_id,
      text: tweet.text,
      media: mediaUrls,
      posted_at: tweet.created_at,
      raw: tweetPayload
    };

    await axios.post(`${BACKEND_INGEST}/api/claims/ingest`, post, { timeout: 5000 });
    console.log('Forwarded tweet', tweet.id);
  } catch (err) {
    console.warn('Forward tweet error', err?.message || err);
  }
}

/** Main stream connect with backoff */
export async function startTwitterStream(opts = {}) {
  if (!BEARER) return;
  // Example rules to add if none exist
  const defaultRules = [
    { value: 'Mumbai flood', tag: 'flood-mumbai' },
    { value: 'flood AND mumbai has:images', tag: 'flood-image' },
    { value: 'railway cancelled mumbai', tag: 'trains-mumbai' }
  ];

  // ensure rules exist
  try {
    const current = await getCurrentRules();
    if (!current?.data || current.data.length === 0) {
      console.log('No rules present. Adding defaults.');
      await setRules(defaultRules);
    } else {
      console.log('Existing stream rules:', current.data.map(r => r.value));
    }
  } catch (err) {
    console.warn('Rules check failed', err.message);
  }

  let backoff = 1000;
  while (true) {
    try {
      console.log('Connecting to Twitter filtered stream...');
      const res = await axios.get(STREAM_URL, {
        headers: { Authorization: `Bearer ${BEARER}` },
        responseType: 'stream',
        httpsAgent,
        timeout: 0
      });

      const stream = res.data;
      stream.on('data', async (chunk) => {
        if (!chunk) return;
        const s = chunk.toString('utf8').trim();
        if (!s) return;
        try {
          const parsed = JSON.parse(s);
          // handle keep-alive or warnings
          if (parsed?.data) {
            await forwardTweetToIngest(parsed);
          }
        } catch (e) {
          // ignore keep-alive newlines
        }
      });

      stream.on('error', (err) => {
        console.error('Stream error, reconnecting', err.message || err);
        stream.destroy();
      });

      // reset backoff if connected
      backoff = 1000;
      await new Promise((resolve) => stream.on('end', resolve));
      console.log('Stream ended, reconnecting...');
    } catch (err) {
      console.error(`Connection to Twitter failed: ${err.message || err}, retrying in ${backoff}ms`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      backoff = Math.min(backoff * 2, 60000);
    }
  }
}
