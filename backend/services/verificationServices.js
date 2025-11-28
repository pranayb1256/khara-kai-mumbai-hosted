// backend/services/verificationService.js
import axios from 'axios';
import { generateText, embedTexts } from './geminiClient.js';
import { buildNliPrompt, buildExplanationPrompt } from '../prompts/geminiPrompts.js';
import dotenv from 'dotenv';
dotenv.config();

const SCRAPER_URL = process.env.SCRAPER_URL;
const IMAGE_CHECKER_URL = process.env.IMAGE_CHECKER_URL;
const EXPLAINER_URL = process.env.EXPLAINER_URL; // fallback if you keep explainer service

const GEMINI_MAX_EVIDENCE = parseInt(process.env.GEMINI_MAX_EVIDENCE || '5', 10);

/**
 * Combine signals: scrapers -> image-checker -> Gemini NLI -> Gemini explanation
 * Returns { status, confidence, evidence, priority, explanations: {en, hi, mr} (if available) }
 */
export async function verifyClaim(claim) {
  const text = claim.text || '';
  let status = 'unconfirmed';
  let confidence = 0.3;
  let priority = 1;
  const evidence = [];

  // 1) call scrapers
  try {
    const resp = await axios.get(SCRAPER_URL, { params: { q: text }, timeout: 10_000 });
    if (resp.data && resp.data.results) {
      // push top results
      resp.data.results.slice(0, GEMINI_MAX_EVIDENCE).forEach(r => {
        evidence.push({ source: r.source || 'official', url: r.url, snippet: r.snippet || r.title, date: r.published_at || null });
      });
    }
  } catch (e) {
    console.warn('Scraper call failed', e.message);
  }

  // 2) image-checker if media present
  if (claim.media && claim.media.length) {
    try {
      const imgResp = await axios.post(IMAGE_CHECKER_URL, { urls: claim.media }, { timeout: 15_000 });
      if (imgResp.data && imgResp.data.matches && imgResp.data.matches.length) {
        // attach matches as high-weight evidence
        imgResp.data.matches.forEach(m => {
          evidence.unshift({ source: 'image', url: m.url || m.id || null, snippet: m.meta?.desc || 'Matched seed image', date: m.meta?.date || null });
        });
      }
    } catch (e) {
      console.warn('Image-checker failed', e.message);
    }
  }

  // 3) If we have any evidence, call Gemini NLI for verdict; else fallback heuristics
  let nli = null;
  try {
    // choose top-K evidence snippets for prompt
    const topEvidence = evidence.slice(0, GEMINI_MAX_EVIDENCE);
    const prompt = buildNliPrompt(text, topEvidence);
    const gen = await generateText(prompt, { temperature: 0.0, max_tokens: 400 });
    // parse JSON from gen.text (Gemini may return JSON or string)
    let parsed = null;
    try {
      parsed = JSON.parse(gen.text);
    } catch (err) {
      // fallback: try to extract first JSON-looking substring
      const m = gen.text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    if (parsed && parsed.verdict) {
      nli = parsed;
      status = parsed.verdict === 'confirmed' ? 'confirmed' : (parsed.verdict === 'contradicted' ? 'contradicted' : 'unconfirmed');
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.6;
      // keep evidence_used canonical
      if (parsed.evidence_used && parsed.evidence_used.length) {
        // ensure evidence_used URLs/excerpts present
        // merge into evidence array (avoid duplicates)
        parsed.evidence_used.forEach(eu => {
          if (!evidence.find(x => x.url === eu.url)) evidence.push({ source: 'gemini-evidence', url: eu.url, snippet: eu.excerpt || '', date: null });
        });
      }
    } else {
      // No parse -> fallback
      console.warn('Gemini NLI returned unparsable result, fallback heuristics');
      nli = null;
    }
  } catch (err) {
    console.warn('Gemini NLI error', err?.message || err);
  }

  // 4) heuristic fallback: if image evidence exists strongly, mark contradicted with high confidence
  if (!nli && evidence.some(e => e.source === 'image')) {
    status = 'contradicted';
    confidence = Math.max(confidence, 0.85);
    priority = Math.max(priority, 8);
  }

  // 5) compute priority (simplistic): based on presence of keywords + confidence
  const harmKeywords = ['flood', 'collapsed', 'evacuate', 'fire', 'derail', 'riot', 'death', 'injured', 'bleeding'];
  const containsHarm = harmKeywords.some(k => text.toLowerCase().includes(k));
  priority = Math.max(priority, containsHarm ? 8 : 3);
  if (confidence > 0.8) priority = Math.max(priority, 7);

  // 6) generate multilingual explanations using Gemini (if available)
  const explanations = {};
  try {
    // Build evidenceUsed for explanation: prefer parsed nli evidence or top evidence
    const evidenceUsed = (nli && nli.evidence_used && nli.evidence_used.length) ? nli.evidence_used : evidence.slice(0, 2).map(e => ({ url: e.url, excerpt: e.snippet }));
    // Generate for en, hi, mr
    const langs = ['en', 'hi', 'mr'];
    for (const lang of langs) {
      const explPrompt = buildExplanationPrompt(text, status, evidenceUsed, lang);
      const explGen = await generateText(explPrompt, { temperature: 0.3, max_tokens: 200 });
      // gemini returns text directly
      explanations[lang] = explGen.text;
    }
  } catch (e) {
    console.warn('Gemini explanation generation failed', e.message);
  }

  return {
    status,
    confidence,
    evidence,
    priority,
    explanations,
    nli // raw parsed NLI if available
  };
}
