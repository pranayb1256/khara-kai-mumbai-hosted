// backend/services/geminiClient.js
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
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Create embeddings for an array of texts
 * Returns an array of vectors (floats) or throws
 */
export async function embedTexts(texts = []) {
  if (!API_URL || !API_KEY) return texts.map(() => null);
  const url = `${API_URL}/embeddings`;
  const body = {
    model: EMBED_MODEL,
    input: texts
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
  // expected shape: { data: [ { embedding: [...] }, ... ] }
  return json.data.map(d => d.embedding);
}

/**
 * Generate text response (deterministic by default)
 * prompt: string (system + user content), options: {temperature, max_tokens, stop}
 */
export async function generateText(prompt, options = {}) {
  if (!API_URL || !API_KEY) {
    // safe fallback: return minimal JSON string telling caller to fallback
    return { text: JSON.stringify({ error: 'gemini-not-configured', prompt }) };
  }
  const url = `${API_URL}/generate`;
  const body = {
    model: TEXT_MODEL,
    prompt,
    temperature: options.temperature ?? 0.0,
    max_tokens: options.max_tokens ?? 512
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    timeout: 120_000
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Generate error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  // assume response contains "text" at top-level or in choices
  if (json.text) return { text: json.text, raw: json };
  if (json.choices && json.choices[0] && json.choices[0].text) {
    return { text: json.choices[0].text, raw: json };
  }
  // fallback: stringify full payload
  return { text: JSON.stringify(json), raw: json };
}
