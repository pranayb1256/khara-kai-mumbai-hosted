import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.GEMINI_API_URL;
const API_KEY = process.env.GEMINI_API_KEY;
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embed-1';
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-pro-1';

if (!API_URL || !API_KEY) {
  console.warn('GEMINI_API_URL or GEMINI_API_KEY not set. Gemini calls will fail.');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Create embeddings for an array of texts
 * Returns an array of vectors (floats) or throws
 */
export async function embedTexts(texts = []) {
  if (!API_URL || !API_KEY) return texts.map(() => null);
  const url = `${API_URL}/models/${EMBED_MODEL}:embedContent?key=${API_KEY}`;
  const body = {
    content: {
      parts: texts.map(text => ({ text }))
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    timeout: 60_000
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Embed error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  // Google AI format: { embedding: { values: [...] } }
  return json.embedding ? [json.embedding.values] : texts.map(() => null);
}

/**
 * Generate text response (deterministic by default)
 * prompt: string (system + user content), options: {temperature, max_tokens, stop}
 */
export async function generateText(prompt, options = {}, retries = 3) {
  if (!API_URL || !API_KEY) {
    // safe fallback: return minimal JSON string telling caller to fallback
    return { text: JSON.stringify({ error: 'gemini-not-configured', prompt }) };
  }
  const url = `${API_URL}/models/${TEXT_MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: options.temperature ?? 0.0,
      maxOutputTokens: options.max_tokens ?? 1024  // Increased from 512
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    timeout: 120_000
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`[Gemini] API error: ${res.status} ${txt.slice(0, 300)}`);
    
    // Handle rate limiting with retry
    if (res.status === 429 && retries > 0) {
      // Extract retry delay from response
      let retryDelay = 60; // Default 60 seconds
      try {
        const errorJson = JSON.parse(txt);
        const retryInfo = errorJson?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          const match = retryInfo.retryDelay.match(/([\d.]+)/);
          if (match) retryDelay = Math.ceil(parseFloat(match[1]));
        }
      } catch (e) {}
      
      console.log(`[Gemini] Rate limited. Waiting ${retryDelay}s before retry (${retries} retries left)...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
      return generateText(prompt, options, retries - 1);
    }
    
    throw new Error(`Generate error: ${res.status} ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  
  // Debug logging
  console.log('[Gemini] Response structure:', JSON.stringify(json).slice(0, 500));
  
  // Google AI format: { candidates: [{ content: { parts: [{ text: ... }] } }] }
  if (json.candidates && json.candidates.length > 0) {
    const candidate = json.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      const text = candidate.content.parts[0].text;
      return { text, raw: json };
    }
    // Handle MAX_TOKENS - still try to extract partial content
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('[Gemini] Response truncated due to MAX_TOKENS');
      // Return empty JSON object so parsing can fallback gracefully
      return { text: '{}', raw: json };
    }
    // Handle other finish reasons (e.g., safety block)
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn(`[Gemini] Response blocked: ${candidate.finishReason}`);
      return { text: JSON.stringify({ error: 'blocked', reason: candidate.finishReason }), raw: json };
    }
  }
  
  // Check for prompt feedback (safety issues)
  if (json.promptFeedback && json.promptFeedback.blockReason) {
    console.warn(`[Gemini] Prompt blocked: ${json.promptFeedback.blockReason}`);
    return { text: JSON.stringify({ error: 'prompt-blocked', reason: json.promptFeedback.blockReason }), raw: json };
  }
  
  // fallback: stringify full payload
  console.warn('[Gemini] Unexpected response format:', JSON.stringify(json).slice(0, 300));
  return { text: JSON.stringify(json), raw: json };
}
